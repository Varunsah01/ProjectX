import { randomBytes } from "node:crypto";
import { compare } from "bcrypt";
import { UserRole } from "@prisma/client";
import { db } from "@/lib/db";
import { generateCsrfToken } from "@/lib/csrf";
import { toDateString } from "@/lib/query-utils";

const MOBILE_SESSION_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 30;

type TechnicianRecord = {
  id: string;
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
  csrfToken: string | null;
};

type TechnicianIdentifierType = "phone" | "employee_id";

const technicianSelect = {
  id: true,
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

function buildMobileUser(
  record: TechnicianRecord,
  membershipOrgId: string,
): MobileSessionUser {
  return {
    id: record.id,
    organizationId: membershipOrgId,
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

  // Find users with TECHNICIAN memberships
  const candidates = await db.orgMembership.findMany({
    where: { role: UserRole.TECHNICIAN },
    include: {
      user: { select: technicianSelect },
    },
  });

  for (const candidate of candidates) {
    if (normalizePhone(candidate.user.phone) === normalizedPhone) {
      return {
        ...candidate.user,
        membershipOrgId: candidate.organizationId,
      };
    }
  }

  return null;
}

async function findTechnicianByEmployeeId(employeeId: string) {
  return findTechnicianById(employeeId.trim());
}

async function findTechnicianByIdentifier(
  identifierType: TechnicianIdentifierType,
  identifier: string,
) {
  if (identifierType === "phone") {
    return findTechnicianByPhone(identifier);
  }

  const user = await findTechnicianByEmployeeId(identifier);
  if (!user) return null;

  // Get the first TECHNICIAN membership
  const membership = await db.orgMembership.findFirst({
    where: { userId: user.id, role: UserRole.TECHNICIAN },
    orderBy: { createdAt: "asc" },
  });

  if (!membership) return null;

  return { ...user, membershipOrgId: membership.organizationId };
}

export async function findActiveTechnicianByPhone(phone: string) {
  const result = await findTechnicianByPhone(phone);

  if (!result || result.status === "INACTIVE") {
    return null;
  }

  return buildMobileUser(result, result.membershipOrgId);
}

export async function authenticateTechnician({
  identifierType,
  identifier,
  secret,
}: {
  identifierType: TechnicianIdentifierType;
  identifier: string;
  secret: string;
}) {
  const trimmedIdentifier = identifier.trim();
  const trimmedSecret = secret.trim();

  if (!trimmedIdentifier || !trimmedSecret) {
    return null;
  }

  if (/^\d{6}$/.test(trimmedSecret)) {
    return null;
  }

  const result = await findTechnicianByIdentifier(identifierType, trimmedIdentifier);

  if (!result || result.status === "INACTIVE") {
    return null;
  }

  const passwordMatches = await compare(trimmedSecret, result.passwordHash);

  if (!passwordMatches) {
    return null;
  }

  return buildMobileUser(result, result.membershipOrgId);
}

export async function createMobileSession(userId: string) {
  const sessionToken = randomBytes(32).toString("hex");
  const csrfToken = await generateCsrfToken(sessionToken);
  const expires = new Date(Date.now() + MOBILE_SESSION_MAX_AGE_MS);

  await db.session.create({
    data: {
      sessionToken,
      userId,
      expires,
      csrfToken,
    },
  });

  return { sessionToken, csrfToken };
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
      csrfToken: true,
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

  if (!user || user.status === "INACTIVE") {
    await db.session.deleteMany({
      where: { sessionToken: token },
    });
    return null;
  }

  // Get the first TECHNICIAN membership for org context
  const membership = await db.orgMembership.findFirst({
    where: { userId: session.userId, role: UserRole.TECHNICIAN },
    orderBy: { createdAt: "asc" },
  });

  if (!membership) {
    await db.session.deleteMany({
      where: { sessionToken: token },
    });
    return null;
  }

  // Return HMAC-derived CSRF token (matches middleware validation, handles
  // migration of old sessions that stored a random token).
  const csrfToken = await generateCsrfToken(token);

  return {
    token,
    user: buildMobileUser(user, membership.organizationId),
    csrfToken,
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

export function validateMobileCsrf(
  request: Request,
  session: MobileSessionResult,
): boolean {
  const headerToken = request.headers.get("x-csrf-token");

  if (!headerToken || !session.csrfToken) {
    return false;
  }

  // Timing-safe comparison
  if (headerToken.length !== session.csrfToken.length) return false;
  let result = 0;
  for (let i = 0; i < headerToken.length; i++) {
    result |= headerToken.charCodeAt(i) ^ session.csrfToken.charCodeAt(i);
  }
  return result === 0;
}
