import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-utils";
import { UserRole } from "@prisma/client";
import { createDsrRequest, exportPrincipalData } from "@/lib/compliance/dsr";
import { dsrAccessSchema } from "@/lib/validations/dsr";
import { db } from "@/lib/db";
import { buildAuditLog } from "@/lib/audit/log";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user?.organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = dsrAccessSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const { dataPrincipalId, dataPrincipalType } = parsed.data;

    // Create DSR record
    const dsr = await createDsrRequest(
      user.organizationId,
      dataPrincipalId,
      dataPrincipalType,
      "ACCESS"
    );

    // Generate export
    const url = await exportPrincipalData(user.organizationId, dataPrincipalId, dataPrincipalType);

    // Mark as completed
    await db.dsrRequest.update({
      where: { id: dsr.id },
      data: { status: "COMPLETED", processedById: user.id, processedAt: new Date() },
    });

    await db.auditLog.create({
      data: buildAuditLog({
        actor: user,
        action: "DSR_REQUEST",
        entity: "DsrRequest",
        entityId: dsr.id,
        after: { type: "ACCESS", dataPrincipalId, dataPrincipalType },
      }),
    });

    return NextResponse.json({ url, expiresIn: "7 days", dsrId: dsr.id });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "DSR access export failed" },
      { status: 500 }
    );
  }
}
