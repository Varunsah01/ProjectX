"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { BulkActionBar } from "@/components/ui/BulkActionBar";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { DataTable } from "@/components/ui/DataTable";
import { ExportMenu } from "@/components/ui/ExportMenu";
import { FilterBar } from "@/components/ui/FilterBar";
import { FormField } from "@/components/ui/FormField";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { bulkAssignTicketsAction, bulkCloseTicketsAction } from "@/lib/actions/bulk";
import { listTicketsAction } from "@/lib/actions/tickets";
import { fetchAllExportRows, type ExportColumn } from "@/lib/export";
import { useListUrlState } from "@/lib/use-list-url-state";
import { DEFAULT_PAGE_SIZE } from "@/lib/url-search-params";
import { formatDateTime } from "@/lib/utils";
import type { PaginatedData, Technician, Ticket } from "@/lib/types";

const complaintExportColumns: ExportColumn<Ticket>[] = [
  { header: "Ticket Number", value: (ticket) => ticket.ticketNumber },
  { header: "Subject", value: (ticket) => ticket.subject },
  { header: "Customer", value: (ticket) => ticket.customerName },
  { header: "Asset", value: (ticket) => ticket.assetName ?? "" },
  { header: "Category", value: (ticket) => ticket.category },
  { header: "Priority", value: (ticket) => ticket.priority },
  { header: "Status", value: (ticket) => ticket.status },
  { header: "Assigned To", value: (ticket) => ticket.assignedTo ?? "" },
  { header: "Created At", value: (ticket) => formatDateTime(ticket.createdAt) },
  {
    header: "Resolved At",
    value: (ticket) => (ticket.resolvedAt ? formatDateTime(ticket.resolvedAt) : ""),
  },
];

export default function ComplaintsPageClient({
  tickets,
  technicians,
  statusCounts,
  params,
}: {
  tickets: PaginatedData<Ticket>;
  technicians: Technician[];
  statusCounts: Record<string, number>;
  params: {
    search: string;
    status: string;
    priority: string;
    page: number;
    pageSize: number;
  };
}) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isCloseConfirmOpen, setIsCloseConfirmOpen] = useState(false);
  const [assignedToId, setAssignedToId] = useState(technicians[0]?.id ?? "");
  const { updateParams } = useListUrlState({
    search: "",
    status: "all",
    priority: "all",
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
  });

  useEffect(() => {
    setSelectedIds([]);
    setIsAssignModalOpen(false);
    setIsCloseConfirmOpen(false);
  }, [params.search, params.status, params.priority]);

  useEffect(() => {
    if (!technicians.some((technician) => technician.id === assignedToId)) {
      setAssignedToId(technicians[0]?.id ?? "");
    }
  }, [assignedToId, technicians]);

  const runBulkAction = async <T,>(
    key: string,
    action: Promise<{ success: boolean; data?: T; error?: string }>,
    successMessage: string,
  ) => {
    if (pendingAction) {
      return;
    }

    setPendingAction(key);

    try {
      const result = await action;

      if (!result.success) {
        toast.error(result.error ?? "Bulk action failed");
        return;
      }

      toast.success(successMessage);
      setSelectedIds([]);
      router.refresh();
    } finally {
      setPendingAction(null);
    }
  };

  const loadExportData = () =>
    fetchAllExportRows<Ticket, PaginatedData<Ticket>>(
      (page, pageSize) =>
        listTicketsAction({
          search: params.search || undefined,
          status: params.status !== "all" ? params.status : undefined,
          type: params.priority !== "all" ? params.priority : undefined,
          page,
          pageSize,
          sortBy: "createdAt",
          sortOrder: "desc",
        }),
      {
        getRows: (pageData) => pageData.data,
        getTotalPages: (pageData) => pageData.totalPages,
      },
    );

  return (
    <div>
      <PageHeader
        title="Complaints"
        subtitle={`${statusCounts.all ?? tickets.total} total tickets`}
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
            onClick={() => updateParams({ status: key, page: 1 })}
            className={`shrink-0 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              params.status === key
                ? "bg-brand-600 text-white"
                : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            {label}
            <span className="ml-1.5 opacity-70">
              {statusCounts[key as keyof typeof statusCounts] ?? 0}
            </span>
          </button>
        ))}
      </div>

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <FilterBar
          className="mb-0 flex-1"
          searchValue={params.search}
          onSearchChange={(value) => updateParams({ search: value, page: 1 })}
          searchPlaceholder="Search by subject, customer, or ticket number..."
          onClearAll={() =>
            updateParams({
              search: "",
              status: "all",
              priority: "all",
              page: 1,
            })
          }
          filters={[
            {
              label: "Priority",
              value: params.priority,
              onChange: (value) => updateParams({ priority: value, page: 1 }),
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
        <ExportMenu
          columns={complaintExportColumns}
          filename="complaints-export"
          loadData={loadExportData}
        />
      </div>

      <BulkActionBar
        selectedCount={selectedIds.length}
        onClear={() => setSelectedIds([])}
        actions={[
          {
            key: "assign",
            label: "Assign Technician",
            onClick: () => setIsAssignModalOpen(true),
            disabled: Boolean(pendingAction) || technicians.length === 0,
            variant: "primary",
          },
          {
            key: "close",
            label: "Close Complaints",
            onClick: () => setIsCloseConfirmOpen(true),
            disabled: Boolean(pendingAction),
            variant: "danger",
          },
        ]}
      />

      <DataTable<Ticket>
        page={tickets.page}
        pageSize={tickets.pageSize}
        totalCount={tickets.total}
        totalPages={tickets.totalPages}
        onPageChange={(page) => updateParams({ page })}
        onPageSizeChange={(pageSize) => updateParams({ pageSize, page: 1 })}
        getRowId={(ticket) => ticket.id}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        columns={[
          {
            key: "ticket",
            header: "Ticket",
            render: (ticket) => (
              <div>
                <p className="font-medium text-slate-900">{ticket.subject}</p>
                <p className="text-xs text-slate-500">
                  {ticket.ticketNumber} · {ticket.category}
                </p>
              </div>
            ),
          },
          {
            key: "customer",
            header: "Customer",
            render: (ticket) => (
              <div>
                <p className="text-sm text-slate-700">{ticket.customerName}</p>
                {ticket.assetName && (
                  <p className="text-xs text-slate-400">{ticket.assetName}</p>
                )}
              </div>
            ),
          },
          {
            key: "priority",
            header: "Priority",
            render: (ticket) => <StatusBadge status={ticket.priority} />,
          },
          {
            key: "assignee",
            header: "Assigned To",
            render: (ticket) => (
              <span className="text-sm text-slate-600">
                {ticket.assignedTo || "Unassigned"}
              </span>
            ),
          },
          {
            key: "created",
            header: "Created",
            render: (ticket) => (
              <span className="text-sm text-slate-600">
                {formatDateTime(ticket.createdAt)}
              </span>
            ),
          },
          {
            key: "status",
            header: "Status",
            render: (ticket) => <StatusBadge status={ticket.status} />,
          },
        ]}
        data={tickets.data}
        onRowClick={(ticket) => router.push(`/complaints/${ticket.id}`)}
      />

      <Modal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        title="Assign Technician"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm leading-6 text-slate-600">
            Assign a technician to {selectedIds.length} selected complaint
            {selectedIds.length === 1 ? "" : "s"}.
          </p>
          <FormField
            as="select"
            label="Technician"
            name="assignedToId"
            value={assignedToId}
            onChange={(event) => setAssignedToId(event.target.value)}
            options={[
              { value: "", label: "Select technician" },
              ...technicians.map((technician) => ({
                value: technician.id,
                label: technician.name,
              })),
            ]}
          />
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              disabled={Boolean(pendingAction)}
              onClick={() => setIsAssignModalOpen(false)}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
            >
              Cancel
            </button>
            <SubmitButton
              type="button"
              disabled={!assignedToId}
              loading={pendingAction === "assign"}
              loadingText="Assigning..."
              onClick={async () => {
                await runBulkAction(
                  "assign",
                  bulkAssignTicketsAction({ ids: selectedIds, assignedToId }),
                  "Complaints assigned",
                );
                setIsAssignModalOpen(false);
              }}
            >
              Assign Technician
            </SubmitButton>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        isOpen={isCloseConfirmOpen}
        onClose={() => setIsCloseConfirmOpen(false)}
        onConfirm={async () => {
          await runBulkAction(
            "close",
            bulkCloseTicketsAction({ ids: selectedIds }),
            "Complaints closed",
          );
          setIsCloseConfirmOpen(false);
        }}
        title="Close Selected Complaints"
        description={`Close ${selectedIds.length} selected complaint${selectedIds.length === 1 ? "" : "s"}?`}
        confirmLabel="Close Complaints"
        loading={pendingAction === "close"}
      />
    </div>
  );
}
