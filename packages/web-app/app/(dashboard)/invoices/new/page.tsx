import { getInvoiceFormOptions } from "@/lib/queries/invoices";
import NewInvoicePageClient from "./page-client";

export default async function NewInvoicePage() {
  const customers = await getInvoiceFormOptions();
  return <NewInvoicePageClient customers={customers} />;
}
