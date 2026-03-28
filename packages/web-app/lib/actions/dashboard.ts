"use server";

import { getDashboardDataForOrganization } from "@/lib/queries/dashboard";
import { actionFailure, actionSuccess, getActionError, getOrganizationContext } from "@/lib/query-utils";

export async function getDashboardAction() {
  try {
    const user = await getOrganizationContext();
    const data = await getDashboardDataForOrganization(user.organizationId);
    return actionSuccess(data);
  } catch (error) {
    return actionFailure(getActionError(error, "Failed to load dashboard"));
  }
}
