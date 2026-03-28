import { db } from "@/lib/db";

const redactedKeys = /(password|secret|token|signature)/i;

function serializeAuditValue(value: unknown): unknown {
  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value.map((entry) => serializeAuditValue(entry));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, entryValue]) => [
        key,
        redactedKeys.test(key) ? "[REDACTED]" : serializeAuditValue(entryValue),
      ]),
    );
  }

  return value;
}

function buildDiff(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
) {
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);

  return [...keys].reduce<Record<string, { before: unknown; after: unknown }>>(
    (diff, key) => {
      const previous = serializeAuditValue(before[key]);
      const next = serializeAuditValue(after[key]);

      if (JSON.stringify(previous) === JSON.stringify(next)) {
        return diff;
      }

      diff[key] = {
        before: previous,
        after: next,
      };

      return diff;
    },
    {},
  );
}

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
  const previous = before ? serializeAuditValue(before) : null;
  const next = after ? serializeAuditValue(after) : null;
  const diff =
    previous && next
      ? buildDiff(
          previous as Record<string, unknown>,
          next as Record<string, unknown>,
        )
      : action === "CREATE"
        ? { created: { before: null, after: next } }
        : { deleted: { before: previous, after: null } };

  await db.auditLog.create({
    data: {
      organizationId,
      userId,
      action,
      entity,
      entityId,
      changes: diff,
    },
  });
}
