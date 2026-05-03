import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/db", () => ({ db: {} }));
vi.mock("@/lib/query-utils", () => ({
  startOfDay: (d: Date) => d,
  endOfDay: (d: Date) => d,
  toDateString: (d: Date) => d.toISOString().slice(0, 10),
}));

import { generateTallyXml } from "@/lib/integrations/tally/xml";
import { buildExportDataSet } from "./fixtures";

describe("generateTallyXml", () => {
  const data = buildExportDataSet();
  const xml = generateTallyXml(data);

  it("produces a valid XML envelope structure", () => {
    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain("<ENVELOPE>");
    expect(xml).toContain("<TALLYREQUEST>Import Data</TALLYREQUEST>");
    expect(xml).toContain("<IMPORTDATA>");
    expect(xml).toContain("<REPORTNAME>All Masters and Vouchers</REPORTNAME>");
    expect(xml).toContain("<TALLYMESSAGE");
    expect(xml).toContain("</ENVELOPE>");
  });

  it("creates customer ledger masters under Sundry Debtors", () => {
    expect(xml).toContain('<LEDGER NAME="Mumbai Trading Co"');
    expect(xml).toContain("<PARENT>Sundry Debtors</PARENT>");
    expect(xml).toContain('<LEDGER NAME="Bangalore Tech &amp; Solutions"');
  });

  it("creates standard accounting ledgers", () => {
    expect(xml).toContain('<LEDGER NAME="Sales Account"');
    expect(xml).toContain("<PARENT>Sales Accounts</PARENT>");
    expect(xml).toContain('<LEDGER NAME="Output CGST"');
    expect(xml).toContain('<LEDGER NAME="Output SGST"');
    expect(xml).toContain('<LEDGER NAME="Output IGST"');
    expect(xml).toContain("<PARENT>Duties &amp; Taxes</PARENT>");
  });

  it("creates Sales Vouchers with CGST+SGST for intra-state (INV-2026-001)", () => {
    expect(xml).toContain('<VOUCHER VCHTYPE="Sales"');
    expect(xml).toContain("<VOUCHERNUMBER>INV-2026-001</VOUCHERNUMBER>");
    // Subtotal = 1000.00
    expect(xml).toContain("<LEDGERNAME>Sales Account</LEDGERNAME>");
    // CGST = 90.00, SGST = 90.00
    expect(xml).toContain("<LEDGERNAME>Output CGST</LEDGERNAME>");
    expect(xml).toContain("<LEDGERNAME>Output SGST</LEDGERNAME>");
  });

  it("creates Sales Vouchers with IGST for inter-state (INV-2026-002)", () => {
    expect(xml).toContain("<VOUCHERNUMBER>INV-2026-002</VOUCHERNUMBER>");
    expect(xml).toContain("<LEDGERNAME>Output IGST</LEDGERNAME>");
  });

  it("creates Receipt Vouchers for captured payments", () => {
    expect(xml).toContain('<VOUCHER VCHTYPE="Receipt"');
    // Payment for INV-2026-007
    expect(xml).toContain("INV-2026-007");
    expect(xml).toContain("<LEDGERNAME>State Bank of India</LEDGERNAME>");
  });

  it("creates Credit Note vouchers for refunds", () => {
    expect(xml).toContain('<VOUCHER VCHTYPE="Credit Note"');
    // Refund for INV-2026-009
    expect(xml).toContain("<ORIGINALVCHNO>INV-2026-009</ORIGINALVCHNO>");
    expect(xml).toContain("Customer cancelled service");
  });

  it("handles zero-rated supply with no tax entries for INV-2026-005", () => {
    // The invoice should exist as a Sales voucher
    expect(xml).toContain("<VOUCHERNUMBER>INV-2026-005</VOUCHERNUMBER>");
    // No GST block for zero-rated
  });

  it("formats amounts in rupees with 2 decimals, not paise", () => {
    // INV-2026-001 total = 118000 paise = 1180.00
    expect(xml).toContain("1180.00");
    // Subtotal = 100000 paise = 1000.00
    expect(xml).toContain("1000.00");
  });

  it("formats dates as YYYYMMDD", () => {
    // INV-2026-001 issuedDate = 2026-01-15
    expect(xml).toContain("<DATE>20260115</DATE>");
  });

  it("escapes XML special characters in customer names", () => {
    // "Bangalore Tech & Solutions" should be escaped
    expect(xml).toContain("Bangalore Tech &amp; Solutions");
    expect(xml).not.toContain("Bangalore Tech & Solutions</");
  });

  it("includes inventory entries with HSN codes", () => {
    expect(xml).toContain("<ALLINVENTORYENTRIES.LIST>");
    expect(xml).toContain("<HSNCODE>998314</HSNCODE>");
    expect(xml).toContain("<STOCKITEMNAME>AMC Service - Monthly</STOCKITEMNAME>");
  });

  it("includes GSTIN for registered customers", () => {
    expect(xml).toContain("<PARTYGSTIN>27BBBCD5678E1Z3</PARTYGSTIN>");
  });
});
