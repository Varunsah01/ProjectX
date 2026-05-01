import { describe, it, expect } from "vitest";
import {
  startOfDay,
  addMonthsPreservingDay,
  addBillingCycle,
  getBillingCycleMonths,
  formatBillingCycleLabel,
  toPrismaBillingCycle,
  toUiBillingCycle,
} from "@/lib/billing";

describe("startOfDay", () => {
  it("zeros out hours/minutes/seconds/ms", () => {
    const d = startOfDay(new Date("2025-06-15T14:30:45.123Z"));
    expect(d.getHours()).toBe(0);
    expect(d.getMinutes()).toBe(0);
    expect(d.getSeconds()).toBe(0);
    expect(d.getMilliseconds()).toBe(0);
  });

  it("does not mutate the input", () => {
    const original = new Date("2025-06-15T14:30:00Z");
    const originalTime = original.getTime();
    startOfDay(original);
    expect(original.getTime()).toBe(originalTime);
  });
});

describe("addMonthsPreservingDay", () => {
  it("adds months preserving the day", () => {
    const result = addMonthsPreservingDay(new Date("2025-01-15"), 1);
    expect(result.getMonth()).toBe(1); // Feb
    expect(result.getDate()).toBe(15);
  });

  it("clamps to last day of month (Jan 31 + 1 month = Feb 28)", () => {
    const result = addMonthsPreservingDay(new Date("2025-01-31"), 1);
    expect(result.getMonth()).toBe(1); // Feb
    expect(result.getDate()).toBe(28);
  });

  it("handles leap year (Jan 31 + 1 month = Feb 29 in leap year)", () => {
    const result = addMonthsPreservingDay(new Date("2024-01-31"), 1);
    expect(result.getMonth()).toBe(1);
    expect(result.getDate()).toBe(29);
  });

  it("adds multiple months", () => {
    const result = addMonthsPreservingDay(new Date("2025-01-15"), 6);
    expect(result.getMonth()).toBe(6); // July
    expect(result.getDate()).toBe(15);
  });

  it("crosses year boundary", () => {
    const result = addMonthsPreservingDay(new Date("2025-11-15"), 3);
    expect(result.getFullYear()).toBe(2026);
    expect(result.getMonth()).toBe(1); // Feb
    expect(result.getDate()).toBe(15);
  });
});

describe("addBillingCycle", () => {
  it("adds 1 month for MONTHLY", () => {
    const result = addBillingCycle(new Date("2025-01-15"), "MONTHLY");
    expect(result.getMonth()).toBe(1);
  });

  it("adds 3 months for QUARTERLY", () => {
    const result = addBillingCycle(new Date("2025-01-15"), "QUARTERLY");
    expect(result.getMonth()).toBe(3);
  });

  it("adds 6 months for HALF_YEARLY", () => {
    const result = addBillingCycle(new Date("2025-01-15"), "HALF_YEARLY");
    expect(result.getMonth()).toBe(6);
  });

  it("adds 12 months for YEARLY", () => {
    const result = addBillingCycle(new Date("2025-01-15"), "YEARLY");
    expect(result.getFullYear()).toBe(2026);
    expect(result.getMonth()).toBe(0);
  });

  it("works with UI-case billing cycles", () => {
    const result = addBillingCycle(new Date("2025-01-15"), "monthly");
    expect(result.getMonth()).toBe(1);
  });
});

describe("getBillingCycleMonths", () => {
  it("returns correct months for each cycle", () => {
    expect(getBillingCycleMonths("MONTHLY")).toBe(1);
    expect(getBillingCycleMonths("QUARTERLY")).toBe(3);
    expect(getBillingCycleMonths("HALF_YEARLY")).toBe(6);
    expect(getBillingCycleMonths("YEARLY")).toBe(12);
  });
});

describe("formatBillingCycleLabel", () => {
  it("formats Prisma enum values", () => {
    expect(formatBillingCycleLabel("MONTHLY")).toBe("Monthly");
    expect(formatBillingCycleLabel("QUARTERLY")).toBe("Quarterly");
    expect(formatBillingCycleLabel("HALF_YEARLY")).toBe("Half-Yearly");
    expect(formatBillingCycleLabel("YEARLY")).toBe("Yearly");
  });

  it("formats UI values", () => {
    expect(formatBillingCycleLabel("monthly")).toBe("Monthly");
    expect(formatBillingCycleLabel("half_yearly")).toBe("Half-Yearly");
  });
});

describe("toPrismaBillingCycle / toUiBillingCycle", () => {
  it("converts UI to Prisma", () => {
    expect(toPrismaBillingCycle("monthly")).toBe("MONTHLY");
    expect(toPrismaBillingCycle("quarterly")).toBe("QUARTERLY");
    expect(toPrismaBillingCycle("half_yearly")).toBe("HALF_YEARLY");
    expect(toPrismaBillingCycle("yearly")).toBe("YEARLY");
  });

  it("converts Prisma to UI", () => {
    expect(toUiBillingCycle("MONTHLY")).toBe("monthly");
    expect(toUiBillingCycle("QUARTERLY")).toBe("quarterly");
    expect(toUiBillingCycle("HALF_YEARLY")).toBe("half_yearly");
    expect(toUiBillingCycle("YEARLY")).toBe("yearly");
  });
});
