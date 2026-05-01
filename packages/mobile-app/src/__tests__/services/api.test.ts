// Mock the env diagnostics module before importing api.ts
jest.mock("../../../config/env", () => ({
  getMobileRuntimeEnvDiagnostics: () => ({
    mode: "explicit",
    baseUrl: "https://test.example.com",
    apiUrl: "https://test.example.com",
    mobileApiBaseUrl: "https://test.example.com/api/mobile",
    apiUrlRequired: true,
    buildIntent: "development",
    buildProfile: null,
    isLocalhostLikeApiUrl: false,
    configError: null,
    targetNotice: null,
  }),
}));

jest.mock("../../services/test-logger", () => ({
  logTestEvent: jest.fn(),
  logTestWarning: jest.fn(),
  logTestError: jest.fn(),
}));

import {
  ApiError,
  shouldQueueOfflineMutation,
  getErrorMessage,
  apiRequest,
  MOBILE_API_BASE_URL,
} from "../../services/api";

describe("ApiError", () => {
  it("creates error with message and status", () => {
    const error = new ApiError("Not found", 404);
    expect(error.message).toBe("Not found");
    expect(error.status).toBe(404);
    expect(error).toBeInstanceOf(Error);
  });
});

describe("MOBILE_API_BASE_URL", () => {
  it("appends /v1 to the base URL", () => {
    expect(MOBILE_API_BASE_URL).toBe("https://test.example.com/api/mobile/v1");
  });
});

describe("shouldQueueOfflineMutation", () => {
  it("returns false for 401 ApiError", () => {
    expect(shouldQueueOfflineMutation(new ApiError("Unauthorized", 401))).toBe(false);
  });

  it("returns true for 500 ApiError", () => {
    expect(shouldQueueOfflineMutation(new ApiError("Server error", 500))).toBe(true);
  });

  it("returns true for 503 ApiError", () => {
    expect(shouldQueueOfflineMutation(new ApiError("Service unavailable", 503))).toBe(true);
  });

  it("returns true for 429 ApiError", () => {
    expect(shouldQueueOfflineMutation(new ApiError("Rate limited", 429))).toBe(true);
  });

  it("returns true for 408 ApiError", () => {
    expect(shouldQueueOfflineMutation(new ApiError("Timeout", 408))).toBe(true);
  });

  it("returns false for 400 ApiError", () => {
    expect(shouldQueueOfflineMutation(new ApiError("Bad request", 400))).toBe(false);
  });

  it("returns false for 403 ApiError", () => {
    expect(shouldQueueOfflineMutation(new ApiError("Forbidden", 403))).toBe(false);
  });

  it("returns true for network errors", () => {
    const error = new TypeError("Network request failed");
    expect(shouldQueueOfflineMutation(error)).toBe(true);
  });

  it("returns true for AbortError", () => {
    const error = new Error("Aborted");
    error.name = "AbortError";
    expect(shouldQueueOfflineMutation(error)).toBe(true);
  });

  it("returns false for non-Error values", () => {
    expect(shouldQueueOfflineMutation("string error")).toBe(false);
    expect(shouldQueueOfflineMutation(null)).toBe(false);
    expect(shouldQueueOfflineMutation(undefined)).toBe(false);
  });
});

describe("getErrorMessage", () => {
  it("returns ApiError message directly", () => {
    expect(getErrorMessage(new ApiError("Payment required", 402))).toBe("Payment required");
  });

  it("returns timeout message for AbortError", () => {
    const error = new Error("Aborted");
    error.name = "AbortError";
    expect(getErrorMessage(error)).toContain("taking longer than expected");
  });

  it("returns network message for network errors", () => {
    const error = new TypeError("Network request failed");
    expect(getErrorMessage(error)).toContain("reach the server");
  });

  it("returns generic message for non-Error values", () => {
    expect(getErrorMessage(42)).toBe("Something went wrong.");
    expect(getErrorMessage(null)).toBe("Something went wrong.");
  });

  it("returns error.message for non-retryable errors", () => {
    const error = new Error("Custom validation error");
    expect(getErrorMessage(error)).toBe("Custom validation error");
  });
});

describe("apiRequest", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("sends GET request with auth header", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ "content-type": "application/json" }),
      json: () => Promise.resolve({ data: "test" }),
    });

    const result = await apiRequest("/jobs", { token: "my-token" });

    expect(result).toEqual({ data: "test" });
    expect(global.fetch).toHaveBeenCalledWith(
      "https://test.example.com/api/mobile/v1/jobs",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          Authorization: "Bearer my-token",
        }),
      }),
    );
  });

  it("sends POST with JSON body", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ "content-type": "application/json" }),
      json: () => Promise.resolve({ ok: true }),
    });

    await apiRequest("/jobs/1/status", {
      method: "POST",
      body: { status: "completed" },
      token: "tok",
    });

    const call = (global.fetch as jest.Mock).mock.calls[0];
    expect(call[1].method).toBe("POST");
    expect(call[1].body).toBe(JSON.stringify({ status: "completed" }));
    expect(call[1].headers["Content-Type"]).toBe("application/json");
  });

  it("throws ApiError on non-ok response", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 403,
      headers: new Headers({ "content-type": "application/json" }),
      json: () => Promise.resolve({ error: "Forbidden" }),
    });

    await expect(apiRequest("/protected")).rejects.toThrow(ApiError);
    await expect(apiRequest("/protected")).rejects.toMatchObject({ status: 403 });
  });

  it("retries on 500 error", async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        headers: new Headers({ "content-type": "application/json" }),
        json: () => Promise.resolve({ error: "Server error" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: () => Promise.resolve({ data: "ok" }),
      });

    const result = await apiRequest("/flaky", {
      retry: 1,
      retryDelayMs: 1,
    });

    expect(result).toEqual({ data: "ok" });
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it("does not retry on 400 error", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 400,
      headers: new Headers({ "content-type": "application/json" }),
      json: () => Promise.resolve({ error: "Bad request" }),
    });

    await expect(
      apiRequest("/bad", { retry: 2, retryDelayMs: 1 }),
    ).rejects.toThrow(ApiError);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});
