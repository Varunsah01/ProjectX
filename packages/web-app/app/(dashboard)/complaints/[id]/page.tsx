import { getTicketDetail } from "@/lib/queries/tickets";
import { listAssets } from "@/lib/queries/assets";
import { getTicketFormOptions } from "@/lib/queries/tickets";
import ComplaintDetailPageClient from "./page-client";

export default async function ComplaintDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const [detail, options, assets] = await Promise.all([
    getTicketDetail(params.id),
    getTicketFormOptions(),
    listAssets({ pageSize: 500, sortBy: "name", sortOrder: "asc" }),
  ]);

  return (
    <ComplaintDetailPageClient
      detail={detail}
      customers={options.customers}
      technicians={options.technicians}
      assets={assets.data}
    />
  );
}
