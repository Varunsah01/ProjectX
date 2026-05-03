import { Prisma, PrismaClient } from "@prisma/client";
import { logger } from "@/lib/log";

const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: ReturnType<typeof createPrismaClient>;
};

// Models that have a deletedAt field — read operations automatically exclude soft-deleted rows
// unless the caller explicitly includes `deletedAt` in the where clause.
const SOFT_DELETE_MODELS = new Set([
  "Customer", "Asset", "Contract", "Invoice", "Ticket", "Job",
]);
// findUnique/findUniqueOrThrow are excluded: Prisma rejects non-unique fields in their where clause.
const SOFT_DELETE_FILTERED_OPS = new Set([
  "findMany", "findFirst", "findFirstOrThrow", "count", "aggregate", "groupBy",
]);

function softDeleteExtension() {
  return Prisma.defineExtension({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (
            SOFT_DELETE_MODELS.has(model) &&
            SOFT_DELETE_FILTERED_OPS.has(operation)
          ) {
            const a = args as { where?: Record<string, unknown> };
            if (!a.where || !("deletedAt" in a.where)) {
              a.where = { ...(a.where ?? {}), deletedAt: null };
            }
          }
          return query(args);
        },
      },
    },
  });
}

function createPrismaClient() {
  return new PrismaClient()
    .$extends({
      query: {
        $allModels: {
          async $allOperations({ operation, model, args, query }) {
            const start = Date.now();
            const result = await query(args);
            const ms = Date.now() - start;
            if (ms > 500) {
              logger.warn(
                { event: "slow_query", model, action: operation, durationMs: ms },
                `Slow query: ${model}.${operation} took ${ms}ms`,
              );
            }
            return result;
          },
        },
      },
    })
    .$extends(softDeleteExtension());
}

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}

export default db;
