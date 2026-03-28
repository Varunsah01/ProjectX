"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Clock, User, Package, AlertCircle } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatDateTime } from "@/lib/utils";
import { tickets, technicians } from "@/lib/mock-data";

export default function ComplaintDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const ticket = tickets.find((t) => t.id === id);

  if (!ticket) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-lg text-slate-500">Complaint not found</p>
        <button
          onClick={() => router.push("/complaints")}
          className="mt-4 text-sm text-brand-600 hover:underline"
        >
          Back to complaints
        </button>
      </div>
    );
  }

  const availableTechs = technicians.filter(
    (t) => t.status === "available" || t.id === ticket.assignedTechnicianId
  );

  return (
    <div>
      <PageHeader
        title={ticket.ticketNumber}
        breadcrumbs={[
          { label: "Complaints", href: "/complaints" },
          { label: ticket.ticketNumber },
        ]}
        actions={
          <div className="flex items-center gap-2">
            {!["resolved", "closed"].includes(ticket.status) && (
              <>
                <button className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700">
                  Mark Resolved
                </button>
                <button className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                  Escalate
                </button>
              </>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="space-y-6 lg:col-span-2">
          {/* Ticket Info */}
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  {ticket.subject}
                </h2>
                <p className="mt-1 text-sm text-slate-500">{ticket.category}</p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={ticket.priority} />
                <StatusBadge status={ticket.status} />
              </div>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">
              {ticket.description}
            </p>
          </div>

          {/* Timeline */}
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <h3 className="font-semibold text-slate-900 mb-4">Timeline</h3>
            <div className="relative space-y-0">
              {ticket.timeline.map((event, i) => (
                <div key={i} className="flex gap-4 pb-6 last:pb-0">
                  <div className="flex flex-col items-center">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-100">
                      <Clock className="h-4 w-4 text-brand-600" />
                    </div>
                    {i < ticket.timeline.length - 1 && (
                      <div className="w-px flex-1 bg-slate-200 mt-2" />
                    )}
                  </div>
                  <div className="flex-1 pt-1">
                    <p className="text-sm font-medium text-slate-900">
                      {event.action}
                    </p>
                    <p className="text-xs text-slate-500">
                      By {event.by} &middot; {formatDateTime(event.date)}
                    </p>
                    {event.note && (
                      <p className="mt-1 text-sm text-slate-600 bg-slate-50 rounded-lg p-3">
                        {event.note}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Details */}
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <h3 className="font-semibold text-slate-900 mb-4">Details</h3>
            <div className="space-y-4">
              <DetailRow
                icon={User}
                label="Customer"
                value={ticket.customerName}
                href={`/customers/${ticket.customerId}`}
              />
              {ticket.assetName && (
                <DetailRow
                  icon={Package}
                  label="Asset"
                  value={ticket.assetName}
                  href={ticket.assetId ? `/assets/${ticket.assetId}` : undefined}
                />
              )}
              <DetailRow
                icon={AlertCircle}
                label="Priority"
                value={
                  <StatusBadge status={ticket.priority} />
                }
              />
              <DetailRow
                icon={Clock}
                label="SLA Deadline"
                value={formatDateTime(ticket.slaDeadline)}
              />
              <DetailRow
                icon={Clock}
                label="Created"
                value={formatDateTime(ticket.createdAt)}
              />
              {ticket.resolvedAt && (
                <DetailRow
                  icon={Clock}
                  label="Resolved"
                  value={formatDateTime(ticket.resolvedAt)}
                />
              )}
            </div>
          </div>

          {/* Assignment */}
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <h3 className="font-semibold text-slate-900 mb-3">Assignment</h3>
            {ticket.assignedTo ? (
              <div className="flex items-center gap-3 rounded-lg bg-slate-50 p-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 font-semibold text-brand-700 text-sm">
                  {ticket.assignedTo
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    {ticket.assignedTo}
                  </p>
                  <p className="text-xs text-slate-500">Technician</p>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-sm text-slate-500 mb-3">
                  No technician assigned
                </p>
                <select className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500">
                  <option value="">Assign technician...</option>
                  {availableTechs.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.territory})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
  href?: string;
}) {
  const content =
    typeof value === "string" && href ? (
      <Link href={href} className="text-brand-600 hover:underline text-sm">
        {value}
      </Link>
    ) : typeof value === "string" ? (
      <span className="text-sm text-slate-900">{value}</span>
    ) : (
      value
    );

  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 h-4 w-4 text-slate-400 shrink-0" />
      <div>
        <p className="text-xs text-slate-500">{label}</p>
        <div className="mt-0.5">{content}</div>
      </div>
    </div>
  );
}
