import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-utils";
import { UserRole } from "@prisma/client";
import { processDsrRequest } from "@/lib/compliance/dsr";
import { dsrProcessSchema } from "@/lib/validations/dsr";
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

    // Verify the DSR belongs to this organization
    const existing = await db.dsrRequest.findFirst({
      where: { id, organizationId: user.organizationId },
    });
    if (!existing) {
      return NextResponse.json({ error: "DSR request not found" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = dsrProcessSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const updated = await processDsrRequest(
      id,
      user.id,
      parsed.data.status,
      parsed.data.responseNotes
    );

    await db.auditLog.create({
      data: buildAuditLog({
        actor: user,
        action: "DSR_PROCESS",
        entity: "DsrRequest",
        entityId: id,
        before: { status: existing.status },
        after: { status: updated.status, responseNotes: updated.responseNotes },
      }),
    });

    return NextResponse.json({ request: updated });
  } catch {
    return NextResponse.json({ error: "Failed to process DSR request" }, { status: 500 });
  }
}
