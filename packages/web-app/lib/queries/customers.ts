import { Prisma, CustomerStatus } from "@prisma/client";
import { db } from "@/lib/db";
import {
  assetDetailsInclude,
  contractDetailsInclude,
  customerSummaryInclude,
  invoiceDetailsInclude,
  mapAsset,
  mapContract,
  mapCustomer,
  mapInvoice,
  mapTicket,
  ticketDetailsInclude,
} from "@/lib/data-mappers";
import {
  buildContains,
  buildPagination,
  getOrganizationContext,
  normalizeListParams,
  toEnumValue,
} from "@/lib/query-utils";
import type {
  Customer,
  ListParams,
  PaginatedData,
} from "@/lib/types";

function buildCustomerWhere(
  organizationId: string,
  params: ReturnType<typeof normalizeListParams>,
): Prisma.CustomerWhereInput {
  return {
    organizationId,
    ...(params.search
      ? {
          OR: [
            { name: buildContains(params.search) },
            { phone: buildContains(params.search) },
            { city: buildContains(params.search) },
          ],
        }
      : {}),
    ...(params.status
      ? { status: toEnumValue<CustomerStatus>(params.status) }
      : {}),
    ...(params.category && params.category !== "all"
      ? { category: params.category }
      : {}),
  };
}

function getCustomerOrderBy(
  sortBy: string,
  sortOrder: "asc" | "desc",
): Prisma.CustomerOrderByWithRelationInput {
  switch (sortBy) {
    case "name":
      return { name: sortOrder };
    case "city":
      return { city: sortOrder };
    case "category":
      return { category: sortOrder };
    default:
      return { createdAt: sortOrder };
  }
}

export async function listCustomersForOrganization(
  organizationId: string,
  params: ListParams = {},
): Promise<PaginatedData<Customer>> {
  const normalized = normalizeListParams(params);
  const where = buildCustomerWhere(organizationId, normalized);
  const [total, records] = await Promise.all([
    db.customer.count({ where }),
    db.customer.findMany({
      where,
      include: customerSummaryInclude,
      orderBy: getCustomerOrderBy(normalized.sortBy, normalized.sortOrder),
      skip: normalized.skip,
      take: normalized.take,
    }),
  ]);

  return buildPagination(
    records.map(mapCustomer),
    total,
    normalized.page,
    normalized.pageSize,
  );
}

export async function listCustomers(params: ListParams = {}) {
  const user = await getOrganizationContext();
  return listCustomersForOrganization(user.organizationId, params);
}

export async function getCustomerDetailForOrganization(
  organizationId: string,
  id: string,
) {
  const customer = await db.customer.findFirst({
    where: {
      id,
      organizationId,
    },
    include: customerSummaryInclude,
  });

  if (!customer) {
    return null;
  }

  const [assets, invoices, tickets, contracts] = await Promise.all([
    db.asset.findMany({
      where: { organizationId, customerId: id },
      include: assetDetailsInclude,
      orderBy: { createdAt: "desc" },
    }),
    db.invoice.findMany({
      where: { organizationId, customerId: id },
      include: invoiceDetailsInclude,
      orderBy: { issuedDate: "desc" },
    }),
    db.ticket.findMany({
      where: { organizationId, customerId: id },
      include: ticketDetailsInclude,
      orderBy: { createdAt: "desc" },
    }),
    db.contract.findMany({
      where: { organizationId, customerId: id },
      include: contractDetailsInclude,
      orderBy: { startDate: "desc" },
    }),
  ]);

  return {
    customer: mapCustomer(customer),
    assets: assets.map(mapAsset),
    invoices: invoices.map(mapInvoice),
    tickets: tickets.map(mapTicket),
    contracts: contracts.map(mapContract),
  };
}

export async function getCustomerDetail(id: string) {
  const user = await getOrganizationContext();
  return getCustomerDetailForOrganization(user.organizationId, id);
}

export async function getActiveCustomerOptionsForOrganization(organizationId: string) {
  const customers = await db.customer.findMany({
    where: {
      organizationId,
      status: "ACTIVE",
    },
    orderBy: {
      name: "asc",
    },
    select: {
      id: true,
      name: true,
      city: true,
    },
  });

  return customers;
}

export async function getActiveCustomerOptions() {
  const user = await getOrganizationContext();
  return getActiveCustomerOptionsForOrganization(user.organizationId);
}
