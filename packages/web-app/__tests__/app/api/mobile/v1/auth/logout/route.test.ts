import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/mobile/auth", () => ({
  getMobileSessionToken: vi.fn(),
  clearMobileSession: vi.fn(),
}));

import { getMobileSessionToken, clearMobileSession } from "@/lib/mobile/auth";
import { POST } from "@/app/api/mobile/v1/auth/logout/route";

const mockGetToken = vi.mocked(getMobileSessionToken);
const mockClear = vi.mocked(clearMobileSession);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/mobile/v1/auth/logout", () => {
  it("clears session and returns ok", async () => {
    mockGetToken.mockReturnValue("session-token-123");
    mockClear.mockResolvedValue(undefined);

    const req = new Request("http://localhost/api/mobile/v1/auth/logout", {
      method: "POST",
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(mockClear).toHaveBeenCalledWith("session-token-123");
  });

  it("returns 500 on error", async () => {
    mockGetToken.mockReturnValue("tok");
    mockClear.mockRejectedValue(new Error("DB down"));

    const req = new Request("http://localhost/api/mobile/v1/auth/logout", {
      method: "POST",
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toBeDefined();
  });
});
