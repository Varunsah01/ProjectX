import { getCustomerDetail } from "@/lib/queries/customers";
import CustomerDetailPageClient from "./page-client";

export default async function CustomerDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const detail = await getCustomerDetail(params.id);
  return <CustomerDetailPageClient detail={detail} />;
}
