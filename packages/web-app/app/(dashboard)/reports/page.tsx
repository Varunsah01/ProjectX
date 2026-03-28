import { getReportsData } from "@/lib/queries/reports";
import ReportsPageClient from "./page-client";

export default async function ReportsPage() {
  const data = await getReportsData();
  return <ReportsPageClient data={data} />;
}
