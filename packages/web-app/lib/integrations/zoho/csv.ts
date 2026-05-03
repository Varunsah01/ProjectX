import {
  type ExportDataSet,
  paiseToRupees,
  toZohoDate,
  csvRow,
} from "../shared";

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface ZohoCsvBundle {
  "items.csv": string;
  "customers.csv": string;
  "invoices.csv": string;
  "payments_received.csv": string;
  "credit_notes.csv": string;
}

/**
 * Generate a bundle of Zoho Books-compatible CSV files from an ExportDataSet.
 */
export function generateZohoCsvs(data: ExportDataSet): ZohoCsvBundle {
  return {
    "items.csv": buildItemsCsv(data),
    "customers.csv": buildCustomersCsv(data),
    "invoices.csv": buildInvoicesCsv(data),
    "payments_received.csv": buildPaymentsCsv(data),
    "credit_notes.csv": buildCreditNotesCsv(data),
  };
}

// ---------------------------------------------------------------------------
// Items CSV — deduplicated by description + hsnSac
// ---------------------------------------------------------------------------

function buildItemsCsv(data: ExportDataSet): string {
  const header = csvRow([
    "Item Name",
    "HSN/SAC",
    "Rate",
    "Tax Name",
    "Tax Percentage",
    "Tax Type",
  ]);

  const seen = new Set<string>();
  const rows: string[] = [];

  for (const inv of data.invoices) {
    if (inv.status === "CANCELLED") continue;
    for (const item of inv.items) {
      const key = `${item.description}::${item.hsnSac ?? ""}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const gstRate = Number(item.gstRatePercent);
      const taxName = gstRate > 0 ? `GST${gstRate}` : "Exempt";
      const taxType = inv.isInterState ? "IGST" : "GST";

      rows.push(
        csvRow([
          item.description,
          item.hsnSac ?? "",
          paiseToRupees(item.rate),
          taxName,
          String(gstRate),
          gstRate > 0 ? taxType : "",
        ]),
      );
    }
  }

  return [header, ...rows].join("\n");
}

// ---------------------------------------------------------------------------
// Customers CSV
// ---------------------------------------------------------------------------

function buildCustomersCsv(data: ExportDataSet): string {
  const header = csvRow([
    "Customer Name",
    "Email",
    "Phone",
    "Billing Address",
    "Billing City",
    "Billing State",
    "GSTIN",
    "Place of Supply",
  ]);

  const rows = data.customers.map((c) =>
    csvRow([
      c.name,
      c.email,
      c.phone,
      c.address,
      c.city,
      c.billingState ?? "",
      c.gstin ?? "",
      c.billingState ?? "",
    ]),
  );

  return [header, ...rows].join("\n");
}

// ---------------------------------------------------------------------------
// Invoices CSV — one row per line item (Zoho convention)
// ---------------------------------------------------------------------------

function buildInvoicesCsv(data: ExportDataSet): string {
  const header = csvRow([
    "Invoice Number",
    "Invoice Date",
    "Due Date",
    "Customer Name",
    "Item Name",
    "Quantity",
    "Rate",
    "Tax",
    "Notes",
  ]);

  const rows: string[] = [];

  for (const inv of data.invoices) {
    if (inv.status === "CANCELLED") continue;

    for (const item of inv.items) {
      const gstRate = Number(item.gstRatePercent);
      const taxName = gstRate > 0 ? `GST${gstRate}` : "";

      rows.push(
        csvRow([
          inv.invoiceNumber,
          toZohoDate(inv.issuedDate),
          toZohoDate(inv.dueDate),
          inv.customer.name,
          item.description,
          String(item.qty),
          paiseToRupees(item.rate),
          taxName,
          inv.notes ?? "",
        ]),
      );
    }
  }

  return [header, ...rows].join("\n");
}

// ---------------------------------------------------------------------------
// Payments Received CSV
// ---------------------------------------------------------------------------

const METHOD_MAP: Record<string, string> = {
  razorpay: "Online Payment",
  cash: "Cash",
  bank_transfer: "Bank Transfer",
  upi: "UPI",
  cheque: "Check",
  online: "Online Payment",
};

function buildPaymentsCsv(data: ExportDataSet): string {
  const header = csvRow([
    "Payment Number",
    "Payment Date",
    "Invoice Number",
    "Amount",
    "Payment Mode",
    "Reference",
  ]);

  const rows: string[] = [];

  for (const inv of data.invoices) {
    for (const payment of inv.payments) {
      rows.push(
        csvRow([
          payment.id.slice(0, 8).toUpperCase(),
          toZohoDate(payment.createdAt),
          inv.invoiceNumber,
          paiseToRupees(payment.amount),
          METHOD_MAP[payment.method] ?? payment.method,
          payment.razorpayPaymentId ?? "",
        ]),
      );
    }
  }

  return [header, ...rows].join("\n");
}

// ---------------------------------------------------------------------------
// Credit Notes CSV (refunds)
// ---------------------------------------------------------------------------

function buildCreditNotesCsv(data: ExportDataSet): string {
  const header = csvRow([
    "Credit Note Number",
    "Date",
    "Invoice Number",
    "Amount",
    "Reason",
  ]);

  const rows: string[] = [];

  for (const inv of data.invoices) {
    for (const payment of inv.payments) {
      for (const refund of payment.refunds) {
        rows.push(
          csvRow([
            `CN-${refund.id.slice(0, 8).toUpperCase()}`,
            toZohoDate(refund.processedAt ?? refund.createdAt),
            inv.invoiceNumber,
            paiseToRupees(refund.amountPaisa),
            refund.reason,
          ]),
        );
      }
    }
  }

  return [header, ...rows].join("\n");
}
