import { logAudit } from "@/lib/audit/log";

// Re-export for backward compatibility
export { serializeAuditValue, buildDiff } from "@/lib/audit/log";

/**
 * @deprecated Use `logAudit` from `@/lib/audit/log` directly.
 */
export async function logAuditEvent({
  organizationId,
  userId,
  action,
  entity,
  entityId,
  before,
  after,
}: {
  organizationId: string;
  userId: string;
  action: "CREATE" | "UPDATE" | "DELETE";
  entity: string;
  entityId: string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
}) {
  await logAudit({
    actor: { id: userId, organizationId },
    action,
    entity,
    entityId,
    before,
    after,
  });
}
