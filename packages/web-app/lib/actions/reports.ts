"use server";

import { requireRole, UserRole } from "@/lib/auth-utils";
import { getReportsDataForOrganization } from "@/lib/queries/reports";
import { actionFailure, actionSuccess, getActionError } from "@/lib/query-utils";

export async function getReportsAction() {
  try {
    const user = await requireRole([UserRole.ADMIN, UserRole.MANAGER]);
    const data = await getReportsDataForOrganization(user.organizationId);
    return actionSuccess(data);
  } catch (error) {
    return actionFailure(getActionError(error, "Failed to load reports"));
  }
}
