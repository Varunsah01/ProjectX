"use server";

import { requireRole, UserRole } from "@/lib/auth-utils";
import { getReportsDataForOrganization } from "@/lib/queries/reports";
import { actionFailure, actionSuccess, getActionError } from "@/lib/query-utils";

export async function getReportsAction() {
  try {
    const user = await requireRole([UserRole.ADMIN, UserRole.MANAGER]);
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    const to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    const data = await getReportsDataForOrganization(user.organizationId, from, to);
    return actionSuccess(data);
  } catch (error) {
    return actionFailure(getActionError(error, "Failed to load reports"));
  }
}
