"use server";

import { z } from "zod";
import { requireRole, UserRole } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import {
  actionFailure,
  actionSuccess,
  buildPagination,
  getActionError,
  normalizeListParams,
} from "@/lib/query-utils";

const listSchema = z.object({
  page: z.number().int().min(1).optional(),
  pageSize: z.number().int().min(1).max(100).optional(),
});

export async function listBackupVerificationsAction(
  input: z.infer<typeof listSchema> = {},
) {
  try {
    await requireRole([UserRole.ADMIN]);
    const params = listSchema.parse(input);
    const { page, pageSize, skip, take } = normalizeListParams(params);

    const [data, total] = await Promise.all([
      db.backupVerification.findMany({
        orderBy: { runAt: "desc" },
        skip,
        take,
      }),
      db.backupVerification.count(),
    ]);

    return actionSuccess(buildPagination(data, total, page, pageSize));
  } catch (error) {
    return actionFailure(
      getActionError(error, "Failed to load backup verifications"),
    );
  }
}
