import type { NextResponse } from "next/server";

export function cspHeader(): string {
  const scriptSrcSources = ["'self'", "'unsafe-inline'", "https://checkout.razorpay.com"];
  if (process.env.NODE_ENV !== "production") {
    // React Refresh and Next.js dev chunk eval require 'unsafe-eval'.
    scriptSrcSources.push("'unsafe-eval'");
  }

  return [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    `script-src ${scriptSrcSources.join(" ")}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "connect-src 'self' https://api.razorpay.com https://checkout.razorpay.com https://*.ingest.sentry.io https://*.upstash.io https://*.posthog.com https://us.i.posthog.com https://eu.i.posthog.com",
    "frame-src https://api.razorpay.com https://checkout.razorpay.com",
  ].join("; ");
}

export function applySecurityHeaders(response: NextResponse) {
  response.headers.set("Content-Security-Policy", cspHeader());
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), geolocation=(), microphone=()",
  );
  return response;
}
