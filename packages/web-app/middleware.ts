import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import authConfig from "@/auth.config";
import { applySecurityHeaders } from "@/lib/security/headers";
import { consumeRateLimit } from "@/lib/security/rate-limit";
import { canAccessPath } from "@/lib/security/rbac";

const { auth } = NextAuth(authConfig);

const publicRoutes = new Set(["/login", "/signup"]);
const csrfExemptPrefixes = [
  "/api/auth/",
  "/api/mobile/",
  "/api/webhooks/razorpay",
  "/api/cron/generate-invoices",
];
const rateLimitExemptPrefixes = [
  "/api/auth/",
  "/api/webhooks/razorpay",
  "/api/cron/generate-invoices",
];

function isMutationMethod(method: string) {
  return ["POST", "PUT", "PATCH", "DELETE"].includes(method.toUpperCase());
}

function isExemptPath(pathname: string, prefixes: string[]) {
  return prefixes.some((prefix) => pathname.startsWith(prefix));
}

function buildApiError(message: string, status: number) {
  return applySecurityHeaders(
    NextResponse.json(
      {
        error: message,
      },
      { status },
    ),
  );
}

export default auth((request) => {
  const { nextUrl } = request;
  const pathname = nextUrl.pathname;
  const isApiRoute = pathname.startsWith("/api/");
  const isPublicRoute =
    publicRoutes.has(pathname) ||
    pathname.startsWith("/api/auth/") ||
    pathname.startsWith("/api/mobile/") ||
    pathname === "/api/auth/register";
  const requestIp =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "anonymous";

  if (
    isApiRoute &&
    !isExemptPath(pathname, rateLimitExemptPrefixes)
  ) {
    const rateLimit = consumeRateLimit({
      key: `${requestIp}:${pathname}:${request.method.toUpperCase()}`,
      limit: isMutationMethod(request.method) ? 30 : 120,
      windowMs: 60_000,
    });

    if (!rateLimit.allowed) {
      const response = buildApiError(
        "Too many requests. Please try again shortly.",
        429,
      );
      response.headers.set("X-RateLimit-Limit", String(rateLimit.limit));
      response.headers.set("X-RateLimit-Remaining", String(rateLimit.remaining));
      response.headers.set(
        "X-RateLimit-Reset",
        String(Math.ceil(rateLimit.resetAt / 1000)),
      );
      return response;
    }
  }

  if (
    isMutationMethod(request.method) &&
    !isExemptPath(pathname, csrfExemptPrefixes)
  ) {
    const origin = request.headers.get("origin");
    const referer = request.headers.get("referer");
    const isSameOrigin =
      origin === nextUrl.origin ||
      Boolean(referer && referer.startsWith(nextUrl.origin));

    if (!isSameOrigin) {
      return isApiRoute
        ? buildApiError("Invalid request origin", 403)
        : applySecurityHeaders(
            NextResponse.redirect(new URL("/login", nextUrl)),
          );
    }
  }

  if (!request.auth?.user && !isPublicRoute) {
    if (isApiRoute) {
      return buildApiError("Unauthorized", 401);
    }

    const loginUrl = new URL("/login", nextUrl);
    loginUrl.searchParams.set("callbackUrl", `${pathname}${nextUrl.search}`);
    return applySecurityHeaders(NextResponse.redirect(loginUrl));
  }

  if (request.auth?.user && publicRoutes.has(pathname)) {
    return applySecurityHeaders(NextResponse.redirect(new URL("/", nextUrl)));
  }

  if (
    request.auth?.user?.role &&
    !isApiRoute &&
    !canAccessPath(request.auth.user.role, pathname)
  ) {
    const fallbackUrl =
      request.auth.user.role === "TECHNICIAN" ? "/jobs" : "/";
    return applySecurityHeaders(
      NextResponse.redirect(new URL(fallbackUrl, nextUrl)),
    );
  }

  const requestHeaders = new Headers(request.headers);

  if (request.auth?.user.organizationId) {
    requestHeaders.set(
      "x-organization-id",
      request.auth.user.organizationId,
    );
  }

  if (request.auth?.user?.role) {
    requestHeaders.set("x-user-role", request.auth.user.role);
  }

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
  return applySecurityHeaders(response);
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
