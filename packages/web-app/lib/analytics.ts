/**
 * Thin PostHog wrapper for the web-app (admin dashboard).
 *
 * All exports are no-ops when NEXT_PUBLIC_POSTHOG_KEY is unset or when
 * called server-side — safe to import unconditionally from React components.
 *
 * Users are identified by SHA-256(userId) — never raw PII.
 */
import posthog from "posthog-js";

const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";

let _ready = false;

export function initAnalytics(): void {
  if (!KEY || typeof window === "undefined" || _ready) return;
  posthog.init(KEY, {
    api_host: HOST,
    capture_pageview: false,
    autocapture: false,
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
  SIGNUP_COMPLETED: "signup_completed",
  FIRST_INVOICE_CREATED: "first_invoice_created",
  PAYMENT_RECEIVED: "payment_received",
} as const;
