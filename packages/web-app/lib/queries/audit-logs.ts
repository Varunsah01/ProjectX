import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { mapAuditLogEntry } from "@/lib/data-mappers";
import { buildPagination, normalizeListParams } from "@/lib/query-utils";

interface AuditLogFilters {
  entity?: string;
  action?: string;
  actorId?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export async function listAuditLogsForOrganization(
  organizationId: string,
  filters: AuditLogFilters = {},
) {
  const { page, skip, take } = normalizeListParams({
    page: filters.page,
    pageSize: filters.pageSize ?? 50,
  });

  const where: Prisma.AuditLogWhereInput = {
    organizationId,
    ...(filters.entity ? { entity: filters.entity } : {}),
    ...(filters.action ? { action: filters.action } : {}),
    ...(filters.actorId ? { userId: filters.actorId } : {}),
    ...(filters.dateFrom || filters.dateTo
      ? {
          createdAt: {
            ...(filters.dateFrom ? { gte: new Date(filters.dateFrom) } : {}),
            ...(filters.dateTo ? { lte: new Date(`${filters.dateTo}T23:59:59.999Z`) } : {}),
          },
        }
      : {}),
    ...(filters.search
      ? {
          OR: [
            { entity: { contains: filters.search, mode: "insensitive" as const } },
            { entityId: { contains: filters.search, mode: "insensitive" as const } },
            { action: { contains: filters.search, mode: "insensitive" as const } },
            { user: { name: { contains: filters.search, mode: "insensitive" as const } } },
          ],
        }
      : {}),
  };

  const [logs, total] = await Promise.all([
    db.auditLog.findMany({
      where,
      include: {
        user: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take,
    }),
    db.auditLog.count({ where }),
  ]);

  return buildPagination(logs.map(mapAuditLogEntry), total, page, take);
}
