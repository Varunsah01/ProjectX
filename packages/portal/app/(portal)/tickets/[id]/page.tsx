import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getPortalSession } from "@/lib/portal-auth";
import { getTicketDetailForCustomer } from "@/lib/queries/tickets";
import { TicketDetail } from "@/components/tickets/TicketDetail";

export default async function TicketDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getPortalSession();
  if (!session) redirect("/login");

  const { customerId, organizationId } = session.user;

  const ticket = await getTicketDetailForCustomer(
    customerId,
    organizationId,
    params.id,
  );

  if (!ticket) notFound();

  return (
    <div>
      <div className="mb-4">
        <Link
          href="/tickets"
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
      </div>

      <TicketDetail ticket={ticket} />
    </div>
  );
}
