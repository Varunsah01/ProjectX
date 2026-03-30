import { randomBytes } from "node:crypto";
import { compare } from "bcrypt";
import { UserRole } from "@prisma/client";
import { db } from "@/lib/db";
import { technicians } from "@/lib/mock-data";
import { toDateString } from "@/lib/query-utils";

const MOBILE_SESSION_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 30;

type TechnicianRecord = {
  id: string;
  organizationId: string;
  role: UserRole;
  name: string;
  email: string;
  passwordHash: string;
  status: string;
  phone: string | null;
  territory: string | null;
  specialization: string | null;
  activeJobs: number;
  completedToday: number;
  totalJobs: number;
  avgRating: number;
  completedThisWeek: number;
  completedThisMonth: number;
  createdAt: Date;
  skills: string[];
};

export interface MobileSessionUser {
  id: string;
  organizationId: string;
  role: "technician";
  name: string;
  email: string;
  phone: string;
  territory: string;
  status: string;
  specialization: string;
  activeJobs: number;
  completedToday: number;
  totalJobs: number;
  avgRating: number;
  completedThisWeek: number;
  completedThisMonth: number;
  joinDate: string;
  skills: string[];
}

type MobileSessionResult = {
  token: string;
  user: MobileSessionUser;
};

type TechnicianIdentifierType = "phone" | "employee_id";
type TechnicianAuthMethod = "password" | "otp";

export class UnsupportedMobileAuthMethodError extends Error {
  status: number;

  constructor(message: string, status = 503) {
    super(message);
    this.status = status;
  }
}

const seededEmployeeIdToEmail = new Map(
  technicians.map((technician) => [technician.id.toUpperCase(), technician.email.toLowerCase()]),
);

const technicianSelect = {
  id: true,
  organizationId: true,
  role: true,
  name: true,
  email: true,
  passwordHash: true,
  status: true,
  phone: true,
  territory: true,
  specialization: true,
  activeJobs: true,
  completedToday: true,
  totalJobs: true,
  avgRating: true,
  completedThisWeek: true,
  completedThisMonth: true,
  createdAt: true,
  skills: true,
} as const;

function buildMobileUser(record: TechnicianRecord): MobileSessionUser {
  return {
    id: record.id,
    organizationId: record.organizationId,
    role: "technician",
    name: record.name,
    email: record.email,
    phone: record.phone ?? "",
    territory: record.territory ?? "",
    status: record.status.toLowerCase(),
    specialization: record.specialization ?? "",
    activeJobs: record.activeJobs,
    completedToday: record.completedToday,
    totalJobs: record.totalJobs,
    avgRating: record.avgRating,
    completedThisWeek: record.completedThisWeek,
    completedThisMonth: record.completedThisMonth,
    joinDate: toDateString(record.createdAt),
    skills: record.skills,
  };
}

function getAuthorizationToken(request: Request) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  const token = authorization.slice("Bearer ".length).trim();
  return token || null;
}

function normalizePhone(value: string | null | undefined) {
  return (value ?? "").replace(/\D/g, "").slice(-10);
}

async function findTechnicianByEmail(email: string) {
  return db.user.findUnique({
    where: { email },
    select: technicianSelect,
  });
}

async function findTechnicianById(userId: string) {
  return db.user.findUnique({
    where: { id: userId },
    select: technicianSelect,
  });
}

async function findTechnicianByPhone(phone: string) {
  const normalizedPhone = normalizePhone(phone);

  if (!normalizedPhone) {
    return null;
  }

  const candidates = await db.user.findMany({
    where: {
      role: UserRole.TECHNICIAN,
      phone: {
        not: null,
      },
    },
    select: technicianSelect,
  });

  return (
    candidates.find((candidate) => normalizePhone(candidate.phone) === normalizedPhone) ?? null
  );
}

async function findTechnicianByEmployeeId(employeeId: string) {
  const trimmedEmployeeId = employeeId.trim();
  const directMatch = await findTechnicianById(trimmedEmployeeId);

  if (directMatch) {
    return directMatch;
  }

  const seededEmail = seededEmployeeIdToEmail.get(trimmedEmployeeId.toUpperCase());

  if (!seededEmail) {
    return null;
  }

  return findTechnicianByEmail(seededEmail);
}

async function findTechnicianByIdentifier(
  identifierType: TechnicianIdentifierType,
  identifier: string,
) {
  if (identifierType === "phone") {
    return findTechnicianByPhone(identifier);
  }

  return findTechnicianByEmployeeId(identifier);
}

export async function authenticateTechnician({
  identifierType,
  identifier,
  authMethod,
  secret,
}: {
  identifierType: TechnicianIdentifierType;
  identifier: string;
  authMethod: TechnicianAuthMethod;
  secret: string;
}) {
  const trimmedIdentifier = identifier.trim();
  const trimmedSecret = secret.trim();

  if (!trimmedIdentifier || !trimmedSecret) {
    return null;
  }

  const user = await findTechnicianByIdentifier(identifierType, trimmedIdentifier);

  if (!user || user.role !== UserRole.TECHNICIAN || user.status === "INACTIVE") {
    return null;
  }

  if (authMethod !== "password") {
    throw new UnsupportedMobileAuthMethodError(
      "OTP sign-in is not enabled for the current pilot. Use your employee ID or phone number with password.",
    );
  }

  const passwordMatches = await compare(trimmedSecret, user.passwordHash);

  if (!passwordMatches) {
    return null;
  }

  return buildMobileUser(user);
}

export async function createMobileSession(userId: string) {
  const sessionToken = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + MOBILE_SESSION_MAX_AGE_MS);

  await db.session.create({
    data: {
      sessionToken,
      userId,
      expires,
    },
  });

  return sessionToken;
}

export async function getMobileSession(request: Request): Promise<MobileSessionResult | null> {
  const token = getAuthorizationToken(request);

  if (!token) {
    return null;
  }

  const session = await db.session.findUnique({
    where: { sessionToken: token },
    select: {
      sessionToken: true,
      expires: true,
      userId: true,
    },
  });

  if (!session) {
    return null;
  }

  if (session.expires.getTime() <= Date.now()) {
    await db.session.deleteMany({
      where: { sessionToken: token },
    });
    return null;
  }

  const user = await findTechnicianById(session.userId);

  if (!user || user.role !== UserRole.TECHNICIAN || user.status === "INACTIVE") {
    await db.session.deleteMany({
      where: { sessionToken: token },
    });
    return null;
  }

  return {
    token,
    user: buildMobileUser(user),
  };
}

export async function clearMobileSession(token: string | null | undefined) {
  if (!token) {
    return;
  }

  await db.session.deleteMany({
    where: { sessionToken: token },
  });
}

export function getMobileSessionToken(request: Request) {
  return getAuthorizationToken(request);
}
