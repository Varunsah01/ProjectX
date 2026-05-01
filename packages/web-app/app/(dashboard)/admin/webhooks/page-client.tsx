"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { DataTable } from "@/components/ui/DataTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatDateTime } from "@/lib/utils";
import {
  getWebhookEventsAction,
  reprocessWebhookEventAction,
} from "@/lib/actions/webhooks";
import type { WebhookEventEntry } from "@/lib/types";

type StatusFilter = "all" | "received" | "processed" | "failed";

const STATUS_FILTERS: { label: string; value: StatusFilter }[] = [
  { label: "All", value: "all" },
  { label: "Received", value: "received" },
  { label: "Processed", value: "processed" },
  { label: "Failed", value: "failed" },
];

interface WebhooksData {
  data: WebhookEventEntry[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export default function WebhooksPageClient({
  initialData,
}: {
  initialData: WebhooksData;
}) {
  const [data, setData] = useState(initialData);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [isPending, startTransition] = useTransition();
  const [reprocessingId, setReprocessingId] = useState<string | null>(null);

  function fetchData(status: StatusFilter, page: number) {
    startTransition(async () => {
      const result = await getWebhookEventsAction({
        status: status === "all" ? undefined : status,
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

  function handleStatusFilter(status: StatusFilter) {
    setStatusFilter(status);
    fetchData(status, 1);
  }

  function handlePageChange(page: number) {
    fetchData(statusFilter, page);
  }

  function handleReprocess(id: string) {
    setReprocessingId(id);
    startTransition(async () => {
      const result = await reprocessWebhookEventAction(id);
      setReprocessingId(null);

      if (result.success) {
        toast.success("Webhook event reprocessed successfully");
        fetchData(statusFilter, data.page);
      } else {
        toast.error(result.error);
      }
    });
  }

  const columns = [
    {
      key: "eventId",
      header: "Event ID",
      className: "min-w-[140px]",
      render: (row: WebhookEventEntry) => (
        <span className="font-mono text-xs" title={row.eventId}>
          {row.eventId.length > 20
            ? `...${row.eventId.slice(-16)}`
            : row.eventId}
        </span>
      ),
    },
    {
      key: "eventType",
      header: "Type",
      render: (row: WebhookEventEntry) => (
        <span className="text-sm">{row.eventType}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (row: WebhookEventEntry) => <StatusBadge status={row.status} />,
    },
    {
      key: "receivedAt",
      header: "Received",
      render: (row: WebhookEventEntry) => (
        <span className="text-sm text-slate-500">
          {formatDateTime(row.receivedAt)}
        </span>
      ),
    },
    {
      key: "processedAt",
      header: "Processed",
      render: (row: WebhookEventEntry) => (
        <span className="text-sm text-slate-500">
          {row.processedAt ? formatDateTime(row.processedAt) : "\u2014"}
        </span>
      ),
    },
    {
      key: "error",
      header: "Error",
      className: "max-w-[200px]",
      render: (row: WebhookEventEntry) =>
        row.error ? (
          <span
            className="text-xs text-red-600 truncate block"
            title={row.error}
          >
            {row.error.length > 60
              ? `${row.error.slice(0, 60)}...`
              : row.error}
          </span>
        ) : null,
    },
    {
      key: "actions",
      header: "",
      className: "w-[120px]",
      render: (row: WebhookEventEntry) =>
        row.status === "failed" ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleReprocess(row.id);
            }}
            disabled={isPending && reprocessingId === row.id}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
          >
            {isPending && reprocessingId === row.id
              ? "Retrying..."
              : "Re-process"}
          </button>
        ) : null,
    },
  ];

  return (
    <div>
      <PageHeader
        title="Webhook Events"
        subtitle="View and manage incoming webhook events from payment providers"
        breadcrumbs={[
          { label: "Settings", href: "/settings" },
          { label: "Webhook Events" },
        ]}
      />

      <div className="mb-4 flex gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1 w-fit">
        {STATUS_FILTERS.map((filter) => (
          <button
            key={filter.value}
            onClick={() => handleStatusFilter(filter.value)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              statusFilter === filter.value
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      <DataTable
        columns={columns}
        data={data.data}
        page={data.page}
        pageSize={data.pageSize}
        totalCount={data.total}
        totalPages={data.totalPages}
        onPageChange={handlePageChange}
        emptyMessage="No webhook events found"
      />
    </div>
  );
}
