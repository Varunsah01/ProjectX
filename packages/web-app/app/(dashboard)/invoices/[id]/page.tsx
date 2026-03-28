import { getInvoiceDetail } from "@/lib/queries/invoices";
import { getInvoiceFormOptions } from "@/lib/queries/invoices";
import InvoiceDetailPageClient from "./page-client";

export default async function InvoiceDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const [invoice, customers] = await Promise.all([
    getInvoiceDetail(params.id),
    getInvoiceFormOptions(),
  ]);

  return <InvoiceDetailPageClient invoice={invoice} customers={customers} />;
}
