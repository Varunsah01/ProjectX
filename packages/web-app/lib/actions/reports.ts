"use server";

import { getReportsDataForOrganization } from "@/lib/queries/reports";
import { actionFailure, actionSuccess, getActionError, getOrganizationContext } from "@/lib/query-utils";

export async function getReportsAction() {
  try {
    const user = await getOrganizationContext();
    const data = await getReportsDataForOrganization(user.organizationId);
    return actionSuccess(data);
  } catch (error) {
    return actionFailure(getActionError(error, "Failed to load reports"));
  }
}
