"use server";

import { revalidatePath } from "next/cache";
import { requireRole, UserRole } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { buildAuditLog } from "@/lib/audit/log";
import { actionFailure, actionSuccess, getActionError } from "@/lib/query-utils";

export async function updateNotificationSettingsAction(settings: object) {
  try {
    const user = await requireRole([UserRole.ADMIN, UserRole.MANAGER]);

    const existing = await db.organization.findUniqueOrThrow({
      where: { id: user.organizationId },
      select: { notificationSettings: true },
    });

    await db.$transaction([
      db.organization.update({
        where: { id: user.organizationId },
        data: { notificationSettings: settings },
      }),
      db.auditLog.create({
        data: buildAuditLog({
          actor: user,
          action: "UPDATE",
          entity: "NotificationSettings",
          entityId: user.organizationId,
          before: { settings: existing.notificationSettings as Record<string, unknown> },
          after: { settings: settings as Record<string, unknown> },
        }),
      }),
    ]);

    revalidatePath("/settings");
    return actionSuccess(null);
  } catch (error) {
    return actionFailure(getActionError(error, "Failed to update notification settings"));
  }
}
