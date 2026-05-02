import { db } from "@/lib/db";
import { mapPortalInvoice, portalInvoiceInclude } from "@/lib/portal-mappers";
import { normalizeListParams, buildContains } from "@/lib/query-utils";
import type { PortalInvoice, PortalListParams, PaginatedData } from "@/lib/portal-types";

export async function listInvoicesForCustomer(
  customerId: string,
  organizationId: string,
  params: PortalListParams = {},
): Promise<PaginatedData<PortalInvoice>> {
  const { search, status, skip, take, page, pageSize } = normalizeListParams(params);

  const where = {
    customerId,
    organizationId,
    status: { not: "DRAFT" as const },
    ...(status && status !== "all"
      ? { status: status.toUpperCase() as any }
      : {}),
    ...(search
      ? { invoiceNumber: buildContains(search) }
      : {}),
  };

  const [invoices, total] = await Promise.all([
    db.invoice.findMany({
      where,
      include: portalInvoiceInclude,
      orderBy: { issuedDate: "desc" },
      skip,
      take,
    }),
    db.invoice.count({ where }),
  ]);

  return {
    data: invoices.map(mapPortalInvoice),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function getInvoiceDetailForCustomer(
  customerId: string,
  organizationId: string,
  invoiceId: string,
): Promise<PortalInvoice | null> {
  const invoice = await db.invoice.findFirst({
    where: {
      id: invoiceId,
      customerId,
      organizationId,
      status: { not: "DRAFT" },
    },
    include: portalInvoiceInclude,
  });

  if (!invoice) return null;
  return mapPortalInvoice(invoice);
}
