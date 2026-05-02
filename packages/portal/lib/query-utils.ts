import type { BillingCycle as PrismaBillingCycle } from "@prisma/client";

export function toDateString(date: Date | null | undefined): string {
  if (!date) return "";
  return date.toISOString().slice(0, 10);
}

export function toDateTimeString(date: Date | null | undefined): string {
  if (!date) return "";
  return date.toISOString();
}

export function enumToUi<T extends string>(value: T): Lowercase<T> {
  return value.toLowerCase() as Lowercase<T>;
}

export function buildContains(value: string) {
  return { contains: value, mode: "insensitive" as const };
}

const BILLING_CYCLE_MAP: Record<PrismaBillingCycle, string> = {
  MONTHLY: "monthly",
  QUARTERLY: "quarterly",
  HALF_YEARLY: "half_yearly",
  YEARLY: "yearly",
};

export function toUiBillingCycle(cycle: PrismaBillingCycle): string {
  return BILLING_CYCLE_MAP[cycle] ?? cycle.toLowerCase();
}

export function normalizeListParams(params: {
  search?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}) {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, params.pageSize ?? 20));

  return {
    search: params.search?.trim() ?? "",
    status: params.status?.trim() ?? "",
    page,
    pageSize,
    skip: (page - 1) * pageSize,
    take: pageSize,
  };
}
