import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import {
  jobDetailsInclude,
  mapJob,
  mapTechnician,
  mapTicket,
  technicianSelect,
  ticketDetailsInclude,
} from "@/lib/data-mappers";
import {
  buildContains,
  buildPagination,
  getOrganizationContext,
  normalizeListParams,
} from "@/lib/query-utils";
import type { ListParams, PaginatedData, Technician } from "@/lib/types";

function buildTechnicianWhere(
  organizationId: string,
  params: ReturnType<typeof normalizeListParams>,
): Prisma.UserWhereInput {
  return {
    organizationId,
    role: "TECHNICIAN",
    ...(params.search
      ? {
          OR: [
            { name: buildContains(params.search) },
            { territory: buildContains(params.search) },
            { specialization: buildContains(params.search) },
          ],
        }
      : {}),
    ...(params.status && params.status !== "all"
      ? { status: params.status }
      : {}),
  };
}

function getTechnicianOrderBy(
  sortBy: string,
  sortOrder: "asc" | "desc",
): Prisma.UserOrderByWithRelationInput {
  switch (sortBy) {
    case "name":
      return { name: sortOrder };
    case "rating":
      return { rating: sortOrder };
    case "activeJobs":
      return { activeJobs: sortOrder };
    default:
      return { createdAt: sortOrder };
  }
}

export async function listTechniciansForOrganization(
  organizationId: string,
  params: ListParams = {},
): Promise<PaginatedData<Technician>> {
  const normalized = normalizeListParams(params);
  const where = buildTechnicianWhere(organizationId, normalized);
  const [total, records] = await Promise.all([
    db.user.count({ where }),
    db.user.findMany({
      where,
      select: technicianSelect,
      orderBy: getTechnicianOrderBy(normalized.sortBy, normalized.sortOrder),
      skip: normalized.skip,
      take: normalized.take,
    }),
  ]);

  return buildPagination(
    records.map(mapTechnician),
    total,
    normalized.page,
    normalized.pageSize,
  );
}

export async function listTechnicians(params: ListParams = {}) {
  const user = await getOrganizationContext();
  return listTechniciansForOrganization(user.organizationId, params);
}

export async function getTechnicianDetailForOrganization(organizationId: string, id: string) {
  const technician = await db.user.findFirst({
    where: {
      id,
      organizationId,
      role: "TECHNICIAN",
    },
    select: technicianSelect,
  });

  if (!technician) {
    return null;
  }

  const [jobs, tickets] = await Promise.all([
    db.job.findMany({
      where: {
        organizationId,
        technicianId: id,
      },
      include: jobDetailsInclude,
      orderBy: {
        scheduledDate: "desc",
      },
      take: 100,
    }),
    db.ticket.findMany({
      where: {
        organizationId,
        assignedToId: id,
      },
      include: ticketDetailsInclude,
      orderBy: {
        createdAt: "desc",
      },
      take: 100,
    }),
  ]);

  return {
    technician: mapTechnician(technician),
    jobs: jobs.map(mapJob),
    tickets: tickets.map(mapTicket),
  };
}

export async function getTechnicianDetail(id: string) {
  const user = await getOrganizationContext();
  return getTechnicianDetailForOrganization(user.organizationId, id);
}

export async function getTechnicianOverviewForOrganization(organizationId: string) {
  const [total, available] = await Promise.all([
    db.user.count({
      where: {
        organizationId,
        role: "TECHNICIAN",
      },
    }),
    db.user.count({
      where: {
        organizationId,
        role: "TECHNICIAN",
        status: "available",
      },
    }),
  ]);

  return {
    total,
    available,
  };
}

export async function getTechnicianOverview() {
  const user = await getOrganizationContext();
  return getTechnicianOverviewForOrganization(user.organizationId);
}
