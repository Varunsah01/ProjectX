"use server";

import { z } from "zod";
import { requireRole, UserRole } from "@/lib/auth-utils";
import { listAuditLogsForOrganization } from "@/lib/queries/audit-logs";
import { actionFailure, actionSuccess, getActionError } from "@/lib/query-utils";

const listAuditLogsSchema = z.object({
  entity: z.string().optional(),
  action: z.string().optional(),
  actorId: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  search: z.string().optional(),
  page: z.number().int().min(1).optional(),
  pageSize: z.number().int().min(1).max(100).optional(),
});

export async function listAuditLogsAction(
  input: z.infer<typeof listAuditLogsSchema> = {},
) {
  try {
    const user = await requireRole([UserRole.ADMIN]);
    const params = listAuditLogsSchema.parse(input);
    const data = await listAuditLogsForOrganization(user.organizationId, params);
    return actionSuccess(data);
  } catch (error) {
    return actionFailure(getActionError(error, "Failed to load audit logs"));
  }
}
