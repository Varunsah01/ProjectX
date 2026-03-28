import { listAssets } from "@/lib/queries/assets";
import { getJobFormOptions } from "@/lib/queries/jobs";
import CreateJobPageClient from "./page-client";

export default async function CreateJobPage() {
  const [options, assets] = await Promise.all([
    getJobFormOptions(),
    listAssets({ pageSize: 500, sortBy: "name", sortOrder: "asc" }),
  ]);

  return (
    <CreateJobPageClient
      customers={options.customers}
      technicians={options.technicians}
      assets={assets.data}
    />
  );
}
