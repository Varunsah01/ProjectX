import { getContractDetail } from "@/lib/queries/contracts";
import { listAssets } from "@/lib/queries/assets";
import { getContractFormOptions } from "@/lib/queries/contracts";
import ContractDetailPageClient from "./page-client";

export default async function ContractDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const [detail, options, assets] = await Promise.all([
    getContractDetail(params.id),
    getContractFormOptions(),
    listAssets({ pageSize: 500, sortBy: "name", sortOrder: "asc" }),
  ]);

  return (
    <ContractDetailPageClient
      detail={detail}
      customers={options.customers}
      plans={options.plans}
      assets={assets.data}
    />
  );
}
