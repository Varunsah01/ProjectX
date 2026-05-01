import { db } from "@/lib/db";
import { getOrganizationContext } from "@/lib/query-utils";
import { getInvoiceFormOptions } from "@/lib/queries/invoices";
import NewInvoicePageClient from "./page-client";

export default async function NewInvoicePage() {
  const [{ organizationId }, customers] = await Promise.all([
    getOrganizationContext(),
    getInvoiceFormOptions(),
  ]);

  const org = await db.organization.findUniqueOrThrow({
    where: { id: organizationId },
    select: { placeOfBusinessState: true },
  });

  return (
    <NewInvoicePageClient
      customers={customers}
      orgState={org.placeOfBusinessState ?? ""}
    />
  );
}
