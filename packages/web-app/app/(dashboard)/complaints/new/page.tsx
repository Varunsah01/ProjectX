import { listAssets } from "@/lib/queries/assets";
import { getTicketFormOptions } from "@/lib/queries/tickets";
import NewComplaintPageClient from "./page-client";

export default async function NewComplaintPage() {
  const [options, assets] = await Promise.all([
    getTicketFormOptions(),
    listAssets({ pageSize: 500, sortBy: "name", sortOrder: "asc" }),
  ]);

  return (
    <NewComplaintPageClient
      customers={options.customers}
      technicians={options.technicians}
      assets={assets.data}
    />
  );
}
