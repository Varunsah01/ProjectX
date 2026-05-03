import { GrowthBook, type FeatureDefinition } from "@growthbook/growthbook";
import { logger } from "@/lib/log";

export type FlagContext = {
  userId?: string;
  orgId?: string;
  role?: string;
  plan?: string;
};

const API_HOST =
  process.env.NEXT_PUBLIC_GROWTHBOOK_API_HOST ?? "https://cdn.growthbook.io";
const CLIENT_KEY = process.env.NEXT_PUBLIC_GROWTHBOOK_CLIENT_KEY ?? "";

let cachedFeatures: Record<string, FeatureDefinition<unknown>> = {};
let cacheTs = 0;
const TTL = 30_000; // 30 seconds

async function fetchFeatures(): Promise<Record<string, FeatureDefinition<unknown>>> {
  if (!CLIENT_KEY) return cachedFeatures;
  const now = Date.now();
  if (cacheTs > 0 && now - cacheTs < TTL) return cachedFeatures;
  try {
    const r = await fetch(`${API_HOST}/api/features/${CLIENT_KEY}`, {
      cache: "no-store",
    });
    if (r.ok) {
      const body = (await r.json()) as {
        features: Record<string, FeatureDefinition<unknown>>;
      };
      cachedFeatures = body.features ?? {};
      cacheTs = now;
    }
  } catch (err) {
    logger.warn({ err }, "feature-flags: fetch failed, using stale cache");
  }
  return cachedFeatures;
}

/**
 * Returns a JSON-serialized snapshot of the features payload for hydrating
 * the client-side GrowthBookProvider.
 */
export async function getSerializedFeatures(): Promise<string> {
  return JSON.stringify(await fetchFeatures());
}

/**
 * Evaluate a feature flag server-side.
 * Logs each evaluation with `requestId` via Pino's AsyncLocalStorage mixin (P6).
 * Returns `false` (fail-closed) if the features payload is unavailable.
 */
export async function evalFeature(
  key: string,
  ctx: FlagContext = {},
): Promise<boolean> {
  const features = await fetchFeatures();
  if (!Object.keys(features).length) {
    logger.debug({ flag: key, result: false, reason: "no-features" }, "feature.eval");
    return false;
  }
  const gb = new GrowthBook({ features, attributes: ctx });
  const result = gb.isOn(key);
  logger.debug(
    { flag: key, result, userId: ctx.userId, orgId: ctx.orgId },
    "feature.eval",
  );
  return result;
}
