import { getAssetDetail } from "@/lib/queries/assets";
import { listCustomers } from "@/lib/queries/customers";
import AssetDetailPageClient from "./page-client";

export default async function AssetDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const [detail, customers] = await Promise.all([
    getAssetDetail(params.id),
    listCustomers({ pageSize: 500, sortBy: "name", sortOrder: "asc" }),
  ]);

  return (
    <AssetDetailPageClient
      detail={detail}
      customers={customers.data.map((customer) => ({
        id: customer.id,
        name: customer.name,
        city: customer.city,
      }))}
    />
  );
}
