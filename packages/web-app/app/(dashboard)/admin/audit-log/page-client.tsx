"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { DataTable } from "@/components/ui/DataTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatDateTime } from "@/lib/utils";
import { listAuditLogsAction } from "@/lib/actions/audit-logs";
import type { AuditLogEntry } from "@/lib/types";

const ENTITY_OPTIONS = [
  "Customer",
  "Asset",
  "Contract",
  "Invoice",
  "Ticket",
  "Job",
  "Plan",
  "Technician",
  "TeamMember",
  "Organization",
  "NotificationSettings",
  "Refund",
];

const ACTION_OPTIONS = [
  "CREATE",
  "UPDATE",
  "DELETE",
  "STATUS_CHANGE",
  "REFUND",
];

interface AuditLogData {
  data: AuditLogEntry[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

function DiffViewer({ changes }: { changes: Record<string, unknown> }) {
  const entries = Object.entries(changes);

  if (entries.length === 0) {
    return <span className="text-xs text-slate-400">No changes recorded</span>;
  }

  // Handle created/deleted wrapper
  if (entries.length === 1 && (entries[0][0] === "created" || entries[0][0] === "deleted")) {
    const [label, wrapper] = entries[0];
    const inner = wrapper as { before: unknown; after: unknown };
    const data = label === "created" ? inner.after : inner.before;

    if (data && typeof data === "object") {
      return (
        <div className="space-y-1">
          <span className={`text-xs font-medium ${label === "created" ? "text-green-700" : "text-red-700"}`}>
            {label === "created" ? "Created" : "Deleted"}
          </span>
          <div className="grid gap-1">
            {Object.entries(data as Record<string, unknown>).map(([key, value]) => (
              <div key={key} className="flex gap-2 text-xs">
                <span className="font-medium text-slate-600 min-w-[100px]">{key}:</span>
                <span className={label === "created" ? "text-green-700" : "text-red-700"}>
                  {formatValue(value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      );
    }

    return (
      <span className={`text-xs ${label === "created" ? "text-green-700" : "text-red-700"}`}>
        {label}: {formatValue(data)}
      </span>
    );
  }

  // Handle field-level diffs
  return (
    <div className="grid gap-1">
      {entries.map(([field, change]) => {
        const diff = change as { before: unknown; after: unknown };
        return (
          <div key={field} className="flex gap-2 text-xs">
            <span className="font-medium text-slate-600 min-w-[100px]">{field}:</span>
            <span className="text-red-600 line-through">{formatValue(diff.before)}</span>
            <span className="text-slate-400">&rarr;</span>
            <span className="text-green-700">{formatValue(diff.after)}</span>
          </div>
        );
      })}
    </div>
  );
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "null";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export default function AuditLogPageClient({
  initialData,
}: {
  initialData: AuditLogData;
}) {
  const [data, setData] = useState(initialData);
  const [entityFilter, setEntityFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function fetchData(overrides: {
    entity?: string;
    action?: string;
    from?: string;
    to?: string;
    page?: number;
  } = {}) {
    const entity = overrides.entity ?? entityFilter;
    const action = overrides.action ?? actionFilter;
    const from = overrides.from ?? dateFrom;
    const to = overrides.to ?? dateTo;
    const page = overrides.page ?? 1;

    startTransition(async () => {
      const result = await listAuditLogsAction({
        entity: entity || undefined,
        action: action || undefined,
        dateFrom: from || undefined,
        dateTo: to || undefined,
        page,
        pageSize: data.pageSize,
      });

      if (result.success) {
        setData(result.data);
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleEntityChange(value: string) {
    setEntityFilter(value);
    fetchData({ entity: value });
  }

  function handleActionChange(value: string) {
    setActionFilter(value);
    fetchData({ action: value });
  }

  function handleDateFromChange(value: string) {
    setDateFrom(value);
    fetchData({ from: value });
  }

  function handleDateToChange(value: string) {
    setDateTo(value);
    fetchData({ to: value });
  }

  function handleClearFilters() {
    setEntityFilter("");
    setActionFilter("");
    setDateFrom("");
    setDateTo("");
    fetchData({ entity: "", action: "", from: "", to: "" });
  }

  function handlePageChange(page: number) {
    fetchData({ page });
  }

  const hasFilters = entityFilter || actionFilter || dateFrom || dateTo;

  const columns = [
    {
      key: "createdAt",
      header: "Time",
      className: "min-w-[140px]",
      render: (row: AuditLogEntry) => (
        <span className="text-sm text-slate-500">
          {formatDateTime(row.createdAt)}
        </span>
      ),
    },
    {
      key: "user",
      header: "User",
      className: "min-w-[120px]",
      render: (row: AuditLogEntry) => (
        <div>
          <div className="text-sm font-medium text-slate-900">{row.userName}</div>
          <div className="text-xs text-slate-500">{row.userEmail}</div>
        </div>
      ),
    },
    {
      key: "action",
      header: "Action",
      render: (row: AuditLogEntry) => (
        <StatusBadge status={row.action.toLowerCase().replace("_", " ")} />
      ),
    },
    {
      key: "entity",
      header: "Entity",
      render: (row: AuditLogEntry) => (
        <span className="text-sm">{row.entity}</span>
      ),
    },
    {
      key: "entityId",
      header: "Entity ID",
      className: "max-w-[160px]",
      render: (row: AuditLogEntry) => (
        <span className="font-mono text-xs text-slate-500" title={row.entityId}>
          {row.entityId.length > 12
            ? `${row.entityId.slice(0, 8)}...`
            : row.entityId}
        </span>
      ),
    },
    {
      key: "expand",
      header: "",
      className: "w-[80px]",
      render: (row: AuditLogEntry) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setExpandedId(expandedId === row.id ? null : row.id);
          }}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
        >
          {expandedId === row.id ? "Hide" : "Details"}
        </button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Audit Log"
        subtitle="View all changes made across the system"
        breadcrumbs={[
          { label: "Settings", href: "/settings" },
          { label: "Audit Log" },
        ]}
      />

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Entity</label>
          <select
            value={entityFilter}
            onChange={(e) => handleEntityChange(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            <option value="">All entities</option>
            {ENTITY_OPTIONS.map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Action</label>
          <select
            value={actionFilter}
            onChange={(e) => handleActionChange(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            <option value="">All actions</option>
            {ACTION_OPTIONS.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">From</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => handleDateFromChange(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">To</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => handleDateToChange(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>

        {hasFilters && (
          <button
            onClick={handleClearFilters}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
          >
            Clear filters
          </button>
        )}
      </div>

      <DataTable
        columns={columns}
        data={data.data}
        page={data.page}
        pageSize={data.pageSize}
        totalCount={data.total}
        totalPages={data.totalPages}
        onPageChange={handlePageChange}
        emptyMessage="No audit log entries found"
        renderExpandedRow={(row: AuditLogEntry) =>
          expandedId === row.id ? (
            <tr key={`${row.id}-detail`}>
              <td colSpan={columns.length} className="bg-slate-50 px-6 py-4 border-b border-slate-100">
                <DiffViewer changes={row.changes} />
              </td>
            </tr>
          ) : null
        }
      />
    </div>
  );
}
