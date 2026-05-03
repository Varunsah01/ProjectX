import NextAuth, { type Session } from "next-auth";
import { NextResponse, type NextRequest } from "next/server";
import authConfig from "@/auth.config";
import { requestContext } from "@/lib/request-context";
import { applySecurityHeaders } from "@/lib/security/headers";
import { rateLimit, rateLimitOrg, rateLimitUser, type RateLimitResult } from "@/lib/security/rate-limit";
import { canAccessPath } from "@/lib/security/rbac";

const { auth } = NextAuth(authConfig);

type AuthedRequest = NextRequest & { auth: Session | null };

const publicRoutes = new Set(["/login", "/signup", "/forgot-password", "/reset-password", "/verify-email", "/accept-invitation"]);
const csrfExemptPrefixes = [
  "/api/auth/",
  "/api/mobile/v1/",
  "/api/mobile/",
  "/api/webhooks/razorpay",
  "/api/cron/generate-invoices",
  "/api/cron/contract-renewals",
  "/api/cron/invoice-reminders",
  "/api/health",
  "/api/status",
  "/api/admin/impersonate",
];
const rateLimitExemptPrefixes = [
  "/api/auth/",
  "/api/webhooks/razorpay",
  "/api/cron/generate-invoices",
  "/api/cron/contract-renewals",
  "/api/cron/invoice-reminders",
  "/api/health",
  "/api/status",
  "/api/mobile/v1/openapi.json",
];

const WINDOW_MS = 60_000;
const MOBILE_ORG_MULTIPLIER = 10;

const IP_LIMITS   = { mutation: 30,  query: 120   } as const;
const ORG_LIMITS  = { mutation: 600, query: 3_000  } as const;
const USER_LIMITS = { mutation: 120, query: 600    } as const;

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

type RateLimitScope = "ip" | "org" | "user";

function build429(scope: RateLimitScope, result: RateLimitResult): NextResponse {
  const response = buildApiError("Too many requests. Please try again shortly.", 429);
  const retryAfterSeconds = Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1000));
  response.headers.set("Retry-After",                        String(retryAfterSeconds));
  response.headers.set("X-RateLimit-Limit",                  String(result.limit));
  response.headers.set("X-RateLimit-Remaining",              String(result.remaining));
  response.headers.set("X-RateLimit-Reset",                  String(Math.ceil(result.resetAt / 1000)));
  response.headers.set("X-RateLimit-Scope",                  scope);
  response.headers.set(`X-RateLimit-Remaining-${scope}`,     String(result.remaining));
  return response;
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

  if (isApiRoute && !isExemptPath(pathname, rateLimitExemptPrefixes)) {
    const isMobile   = pathname.startsWith("/api/mobile/");
    const isMutation = isMutationMethod(request.method);
    const method     = request.method.toUpperCase();
    const scopeKey   = isMutation ? "mutation" : "query";

    // IP ────────────────────────────────────────────────────────────────────
    const ipResult = await rateLimit(
      `${requestIp}:${pathname}:${method}`,
      { limit: IP_LIMITS[scopeKey], windowMs: WINDOW_MS },
    );
    if (!ipResult.allowed) return build429("ip", ipResult);

    // Org ───────────────────────────────────────────────────────────────────
    const orgId = request.auth?.user?.activeOrgId;
    if (orgId) {
      const orgBase   = ORG_LIMITS[scopeKey];
      const orgResult = await rateLimitOrg(orgId, method, {
        limit: isMobile ? orgBase * MOBILE_ORG_MULTIPLIER : orgBase,
        windowMs: WINDOW_MS,
      });
      if (!orgResult.allowed) return build429("org", orgResult);
    }

    // User ──────────────────────────────────────────────────────────────────
    const userId = request.auth?.user?.id;
    if (userId) {
      const userResult = await rateLimitUser(userId, method, {
        limit: USER_LIMITS[scopeKey],
        windowMs: WINDOW_MS,
      });
      if (!userResult.allowed) return build429("user", userResult);
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

  // SUPPORT role: redirect to /admin/lookup when not impersonating and not already on /admin/*
  if (
    request.auth?.user?.activeRole === "SUPPORT" &&
    !isApiRoute &&
    !pathname.startsWith("/admin") &&
    !request.cookies.get("__impersonate")
  ) {
    return applySecurityHeaders(
      NextResponse.redirect(new URL("/admin/lookup", nextUrl)),
    );
  }

  if (
    request.auth?.user?.activeRole &&
    !isApiRoute &&
    !canAccessPath(request.auth.user.activeRole, pathname)
  ) {
    const fallbackUrl =
      request.auth.user.activeRole === "TECHNICIAN" ? "/jobs" : "/";
    return applySecurityHeaders(
      NextResponse.redirect(new URL(fallbackUrl, nextUrl)),
    );
  }

  const requestHeaders = new Headers(request.headers);

  if (request.auth?.user.activeOrgId) {
    requestHeaders.set(
      "x-organization-id",
      request.auth.user.activeOrgId,
    );
  }

  if (request.auth?.user?.activeRole) {
    requestHeaders.set("x-user-role", request.auth.user.activeRole);
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
