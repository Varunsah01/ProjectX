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
  var __portalRateLimitStore__: Map<string, RateLimitState> | undefined;
  // eslint-disable-next-line no-var
  var __portalRateLimitUpstashClient__: Redis | undefined;
  // eslint-disable-next-line no-var
  var __portalRateLimitUpstashLimiters__: Map<string, Ratelimit> | undefined;
}

const memoryStore =
  globalThis.__portalRateLimitStore__ ?? new Map<string, RateLimitState>();

if (!globalThis.__portalRateLimitStore__) {
  globalThis.__portalRateLimitStore__ = memoryStore;
}

function getUpstashClient() {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();

  if (!url || !token) return null;

  if (!globalThis.__portalRateLimitUpstashClient__) {
    globalThis.__portalRateLimitUpstashClient__ = new Redis({ url, token });
    globalThis.__portalRateLimitUpstashLimiters__ = new Map();
  }

  return globalThis.__portalRateLimitUpstashClient__;
}

function getUpstashLimiter(redis: Redis, limit: number, windowMs: number) {
  const cache = globalThis.__portalRateLimitUpstashLimiters__;
  const cacheKey = `${limit}:${windowMs}`;

  if (cache) {
    const cached = cache.get(cacheKey);
    if (cached) return cached;
  }

  const limiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(limit, `${windowMs} ms`),
    prefix: "portal-rl",
    analytics: false,
  });

  cache?.set(cacheKey, limiter);
  return limiter;
}

function consumeMemoryRateLimit(
  key: string,
  { limit, windowMs }: RateLimitOptions,
): RateLimitResult {
  const now = Date.now();
  const current = memoryStore.get(key);

  if (!current || current.resetAt <= now) {
    const next: RateLimitState = { count: 1, resetAt: now + windowMs };
    memoryStore.set(key, next);
    return { allowed: true, remaining: limit - 1, limit, resetAt: next.resetAt };
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
  } catch {
    return consumeMemoryRateLimit(key, { limit, windowMs });
  }
}
