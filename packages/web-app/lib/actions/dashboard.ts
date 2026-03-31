"use server";

import { requireRole, UserRole } from "@/lib/auth-utils";
import { getDashboardDataForOrganization } from "@/lib/queries/dashboard";
import { actionFailure, actionSuccess, getActionError } from "@/lib/query-utils";

export async function getDashboardAction() {
  try {
    const user = await requireRole([UserRole.ADMIN, UserRole.MANAGER, UserRole.AGENT]);
    const data = await getDashboardDataForOrganization(user.organizationId);
    return actionSuccess(data);
  } catch (error) {
    return actionFailure(getActionError(error, "Failed to load dashboard"));
  }
}
