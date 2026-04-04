import { getAssetDetail } from "@/lib/queries/assets";
import { listCustomers } from "@/lib/queries/customers";
import { getJobFormOptions } from "@/lib/queries/jobs";
import AssetDetailPageClient from "./page-client";

export default async function AssetDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const [detail, customers, formOptions] = await Promise.all([
    getAssetDetail(params.id),
    listCustomers({ pageSize: 500, sortBy: "name", sortOrder: "asc" }),
    getJobFormOptions(),
  ]);

  return (
    <AssetDetailPageClient
      detail={detail}
      customers={customers.data.map((customer) => ({
        id: customer.id,
        name: customer.name,
        city: customer.city,
      }))}
      technicians={formOptions.technicians.map((t) => ({ id: t.id, name: t.name }))}
    />
  );
}
