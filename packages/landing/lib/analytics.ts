/**
 * Thin PostHog wrapper for the landing site.
 *
 * All exports are no-ops when NEXT_PUBLIC_POSTHOG_KEY is unset or when
 * called server-side — safe to import unconditionally from React components.
 */
import posthog from "posthog-js";

const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";

let _ready = false;

export function initAnalytics(): void {
  if (!KEY || typeof window === "undefined" || _ready) return;
  posthog.init(KEY, {
    api_host: HOST,
    capture_pageview: false, // manual pageviews only
    autocapture: false, // explicit events only — keeps Lighthouse clean
    persistence: "localStorage+cookie",
  });
  _ready = true;
}

export function isReady(): boolean {
  return _ready;
}

export function track(event: string, props?: Record<string, unknown>): void {
  if (!_ready) return;
  posthog.capture(event, props);
}

export function identifyUser(
  hashedId: string,
  traits?: Record<string, unknown>,
): void {
  if (!_ready) return;
  posthog.identify(hashedId, traits);
}

export function resetUser(): void {
  if (!_ready) return;
  posthog.reset();
}

export const Events = {
  PAGE_VIEW: "pageview",
  DEMO_REQUEST_SUBMITTED: "demo_request_submitted",
  PRICING_VIEWED: "pricing_viewed",
  CTA_CLICKED: "cta_clicked",
} as const;
