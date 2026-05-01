import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/mobile/auth", () => ({
  getMobileSession: vi.fn(),
}));

import { getMobileSession } from "@/lib/mobile/auth";
import { GET } from "@/app/api/mobile/v1/auth/me/route";

const mockGetSession = vi.mocked(getMobileSession);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/mobile/v1/auth/me", () => {
  it("returns user and csrfToken for valid session", async () => {
    const mockUser = { id: "u1", name: "Tech", role: "technician" };
    mockGetSession.mockResolvedValue({
      token: "tok",
      user: mockUser as never,
      csrfToken: "csrf-123",
    });

    const req = new Request("http://localhost/api/mobile/v1/auth/me");
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.user.id).toBe("u1");
    expect(body.csrfToken).toBe("csrf-123");
  });

  it("returns 401 when no session", async () => {
    mockGetSession.mockResolvedValue(null);

    const req = new Request("http://localhost/api/mobile/v1/auth/me");
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 500 on error", async () => {
    mockGetSession.mockRejectedValue(new Error("DB error"));

    const req = new Request("http://localhost/api/mobile/v1/auth/me");
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toBeDefined();
  });
});
