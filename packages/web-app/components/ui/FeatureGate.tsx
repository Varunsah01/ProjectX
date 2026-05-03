"use client";

import { useFeatureIsOn } from "@growthbook/growthbook-react";
import type { ReactNode } from "react";

/**
 * Declarative feature gate. Renders `children` when the flag is on,
 * `fallback` (default: nothing) when it is off.
 *
 * Flag naming convention: `area.flag-name` (lowercase kebab, dot separator).
 *
 * @example
 * <FeatureGate flag="portal.tickets" fallback={<ComingSoon />}>
 *   <TicketsPage />
 * </FeatureGate>
 */
export function FeatureGate({
  flag,
  children,
  fallback = null,
}: {
  flag: string;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const enabled = useFeatureIsOn(flag);
  return enabled ? <>{children}</> : <>{fallback}</>;
}
