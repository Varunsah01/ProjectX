"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { FilterBar } from "@/components/ui/FilterBar";
import { DataTable } from "@/components/ui/DataTable";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatDate } from "@/lib/utils";
import { jobs, type Job } from "@/lib/mock-data";

export default function JobsPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  const filtered = jobs.filter((j) => {
    const matchSearch =
      j.customerName.toLowerCase().includes(search.toLowerCase()) ||
      j.technicianName.toLowerCase().includes(search.toLowerCase()) ||
      j.jobNumber.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || j.status === statusFilter;
    const matchType = typeFilter === "all" || j.type === typeFilter;
    return matchSearch && matchStatus && matchType;
  });

  return (
    <div>
      <PageHeader
        title="Jobs"
        subtitle={`${jobs.length} total jobs`}
        actions={
          <button
            onClick={() => router.push("/jobs/new")}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Schedule Job
          </button>
        }
      />

      <FilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by customer, technician, or job number..."
        filters={[
          {
            label: "Status",
            value: statusFilter,
            onChange: setStatusFilter,
            options: [
              { label: "All Status", value: "all" },
              { label: "Pending", value: "pending" },
              { label: "Assigned", value: "assigned" },
              { label: "In Progress", value: "in_progress" },
              { label: "Completed", value: "completed" },
              { label: "Cancelled", value: "cancelled" },
            ],
          },
          {
            label: "Type",
            value: typeFilter,
            onChange: setTypeFilter,
            options: [
              { label: "All Types", value: "all" },
              { label: "Complaint", value: "complaint" },
              { label: "Scheduled", value: "scheduled" },
              { label: "Installation", value: "installation" },
              { label: "Inspection", value: "inspection" },
            ],
          },
        ]}
      />

      <DataTable<Job>
        totalCount={jobs.length}
        columns={[
          {
            key: "job",
            header: "Job",
            render: (j) => (
              <div>
                <p className="font-medium text-slate-900">{j.jobNumber}</p>
                <p className="text-xs text-slate-500 capitalize">{j.type}</p>
              </div>
            ),
          },
          {
            key: "customer",
            header: "Customer",
            render: (j) => (
              <div>
                <p className="text-sm text-slate-700">{j.customerName}</p>
                <p className="text-xs text-slate-400 truncate max-w-[200px]">
                  {j.customerAddress}
                </p>
              </div>
            ),
          },
          {
            key: "asset",
            header: "Asset",
            render: (j) => j.assetName || "-",
          },
          {
            key: "technician",
            header: "Technician",
            render: (j) => (
              <span className="text-sm font-medium text-slate-700">
                {j.technicianName}
              </span>
            ),
          },
          {
            key: "scheduled",
            header: "Scheduled",
            render: (j) => formatDate(j.scheduledDate),
          },
          {
            key: "status",
            header: "Status",
            render: (j) => <StatusBadge status={j.status} />,
          },
        ]}
        data={filtered}
        onRowClick={(j) => router.push(`/jobs/${j.id}`)}
      />
    </div>
  );
}
