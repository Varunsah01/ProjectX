import { describe, it, expect } from "vitest";
import { NextResponse } from "next/server";
import { cspHeader, applySecurityHeaders } from "@/lib/security/headers";

describe("cspHeader", () => {
  it("includes default-src self", () => {
    expect(cspHeader).toContain("default-src 'self'");
  });

  it("does not include unsafe-eval", () => {
    expect(cspHeader).not.toContain("unsafe-eval");
  });

  it("allows Razorpay checkout script", () => {
    expect(cspHeader).toContain("https://checkout.razorpay.com");
  });

  it("includes Sentry in connect-src", () => {
    expect(cspHeader).toContain("https://*.ingest.sentry.io");
  });

  it("includes Upstash in connect-src", () => {
    expect(cspHeader).toContain("https://*.upstash.io");
  });

  it("blocks self-framing (frame-ancestors none)", () => {
    expect(cspHeader).toContain("frame-ancestors 'none'");
  });

  it("frame-src does not include self", () => {
    const frameSrc = cspHeader
      .split(";")
      .map((d) => d.trim())
      .find((d) => d.startsWith("frame-src"));
    expect(frameSrc).toBeDefined();
    expect(frameSrc).not.toContain("'self'");
  });

  it("font-src does not include https: wildcard", () => {
    const fontSrc = cspHeader
      .split(";")
      .map((d) => d.trim())
      .find((d) => d.startsWith("font-src"));
    expect(fontSrc).toBe("font-src 'self' data:");
  });
});

describe("applySecurityHeaders", () => {
  it("sets all required security headers", () => {
    const response = NextResponse.json({ ok: true });
    applySecurityHeaders(response);

    expect(response.headers.get("Content-Security-Policy")).toBe(cspHeader);
    expect(response.headers.get("Referrer-Policy")).toBe(
      "strict-origin-when-cross-origin",
    );
    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(response.headers.get("X-Frame-Options")).toBe("DENY");
    expect(response.headers.get("Permissions-Policy")).toBe(
      "camera=(), geolocation=(), microphone=()",
    );
  });

  it("returns the same response object", () => {
    const response = NextResponse.json({ ok: true });
    const result = applySecurityHeaders(response);
    expect(result).toBe(response);
  });
});
