import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { buildAuditLog } from "@/lib/audit/log";
import {
  verifyImpersonationToken,
  clearImpersonateCookieHeaders,
} from "@/lib/security/impersonation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const cookieHeader = request.headers.get("cookie") ?? "";
    const match = cookieHeader.match(/(?:^|;\s*)__impersonate=([^;]+)/);
    const token = match?.[1];

    if (!token) {
      return NextResponse.json({ error: "No active impersonation session" }, { status: 400 });
    }

    const imp = await verifyImpersonationToken(token);
    if (!imp) {
      // Token invalid or expired — just clear the cookies
      return NextResponse.json(
        { ok: true },
        {
          headers: { "Set-Cookie": clearImpersonateCookieHeaders().join(", ") },
        },
      );
    }

    const requestIp =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const userAgent = request.headers.get("user-agent") ?? undefined;

    // Mark session as ended + audit log
    const session = await db.impersonationSession.findUnique({
      where: { id: imp.sessionId },
      include: {
        supportUser: { select: { memberships: { select: { organizationId: true }, take: 1 } } },
      },
    });

    if (session && !session.endedAt) {
      const orgId = session.supportUser.memberships[0]?.organizationId ?? imp.targetOrgId;
      await db.$transaction([
        db.impersonationSession.update({
          where: { id: imp.sessionId },
          data: { endedAt: new Date() },
        }),
        db.auditLog.create({
          data: buildAuditLog({
            actor: { id: imp.supportUserId, organizationId: orgId },
            action: "IMPERSONATE_END",
            entity: "ImpersonationSession",
            entityId: imp.sessionId,
            actUserId: imp.supportUserId,
            after: { targetUserId: imp.targetUserId, targetOrgId: imp.targetOrgId },
            ip: requestIp,
            userAgent,
          }),
        }),
      ]);
    }

    return NextResponse.json(
      { ok: true },
      {
        headers: { "Set-Cookie": clearImpersonateCookieHeaders().join(", ") },
      },
    );
  } catch (error) {
    console.error("Impersonate end error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
