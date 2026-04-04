"use server";

import { revalidatePath } from "next/cache";
import { requireRole, UserRole } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { actionFailure, actionSuccess, getActionError } from "@/lib/query-utils";

export async function updateNotificationSettingsAction(settings: object) {
  try {
    const user = await requireRole([UserRole.ADMIN, UserRole.MANAGER]);
    await db.organization.update({
      where: { id: user.organizationId },
      data: { notificationSettings: settings },
    });
    revalidatePath("/settings");
    return actionSuccess(null);
  } catch (error) {
    return actionFailure(getActionError(error, "Failed to update notification settings"));
  }
}
