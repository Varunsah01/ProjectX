import { getDashboardData, getOnboardingStatus } from "@/lib/queries/dashboard";
import type { RevenuePeriod } from "@/lib/types";
import DashboardPageClient from "./page-client";

const VALID_PERIODS: RevenuePeriod[] = ["3m", "6m", "12m", "ytd"];

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { period?: string };
}) {
  const period: RevenuePeriod = VALID_PERIODS.includes(searchParams.period as RevenuePeriod)
    ? (searchParams.period as RevenuePeriod)
    : "6m";
  const [data, onboarding] = await Promise.all([
    getDashboardData(period),
    getOnboardingStatus(),
  ]);
  return <DashboardPageClient data={data} period={period} onboarding={onboarding} />;
}
