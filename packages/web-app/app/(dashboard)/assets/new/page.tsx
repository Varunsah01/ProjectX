import { getActiveCustomerOptions } from "@/lib/queries/customers";
import NewAssetPageClient from "./page-client";

export default async function AddAssetPage() {
  const customers = await getActiveCustomerOptions();
  return <NewAssetPageClient customers={customers} />;
}
