import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSupport } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { buildAuditLog } from "@/lib/audit/log";
import { rateLimitUser } from "@/lib/security/rate-limit";
import {
  signImpersonationToken,
  makeImpersonateCookieHeader,
  makeInfoCookieHeader,
} from "@/lib/security/impersonation";
import { notifyImpersonationStart } from "@/lib/support/slack";

export const runtime = "nodejs";

const schema = z.object({
  targetUserId: z.string().uuid("Invalid target user ID"),
  reason: z.string().trim().min(20, "Reason must be at least 20 characters"),
});

export async function POST(request: Request) {
  try {
    const supportUser = await requireSupport();

    // Rate limit: max 3 impersonations per support user per hour
    const limitResult = await rateLimitUser(supportUser.id, "POST:impersonate", {
      limit: 3,
      windowMs: 60 * 60 * 1000,
    });
    if (!limitResult.allowed) {
      const retryAfter = Math.max(1, Math.ceil((limitResult.resetAt - Date.now()) / 1000));
      return NextResponse.json(
        { error: "Cool-down active. Maximum 3 impersonations per hour." },
        {
          status: 429,
          headers: { "Retry-After": String(retryAfter) },
        },
      );
    }

    const body = schema.parse(await request.json());

    // Fetch target user and their first membership
    const targetUser = await db.user.findUnique({
      where: { id: body.targetUserId },
      select: {
        id: true,
        name: true,
        email: true,
        status: true,
        memberships: {
          select: {
            organizationId: true,
            role: true,
            organization: { select: { id: true, name: true } },
          },
          take: 1,
        },
      },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "Target user not found" }, { status: 404 });
    }

    if (targetUser.status !== "ACTIVE") {
      return NextResponse.json({ error: "Target user is not active" }, { status: 400 });
    }

    if (targetUser.memberships.length === 0) {
      return NextResponse.json({ error: "Target user has no organization membership" }, { status: 400 });
    }

    const targetMembership = targetUser.memberships[0];

    if (targetMembership.role === "SUPPORT") {
      return NextResponse.json({ error: "Cannot impersonate a SUPPORT user" }, { status: 400 });
    }

    // Check for already-open session
    const openSession = await db.impersonationSession.findFirst({
      where: { supportUserId: supportUser.id, endedAt: null },
    });
    if (openSession) {
      return NextResponse.json(
        { error: "You have an active impersonation session. End it before starting a new one." },
        { status: 409 },
      );
    }

    const requestIp =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const userAgent = request.headers.get("user-agent") ?? undefined;

    // Create ImpersonationSession + audit log atomically
    const [session] = await db.$transaction([
      db.impersonationSession.create({
        data: {
          supportUserId: supportUser.id,
          targetUserId: targetUser.id,
          targetOrgId: targetMembership.organizationId,
          reason: body.reason,
          ip: requestIp,
          userAgent,
        },
      }),
      db.auditLog.create({
        data: buildAuditLog({
          actor: { id: supportUser.id, organizationId: supportUser.organizationId },
          action: "IMPERSONATE_START",
          entity: "ImpersonationSession",
          entityId: targetUser.id,
          actUserId: supportUser.id,
          after: {
            targetUserId: targetUser.id,
            targetUserEmail: targetUser.email,
            targetOrgId: targetMembership.organizationId,
            targetOrgName: targetMembership.organization.name,
            reason: body.reason,
          },
          ip: requestIp,
          userAgent,
        }),
      }),
    ]);

    // Sign impersonation JWT
    const token = await signImpersonationToken({
      sessionId: session.id,
      supportUserId: supportUser.id,
      targetUserId: targetUser.id,
      targetOrgId: targetMembership.organizationId,
    });

    // Fire Slack alert (fire-and-forget)
    notifyImpersonationStart({
      supportUserName: supportUser.name,
      supportUserEmail: supportUser.email,
      targetUserName: targetUser.name,
      targetUserEmail: targetUser.email,
      targetOrgName: targetMembership.organization.name,
      reason: body.reason,
      ip: requestIp,
      sessionId: session.id,
    });

    return NextResponse.json(
      { ok: true, sessionId: session.id },
      {
        status: 200,
        headers: {
          "Set-Cookie": [
            makeImpersonateCookieHeader(token),
            makeInfoCookieHeader({ name: targetUser.name, email: targetUser.email }),
          ].join(", "),
        },
      },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid request" },
        { status: 400 },
      );
    }
    if (error instanceof Error) {
      if (error.message === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      if (error.message === "Forbidden") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    console.error("Impersonate error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
