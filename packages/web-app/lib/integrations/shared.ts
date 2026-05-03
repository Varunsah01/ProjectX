import { db } from "@/lib/db";
import { startOfDay, endOfDay } from "@/lib/query-utils";
import type { Prisma } from "@prisma/client";

// ---------------------------------------------------------------------------
// Formatting helpers (paise → rupees, date formats)
// ---------------------------------------------------------------------------

/** Convert paise integer to rupee string with exactly 2 decimal places. */
export function paiseToRupees(paise: number): string {
  return (paise / 100).toFixed(2);
}

/** Format Date as YYYYMMDD (Tally Prime format). */
export function toTallyDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

/** Format Date as YYYY-MM-DD (Zoho Books / ISO format). */
export function toZohoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Escape XML special characters. */
export function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** Escape a value for CSV (RFC 4180). */
export function escapeCsvCell(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/** Build one CSV row from an array of cell strings. */
export function csvRow(cells: string[]): string {
  return cells.map((c) => escapeCsvCell(c)).join(",");
}

// ---------------------------------------------------------------------------
// Export data set — shared Prisma query for Tally & Zoho exports
// ---------------------------------------------------------------------------

const invoiceInclude = {
  items: true,
  customer: true,
  payments: {
    where: { status: "captured" },
    include: { refunds: { where: { status: "PROCESSED" } } },
  },
} satisfies Prisma.InvoiceInclude;

export type ExportInvoice = Prisma.InvoiceGetPayload<{ include: typeof invoiceInclude }>;

export interface ExportDataSet {
  organization: {
    id: string;
    name: string;
    legalName: string | null;
    gstin: string | null;
    placeOfBusinessState: string | null;
    pan: string | null;
    bankName: string | null;
    bankAccountNumber: string | null;
    bankIfsc: string | null;
    address: string;
    city: string;
    email: string;
    phone: string;
  };
  invoices: ExportInvoice[];
  customers: Array<{
    id: string;
    name: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    gstin: string | null;
    billingState: string | null;
  }>;
}

/**
 * Fetch all non-draft invoices within a date range, with items, customer,
 * captured payments, and processed refunds. Single query point for both
 * Tally and Zoho exporters.
 */
export async function fetchExportDataSet(
  organizationId: string,
  from: Date,
  to: Date,
): Promise<ExportDataSet> {
  const [organization, invoices] = await Promise.all([
    db.organization.findUniqueOrThrow({
      where: { id: organizationId },
      select: {
        id: true,
        name: true,
        legalName: true,
        gstin: true,
        placeOfBusinessState: true,
        pan: true,
        bankName: true,
        bankAccountNumber: true,
        bankIfsc: true,
        address: true,
        city: true,
        email: true,
        phone: true,
      },
    }),
    db.invoice.findMany({
      where: {
        organizationId,
        deletedAt: null,
        status: { not: "DRAFT" },
        issuedDate: { gte: startOfDay(from), lte: endOfDay(to) },
      },
      include: invoiceInclude,
      orderBy: { issuedDate: "asc" },
    }),
  ]);

  // Deduplicate customers from the invoices
  const customerMap = new Map<string, ExportDataSet["customers"][number]>();
  for (const inv of invoices) {
    if (!customerMap.has(inv.customer.id)) {
      const c = inv.customer;
      customerMap.set(c.id, {
        id: c.id,
        name: c.name,
        email: c.email,
        phone: c.phone,
        address: c.address,
        city: c.city,
        gstin: c.gstin,
        billingState: c.billingState,
      });
    }
  }

  return {
    organization,
    invoices,
    customers: Array.from(customerMap.values()),
  };
}
