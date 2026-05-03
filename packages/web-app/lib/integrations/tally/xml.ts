import {
  type ExportDataSet,
  type ExportInvoice,
  paiseToRupees,
  toTallyDate,
  escapeXml,
} from "../shared";

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Generate Tally Prime-compatible XML for import.
 * Includes ledger masters, Sales vouchers, Receipt vouchers, and Credit Notes.
 */
export function generateTallyXml(data: ExportDataSet): string {
  const masters = buildLedgerMasters(data);
  const sales = buildSalesVouchers(data);
  const receipts = buildReceiptVouchers(data);
  const creditNotes = buildCreditNoteVouchers(data);

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<ENVELOPE>`,
    `  <HEADER>`,
    `    <TALLYREQUEST>Import Data</TALLYREQUEST>`,
    `  </HEADER>`,
    `  <BODY>`,
    `    <IMPORTDATA>`,
    `      <REQUESTDESC>`,
    `        <REPORTNAME>All Masters and Vouchers</REPORTNAME>`,
    `      </REQUESTDESC>`,
    `      <REQUESTDATA>`,
    `        <TALLYMESSAGE xmlns:UDF="TallyUDF">`,
    masters,
    sales,
    receipts,
    creditNotes,
    `        </TALLYMESSAGE>`,
    `      </REQUESTDATA>`,
    `    </IMPORTDATA>`,
    `  </BODY>`,
    `</ENVELOPE>`,
  ].join("\n");
}

// ---------------------------------------------------------------------------
// Ledger Masters
// ---------------------------------------------------------------------------

function ledger(name: string, parent: string, extra = ""): string {
  return [
    `          <LEDGER NAME="${escapeXml(name)}" ACTION="Create">`,
    `            <NAME>${escapeXml(name)}</NAME>`,
    `            <PARENT>${escapeXml(parent)}</PARENT>`,
    extra,
    `          </LEDGER>`,
  ]
    .filter(Boolean)
    .join("\n");
}

function buildLedgerMasters(data: ExportDataSet): string {
  const lines: string[] = [];

  // Standard accounting ledgers
  lines.push(ledger("Sales Account", "Sales Accounts"));
  lines.push(ledger("Output CGST", "Duties & Taxes"));
  lines.push(ledger("Output SGST", "Duties & Taxes"));
  lines.push(ledger("Output IGST", "Duties & Taxes"));

  // Bank ledger (use org's bankName or fall back to generic)
  const bankName = data.organization.bankName || "Bank Account";
  lines.push(ledger(bankName, "Bank Accounts"));

  // Customer ledgers under Sundry Debtors
  for (const customer of data.customers) {
    const extra = customer.gstin
      ? `            <GSTREGISTRATIONTYPE>Regular</GSTREGISTRATIONTYPE>\n            <PARTYGSTIN>${escapeXml(customer.gstin)}</PARTYGSTIN>`
      : "";
    lines.push(ledger(customer.name, "Sundry Debtors", extra));
  }

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Sales Vouchers
// ---------------------------------------------------------------------------

function buildSalesVouchers(data: ExportDataSet): string {
  const vouchers: string[] = [];

  for (const inv of data.invoices) {
    // Skip cancelled invoices — they don't represent valid sales
    if (inv.status === "CANCELLED") continue;

    const date = toTallyDate(inv.issuedDate);
    const partyName = escapeXml(inv.customer.name);
    const voucherNumber = escapeXml(inv.invoiceNumber);
    const totalAmount = paiseToRupees(inv.amount);
    const subtotal = paiseToRupees(inv.subtotalAmount ?? 0);
    const cgst = inv.cgstAmount ?? 0;
    const sgst = inv.sgstAmount ?? 0;
    const igst = inv.igstAmount ?? 0;

    const ledgerEntries: string[] = [];

    // Dr: Customer (Party)
    ledgerEntries.push(ledgerEntry(inv.customer.name, totalAmount, true));

    // Cr: Sales Account
    ledgerEntries.push(ledgerEntry("Sales Account", subtotal, false));

    // Cr: Tax ledgers
    if (inv.isInterState) {
      if (igst > 0) {
        ledgerEntries.push(ledgerEntry("Output IGST", paiseToRupees(igst), false));
      }
    } else {
      if (cgst > 0) {
        ledgerEntries.push(ledgerEntry("Output CGST", paiseToRupees(cgst), false));
      }
      if (sgst > 0) {
        ledgerEntries.push(ledgerEntry("Output SGST", paiseToRupees(sgst), false));
      }
    }

    // Inventory entries per line item
    const inventoryEntries = inv.items
      .map((item) => {
        const amt = paiseToRupees(item.amount);
        const rate = paiseToRupees(item.rate);
        return [
          `              <ALLINVENTORYENTRIES.LIST>`,
          `                <STOCKITEMNAME>${escapeXml(item.description)}</STOCKITEMNAME>`,
          item.hsnSac ? `                <HSNCODE>${escapeXml(item.hsnSac)}</HSNCODE>` : "",
          `                <RATE>${rate}/Nos</RATE>`,
          `                <AMOUNT>-${amt}</AMOUNT>`,
          `                <ACTUALQTY>${item.qty} Nos</ACTUALQTY>`,
          `                <BILLEDQTY>${item.qty} Nos</BILLEDQTY>`,
          `              </ALLINVENTORYENTRIES.LIST>`,
        ]
          .filter(Boolean)
          .join("\n");
      })
      .join("\n");

    const gstBlock = buildGstBlock(inv);

    vouchers.push(
      [
        `          <VOUCHER VCHTYPE="Sales" ACTION="Create">`,
        `            <DATE>${date}</DATE>`,
        `            <VOUCHERTYPENAME>Sales</VOUCHERTYPENAME>`,
        `            <VOUCHERNUMBER>${voucherNumber}</VOUCHERNUMBER>`,
        `            <PARTYLEDGERNAME>${partyName}</PARTYLEDGERNAME>`,
        `            <PERSISTEDVIEW>Invoice Voucher View</PERSISTEDVIEW>`,
        `            <ISINVOICE>Yes</ISINVOICE>`,
        gstBlock,
        ledgerEntries.join("\n"),
        inventoryEntries,
        `          </VOUCHER>`,
      ]
        .filter(Boolean)
        .join("\n"),
    );
  }

  return vouchers.join("\n");
}

// ---------------------------------------------------------------------------
// Receipt Vouchers
// ---------------------------------------------------------------------------

function buildReceiptVouchers(data: ExportDataSet): string {
  const vouchers: string[] = [];
  const bankName = escapeXml(data.organization.bankName || "Bank Account");

  for (const inv of data.invoices) {
    for (const payment of inv.payments) {
      const date = toTallyDate(payment.createdAt);
      const amount = paiseToRupees(payment.amount);
      const partyName = escapeXml(inv.customer.name);
      const ref = payment.razorpayPaymentId || payment.razorpayOrderId;

      vouchers.push(
        [
          `          <VOUCHER VCHTYPE="Receipt" ACTION="Create">`,
          `            <DATE>${date}</DATE>`,
          `            <VOUCHERTYPENAME>Receipt</VOUCHERTYPENAME>`,
          `            <NARRATION>Payment ${escapeXml(ref)} for ${escapeXml(inv.invoiceNumber)}</NARRATION>`,
          `            <PARTYLEDGERNAME>${partyName}</PARTYLEDGERNAME>`,
          ledgerEntry(data.organization.bankName || "Bank Account", amount, true),
          ledgerEntry(inv.customer.name, amount, false),
          `          </VOUCHER>`,
        ].join("\n"),
      );
    }
  }

  return vouchers.join("\n");
}

// ---------------------------------------------------------------------------
// Credit Note Vouchers (Refunds)
// ---------------------------------------------------------------------------

function buildCreditNoteVouchers(data: ExportDataSet): string {
  const vouchers: string[] = [];

  for (const inv of data.invoices) {
    for (const payment of inv.payments) {
      for (const refund of payment.refunds) {
        const date = toTallyDate(refund.processedAt ?? refund.createdAt);
        const refundAmount = paiseToRupees(refund.amountPaisa);
        const partyName = escapeXml(inv.customer.name);

        // Calculate proportional tax reversal
        const ratio = inv.amount > 0 ? refund.amountPaisa / inv.amount : 0;
        const subtotal = inv.subtotalAmount ?? 0;
        const cgst = inv.cgstAmount ?? 0;
        const sgst = inv.sgstAmount ?? 0;
        const igst = inv.igstAmount ?? 0;
        const subtotalPortion = paiseToRupees(Math.round(subtotal * ratio));

        const ledgerEntries: string[] = [];

        // Cr: Customer (reverse the debit)
        ledgerEntries.push(ledgerEntry(inv.customer.name, refundAmount, false));

        // Dr: Sales Account (reverse)
        ledgerEntries.push(ledgerEntry("Sales Account", subtotalPortion, true));

        // Dr: Tax ledgers (proportional reversal)
        if (inv.isInterState) {
          const igstPortion = paiseToRupees(Math.round(igst * ratio));
          if (igst > 0) {
            ledgerEntries.push(ledgerEntry("Output IGST", igstPortion, true));
          }
        } else {
          const cgstPortion = paiseToRupees(Math.round(cgst * ratio));
          const sgstPortion = paiseToRupees(Math.round(sgst * ratio));
          if (cgst > 0) {
            ledgerEntries.push(ledgerEntry("Output CGST", cgstPortion, true));
          }
          if (sgst > 0) {
            ledgerEntries.push(ledgerEntry("Output SGST", sgstPortion, true));
          }
        }

        vouchers.push(
          [
            `          <VOUCHER VCHTYPE="Credit Note" ACTION="Create">`,
            `            <DATE>${date}</DATE>`,
            `            <VOUCHERTYPENAME>Credit Note</VOUCHERTYPENAME>`,
            `            <NARRATION>Refund for ${escapeXml(inv.invoiceNumber)} - ${escapeXml(refund.reason)}</NARRATION>`,
            `            <PARTYLEDGERNAME>${partyName}</PARTYLEDGERNAME>`,
            `            <ORIGINALVCHNO>${escapeXml(inv.invoiceNumber)}</ORIGINALVCHNO>`,
            `            <ISINVOICE>Yes</ISINVOICE>`,
            ledgerEntries.join("\n"),
            `          </VOUCHER>`,
          ].join("\n"),
        );
      }
    }
  }

  return vouchers.join("\n");
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function ledgerEntry(name: string, amount: string, isDebit: boolean): string {
  const tag = isDebit ? "ISDEEMEDPOSITIVE" : "ISDEEMEDPOSITIVE";
  const sign = isDebit ? amount : `-${amount}`;
  return [
    `              <ALLLEDGERENTRIES.LIST>`,
    `                <LEDGERNAME>${escapeXml(name)}</LEDGERNAME>`,
    `                <ISDEEMEDPOSITIVE>${isDebit ? "Yes" : "No"}</ISDEEMEDPOSITIVE>`,
    `                <AMOUNT>${isDebit ? `-${amount}` : amount}</AMOUNT>`,
    `              </ALLLEDGERENTRIES.LIST>`,
  ].join("\n");
}

function buildGstBlock(inv: ExportInvoice): string {
  if (inv.totalTaxAmount === 0) return "";

  const placeOfSupply = inv.placeOfSupply || "";
  return [
    `            <STATENAME>${escapeXml(placeOfSupply)}</STATENAME>`,
    `            <ISGSTAPPLICABLE>Yes</ISGSTAPPLICABLE>`,
    inv.isInterState
      ? `            <GSTREGISTRATIONTYPE>Inter-State</GSTREGISTRATIONTYPE>`
      : `            <GSTREGISTRATIONTYPE>Intra-State</GSTREGISTRATIONTYPE>`,
  ].join("\n");
}
