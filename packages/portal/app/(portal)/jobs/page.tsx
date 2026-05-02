import { redirect } from "next/navigation";
import { Wrench } from "lucide-react";
import { getPortalSession } from "@/lib/portal-auth";
import { listJobsForCustomer } from "@/lib/queries/jobs";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { JobListCard } from "@/components/jobs/JobListCard";
import { Pagination } from "@/components/ui/Pagination";

export default async function JobsPage({
  searchParams,
}: {
  searchParams: { status?: string; page?: string };
}) {
  const session = await getPortalSession();
  if (!session) redirect("/login");

  const { customerId, organizationId } = session.user;

  const result = await listJobsForCustomer(customerId, organizationId, {
    status: searchParams.status,
    page: searchParams.page ? Number(searchParams.page) : 1,
  });

  return (
    <div>
      <PageHeader
        title="Service Jobs"
        subtitle="Track your service and repair jobs"
      />

      {result.data.length === 0 ? (
        <EmptyState
          icon={Wrench}
          title="No jobs found"
          description="You don't have any service jobs yet."
        />
      ) : (
        <>
          <div className="grid gap-3">
            {result.data.map((job) => (
              <JobListCard key={job.id} job={job} />
            ))}
          </div>

          <Pagination page={result.page} totalPages={result.totalPages} />
        </>
      )}
    </div>
  );
}
