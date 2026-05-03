import { Prisma, TicketPriority, TicketStatus } from "@prisma/client";
import { db } from "@/lib/db";
import {
  linkedJobSelect,
  mapLinkedJob,
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
  toEnumValue,
} from "@/lib/query-utils";
import type { ListParams, PaginatedData, Ticket } from "@/lib/types";

function buildTicketWhere(
  organizationId: string,
  params: ReturnType<typeof normalizeListParams>,
): Prisma.TicketWhereInput {
  return {
    organizationId,
    ...(params.search
      ? {
          OR: [
            { subject: buildContains(params.search) },
            { ticketNumber: buildContains(params.search) },
            { customer: { name: buildContains(params.search) } },
          ],
        }
      : {}),
    ...(params.status
      ? { status: toEnumValue<TicketStatus>(params.status) }
      : {}),
    ...(params.type
      ? { priority: toEnumValue<TicketPriority>(params.type) }
      : {}),
    ...(params.category && params.category !== "all"
      ? { category: params.category }
      : {}),
  };
}

function getTicketOrderBy(
  sortBy: string,
  sortOrder: "asc" | "desc",
): Prisma.TicketOrderByWithRelationInput {
  switch (sortBy) {
    case "ticketNumber":
      return { ticketNumber: sortOrder };
    case "priority":
      return { priority: sortOrder };
    case "status":
      return { status: sortOrder };
    default:
      return { createdAt: sortOrder };
  }
}

export async function listTicketsForOrganization(
  organizationId: string,
  params: ListParams = {},
): Promise<PaginatedData<Ticket>> {
  const normalized = normalizeListParams(params);
  const where = buildTicketWhere(organizationId, normalized);
  const [total, records] = await Promise.all([
    db.ticket.count({ where }),
    db.ticket.findMany({
      where,
      include: ticketDetailsInclude,
      orderBy: getTicketOrderBy(normalized.sortBy, normalized.sortOrder),
      skip: normalized.skip,
      take: normalized.take,
    }),
  ]);

  return buildPagination(
    records.map(mapTicket),
    total,
    normalized.page,
    normalized.pageSize,
  );
}

export async function listTickets(params: ListParams = {}) {
  const user = await getOrganizationContext();
  return listTicketsForOrganization(user.organizationId, params);
}

export async function getTicketDetailForOrganization(organizationId: string, id: string) {
  const ticket = await db.ticket.findFirst({
    where: {
      id,
      organizationId,
    },
    include: ticketDetailsInclude,
  });

  if (!ticket) {
    return null;
  }

  const [availableTechnicians, linkedJobs] = await Promise.all([
    db.user.findMany({
      where: {
        organizationId,
        role: "TECHNICIAN",
        OR: [
          { status: "available" },
          { id: ticket.assignedToId ?? undefined },
        ],
      },
      select: technicianSelect,
      orderBy: { name: "asc" },
    }),
    db.job.findMany({
      where: { ticketId: id, organizationId },
      select: linkedJobSelect,
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return {
    ticket: mapTicket(ticket),
    availableTechnicians: availableTechnicians.map(mapTechnician),
    linkedJobs: linkedJobs.map(mapLinkedJob),
  };
}

export async function getTicketDetail(id: string) {
  const user = await getOrganizationContext();
  return getTicketDetailForOrganization(user.organizationId, id);
}

export async function getTicketFormOptionsForOrganization(organizationId: string) {
  const [customers, technicians] = await Promise.all([
    db.customer.findMany({
      where: {
        organizationId,
      },
      orderBy: {
        name: "asc",
      },
      select: {
        id: true,
        name: true,
      },
    }),
    db.user.findMany({
      where: {
        organizationId,
        role: "TECHNICIAN",
        status: {
          not: "off_duty",
        },
      },
      select: technicianSelect,
      orderBy: {
        name: "asc",
      },
    }),
  ]);

  return {
    customers,
    technicians: technicians.map(mapTechnician),
  };
}

export async function getTicketFormOptions() {
  const user = await getOrganizationContext();
  return getTicketFormOptionsForOrganization(user.organizationId);
}

export async function getTicketStatusCountsForOrganization(organizationId: string) {
  const groups = await db.ticket.groupBy({
    by: ["status"],
    where: { organizationId },
    _count: true,
  });

  const countMap = new Map(groups.map((g) => [g.status, g._count]));

  return {
    all: groups.reduce((sum, g) => sum + g._count, 0),
    open: countMap.get("OPEN") ?? 0,
    assigned: countMap.get("ASSIGNED") ?? 0,
    in_progress: countMap.get("IN_PROGRESS") ?? 0,
    on_hold: countMap.get("ON_HOLD") ?? 0,
    resolved: countMap.get("RESOLVED") ?? 0,
  };
}

export async function getTicketStatusCounts() {
  const user = await getOrganizationContext();
  return getTicketStatusCountsForOrganization(user.organizationId);
}
