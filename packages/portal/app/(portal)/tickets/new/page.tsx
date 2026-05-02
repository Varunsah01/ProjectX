import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getPortalSession } from "@/lib/portal-auth";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { TicketForm } from "@/components/tickets/TicketForm";

export default async function NewTicketPage() {
  const session = await getPortalSession();
  if (!session) redirect("/login");

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

      <PageHeader
        title="Raise a Ticket"
        subtitle="Submit a service request, complaint, or query"
      />

      <Card>
        <TicketForm />
      </Card>
    </div>
  );
}
