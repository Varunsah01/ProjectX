import { InvoiceStatus, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { toDateString } from "@/lib/query-utils";

export interface UnmatchedInvoice {
  id: string;
  invoiceNumber: string;
  customerName: string;
  amount: number;
  paidAmount: number;
  balance: number;
  dueDate: string;
  status: string;
}

export interface ReconciliationData {
  unmatchedInvoices: UnmatchedInvoice[];
  totalPages: number;
  page: number;
  pageSize: number;
  totalCount: number;
}

/**
 * Fetch invoices with outstanding balances (ISSUED, OVERDUE, PARTIAL)
 * that need manual payment reconciliation.
 */
export async function getReconciliationData(
  organizationId: string,
  params: { search?: string; page?: number; pageSize?: number },
): Promise<ReconciliationData> {
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 20;
  const skip = (page - 1) * pageSize;

  const where: Prisma.InvoiceWhereInput = {
    organizationId,
    deletedAt: null,
    status: {
      in: [InvoiceStatus.ISSUED, InvoiceStatus.OVERDUE, InvoiceStatus.PARTIAL],
    },
    ...(params.search
      ? {
          OR: [
            { invoiceNumber: { contains: params.search, mode: "insensitive" as const } },
            { customer: { name: { contains: params.search, mode: "insensitive" as const } } },
          ],
        }
      : {}),
  };

  const [invoices, totalCount] = await Promise.all([
    db.invoice.findMany({
      where,
      include: { customer: { select: { name: true } } },
      orderBy: { dueDate: "asc" },
      skip,
      take: pageSize,
    }),
    db.invoice.count({ where }),
  ]);

  const unmatchedInvoices: UnmatchedInvoice[] = invoices.map((inv) => ({
    id: inv.id,
    invoiceNumber: inv.invoiceNumber,
    customerName: inv.customer.name,
    amount: inv.amount,
    paidAmount: inv.paidAmount,
    balance: inv.amount - inv.paidAmount,
    dueDate: toDateString(inv.dueDate),
    status: inv.status,
  }));

  return {
    unmatchedInvoices,
    totalPages: Math.ceil(totalCount / pageSize),
    page,
    pageSize,
    totalCount,
  };
}
