import AsyncStorage from "@react-native-async-storage/async-storage";
import { GrowthBook, type FeatureDefinition } from "@growthbook/growthbook";

const CLIENT_KEY = process.env.EXPO_PUBLIC_GROWTHBOOK_CLIENT_KEY ?? "";
const CDN_URL = `https://cdn.growthbook.io/api/features/${CLIENT_KEY}`;
const CACHE_KEY = "gb_features_v1";
const TTL_MS = 30_000; // 30 seconds

let memFeatures: Record<string, FeatureDefinition<unknown>> = {};
let memTs = 0;

/**
 * Load features from cache (AsyncStorage) and then refresh from CDN if stale.
 * Designed to be called non-blockingly on app start.
 */
export async function loadFeatures(): Promise<void> {
  // Warm from AsyncStorage on first run so cached flags are available immediately
  if (!memTs) {
    try {
      const raw = await AsyncStorage.getItem(CACHE_KEY);
      if (raw) {
        const stored = JSON.parse(raw) as {
          features: Record<string, FeatureDefinition<unknown>>;
          ts: number;
        };
        memFeatures = stored.features ?? {};
        memTs = stored.ts ?? 0;
      }
    } catch {
      // ignore — start with empty features (fail-closed)
    }
  }

  const now = Date.now();
  if (!CLIENT_KEY || (memTs > 0 && now - memTs < TTL_MS)) return;

  try {
    const r = await fetch(CDN_URL);
    if (r.ok) {
      const body = (await r.json()) as {
        features: Record<string, FeatureDefinition<unknown>>;
      };
      memFeatures = body.features ?? {};
      memTs = now;
      await AsyncStorage.setItem(
        CACHE_KEY,
        JSON.stringify({ features: memFeatures, ts: now }),
      );
    }
  } catch {
    // keep stale cache — fail-closed if cache is also empty
  }
}

/**
 * Evaluate a feature flag synchronously using the in-memory cache.
 * Returns `false` (fail-closed) when no features are loaded.
 */
export function evalFeatureMobile(
  key: string,
  attrs: Record<string, string | undefined>,
): boolean {
  if (!Object.keys(memFeatures).length) return false;
  const gb = new GrowthBook({ features: memFeatures as never, attributes: attrs });
  return gb.isOn(key);
}
