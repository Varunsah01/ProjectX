import { redirect } from "next/navigation";
import { Shield } from "lucide-react";
import { getPortalSession } from "@/lib/portal-auth";
import { listContractsForCustomer } from "@/lib/queries/contracts";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { ContractListCard } from "@/components/contracts/ContractListCard";
import { Pagination } from "@/components/ui/Pagination";

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
  );
}
