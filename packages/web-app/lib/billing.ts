import type { BillingCycle as PrismaBillingCycle } from "@prisma/client";

export const BILLING_CYCLE_OPTIONS = [
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "half_yearly", label: "Half-Yearly" },
  { value: "yearly", label: "Yearly" },
] as const;

export type UiBillingCycle = (typeof BILLING_CYCLE_OPTIONS)[number]["value"];

const MONTHS_BY_CYCLE: Record<UiBillingCycle, number> = {
  monthly: 1,
  quarterly: 3,
  half_yearly: 6,
  yearly: 12,
};

const UI_TO_PRISMA: Record<UiBillingCycle, PrismaBillingCycle> = {
  monthly: "MONTHLY",
  quarterly: "QUARTERLY",
  half_yearly: "HALF_YEARLY",
  yearly: "YEARLY",
};

const PRISMA_TO_UI: Record<PrismaBillingCycle, UiBillingCycle> = {
  MONTHLY: "monthly",
  QUARTERLY: "quarterly",
  HALF_YEARLY: "half_yearly",
  YEARLY: "yearly",
};

export function toPrismaBillingCycle(cycle: UiBillingCycle): PrismaBillingCycle {
  return UI_TO_PRISMA[cycle];
}

export function toUiBillingCycle(cycle: PrismaBillingCycle): UiBillingCycle {
  return PRISMA_TO_UI[cycle];
}

export function formatBillingCycleLabel(cycle: UiBillingCycle | PrismaBillingCycle) {
  const uiCycle =
    typeof cycle === "string" && cycle === cycle.toUpperCase()
      ? toUiBillingCycle(cycle as PrismaBillingCycle)
      : (cycle as UiBillingCycle);

  return BILLING_CYCLE_OPTIONS.find((option) => option.value === uiCycle)?.label ?? uiCycle;
}

export function getBillingCycleMonths(cycle: UiBillingCycle | PrismaBillingCycle) {
  const uiCycle =
    typeof cycle === "string" && cycle === cycle.toUpperCase()
      ? toUiBillingCycle(cycle as PrismaBillingCycle)
      : (cycle as UiBillingCycle);

  return MONTHS_BY_CYCLE[uiCycle];
}

export function startOfDay(value: Date) {
  const next = new Date(value);
  next.setHours(0, 0, 0, 0);
  return next;
}

export function addMonthsPreservingDay(value: Date, months: number) {
  const next = startOfDay(value);
  const originalDay = next.getDate();

  next.setDate(1);
  next.setMonth(next.getMonth() + months);

  const lastDayOfMonth = new Date(
    next.getFullYear(),
    next.getMonth() + 1,
    0,
  ).getDate();

  next.setDate(Math.min(originalDay, lastDayOfMonth));
  return next;
}

export function addBillingCycle(
  value: Date,
  cycle: UiBillingCycle | PrismaBillingCycle,
) {
  return addMonthsPreservingDay(value, getBillingCycleMonths(cycle));
}
