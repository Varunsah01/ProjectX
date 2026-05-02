import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { PortalTicket } from "@/lib/portal-types";

export function TicketListCard({ ticket }: { ticket: PortalTicket }) {
  return (
    <Link href={`/tickets/${ticket.id}`}>
      <Card className="hover:border-slate-300 hover:shadow-sm transition-all">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900 truncate">
              {ticket.subject}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              {ticket.ticketNumber} &middot; {ticket.category}
            </p>
          </div>
          <StatusBadge status={ticket.status} />
        </div>
        <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <StatusBadge status={ticket.priority} variant="priority" />
            <span>Created {ticket.createdAt}</span>
          </div>
          {ticket.resolvedAt && <span>Resolved {ticket.resolvedAt}</span>}
        </div>
      </Card>
    </Link>
  );
}
