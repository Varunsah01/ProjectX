import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies before importing
vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    contract: { findMany: vi.fn(), update: vi.fn() },
    invoice: { create: vi.fn() },
  },
}));

vi.mock("@/lib/actions/helpers", () => ({
  getNextNumber: vi.fn(),
}));

vi.mock("@/lib/notifications", () => ({
  notifyInvoiceCreated: vi.fn(),
}));

import * as Sentry from "@sentry/nextjs";
import { db } from "@/lib/db";
import { getNextNumber } from "@/lib/actions/helpers";
import { notifyInvoiceCreated } from "@/lib/notifications";
import { generateRecurringInvoices } from "@/lib/cron/recurring-invoices";

const mockFindMany = vi.mocked(db.contract.findMany);
const mockContractUpdate = vi.mocked(db.contract.update);
const mockInvoiceCreate = vi.mocked(db.invoice.create);
const mockGetNextNumber = vi.mocked(getNextNumber);
const mockNotify = vi.mocked(notifyInvoiceCreated);

function makeContract(overrides: Record<string, unknown> = {}) {
  const now = new Date("2025-01-15");
  return {
    id: "contract-1",
    organizationId: "org-1",
    contractNumber: "CON-001",
    customerId: "cust-1",
    assetId: "asset-1",
    planId: "plan-1",
    billingCycle: "MONTHLY" as const,
    value: 5000,
    startDate: new Date("2024-01-01"),
    endDate: new Date("2026-01-01"),
    nextBillingDate: now,
    lastBilledDate: new Date("2024-12-15"),
    status: "ACTIVE" as const,
    plan: { name: "Basic AMC" },
    asset: { name: "AC Unit #1" },
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetNextNumber.mockResolvedValue("INV-0001");
  mockInvoiceCreate.mockResolvedValue({ id: "inv-new-1" } as never);
  mockContractUpdate.mockResolvedValue({} as never);
  mockNotify.mockResolvedValue(undefined as never);
});

describe("generateRecurringInvoices", () => {
  it("generates an invoice for a contract with nextBillingDate <= today", async () => {
    const contract = makeContract({ nextBillingDate: new Date("2025-01-15") });
    mockFindMany.mockResolvedValue([contract] as never);

    const result = await generateRecurringInvoices(new Date("2025-01-15"));

    expect(result.count).toBe(1);
    expect(result.invoiceIds).toEqual(["inv-new-1"]);
    expect(result.contractIds).toEqual(["contract-1"]);

    expect(mockInvoiceCreate).toHaveBeenCalledOnce();
    const createArg = mockInvoiceCreate.mock.calls[0][0] as { data: Record<string, unknown> };
    expect(createArg.data.organizationId).toBe("org-1");
    expect(createArg.data.customerId).toBe("cust-1");
    expect(createArg.data.contractId).toBe("contract-1");
    expect(createArg.data.amount).toBe(5000);
    expect(createArg.data.status).toBe("ISSUED");
    expect(createArg.data.type).toBe("RECURRING");

    expect(mockContractUpdate).toHaveBeenCalledOnce();
    expect(mockNotify).toHaveBeenCalledWith("inv-new-1");
  });

  it("skips contracts with nextBillingDate in the future", async () => {
    mockFindMany.mockResolvedValue([]);

    const result = await generateRecurringInvoices(new Date("2025-01-15"));

    expect(result.count).toBe(0);
    expect(result.invoiceIds).toEqual([]);
    expect(result.contractIds).toEqual([]);
    expect(mockInvoiceCreate).not.toHaveBeenCalled();
  });

  it("handles zero due contracts gracefully", async () => {
    mockFindMany.mockResolvedValue([]);

    const result = await generateRecurringInvoices();

    expect(result.count).toBe(0);
    expect(result.invoiceIds).toEqual([]);
    expect(result.contractIds).toEqual([]);
  });

  it("continues processing other contracts when one fails", async () => {
    const good = makeContract({ id: "contract-good", nextBillingDate: new Date("2025-01-15") });
    const bad = makeContract({ id: "contract-bad", nextBillingDate: new Date("2025-01-15") });

    mockFindMany.mockResolvedValue([bad, good] as never);

    let callCount = 0;
    mockInvoiceCreate.mockImplementation((() => {
      callCount++;
      if (callCount === 1) {
        throw new Error("DB write failed");
      }
      return { id: "inv-good" } as never;
    }) as never);

    const result = await generateRecurringInvoices(new Date("2025-01-15"));

    // The good contract should still produce an invoice
    expect(result.count).toBe(1);
    expect(result.invoiceIds).toEqual(["inv-good"]);
    expect(vi.mocked(Sentry.captureException)).toHaveBeenCalledOnce();
  });

  it("generates multiple invoices for catch-up billing", async () => {
    // Contract with nextBillingDate 2 months in the past
    const contract = makeContract({
      billingCycle: "MONTHLY",
      nextBillingDate: new Date("2024-11-15"),
      lastBilledDate: new Date("2024-10-15"),
      endDate: new Date("2026-01-01"),
    });
    mockFindMany.mockResolvedValue([contract] as never);

    let invoiceCount = 0;
    mockInvoiceCreate.mockImplementation((() => {
      invoiceCount++;
      return { id: `inv-${invoiceCount}` } as never;
    }) as never);

    // Reference date: Jan 15 2025 — should catch up Nov, Dec, Jan
    const result = await generateRecurringInvoices(new Date("2025-01-15"));

    expect(result.count).toBe(3);
    expect(result.invoiceIds).toEqual(["inv-1", "inv-2", "inv-3"]);
    expect(mockContractUpdate).toHaveBeenCalledOnce();
  });

  it("uses correct invoice number from getNextNumber", async () => {
    const contract = makeContract({ nextBillingDate: new Date("2025-01-15") });
    mockFindMany.mockResolvedValue([contract] as never);
    mockGetNextNumber.mockResolvedValue("INV-0042");

    await generateRecurringInvoices(new Date("2025-01-15"));

    const createArg = mockInvoiceCreate.mock.calls[0][0] as { data: Record<string, unknown> };
    expect(createArg.data.invoiceNumber).toBe("INV-0042");
    expect(mockGetNextNumber).toHaveBeenCalledWith("INV", "org-1", "invoice");
  });
});
