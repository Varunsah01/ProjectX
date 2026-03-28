"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { FilterBar } from "@/components/ui/FilterBar";
import { DataTable } from "@/components/ui/DataTable";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatDateTime } from "@/lib/utils";
import { tickets, type Ticket } from "@/lib/mock-data";

export default function ComplaintsPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");

  const filtered = tickets.filter((t) => {
    const matchSearch =
      t.subject.toLowerCase().includes(search.toLowerCase()) ||
      t.customerName.toLowerCase().includes(search.toLowerCase()) ||
      t.ticketNumber.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || t.status === statusFilter;
    const matchPriority =
      priorityFilter === "all" || t.priority === priorityFilter;
    return matchSearch && matchStatus && matchPriority;
  });

  const statusCounts = {
    all: tickets.length,
    open: tickets.filter((t) => t.status === "open").length,
    assigned: tickets.filter((t) => t.status === "assigned").length,
    in_progress: tickets.filter((t) => t.status === "in_progress").length,
    on_hold: tickets.filter((t) => t.status === "on_hold").length,
    resolved: tickets.filter((t) => t.status === "resolved").length,
  };

  return (
    <div>
      <PageHeader
        title="Complaints"
        subtitle={`${tickets.length} total tickets`}
        actions={
          <button
            onClick={() => router.push("/complaints/new")}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            <Plus className="h-4 w-4" />
            Log Complaint
          </button>
        }
      />

      {/* Status Pipeline */}
      <div className="mb-6 flex gap-2 overflow-x-auto pb-1">
        {(
          [
            ["all", "All"],
            ["open", "Open"],
            ["assigned", "Assigned"],
            ["in_progress", "In Progress"],
            ["on_hold", "On Hold"],
            ["resolved", "Resolved"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setStatusFilter(key)}
            className={`shrink-0 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              statusFilter === key
                ? "bg-brand-600 text-white"
                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            {label}
            <span className="ml-1.5 opacity-70">
              {statusCounts[key as keyof typeof statusCounts] ?? 0}
            </span>
          </button>
        ))}
      </div>

      <FilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by subject, customer, or ticket number..."
        filters={[
          {
            label: "Priority",
            value: priorityFilter,
            onChange: setPriorityFilter,
            options: [
              { label: "All Priorities", value: "all" },
              { label: "Critical", value: "critical" },
              { label: "High", value: "high" },
              { label: "Medium", value: "medium" },
              { label: "Low", value: "low" },
            ],
          },
        ]}
      />

      <DataTable<Ticket>
        totalCount={tickets.length}
        columns={[
          {
            key: "ticket",
            header: "Ticket",
            render: (t) => (
              <div>
                <p className="font-medium text-slate-900">{t.subject}</p>
                <p className="text-xs text-slate-500">
                  {t.ticketNumber} &middot; {t.category}
                </p>
              </div>
            ),
          },
          {
            key: "customer",
            header: "Customer",
            render: (t) => (
              <div>
                <p className="text-sm text-slate-700">{t.customerName}</p>
                {t.assetName && (
                  <p className="text-xs text-slate-400">{t.assetName}</p>
                )}
              </div>
            ),
          },
          {
            key: "priority",
            header: "Priority",
            render: (t) => <StatusBadge status={t.priority} />,
          },
          {
            key: "assignee",
            header: "Assigned To",
            render: (t) => (
              <span className="text-sm text-slate-600">
                {t.assignedTo || "Unassigned"}
              </span>
            ),
          },
          {
            key: "created",
            header: "Created",
            render: (t) => (
              <span className="text-sm text-slate-600">
                {formatDateTime(t.createdAt)}
              </span>
            ),
          },
          {
            key: "status",
            header: "Status",
            render: (t) => <StatusBadge status={t.status} />,
          },
        ]}
        data={filtered}
        onRowClick={(t) => router.push(`/complaints/${t.id}`)}
      />
    </div>
  );
}
