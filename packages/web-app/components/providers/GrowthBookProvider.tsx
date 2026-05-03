"use client";

import { useMemo, type ReactNode } from "react";
import { GrowthBook } from "@growthbook/growthbook-react";
import { GrowthBookProvider as GBProvider } from "@growthbook/growthbook-react";

type Props = {
  serializedFeatures: string;
  attributes: { userId?: string; orgId?: string; role?: string };
  children: ReactNode;
};

export function GrowthBookProvider({
  serializedFeatures,
  attributes,
  children,
}: Props) {
  const gb = useMemo(() => {
    let features: Record<string, unknown> = {};
    try {
      features = JSON.parse(serializedFeatures) as Record<string, unknown>;
    } catch {
      // fail-closed: empty features means all flags are off
    }

    const instance = new GrowthBook({
      apiHost:
        process.env.NEXT_PUBLIC_GROWTHBOOK_API_HOST ??
        "https://cdn.growthbook.io",
      clientKey: process.env.NEXT_PUBLIC_GROWTHBOOK_CLIENT_KEY ?? "",
      enableDevMode: process.env.NODE_ENV !== "production",
      attributes,
    });

    // Hydrate with SSR-fetched features immediately (no CDN call on first render)
    instance.setFeatures(features as never);

    // Background re-fetch every ~30 s for live flag updates (<60 s propagation)
    void instance.init({ streaming: false });

    return instance;
    // attributes object identity changes on every render; key on individual fields
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serializedFeatures, attributes.userId, attributes.orgId, attributes.role]);

  return <GBProvider growthbook={gb}>{children}</GBProvider>;
}
