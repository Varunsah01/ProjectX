import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-utils";
import { UserRole } from "@prisma/client";
import { createDsrRequest } from "@/lib/compliance/dsr";
import { dsrCorrectionSchema } from "@/lib/validations/dsr";
import { db } from "@/lib/db";
import { buildAuditLog } from "@/lib/audit/log";

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
    const parsed = dsrCorrectionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const { dataPrincipalId, dataPrincipalType, details } = parsed.data;

    const dsr = await createDsrRequest(
      user.organizationId,
      dataPrincipalId,
      dataPrincipalType,
      "CORRECTION",
      details
    );

    await db.auditLog.create({
      data: buildAuditLog({
        actor: user,
        action: "DSR_REQUEST",
        entity: "DsrRequest",
        entityId: dsr.id,
        after: { type: "CORRECTION", dataPrincipalId, dataPrincipalType },
      }),
    });

    return NextResponse.json({ dsrId: dsr.id, status: dsr.status });
  } catch {
    return NextResponse.json({ error: "Failed to create correction request" }, { status: 500 });
  }
}
