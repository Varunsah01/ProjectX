type RateLimitState = {
  count: number;
  resetAt: number;
};

type RateLimitOptions = {
  key: string;
  limit: number;
  windowMs: number;
};

declare global {
  // eslint-disable-next-line no-var
  var __appRateLimitStore__: Map<string, RateLimitState> | undefined;
}

const rateLimitStore = globalThis.__appRateLimitStore__ ?? new Map<string, RateLimitState>();

if (!globalThis.__appRateLimitStore__) {
  globalThis.__appRateLimitStore__ = rateLimitStore;
}

export function consumeRateLimit({ key, limit, windowMs }: RateLimitOptions) {
  const now = Date.now();
  const current = rateLimitStore.get(key);

  if (!current || current.resetAt <= now) {
    const next = {
      count: 1,
      resetAt: now + windowMs,
    };

    rateLimitStore.set(key, next);

    return {
      allowed: true,
      remaining: limit - 1,
      limit,
      resetAt: next.resetAt,
    };
  }

  current.count += 1;
  rateLimitStore.set(key, current);

  return {
    allowed: current.count <= limit,
    remaining: Math.max(0, limit - current.count),
    limit,
    resetAt: current.resetAt,
  };
}
