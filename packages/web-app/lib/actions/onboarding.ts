"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireRole, UserRole } from "@/lib/auth-utils";
import { actionFailure, actionSuccess, getActionError } from "@/lib/query-utils";

export async function dismissOnboardingAction() {
  try {
    const user = await requireRole([
      UserRole.ADMIN,
      UserRole.MANAGER,
      UserRole.AGENT,
      UserRole.TECHNICIAN,
      UserRole.SUPPORT,
    ]);
    await db.user.update({
      where: { id: user.id },
      data: { onboardingDismissedAt: new Date() },
    });
    revalidatePath("/");
    return actionSuccess(null);
  } catch (error) {
    return actionFailure(getActionError(error, "Failed to dismiss onboarding"));
  }
}
