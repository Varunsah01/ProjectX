import { redirect } from "next/navigation";
import { Shield } from "lucide-react";
import { getPortalSession } from "@/lib/portal-auth";
import { listContractsForCustomer } from "@/lib/queries/contracts";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { ContractListCard } from "@/components/contracts/ContractListCard";
import { Pagination } from "@/components/ui/Pagination";
import { FeatureGate } from "@/components/ui/FeatureGate";

function ComingSoon() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="mb-4 rounded-full bg-slate-100 p-4">
        <Shield className="h-8 w-8 text-slate-400" />
      </div>
      <h2 className="text-lg font-semibold text-slate-700">Contracts</h2>
      <p className="mt-1 text-sm text-slate-500">This section is coming soon.</p>
    </div>
  );
}

export default async function ContractsPage({
  searchParams,
}: {
  searchParams: { status?: string; page?: string };
}) {
  const session = await getPortalSession();
  if (!session) redirect("/login");

  const { customerId, organizationId } = session.user;

  const result = await listContractsForCustomer(customerId, organizationId, {
    status: searchParams.status,
    page: searchParams.page ? Number(searchParams.page) : 1,
  });

  return (
    <FeatureGate flag="portal.contracts" fallback={<ComingSoon />}>
    <div>
      <PageHeader
        title="Contracts"
        subtitle="Your AMC and warranty contracts"
      />

      {result.data.length === 0 ? (
        <EmptyState
          icon={Shield}
          title="No contracts found"
          description="You don't have any active contracts."
        />
      ) : (
        <>
          <div className="grid gap-3">
            {result.data.map((contract) => (
              <ContractListCard key={contract.id} contract={contract} />
            ))}
          </div>

          <Pagination page={result.page} totalPages={result.totalPages} />
        </>
      )}
    </div>
    </FeatureGate>
  );
}
