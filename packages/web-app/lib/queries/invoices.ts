import { Prisma, InvoiceStatus, InvoiceType } from "@prisma/client";
import { db } from "@/lib/db";
import { invoiceDetailsInclude, mapInvoice } from "@/lib/data-mappers";
import {
  addDays,
  buildContains,
  buildPagination,
  getDaysDifference,
  getOrganizationContext,
  normalizeListParams,
  startOfDay,
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
  const referenceDate = new Date();
  const today = startOfDay(referenceDate);
  const d30 = addDays(today, -30);
  const d60 = addDays(today, -60);
  const d90 = addDays(today, -90);

  const baseWhere: Prisma.InvoiceWhereInput = {
    organizationId,
    status: { in: ["ISSUED", "OVERDUE", "PARTIAL"] },
  };

  // ── Bucket aggregates (summary across ALL non-paid invoices) ──
  const [notDueAgg, b030Agg, b3060Agg, b6090Agg, b90PlusAgg] =
    await Promise.all([
      db.invoice.aggregate({
        where: { ...baseWhere, dueDate: { gte: today } },
        _sum: { amount: true, paidAmount: true },
        _count: true,
      }),
      db.invoice.aggregate({
        where: { ...baseWhere, dueDate: { gte: d30, lt: today } },
        _sum: { amount: true, paidAmount: true },
        _count: true,
      }),
      db.invoice.aggregate({
        where: { ...baseWhere, dueDate: { gte: d60, lt: d30 } },
        _sum: { amount: true, paidAmount: true },
        _count: true,
      }),
      db.invoice.aggregate({
        where: { ...baseWhere, dueDate: { gte: d90, lt: d60 } },
        _sum: { amount: true, paidAmount: true },
        _count: true,
      }),
      db.invoice.aggregate({
        where: { ...baseWhere, dueDate: { lt: d90 } },
        _sum: { amount: true, paidAmount: true },
        _count: true,
      }),
    ]);

  function bucketBalance(agg: typeof notDueAgg) {
    return Math.max(0, (agg._sum.amount ?? 0) - (agg._sum.paidAmount ?? 0));
  }

  const notDueAmount = bucketBalance(notDueAgg);
  const b030Amount = bucketBalance(b030Agg);
  const b3060Amount = bucketBalance(b3060Agg);
  const b6090Amount = bucketBalance(b6090Agg);
  const b90PlusAmount = bucketBalance(b90PlusAgg);

  const totalOutstanding = notDueAmount + b030Amount + b3060Amount + b6090Amount + b90PlusAmount;
  const overdueAmount = b030Amount + b3060Amount + b6090Amount + b90PlusAmount;
  const criticalAmount = b6090Amount + b90PlusAmount;

  const buckets = [
    { label: "Not Yet Due", key: "not_due", color: "bg-blue-500", amount: notDueAmount, count: notDueAgg._count },
    { label: "0-30 Days", key: "0-30", color: "bg-amber-500", amount: b030Amount, count: b030Agg._count },
    { label: "30-60 Days", key: "30-60", color: "bg-orange-500", amount: b3060Amount, count: b3060Agg._count },
    { label: "60-90 Days", key: "60-90", color: "bg-red-500", amount: b6090Amount, count: b6090Agg._count },
    { label: "90+ Days", key: "90+", color: "bg-red-700", amount: b90PlusAmount, count: b90PlusAgg._count },
  ];

  // ── Paginated rows with DB-level filters ──
  const search = params.search?.trim().toLowerCase() ?? "";
  const bucketFilter = params.bucket?.trim() ?? "all";
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.max(1, params.pageSize ?? 20);

  const bucketDateWhere: Prisma.InvoiceWhereInput =
    bucketFilter === "not_due"
      ? { dueDate: { gte: today } }
      : bucketFilter === "0-30"
        ? { dueDate: { gte: d30, lt: today } }
        : bucketFilter === "30-60"
          ? { dueDate: { gte: d60, lt: d30 } }
          : bucketFilter === "60-90"
            ? { dueDate: { gte: d90, lt: d60 } }
            : bucketFilter === "90+"
              ? { dueDate: { lt: d90 } }
              : {};

  const rowsWhere: Prisma.InvoiceWhereInput = {
    ...baseWhere,
    ...bucketDateWhere,
    ...(search
      ? { customer: { name: { contains: search, mode: "insensitive" as const } } }
      : {}),
  };

  const [totalCount, invoiceRecords] = await Promise.all([
    db.invoice.count({ where: rowsWhere }),
    db.invoice.findMany({
      where: rowsWhere,
      include: invoiceDetailsInclude,
      orderBy: { dueDate: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const normalizedPage = Math.min(page, totalPages);

  const rows: CollectionRow[] = invoiceRecords.map((invoiceRecord) => {
    const invoice = mapInvoice(invoiceRecord);
    const balance = Math.max(0, invoice.amount - invoice.paidAmount);
    const daysOverdue = getDaysDifference(invoiceRecord.dueDate, referenceDate);
    let bucket = "not_due";
    if (daysOverdue > 90) bucket = "90+";
    else if (daysOverdue > 60) bucket = "60-90";
    else if (daysOverdue > 30) bucket = "30-60";
    else if (daysOverdue > 0) bucket = "0-30";
    return { ...invoice, balance, daysOverdue, bucket };
  });

  return {
    totalOutstanding,
    overdueAmount,
    criticalAmount,
    buckets,
    rows,
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
      billingState: true,
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
