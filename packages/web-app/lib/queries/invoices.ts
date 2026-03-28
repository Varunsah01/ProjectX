import { Prisma, InvoiceStatus, InvoiceType } from "@prisma/client";
import { db } from "@/lib/db";
import { invoiceDetailsInclude, mapInvoice } from "@/lib/data-mappers";
import {
  buildContains,
  buildPagination,
  getDaysDifference,
  getOrganizationContext,
  normalizeListParams,
  toDateString,
  toEnumValue,
} from "@/lib/query-utils";
import type {
  CollectionRow,
  CollectionsData,
  Invoice,
  ListParams,
  PaginatedData,
} from "@/lib/types";

function buildInvoiceWhere(
  organizationId: string,
  params: ReturnType<typeof normalizeListParams>,
): Prisma.InvoiceWhereInput {
  return {
    organizationId,
    ...(params.search
      ? {
          OR: [
            { invoiceNumber: buildContains(params.search) },
            { customer: { name: buildContains(params.search) } },
          ],
        }
      : {}),
    ...(params.status
      ? { status: toEnumValue<InvoiceStatus>(params.status) }
      : {}),
    ...(params.type ? { type: toEnumValue<InvoiceType>(params.type) } : {}),
  };
}

function getInvoiceOrderBy(
  sortBy: string,
  sortOrder: "asc" | "desc",
): Prisma.InvoiceOrderByWithRelationInput {
  switch (sortBy) {
    case "invoiceNumber":
      return { invoiceNumber: sortOrder };
    case "issuedDate":
      return { issuedDate: sortOrder };
    case "dueDate":
      return { dueDate: sortOrder };
    case "amount":
      return { amount: sortOrder };
    default:
      return { createdAt: sortOrder };
  }
}

export async function listInvoicesForOrganization(
  organizationId: string,
  params: ListParams = {},
): Promise<PaginatedData<Invoice>> {
  const normalized = normalizeListParams(params);
  const where = buildInvoiceWhere(organizationId, normalized);
  const [total, records] = await Promise.all([
    db.invoice.count({ where }),
    db.invoice.findMany({
      where,
      include: invoiceDetailsInclude,
      orderBy: getInvoiceOrderBy(normalized.sortBy, normalized.sortOrder),
      skip: normalized.skip,
      take: normalized.take,
    }),
  ]);

  return buildPagination(
    records.map(mapInvoice),
    total,
    normalized.page,
    normalized.pageSize,
  );
}

export async function listInvoices(params: ListParams = {}) {
  const user = await getOrganizationContext();
  return listInvoicesForOrganization(user.organizationId, params);
}

export async function getInvoiceDetailForOrganization(organizationId: string, id: string) {
  const invoice = await db.invoice.findFirst({
    where: {
      id,
      organizationId,
    },
    include: invoiceDetailsInclude,
  });

  if (!invoice) {
    return null;
  }

  return mapInvoice(invoice);
}

export async function getInvoiceDetail(id: string) {
  const user = await getOrganizationContext();
  return getInvoiceDetailForOrganization(user.organizationId, id);
}

export async function getCollectionsDataForOrganization(
  organizationId: string,
  params: {
    search?: string;
    bucket?: string;
    page?: number;
    pageSize?: number;
  } = {},
): Promise<CollectionsData> {
  const invoices = await db.invoice.findMany({
    where: {
      organizationId,
      status: {
        in: ["ISSUED", "OVERDUE", "PARTIAL"],
      },
    },
    include: invoiceDetailsInclude,
    orderBy: {
      dueDate: "asc",
    },
  });

  const referenceDate =
    invoices.reduce<Date | null>((latest, invoice) => {
      if (!latest || invoice.dueDate > latest) {
        return invoice.dueDate;
      }

      return latest;
    }, null) ?? new Date();

  const rows: CollectionRow[] = invoices.map((invoiceRecord) => {
    const invoice = mapInvoice(invoiceRecord);
    const balance = Math.max(0, invoice.amount - invoice.paidAmount);
    const daysOverdue = getDaysDifference(invoiceRecord.dueDate, referenceDate);
    let bucket = "not_due";

    if (daysOverdue > 90) {
      bucket = "90+";
    } else if (daysOverdue > 60) {
      bucket = "60-90";
    } else if (daysOverdue > 30) {
      bucket = "30-60";
    } else if (daysOverdue > 0) {
      bucket = "0-30";
    }

    return {
      ...invoice,
      balance,
      daysOverdue,
      bucket,
    };
  }).sort((left, right) => right.daysOverdue - left.daysOverdue);

  const totalOutstanding = rows.reduce((sum, row) => sum + row.balance, 0);
  const overdueAmount = rows
    .filter((row) => row.daysOverdue > 0)
    .reduce((sum, row) => sum + row.balance, 0);
  const criticalAmount = rows
    .filter((row) => row.daysOverdue > 60)
    .reduce((sum, row) => sum + row.balance, 0);

  const buckets = [
    { label: "Not Yet Due", key: "not_due", color: "bg-blue-500" },
    { label: "0-30 Days", key: "0-30", color: "bg-amber-500" },
    { label: "30-60 Days", key: "30-60", color: "bg-orange-500" },
    { label: "60-90 Days", key: "60-90", color: "bg-red-500" },
    { label: "90+ Days", key: "90+", color: "bg-red-700" },
  ].map((bucket) => ({
    ...bucket,
    amount: rows
      .filter((row) => row.bucket === bucket.key)
      .reduce((sum, row) => sum + row.balance, 0),
    count: rows.filter((row) => row.bucket === bucket.key).length,
  }));

  const search = params.search?.trim().toLowerCase() ?? "";
  const bucket = params.bucket?.trim() ?? "all";
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.max(1, params.pageSize ?? 20);
  const filteredRows = rows.filter((row) => {
    const matchSearch = !search || row.customerName.toLowerCase().includes(search);
    const matchBucket = bucket === "all" || row.bucket === bucket;
    return matchSearch && matchBucket;
  });
  const totalCount = filteredRows.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const normalizedPage = Math.min(page, totalPages);
  const paginatedRows = filteredRows.slice(
    (normalizedPage - 1) * pageSize,
    normalizedPage * pageSize,
  );

  return {
    totalOutstanding,
    overdueAmount,
    criticalAmount,
    buckets,
    rows: paginatedRows,
    totalCount,
    page: normalizedPage,
    pageSize,
    totalPages,
  };
}

export async function getCollectionsData(params: {
  search?: string;
  bucket?: string;
  page?: number;
  pageSize?: number;
} = {}) {
  const user = await getOrganizationContext();
  return getCollectionsDataForOrganization(user.organizationId, params);
}

export async function getInvoiceFormOptionsForOrganization(organizationId: string) {
  const customers = await db.customer.findMany({
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
  });

  return customers;
}

export async function getInvoiceFormOptions() {
  const user = await getOrganizationContext();
  return getInvoiceFormOptionsForOrganization(user.organizationId);
}

export async function getInvoiceOverviewForOrganization(organizationId: string) {
  const [total, outstanding] = await Promise.all([
    db.invoice.count({
      where: {
        organizationId,
      },
    }),
    db.invoice.aggregate({
      where: {
        organizationId,
        status: {
          in: ["ISSUED", "OVERDUE", "PARTIAL"],
        },
      },
      _sum: {
        amount: true,
        paidAmount: true,
      },
    }),
  ]);

  return {
    total,
    totalDue:
      (outstanding._sum.amount ?? 0) - (outstanding._sum.paidAmount ?? 0),
  };
}

export async function getInvoiceOverview() {
  const user = await getOrganizationContext();
  return getInvoiceOverviewForOrganization(user.organizationId);
}
