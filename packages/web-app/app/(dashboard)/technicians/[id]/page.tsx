import { getCurrentUser } from "@/lib/auth-utils";
import { getTechnicianDetail } from "@/lib/queries/technicians";
import TechnicianDetailPageClient from "./page-client";

export default async function TechnicianDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const [detail, user] = await Promise.all([
    getTechnicianDetail(params.id),
    getCurrentUser(),
  ]);
  return (
    <TechnicianDetailPageClient
      detail={detail}
      currentRole={user?.role ?? null}
    />
  );
}
