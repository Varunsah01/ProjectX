import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getPortalSession } from "@/lib/portal-auth";
import { getContractDetailForCustomer } from "@/lib/queries/contracts";
import { listInvoicesForCustomer } from "@/lib/queries/invoices";
import { ContractDetail } from "@/components/contracts/ContractDetail";

export default async function ContractDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getPortalSession();
  if (!session) redirect("/login");

  const { customerId, organizationId } = session.user;

  const contract = await getContractDetailForCustomer(
    customerId,
    organizationId,
    params.id,
  );

  if (!contract) notFound();

  // Fetch related invoices for this contract
  const relatedInvoices = await listInvoicesForCustomer(
    customerId,
    organizationId,
    { pageSize: 20 },
  );

  // Filter to invoices linked to this contract
  const contractInvoices = relatedInvoices.data.filter(
    (inv) => inv.contractId === contract.id,
  );

  return (
    <div>
      <div className="mb-4">
        <Link
          href="/contracts"
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
      </div>

      <ContractDetail
        contract={contract}
        relatedInvoices={contractInvoices}
      />
    </div>
  );
}
