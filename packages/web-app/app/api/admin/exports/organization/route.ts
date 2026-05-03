import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-utils";
import { UserRole } from "@prisma/client";
import { exportOrganizationData } from "@/lib/exports/organization";
import { db } from "@/lib/db";
import { buildAuditLog } from "@/lib/audit/log";
import { logger } from "@/lib/log";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST() {
  try {
    const user = await getCurrentUser();

    if (!user?.organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    logger.info(
      { event: "export.start", organizationId: user.organizationId, userId: user.id },
      "org export starting",
    );

    const url = await exportOrganizationData(user.organizationId);

    await db.auditLog.create({
      data: buildAuditLog({
        actor: user,
        action: "EXPORT",
        entity: "Organization",
        entityId: user.organizationId,
        after: { format: "zip/jsonl", expiresIn: "7 days" },
      }),
    });

    logger.info(
      { event: "export.done", organizationId: user.organizationId, userId: user.id },
      "org export complete",
    );

    return NextResponse.json({ url, expiresIn: "7 days" });
  } catch (error) {
    logger.error({ event: "export.error", err: error }, "org export failed");
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Export failed" },
      { status: 500 },
    );
  }
}
