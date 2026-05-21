import NextAuth, { type Session } from "next-auth";
import { NextResponse, type NextRequest } from "next/server";
import authConfig from "@/auth.config";
import { requestContext } from "@/lib/request-context";
import { generateCsrfToken, verifyCsrfToken } from "@/lib/csrf";
import { applySecurityHeaders } from "@/lib/security/headers";
import { rateLimit, rateLimitOrg, rateLimitUser, type RateLimitResult } from "@/lib/security/rate-limit";
import { canAccessPath } from "@/lib/security/rbac";

const { auth } = NextAuth(authConfig);

type AuthedRequest = NextRequest & { auth: Session | null };

const publicRoutes = new Set(["/login", "/signup", "/signout", "/forgot-password", "/reset-password", "/verify-email", "/accept-invitation"]);
// Routes exempt from all CSRF checks (origin + token)
const csrfExemptPrefixes = [
  "/api/auth/",
  "/api/webhooks/",
  "/api/cron/",
  "/api/health",
  "/api/status",
  "/api/admin/impersonate",
  "/api/leads",
];

// Mobile auth routes exempt from mobile CSRF token check
const mobileCsrfExemptPrefixes = [
  "/api/mobile/v1/auth/login",
  "/api/mobile/v1/auth/logout",
  "/api/mobile/v1/auth/otp/",
  "/api/mobile/auth/login",
  "/api/mobile/auth/logout",
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

  // ── CSRF ────────────────────────────────────────────────────────────────
  if (isMutationMethod(request.method)) {
    const isMobileRoute = pathname.startsWith("/api/mobile/");

    if (isMobileRoute) {
      // Mobile routes: validate X-CSRF-Token against HMAC of Bearer token
      if (!isExemptPath(pathname, mobileCsrfExemptPrefixes)) {
        const bearerToken = request.headers
          .get("authorization")
          ?.replace(/^Bearer\s+/i, "")
          .trim();
        const csrfHeader = request.headers.get("x-csrf-token");

        if (
          !bearerToken ||
          !csrfHeader ||
          !(await verifyCsrfToken(csrfHeader, bearerToken))
        ) {
          return buildApiError("invalid_csrf_token", 403);
        }
      }
    } else if (!isExemptPath(pathname, csrfExemptPrefixes)) {
      // Web routes: Origin/Referer check
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

      // For authenticated API routes: also require X-CSRF-Token
      if (isApiRoute && request.auth?.user?.csrfSeed) {
        const csrfHeader = request.headers.get("x-csrf-token");
        if (
          !csrfHeader ||
          !(await verifyCsrfToken(csrfHeader, request.auth.user.csrfSeed))
        ) {
          return buildApiError("invalid_csrf_token", 403);
        }
      }
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

  if (request.auth?.user && publicRoutes.has(pathname) && pathname !== "/signout") {
    return applySecurityHeaders(NextResponse.redirect(new URL("/", nextUrl)));
  }

  // Authenticated user with no org yet (e.g. just signed up with Google).
  // Send them to onboarding before they can reach the dashboard.
  if (
    request.auth?.user &&
    !request.auth.user.activeOrgId &&
    !pathname.startsWith("/onboarding") &&
    !isApiRoute
  ) {
    return applySecurityHeaders(
      NextResponse.redirect(new URL("/onboarding/create-org", nextUrl)),
    );
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

  // Set non-HttpOnly CSRF cookie so browser JS can read it for API calls
  if (request.auth?.user?.csrfSeed && !isApiRoute) {
    const csrfToken = await generateCsrfToken(request.auth.user.csrfSeed);
    response.cookies.set("csrf-token", csrfToken, {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });
  }

  return applySecurityHeaders(response);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
