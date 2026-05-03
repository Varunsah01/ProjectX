"use client";

/**
 * Client-side feature flag helpers.
 *
 * Usage in client components:
 *   import { useFeature, FeatureGate } from "@/lib/feature-flags/client";
 *
 * For server-side evaluation:
 *   import { evalFeature } from "@/lib/feature-flags/server";
 */
export { useFeatureIsOn as useFeature } from "@growthbook/growthbook-react";
export { FeatureGate } from "@/components/ui/FeatureGate";
