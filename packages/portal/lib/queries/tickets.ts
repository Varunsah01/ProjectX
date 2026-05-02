import { db } from "@/lib/db";
import { mapPortalTicket, portalTicketInclude } from "@/lib/portal-mappers";
import { normalizeListParams } from "@/lib/query-utils";
import type { PortalTicket, PortalListParams, PaginatedData } from "@/lib/portal-types";

export async function listTicketsForCustomer(
  customerId: string,
  organizationId: string,
  params: PortalListParams = {},
): Promise<PaginatedData<PortalTicket>> {
  const { status, skip, take, page, pageSize } = normalizeListParams(params);

  const where = {
    customerId,
    organizationId,
    ...(status && status !== "all"
      ? { status: status.toUpperCase() as any }
      : {}),
  };

  const [tickets, total] = await Promise.all([
    db.ticket.findMany({
      where,
      include: portalTicketInclude,
      orderBy: { createdAt: "desc" },
      skip,
      take,
    }),
    db.ticket.count({ where }),
  ]);

  return {
    data: tickets.map(mapPortalTicket),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function getTicketDetailForCustomer(
  customerId: string,
  organizationId: string,
  ticketId: string,
): Promise<PortalTicket | null> {
  const ticket = await db.ticket.findFirst({
    where: { id: ticketId, customerId, organizationId },
    include: portalTicketInclude,
  });

  if (!ticket) return null;
  return mapPortalTicket(ticket);
}
