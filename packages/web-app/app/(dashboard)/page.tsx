import { getDashboardData } from "@/lib/queries/dashboard";
import DashboardPageClient from "./page-client";

export default async function DashboardPage() {
  const data = await getDashboardData();
  return <DashboardPageClient data={data} />;
}
