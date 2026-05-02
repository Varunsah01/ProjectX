import { redirect } from "next/navigation";
import { FileText } from "lucide-react";
import { getPortalSession } from "@/lib/portal-auth";
import { listInvoicesForCustomer } from "@/lib/queries/invoices";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { InvoiceStatusFilter } from "@/components/invoices/InvoiceStatusFilter";
import { InvoiceListCard } from "@/components/invoices/InvoiceListCard";
import { Pagination } from "@/components/ui/Pagination";

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: { status?: string; page?: string; search?: string };
}) {
  const session = await getPortalSession();
  if (!session) redirect("/login");

  const { customerId, organizationId } = session.user;

  const result = await listInvoicesForCustomer(customerId, organizationId, {
    status: searchParams.status,
    page: searchParams.page ? Number(searchParams.page) : 1,
    search: searchParams.search,
  });

  return (
    <div>
      <PageHeader title="Invoices" subtitle="View and pay your invoices" />

      <div className="mb-4">
        <InvoiceStatusFilter />
      </div>

      {result.data.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No invoices found"
          description={
            searchParams.status
              ? "No invoices match the selected filter."
              : "You don't have any invoices yet."
          }
        />
      ) : (
        <>
          <div className="grid gap-3">
            {result.data.map((invoice) => (
              <InvoiceListCard key={invoice.id} invoice={invoice} />
            ))}
          </div>

          <Pagination page={result.page} totalPages={result.totalPages} />
        </>
      )}
    </div>
  );
}
