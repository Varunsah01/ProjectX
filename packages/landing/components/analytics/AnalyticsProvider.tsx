"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { initAnalytics, track, Events } from "@/lib/analytics";

function maybeInit() {
  if (typeof window === "undefined") return false;
  if (localStorage.getItem("analytics_consent") === "granted") {
    initAnalytics();
    return true;
  }
  return false;
}

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Init on mount if consent was previously granted
  useEffect(() => {
    maybeInit();

    // Listen for consent granted by the CookieBanner
    const onConsent = () => {
      initAnalytics();
      track(Events.PAGE_VIEW, { path: window.location.pathname });
    };
    window.addEventListener("analytics:consent_granted", onConsent);
    return () => window.removeEventListener("analytics:consent_granted", onConsent);
  }, []);

  // Pageview on each route change
  useEffect(() => {
    if (maybeInit()) {
      track(Events.PAGE_VIEW, { path: pathname });
    }
  }, [pathname]);

  // Delegated CTA click tracking via data-track="cta" attribute
  useEffect(() => {
    function onClick(e: MouseEvent) {
      let el = e.target as HTMLElement | null;
      while (el) {
        if (el.dataset?.track === "cta") {
          track(Events.CTA_CLICKED, {
            label: el.dataset.trackLabel ?? el.textContent?.trim().slice(0, 60),
            path: window.location.pathname,
          });
          break;
        }
        el = el.parentElement;
      }
    }
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  return <>{children}</>;
}
