import { GrowthBook, type FeatureDefinition } from "@growthbook/growthbook";

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
const TTL = 30_000;

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
  } catch {
    // keep stale cache — fail-closed if cache is also empty
  }
  return cachedFeatures;
}

export async function getSerializedFeatures(): Promise<string> {
  return JSON.stringify(await fetchFeatures());
}

export async function evalFeature(
  key: string,
  ctx: FlagContext = {},
): Promise<boolean> {
  const features = await fetchFeatures();
  if (!Object.keys(features).length) return false;
  const gb = new GrowthBook({ features, attributes: ctx });
  return gb.isOn(key);
}
