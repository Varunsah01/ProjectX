import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth-utils";
import { getOrganizationContext } from "@/lib/query-utils";
import { getInvoiceDetail } from "@/lib/queries/invoices";
import { getInvoiceFormOptions } from "@/lib/queries/invoices";
import InvoiceDetailPageClient from "./page-client";

export default async function InvoiceDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const [{ organizationId }, invoice, customers, currentUser] = await Promise.all([
    getOrganizationContext(),
    getInvoiceDetail(params.id),
    getInvoiceFormOptions(),
    getCurrentUser(),
  ]);

  const org = await db.organization.findUniqueOrThrow({
    where: { id: organizationId },
    select: { placeOfBusinessState: true },
  });

  return (
    <InvoiceDetailPageClient
      invoice={invoice}
      customers={customers}
      orgState={org.placeOfBusinessState ?? ""}
      currentRole={currentUser?.role ?? null}
    />
  );
}
