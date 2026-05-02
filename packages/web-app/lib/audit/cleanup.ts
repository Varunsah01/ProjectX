import { db } from "@/lib/db";

/**
 * Deletes audit log rows older than `retentionDays`.
 * Intended to be called from a scheduled cron job.
 */
export async function deleteOldAuditLogs(retentionDays = 365) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - retentionDays);

  const result = await db.auditLog.deleteMany({
    where: { createdAt: { lt: cutoff } },
  });

  return { deleted: result.count, cutoff };
}
