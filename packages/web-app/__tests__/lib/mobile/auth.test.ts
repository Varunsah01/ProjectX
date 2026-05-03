import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth-utils", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@/lib/db", () => {
  const mockSession = {
    create: vi.fn(),
    findUnique: vi.fn(),
    deleteMany: vi.fn(),
  };
  const mockUser = {
    findUnique: vi.fn(),
    findMany: vi.fn(),
  };
  const mockOrgMembership = {
    findMany: vi.fn(),
    findFirst: vi.fn(),
  };
  return {
    db: {
      session: mockSession,
      user: mockUser,
      orgMembership: mockOrgMembership,
    },
  };
});

vi.mock("bcrypt", () => ({
  compare: vi.fn(),
}));

import { db } from "@/lib/db";
import { compare } from "bcrypt";
import {
  createMobileSession,
  getMobileSession,
  clearMobileSession,
  getMobileSessionToken,
  validateMobileCsrf,
  authenticateTechnician,
} from "@/lib/mobile/auth";

const mockSessionCreate = vi.mocked(db.session.create);
const mockSessionFind = vi.mocked(db.session.findUnique);
const mockSessionDeleteMany = vi.mocked(db.session.deleteMany);
const mockUserFind = vi.mocked(db.user.findUnique);
const mockOrgMembershipFindMany = vi.mocked(db.orgMembership.findMany);
const mockOrgMembershipFindFirst = vi.mocked(db.orgMembership.findFirst);
const mockCompare = vi.mocked(compare);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createMobileSession", () => {
  it("creates a session with token and csrf token", async () => {
    mockSessionCreate.mockResolvedValue({} as never);

    const result = await createMobileSession("user-123");

    expect(result.sessionToken).toBeDefined();
    expect(result.sessionToken.length).toBe(64); // 32 bytes hex
    expect(result.csrfToken).toBeDefined();
    expect(result.csrfToken.length).toBe(64);
    expect(result.sessionToken).not.toBe(result.csrfToken);

    expect(mockSessionCreate).toHaveBeenCalledOnce();
    const arg = mockSessionCreate.mock.calls[0][0] as { data: Record<string, unknown> };
    expect(arg.data.userId).toBe("user-123");
    expect(arg.data.sessionToken).toBe(result.sessionToken);
    expect(arg.data.csrfToken).toBe(result.csrfToken);
    expect(arg.data.expires).toBeInstanceOf(Date);
  });
});

describe("getMobileSession", () => {
  const makeTechnician = () => ({
    id: "user-1",
    organizationId: "org-1",
    role: "TECHNICIAN" as const,
    name: "Tech User",
    email: "tech@test.com",
    passwordHash: "$2b$10$hash",
    status: "ACTIVE",
    phone: "1234567890",
    territory: "North",
    specialization: "HVAC",
    activeJobs: 1,
    completedToday: 0,
    totalJobs: 10,
    avgRating: 4.0,
    completedThisWeek: 3,
    completedThisMonth: 12,
    createdAt: new Date("2024-01-01"),
    skills: ["AC"],
  });

  it("returns null when no authorization header", async () => {
    const req = new Request("http://localhost/api/mobile/v1/jobs", {
      method: "GET",
    });
    const result = await getMobileSession(req);
    expect(result).toBeNull();
  });

  it("returns null for non-Bearer authorization", async () => {
    const req = new Request("http://localhost/api/mobile/v1/jobs", {
      headers: { Authorization: "Basic abc123" },
    });
    const result = await getMobileSession(req);
    expect(result).toBeNull();
  });

  it("returns null when session not found in DB", async () => {
    mockSessionFind.mockResolvedValue(null);

    const req = new Request("http://localhost/api/mobile/v1/jobs", {
      headers: { Authorization: "Bearer valid-token" },
    });
    const result = await getMobileSession(req);
    expect(result).toBeNull();
  });

  it("returns null and deletes expired sessions", async () => {
    mockSessionFind.mockResolvedValue({
      sessionToken: "expired-token",
      expires: new Date(Date.now() - 1000), // expired
      userId: "user-1",
      csrfToken: "csrf-1",
    } as never);

    const req = new Request("http://localhost/api/mobile/v1/jobs", {
      headers: { Authorization: "Bearer expired-token" },
    });
    const result = await getMobileSession(req);
    expect(result).toBeNull();
    expect(mockSessionDeleteMany).toHaveBeenCalled();
  });

  it("returns session for valid token with active technician", async () => {
    mockSessionFind.mockResolvedValue({
      sessionToken: "valid-token",
      expires: new Date(Date.now() + 86400000),
      userId: "user-1",
      csrfToken: "csrf-abc",
    } as never);
    mockUserFind.mockResolvedValue(makeTechnician() as never);
    mockOrgMembershipFindFirst.mockResolvedValue({
      organizationId: "org-1",
    } as never);

    const req = new Request("http://localhost/api/mobile/v1/jobs", {
      headers: { Authorization: "Bearer valid-token" },
    });
    const result = await getMobileSession(req);
    expect(result).not.toBeNull();
    expect(result!.token).toBe("valid-token");
    expect(result!.user.id).toBe("user-1");
    expect(result!.user.role).toBe("technician");
    expect(result!.csrfToken).toBe("csrf-abc");
  });

  it("returns null for inactive users", async () => {
    mockSessionFind.mockResolvedValue({
      sessionToken: "valid-token",
      expires: new Date(Date.now() + 86400000),
      userId: "user-1",
      csrfToken: "csrf-abc",
    } as never);
    mockUserFind.mockResolvedValue({
      ...makeTechnician(),
      status: "INACTIVE",
    } as never);

    const req = new Request("http://localhost/api/mobile/v1/jobs", {
      headers: { Authorization: "Bearer valid-token" },
    });
    const result = await getMobileSession(req);
    expect(result).toBeNull();
    expect(mockSessionDeleteMany).toHaveBeenCalled();
  });
});

describe("clearMobileSession", () => {
  it("deletes session by token", async () => {
    mockSessionDeleteMany.mockResolvedValue({ count: 1 } as never);
    await clearMobileSession("token-to-clear");
    expect(mockSessionDeleteMany).toHaveBeenCalledWith({
      where: { sessionToken: "token-to-clear" },
    });
  });

  it("no-ops for null/undefined token", async () => {
    await clearMobileSession(null);
    await clearMobileSession(undefined);
    expect(mockSessionDeleteMany).not.toHaveBeenCalled();
  });
});

describe("getMobileSessionToken", () => {
  it("extracts Bearer token from request", () => {
    const req = new Request("http://localhost/test", {
      headers: { Authorization: "Bearer my-token-123" },
    });
    expect(getMobileSessionToken(req)).toBe("my-token-123");
  });

  it("returns null for missing header", () => {
    const req = new Request("http://localhost/test");
    expect(getMobileSessionToken(req)).toBeNull();
  });
});

describe("validateMobileCsrf", () => {
  it("returns true for matching CSRF token", () => {
    const req = new Request("http://localhost/test", {
      headers: { "x-csrf-token": "csrf-abc" },
    });
    const session = {
      token: "sess-token",
      user: {} as never,
      csrfToken: "csrf-abc",
    };
    expect(validateMobileCsrf(req, session)).toBe(true);
  });

  it("returns false for mismatched token", () => {
    const req = new Request("http://localhost/test", {
      headers: { "x-csrf-token": "wrong-csrf" },
    });
    const session = {
      token: "sess-token",
      user: {} as never,
      csrfToken: "csrf-abc",
    };
    expect(validateMobileCsrf(req, session)).toBe(false);
  });

  it("returns false when header is missing", () => {
    const req = new Request("http://localhost/test");
    const session = {
      token: "sess-token",
      user: {} as never,
      csrfToken: "csrf-abc",
    };
    expect(validateMobileCsrf(req, session)).toBe(false);
  });

  it("returns false when session csrfToken is null", () => {
    const req = new Request("http://localhost/test", {
      headers: { "x-csrf-token": "csrf-abc" },
    });
    const session = {
      token: "sess-token",
      user: {} as never,
      csrfToken: null,
    };
    expect(validateMobileCsrf(req, session)).toBe(false);
  });
});

describe("authenticateTechnician", () => {
  it("returns null for empty identifier", async () => {
    const result = await authenticateTechnician({
      identifierType: "phone",
      identifier: "",
      secret: "password",
    });
    expect(result).toBeNull();
  });

  it("returns null for empty secret", async () => {
    const result = await authenticateTechnician({
      identifierType: "phone",
      identifier: "1234567890",
      secret: "",
    });
    expect(result).toBeNull();
  });

  it("returns null for 6-digit OTP secret (rejected in password flow)", async () => {
    const result = await authenticateTechnician({
      identifierType: "phone",
      identifier: "1234567890",
      secret: "123456",
    });
    expect(result).toBeNull();
  });

  it("returns null when user not found", async () => {
    mockOrgMembershipFindMany.mockResolvedValue([]);

    const result = await authenticateTechnician({
      identifierType: "phone",
      identifier: "9999999999",
      secret: "password123",
    });
    expect(result).toBeNull();
  });

  it("returns null on wrong password", async () => {
    mockOrgMembershipFindMany.mockResolvedValue([
      {
        organizationId: "org-1",
        user: {
          id: "user-1",
          name: "Tech",
          email: "tech@test.com",
          passwordHash: "$2b$10$hash",
          status: "ACTIVE",
          phone: "9876543210",
          territory: null,
          specialization: null,
          activeJobs: 0,
          completedToday: 0,
          totalJobs: 0,
          avgRating: 0,
          completedThisWeek: 0,
          completedThisMonth: 0,
          createdAt: new Date(),
          skills: [],
        },
      },
    ] as never);
    mockCompare.mockResolvedValue(false as never);

    const result = await authenticateTechnician({
      identifierType: "phone",
      identifier: "9876543210",
      secret: "wrongpassword",
    });
    expect(result).toBeNull();
  });

  it("returns user on correct password", async () => {
    mockOrgMembershipFindMany.mockResolvedValue([
      {
        organizationId: "org-1",
        user: {
          id: "user-1",
          name: "Tech User",
          email: "tech@test.com",
          passwordHash: "$2b$10$hash",
          status: "ACTIVE",
          phone: "9876543210",
          territory: "North",
          specialization: "HVAC",
          activeJobs: 2,
          completedToday: 1,
          totalJobs: 50,
          avgRating: 4.5,
          completedThisWeek: 5,
          completedThisMonth: 20,
          createdAt: new Date("2024-06-01"),
          skills: ["AC", "Fridge"],
        },
      },
    ] as never);
    mockCompare.mockResolvedValue(true as never);

    const result = await authenticateTechnician({
      identifierType: "phone",
      identifier: "9876543210",
      secret: "correctpassword",
    });

    expect(result).not.toBeNull();
    expect(result!.id).toBe("user-1");
    expect(result!.role).toBe("technician");
    expect(result!.name).toBe("Tech User");
  });
});
