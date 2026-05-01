import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";

const mockAuthenticateTechnician = vi.fn();
const mockCreateMobileSession = vi.fn();

vi.mock("@/lib/mobile/auth", () => ({
  authenticateTechnician: (...args: unknown[]) => mockAuthenticateTechnician(...args),
  createMobileSession: (...args: unknown[]) => mockCreateMobileSession(...args),
}));

import { POST } from "@/app/api/mobile/v1/auth/login/route";

function makeRequest(body: unknown) {
  return new Request("http://localhost:3001/api/mobile/v1/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const validCredentials = {
  identifierType: "phone",
  identifier: "9876543210",
  authMethod: "password",
  secret: "correctpassword",
};

const mockUser = {
  id: "user-1",
  organizationId: "org-1",
  role: "technician",
  name: "John Tech",
  email: "john@test.com",
  phone: "9876543210",
  territory: "North",
  status: "active",
  specialization: "HVAC",
  activeJobs: 2,
  completedToday: 1,
  totalJobs: 50,
  avgRating: 4.5,
  completedThisWeek: 5,
  completedThisMonth: 20,
  joinDate: "2024-01-01",
  skills: ["AC", "Fridge"],
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/mobile/v1/auth/login", () => {
  it("returns token and user on valid credentials", async () => {
    mockAuthenticateTechnician.mockResolvedValue(mockUser);
    mockCreateMobileSession.mockResolvedValue({
      sessionToken: "session-token-abc",
      csrfToken: "csrf-token-xyz",
    });

    const response = await POST(makeRequest(validCredentials));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.token).toBe("session-token-abc");
    expect(body.csrfToken).toBe("csrf-token-xyz");
    expect(body.user).toEqual(mockUser);

    expect(mockAuthenticateTechnician).toHaveBeenCalledWith({
      identifierType: "phone",
      identifier: "9876543210",
      secret: "correctpassword",
    });
    expect(mockCreateMobileSession).toHaveBeenCalledWith(mockUser.id);
  });

  it("returns 401 on invalid credentials", async () => {
    mockAuthenticateTechnician.mockResolvedValue(null);

    const response = await POST(
      makeRequest({ ...validCredentials, secret: "wrongpassword" }),
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe("Invalid operator credentials.");
    expect(mockCreateMobileSession).not.toHaveBeenCalled();
  });

  it("returns 400 on missing required fields", async () => {
    const response = await POST(
      makeRequest({ identifierType: "phone" }),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBeDefined();
  });

  it("returns 400 on empty identifier", async () => {
    const response = await POST(
      makeRequest({
        ...validCredentials,
        identifier: "",
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBeDefined();
  });

  it("returns 400 on invalid identifierType", async () => {
    const response = await POST(
      makeRequest({
        ...validCredentials,
        identifierType: "email",
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBeDefined();
  });

  it("returns 503 when OTP code is provided", async () => {
    const response = await POST(
      makeRequest({
        ...validCredentials,
        otpCode: "123456",
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.error).toContain("OTP login is not available");
  });

  it("returns 500 on unexpected server error", async () => {
    mockAuthenticateTechnician.mockRejectedValue(new Error("DB connection lost"));

    const response = await POST(makeRequest(validCredentials));
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe("Unable to sign in right now.");
  });
});
