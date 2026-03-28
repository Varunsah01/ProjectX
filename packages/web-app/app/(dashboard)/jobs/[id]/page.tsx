import { getJobDetail } from "@/lib/queries/jobs";
import { listAssets } from "@/lib/queries/assets";
import { getJobFormOptions } from "@/lib/queries/jobs";
import JobDetailPageClient from "./page-client";

export default async function JobDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const [job, options, assets] = await Promise.all([
    getJobDetail(params.id),
    getJobFormOptions(),
    listAssets({ pageSize: 500, sortBy: "name", sortOrder: "asc" }),
  ]);

  return (
    <JobDetailPageClient
      job={job}
      customers={options.customers}
      technicians={options.technicians}
      assets={assets.data}
    />
  );
}
