import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-utils";
import { UserRole } from "@prisma/client";
import { updateBreach } from "@/lib/compliance/breach";
import { updateBreachSchema } from "@/lib/validations/breach";
import { db } from "@/lib/db";
import { buildAuditLog } from "@/lib/audit/log";

export async function PATCH(
  request: NextRequest,
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

    const body = await request.json();
    const parsed = updateBreachSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const updated = await updateBreach(id, parsed.data);

    await db.auditLog.create({
      data: buildAuditLog({
        actor: user,
        action: "BREACH_LOG",
        entity: "BreachLog",
        entityId: id,
        before: { status: existing.status },
        after: { status: updated.status },
      }),
    });

    return NextResponse.json({ breach: updated });
  } catch {
    return NextResponse.json({ error: "Failed to update breach log" }, { status: 500 });
  }
}
