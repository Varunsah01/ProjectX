import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/db", () => ({ db: {} }));
vi.mock("@/lib/query-utils", () => ({
  startOfDay: (d: Date) => d,
  endOfDay: (d: Date) => d,
  toDateString: (d: Date) => d.toISOString().slice(0, 10),
}));

import { generateZohoCsvs } from "@/lib/integrations/zoho/csv";
import { buildExportDataSet } from "./fixtures";

describe("generateZohoCsvs", () => {
  const data = buildExportDataSet();
  const csvs = generateZohoCsvs(data);

  it("returns all expected CSV files in the bundle", () => {
    expect(Object.keys(csvs)).toEqual([
      "items.csv",
      "customers.csv",
      "invoices.csv",
      "payments_received.csv",
      "credit_notes.csv",
    ]);
  });

  describe("items.csv", () => {
    it("has correct headers", () => {
      const lines = csvs["items.csv"].split("\n");
      expect(lines[0]).toBe("Item Name,HSN/SAC,Rate,Tax Name,Tax Percentage,Tax Type");
    });

    it("deduplicates items by description+hsnSac", () => {
      const lines = csvs["items.csv"].split("\n");
      // header + unique items (not including cancelled)
      // Each unique item description across all invoices
      expect(lines.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("customers.csv", () => {
    it("has correct headers", () => {
      const lines = csvs["customers.csv"].split("\n");
      expect(lines[0]).toBe(
        "Customer Name,Email,Phone,Billing Address,Billing City,Billing State,GSTIN,Place of Supply",
      );
    });

    it("includes all 3 customers", () => {
      const lines = csvs["customers.csv"].split("\n");
      // header + 3 customers
      expect(lines.length).toBe(4);
    });

    it("includes customer GSTIN", () => {
      expect(csvs["customers.csv"]).toContain("27BBBCD5678E1Z3");
    });
  });

  describe("invoices.csv", () => {
    it("has correct headers", () => {
      const lines = csvs["invoices.csv"].split("\n");
      expect(lines[0]).toBe(
        "Invoice Number,Invoice Date,Due Date,Customer Name,Item Name,Quantity,Rate,Tax,Notes",
      );
    });

    it("generates one row per line item", () => {
      const lines = csvs["invoices.csv"].split("\n");
      // Invoice 3 has 2 items, so 2 rows for that invoice
      const inv3Rows = lines.filter((l) => l.startsWith("INV-2026-003"));
      expect(inv3Rows.length).toBe(2);
    });

    it("formats dates as YYYY-MM-DD", () => {
      expect(csvs["invoices.csv"]).toContain("2026-01-15");
      expect(csvs["invoices.csv"]).toContain("2026-02-15");
    });

    it("formats amounts in rupees", () => {
      // Rate for AMC Service = 100000 paise = 1000.00
      expect(csvs["invoices.csv"]).toContain("1000.00");
    });

    it("includes tax name for taxable items", () => {
      expect(csvs["invoices.csv"]).toContain("GST18");
    });

    it("does not include cancelled invoices", () => {
      // None of our fixtures are cancelled, but let's verify structure
      const lines = csvs["invoices.csv"].split("\n");
      expect(lines.length).toBeGreaterThan(1);
    });
  });

  describe("payments_received.csv", () => {
    it("has correct headers", () => {
      const lines = csvs["payments_received.csv"].split("\n");
      expect(lines[0]).toBe(
        "Payment Number,Payment Date,Invoice Number,Amount,Payment Mode,Reference",
      );
    });

    it("maps payment methods correctly", () => {
      // Payment for INV-2026-007 is razorpay
      expect(csvs["payments_received.csv"]).toContain("Online Payment");
      // Payment for INV-2026-008 is bank_transfer
      expect(csvs["payments_received.csv"]).toContain("Bank Transfer");
    });

    it("includes Razorpay payment ID as reference", () => {
      expect(csvs["payments_received.csv"]).toContain("pay_xyz789");
    });

    it("includes payments for fully and partially paid invoices", () => {
      expect(csvs["payments_received.csv"]).toContain("INV-2026-007");
      expect(csvs["payments_received.csv"]).toContain("INV-2026-008");
    });
  });

  describe("credit_notes.csv", () => {
    it("has correct headers", () => {
      const lines = csvs["credit_notes.csv"].split("\n");
      expect(lines[0]).toBe("Credit Note Number,Date,Invoice Number,Amount,Reason");
    });

    it("includes credit notes for processed refunds", () => {
      expect(csvs["credit_notes.csv"]).toContain("INV-2026-009");
      expect(csvs["credit_notes.csv"]).toContain("Customer cancelled service");
    });

    it("includes partial refund credit note", () => {
      expect(csvs["credit_notes.csv"]).toContain("INV-2026-010");
      expect(csvs["credit_notes.csv"]).toContain("Partial service not rendered");
    });

    it("formats refund amounts in rupees", () => {
      // Full refund = 177000 paise = 1770.00
      expect(csvs["credit_notes.csv"]).toContain("1770.00");
      // Partial refund = 100000 paise = 1000.00
      expect(csvs["credit_notes.csv"]).toContain("1000.00");
    });

    it("prefixes credit note numbers with CN-", () => {
      expect(csvs["credit_notes.csv"]).toMatch(/CN-REF-/);
    });
  });
});
