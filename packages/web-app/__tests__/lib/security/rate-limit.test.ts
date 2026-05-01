import { describe, it, expect, beforeEach, vi } from "vitest";

// Ensure no Upstash env vars so the in-memory limiter is used
delete process.env.UPSTASH_REDIS_REST_URL;
delete process.env.UPSTASH_REDIS_REST_TOKEN;

// Reset global state before importing
beforeEach(() => {
  globalThis.__appRateLimitStore__ = undefined;
  globalThis.__appRateLimitUpstashClient__ = undefined;
  globalThis.__appRateLimitUpstashLimiters__ = undefined;
  globalThis.__appRateLimitFallbackLogged__ = undefined;
  globalThis.__appRateLimitUpstashLogged__ = undefined;
});

describe("rate-limit (in-memory fallback)", () => {
  async function freshImport() {
    // Force re-evaluation of module-level state
    vi.resetModules();
    return import("@/lib/security/rate-limit");
  }

  it("allows requests within the limit", async () => {
    const { rateLimit } = await freshImport();
    const result = await rateLimit("test-key-1", { limit: 5, windowMs: 60_000 });

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
    expect(result.limit).toBe(5);
    expect(result.resetAt).toBeGreaterThan(Date.now() - 1000);
  });

  it("blocks requests exceeding the limit", async () => {
    const { rateLimit } = await freshImport();
    const key = "test-key-2";
    const opts = { limit: 3, windowMs: 60_000 };

    await rateLimit(key, opts); // 1
    await rateLimit(key, opts); // 2
    await rateLimit(key, opts); // 3 — at limit

    const blocked = await rateLimit(key, opts); // 4 — over limit
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  it("remaining decrements correctly", async () => {
    const { rateLimit } = await freshImport();
    const key = "test-key-3";
    const opts = { limit: 3, windowMs: 60_000 };

    const r1 = await rateLimit(key, opts);
    expect(r1.remaining).toBe(2);

    const r2 = await rateLimit(key, opts);
    expect(r2.remaining).toBe(1);

    const r3 = await rateLimit(key, opts);
    expect(r3.remaining).toBe(0);

    const r4 = await rateLimit(key, opts);
    expect(r4.remaining).toBe(0);
  });

  it("resets after window expires", async () => {
    const { rateLimit } = await freshImport();
    const key = "test-key-4";
    const opts = { limit: 1, windowMs: 50 }; // 50ms window

    const r1 = await rateLimit(key, opts);
    expect(r1.allowed).toBe(true);

    const r2 = await rateLimit(key, opts);
    expect(r2.allowed).toBe(false);

    // Wait for window to expire
    await new Promise((resolve) => setTimeout(resolve, 60));

    const r3 = await rateLimit(key, opts);
    expect(r3.allowed).toBe(true);
    expect(r3.remaining).toBe(0);
  });

  it("different keys are independent", async () => {
    const { rateLimit } = await freshImport();
    const opts = { limit: 1, windowMs: 60_000 };

    await rateLimit("key-a", opts);
    const ra = await rateLimit("key-a", opts);
    expect(ra.allowed).toBe(false);

    const rb = await rateLimit("key-b", opts);
    expect(rb.allowed).toBe(true);
  });

  it("consumeRateLimit works synchronously", async () => {
    const { consumeRateLimit } = await freshImport();

    const r1 = consumeRateLimit({ key: "sync-key", limit: 2, windowMs: 60_000 });
    expect(r1.allowed).toBe(true);
    expect(r1.remaining).toBe(1);

    const r2 = consumeRateLimit({ key: "sync-key", limit: 2, windowMs: 60_000 });
    expect(r2.allowed).toBe(true);
    expect(r2.remaining).toBe(0);

    const r3 = consumeRateLimit({ key: "sync-key", limit: 2, windowMs: 60_000 });
    expect(r3.allowed).toBe(false);
  });
});
