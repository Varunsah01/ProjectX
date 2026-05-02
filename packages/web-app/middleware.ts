import NextAuth, { type Session } from "next-auth";
import { NextResponse, type NextRequest } from "next/server";
import authConfig from "@/auth.config";
import { requestContext } from "@/lib/request-context";
import { applySecurityHeaders } from "@/lib/security/headers";
import { rateLimit } from "@/lib/security/rate-limit";
import { canAccessPath } from "@/lib/security/rbac";

const { auth } = NextAuth(authConfig);

type AuthedRequest = NextRequest & { auth: Session | null };

const publicRoutes = new Set(["/login", "/signup", "/forgot-password", "/reset-password", "/verify-email"]);
const csrfExemptPrefixes = [
  "/api/auth/",
  "/api/mobile/v1/",
  "/api/mobile/",
  "/api/webhooks/razorpay",
  "/api/cron/generate-invoices",
  "/api/health",
  "/api/status",
];
const rateLimitExemptPrefixes = [
  "/api/auth/",
  "/api/webhooks/razorpay",
  "/api/cron/generate-invoices",
  "/api/health",
  "/api/status",
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

export default auth(async (request) => {
  const requestId = crypto.randomUUID();

  return requestContext.run({ requestId }, async () => {
    const response = await handle(request as AuthedRequest);
    response.headers.set("x-request-id", requestId);
    return response;
  });
});

async function handle(request: AuthedRequest): Promise<NextResponse> {
  const { nextUrl } = request;
  const pathname = nextUrl.pathname;
  const isApiRoute = pathname.startsWith("/api/");
  const isPublicRoute =
    publicRoutes.has(pathname) ||
    pathname.startsWith("/api/auth/") ||
    pathname.startsWith("/api/mobile/") ||
    pathname === "/api/auth/register" ||
    pathname === "/api/health" ||
    pathname === "/api/status";
  const requestIp =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "anonymous";

  if (
    isApiRoute &&
    !isExemptPath(pathname, rateLimitExemptPrefixes)
  ) {
    const limit = isMutationMethod(request.method) ? 30 : 120;
    const rateLimitResult = await rateLimit(
      `${requestIp}:${pathname}:${request.method.toUpperCase()}`,
      {
        limit,
        windowMs: 60_000,
      },
    );

    if (!rateLimitResult.allowed) {
      const response = buildApiError(
        "Too many requests. Please try again shortly.",
        429,
      );
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000),
      );
      response.headers.set("Retry-After", String(retryAfterSeconds));
      response.headers.set("X-RateLimit-Limit", String(rateLimitResult.limit));
      response.headers.set(
        "X-RateLimit-Remaining",
        String(rateLimitResult.remaining),
      );
      response.headers.set(
        "X-RateLimit-Reset",
        String(Math.ceil(rateLimitResult.resetAt / 1000)),
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
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
