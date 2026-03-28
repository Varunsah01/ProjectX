import { listAssets } from "@/lib/queries/assets";
import { getContractFormOptions } from "@/lib/queries/contracts";
import CreateContractPageClient from "./page-client";

export default async function CreateContractPage() {
  const [options, assets] = await Promise.all([
    getContractFormOptions(),
    listAssets({ pageSize: 500, sortBy: "name", sortOrder: "asc" }),
  ]);

  return (
    <CreateContractPageClient
      customers={options.customers}
      plans={options.plans}
      assets={assets.data}
    />
  );
}
