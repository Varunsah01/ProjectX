import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-utils";
import { UserRole } from "@prisma/client";
import { sendBreachNotification } from "@/lib/compliance/breach";
import { db } from "@/lib/db";
import { buildAuditLog } from "@/lib/audit/log";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user?.organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    const existing = await db.breachLog.findFirst({
      where: { id, organizationId: user.organizationId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Breach log not found" }, { status: 404 });
    }

    const result = await sendBreachNotification(id);

    await db.auditLog.create({
      data: buildAuditLog({
        actor: user,
        action: "BREACH_LOG",
        entity: "BreachLog",
        entityId: id,
        after: { action: "notify_principals", sentCount: result.sentCount },
      }),
    });

    return NextResponse.json({
      success: true,
      sentCount: result.sentCount,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to send notifications" },
      { status: 500 }
    );
  }
}
