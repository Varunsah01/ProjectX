import { StatusBadge } from "@/components/ui/StatusBadge";
import { Card } from "@/components/ui/Card";
import { TicketTimeline } from "@/components/tickets/TicketTimeline";
import type { PortalTicket } from "@/lib/portal-types";

export function TicketDetail({ ticket }: { ticket: PortalTicket }) {
  return (
    <div className="space-y-4">
      <Card>
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="text-lg font-semibold text-slate-900">
              {ticket.subject}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              {ticket.ticketNumber} &middot; {ticket.category}
            </p>
          </div>
          <StatusBadge status={ticket.status} />
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs text-slate-500">Priority</p>
            <StatusBadge status={ticket.priority} variant="priority" />
          </div>
          <div>
            <p className="text-xs text-slate-500">Created</p>
            <p className="font-medium text-slate-900">{ticket.createdAt}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">SLA Deadline</p>
            <p className="font-medium text-slate-900">{ticket.slaDeadline}</p>
          </div>
          {ticket.resolvedAt && (
            <div>
              <p className="text-xs text-slate-500">Resolved</p>
              <p className="font-medium text-green-600">
                {ticket.resolvedAt}
              </p>
            </div>
          )}
          {ticket.assetName && (
            <div>
              <p className="text-xs text-slate-500">Asset</p>
              <p className="font-medium text-slate-900">{ticket.assetName}</p>
            </div>
          )}
        </div>
      </Card>

      <Card>
        <h3 className="text-sm font-semibold text-slate-900 mb-2">
          Description
        </h3>
        <p className="text-sm text-slate-700 whitespace-pre-wrap">
          {ticket.description}
        </p>
      </Card>

      {ticket.timeline.length > 0 && (
        <Card>
          <h3 className="text-sm font-semibold text-slate-900 mb-4">
            Timeline
          </h3>
          <TicketTimeline entries={ticket.timeline} />
        </Card>
      )}
    </div>
  );
}
