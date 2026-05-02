import { redirect } from "next/navigation";
import Link from "next/link";
import { MessageSquare, Plus } from "lucide-react";
import { getPortalSession } from "@/lib/portal-auth";
import { listTicketsForCustomer } from "@/lib/queries/tickets";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { TicketListCard } from "@/components/tickets/TicketListCard";
import { Pagination } from "@/components/ui/Pagination";

export default async function TicketsPage({
  searchParams,
}: {
  searchParams: { status?: string; page?: string };
}) {
  const session = await getPortalSession();
  if (!session) redirect("/login");

  const { customerId, organizationId } = session.user;

  const result = await listTicketsForCustomer(customerId, organizationId, {
    status: searchParams.status,
    page: searchParams.page ? Number(searchParams.page) : 1,
  });

  return (
    <div>
      <PageHeader
        title="Support Tickets"
        subtitle="View and raise support tickets"
        action={
          <Link
            href="/tickets/new"
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Raise Ticket
          </Link>
        }
      />

      {result.data.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title="No tickets found"
          description="You haven't raised any tickets yet."
        />
      ) : (
        <>
          <div className="grid gap-3">
            {result.data.map((ticket) => (
              <TicketListCard key={ticket.id} ticket={ticket} />
            ))}
          </div>

          <Pagination page={result.page} totalPages={result.totalPages} />
        </>
      )}
    </div>
  );
}
