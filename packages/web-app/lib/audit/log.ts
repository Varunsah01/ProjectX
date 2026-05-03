import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

export type AuditAction =
  | "CREATE"
  | "UPDATE"
  | "DELETE"
  | "RESTORE"
  | "STATUS_CHANGE"
  | "LOGIN"
  | "LOGOUT"
  | "EXPORT"
  | "REFUND"
  | "REMINDER_SENT"
  | "CONSENT_GRANT"
  | "CONSENT_WITHDRAW"
  | "DSR_REQUEST"
  | "DSR_PROCESS"
  | "BREACH_LOG"
  | "IMPERSONATE_START"
  | "IMPERSONATE_END"
  | "IMPERSONATION_BLOCKED";

export interface AuditActor {
  id: string;
  organizationId: string;
}

export interface AuditParams {
  actor: AuditActor;
  action: AuditAction;
  entity: string;
  entityId: string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  ip?: string;
  userAgent?: string;
  actUserId?: string; // Set when action is taken during impersonation
}

const redactedKeys = /(password|secret|token|signature)/i;

export function serializeAuditValue(value: unknown): unknown {
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

export function buildDiff(
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

function computeChanges(
  action: AuditAction,
  before?: Record<string, unknown> | null,
  after?: Record<string, unknown> | null,
): Prisma.InputJsonValue {
  const previous = before ? (serializeAuditValue(before) as Record<string, unknown>) : null;
  const next = after ? (serializeAuditValue(after) as Record<string, unknown>) : null;

  if (previous && next) {
    return buildDiff(previous, next) as Prisma.InputJsonValue;
  }

  if (action === "DELETE") {
    return { deleted: { before: previous, after: null } } as Prisma.InputJsonValue;
  }

  return { created: { before: null, after: next } } as Prisma.InputJsonValue;
}

/**
 * Returns the `data` payload for `db.auditLog.create()`.
 * Use inside `db.$transaction()` for atomic audit logging.
 */
export function buildAuditLog(params: AuditParams): Prisma.AuditLogUncheckedCreateInput {
  return {
    organizationId: params.actor.organizationId,
    userId: params.actor.id,
    actUserId: params.actUserId ?? null,
    action: params.action,
    entity: params.entity,
    entityId: params.entityId,
    changes: computeChanges(params.action, params.before, params.after),
    ip: params.ip ?? null,
    userAgent: params.userAgent ?? null,
  };
}

/**
 * Standalone audit log insert. Use when not inside a transaction.
 */
export async function logAudit(params: AuditParams) {
  await db.auditLog.create({ data: buildAuditLog(params) });
}
