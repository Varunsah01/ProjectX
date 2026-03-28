import { getTechnicianDetail } from "@/lib/queries/technicians";
import TechnicianDetailPageClient from "./page-client";

export default async function TechnicianDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const detail = await getTechnicianDetail(params.id);
  return <TechnicianDetailPageClient detail={detail} />;
}
