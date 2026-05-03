"use client";

import type { Session } from "next-auth";
import { useEffect, useRef } from "react";
import { initAnalytics, identifyUser, resetUser } from "@/lib/analytics";

async function sha256(s: string): Promise<string> {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(s),
  );
  return [...new Uint8Array(buf)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

interface Props {
  session: Session | null;
}

export function AnalyticsProvider({ session }: Props) {
  const lastIdRef = useRef<string | null>(null);

  useEffect(() => {
    initAnalytics();

    const userId = session?.user?.id;
    const orgId = (session?.user as { activeOrgId?: string })?.activeOrgId;

    if (!userId) {
      // Logged out — reset
      if (lastIdRef.current) {
        resetUser();
        lastIdRef.current = null;
      }
      return;
    }

    // Identify with hashed IDs (never raw PII)
    Promise.all([sha256(userId), orgId ? sha256(orgId) : Promise.resolve(null)])
      .then(([hashedUserId, hashedOrgId]) => {
        const identity = `${hashedUserId}`;
        if (lastIdRef.current === identity) return; // already identified
        lastIdRef.current = identity;
        identifyUser(hashedUserId, {
          ...(hashedOrgId ? { org_id: hashedOrgId } : {}),
          role: (session?.user as { activeRole?: string })?.activeRole,
        });
      })
      .catch(() => {
        // crypto.subtle unavailable (e.g. non-secure context in dev) — skip
      });
  }, [session]);

  return null;
}
