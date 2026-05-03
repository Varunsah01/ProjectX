"use client";

import { useFeatureIsOn } from "@growthbook/growthbook-react";
import type { ReactNode } from "react";

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
