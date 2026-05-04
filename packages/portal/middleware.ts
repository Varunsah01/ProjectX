import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import authConfig from "./auth.config";
import NextAuth from "next-auth";

const { auth } = NextAuth(authConfig);

const PUBLIC_PATHS = ["/login", "/auth", "/api/auth", "/org-not-found"];

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

function extractOrgSlug(host: string): string | null {
  // Dev mode: use env var
  if (host.includes("localhost") || host.includes("127.0.0.1")) {
    return process.env.PORTAL_DEV_ORG_SLUG || null;
  }

  // Production: extract from subdomain
  // e.g. "acme.portal.recuring.in" → "acme"
  const parts = host.split(".");
  // Must have at least 4 parts: slug.portal.recuring.in
  if (parts.length >= 4) {
    return parts[0];
  }

  // Bare portal.recuring.in → no specific org slug
  return null;
}

export default auth(async (request) => {
  const { pathname } = request.nextUrl;

  // Phase 1: Subdomain resolution
  const host = request.headers.get("host") ?? "";
  const slug = extractOrgSlug(host);

  const requestHeaders = new Headers(request.headers);
  if (slug) {
    requestHeaders.set("x-portal-org-slug", slug);
  }

  // Phase 2: Auth gate
  if (!isPublicPath(pathname)) {
    if (!request.auth) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next({
    request: { headers: requestHeaders },
  });
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
