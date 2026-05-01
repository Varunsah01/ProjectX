import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

type RateLimitState = {
  count: number;
  resetAt: number;
};

type RateLimitOptions = {
  limit: number;
  windowMs: number;
};

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetAt: number;
};

declare global {
  // eslint-disable-next-line no-var
  var __appRateLimitStore__: Map<string, RateLimitState> | undefined;
  // eslint-disable-next-line no-var
  var __appRateLimitUpstashLogged__: boolean | undefined;
  // eslint-disable-next-line no-var
  var __appRateLimitFallbackLogged__: boolean | undefined;
  // eslint-disable-next-line no-var
  var __appRateLimitUpstashClient__: Redis | undefined;
  // eslint-disable-next-line no-var
  var __appRateLimitUpstashLimiters__:
    | Map<string, Ratelimit>
    | undefined;
}

const memoryStore =
  globalThis.__appRateLimitStore__ ?? new Map<string, RateLimitState>();

if (!globalThis.__appRateLimitStore__) {
  globalThis.__appRateLimitStore__ = memoryStore;
}

function getUpstashClient() {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();

  if (!url || !token) {
    if (!globalThis.__appRateLimitFallbackLogged__) {
      globalThis.__appRateLimitFallbackLogged__ = true;
      console.warn(
        "[rate-limit] UPSTASH_REDIS_REST_URL/UPSTASH_REDIS_REST_TOKEN not set; using in-memory limiter (single-process only).",
      );
    }
    return null;
  }

  if (!globalThis.__appRateLimitUpstashClient__) {
    globalThis.__appRateLimitUpstashClient__ = new Redis({ url, token });
    globalThis.__appRateLimitUpstashLimiters__ = new Map();

    if (!globalThis.__appRateLimitUpstashLogged__) {
      globalThis.__appRateLimitUpstashLogged__ = true;
      console.info("[rate-limit] Using Upstash sliding-window rate limiter.");
    }
  }

  return globalThis.__appRateLimitUpstashClient__;
}

function getUpstashLimiter(redis: Redis, limit: number, windowMs: number) {
  const cache = globalThis.__appRateLimitUpstashLimiters__;

  if (!cache) {
    return new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(limit, `${windowMs} ms`),
      prefix: "rl",
      analytics: false,
    });
  }

  const cacheKey = `${limit}:${windowMs}`;
  const cached = cache.get(cacheKey);

  if (cached) {
    return cached;
  }

  const limiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(limit, `${windowMs} ms`),
    prefix: "rl",
    analytics: false,
  });

  cache.set(cacheKey, limiter);
  return limiter;
}

function consumeMemoryRateLimit(
  key: string,
  { limit, windowMs }: RateLimitOptions,
): RateLimitResult {
  const now = Date.now();
  const current = memoryStore.get(key);

  if (!current || current.resetAt <= now) {
    const next: RateLimitState = {
      count: 1,
      resetAt: now + windowMs,
    };

    memoryStore.set(key, next);

    return {
      allowed: true,
      remaining: limit - 1,
      limit,
      resetAt: next.resetAt,
    };
  }

  current.count += 1;
  memoryStore.set(key, current);

  return {
    allowed: current.count <= limit,
    remaining: Math.max(0, limit - current.count),
    limit,
    resetAt: current.resetAt,
  };
}

export async function rateLimit(
  key: string,
  { limit, windowMs }: RateLimitOptions,
): Promise<RateLimitResult> {
  const redis = getUpstashClient();

  if (!redis) {
    return consumeMemoryRateLimit(key, { limit, windowMs });
  }

  try {
    const limiter = getUpstashLimiter(redis, limit, windowMs);
    const result = await limiter.limit(key);

    return {
      allowed: result.success,
      remaining: Math.max(0, result.remaining),
      limit: result.limit,
      resetAt: result.reset,
    };
  } catch (error) {
    console.warn(
      "[rate-limit] Upstash request failed, falling back to in-memory limiter for this call.",
      error,
    );
    return consumeMemoryRateLimit(key, { limit, windowMs });
  }
}

/**
 * Synchronous in-memory variant retained for legacy callers that cannot await.
 * Prefer `rateLimit` (async) for distributed counting.
 */
export function consumeRateLimit({
  key,
  limit,
  windowMs,
}: RateLimitOptions & { key: string }): RateLimitResult {
  return consumeMemoryRateLimit(key, { limit, windowMs });
}
