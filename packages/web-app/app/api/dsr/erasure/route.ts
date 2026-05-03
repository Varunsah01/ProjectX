import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-utils";
import { UserRole } from "@prisma/client";
import {
  createDsrRequest,
  checkErasureEligibility,
  executeSoftErasure,
} from "@/lib/compliance/dsr";
import { dsrErasureSchema } from "@/lib/validations/dsr";
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
    const parsed = dsrErasureSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const { dataPrincipalId, dataPrincipalType, reason } = parsed.data;

    // Check eligibility — financial records within 8-year retention block erasure
    const eligibility = await checkErasureEligibility(
      user.organizationId,
      dataPrincipalId,
      dataPrincipalType
    );

    const dsr = await createDsrRequest(
      user.organizationId,
      dataPrincipalId,
      dataPrincipalType,
      "ERASURE",
      { reason, eligibility }
    );

    if (!eligibility.eligible) {
      // Refuse erasure with documented reason — 200 (not error), per DPDPA requirements
      await db.dsrRequest.update({
        where: { id: dsr.id },
        data: {
          status: "REJECTED",
          processedById: user.id,
          processedAt: new Date(),
          responseNotes:
            `Erasure refused: ${eligibility.blockedRecords.length} financial record(s) are within ` +
            `the 8-year retention period required by the IT Act. ` +
            `Earliest eligible erasure date: ${eligibility.blockedRecords
              .map((r) => r.retentionUntil.toISOString().split("T")[0])
              .sort()
              .pop()}.`,
        },
      });

      await db.auditLog.create({
        data: buildAuditLog({
          actor: user,
          action: "DSR_REQUEST",
          entity: "DsrRequest",
          entityId: dsr.id,
          after: { type: "ERASURE", refused: true, blockedCount: eligibility.blockedRecords.length },
        }),
      });

      return NextResponse.json({
        dsrId: dsr.id,
        status: "REJECTED",
        reason:
          "Erasure cannot be completed at this time. Financial records within the 8-year " +
          "retention period required by the Information Technology Act must be preserved.",
        blockedRecords: eligibility.blockedRecords,
      });
    }

    // Eligible — proceed with soft-delete
    await executeSoftErasure(user.organizationId, dataPrincipalId, dataPrincipalType);

    await db.dsrRequest.update({
      where: { id: dsr.id },
      data: {
        status: "COMPLETED",
        processedById: user.id,
        processedAt: new Date(),
        responseNotes: "Erasure completed. Data has been soft-deleted and will be permanently removed after the retention period.",
      },
    });

    await db.auditLog.create({
      data: buildAuditLog({
        actor: user,
        action: "DSR_REQUEST",
        entity: "DsrRequest",
        entityId: dsr.id,
        after: { type: "ERASURE", completed: true, dataPrincipalId, dataPrincipalType },
      }),
    });

    return NextResponse.json({
      dsrId: dsr.id,
      status: "COMPLETED",
      message: "Data has been soft-deleted and will be permanently removed after the retention period.",
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erasure request failed" },
      { status: 500 }
    );
  }
}
