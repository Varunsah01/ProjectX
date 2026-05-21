"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, LayoutList, Plus } from "lucide-react";
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
import { bulkAssignJobsAction, bulkCancelJobsAction } from "@/lib/actions/bulk";
import { listJobsAction } from "@/lib/actions/jobs";
import { JobCalendar } from "@/components/ui/JobCalendar";
import { fetchAllExportRows, type ExportColumn } from "@/lib/export";
import { useListUrlState } from "@/lib/use-list-url-state";
import { DEFAULT_PAGE_SIZE } from "@/lib/url-search-params";
import { formatDate } from "@/lib/utils";
import type { Job, PaginatedData, Technician } from "@/lib/types";

const jobExportColumns: ExportColumn<Job>[] = [
  { header: "Job Number", value: (job) => job.jobNumber },
  { header: "Customer", value: (job) => job.customerName },
  { header: "Address", value: (job) => job.customerAddress },
  { header: "Asset", value: (job) => job.assetName ?? "" },
  { header: "Technician", value: (job) => job.technicianName },
  { header: "Type", value: (job) => job.type },
  { header: "Scheduled Date", value: (job) => formatDate(job.scheduledDate) },
  { header: "Status", value: (job) => job.status },
  { header: "Notes", value: (job) => job.notes ?? "" },
];

export default function JobsPageClient({
  jobs,
  technicians,
  params,
}: {
  jobs: PaginatedData<Job>;
  technicians: Technician[];
  params: {
    search: string;
    status: string;
    type: string;
    page: number;
    pageSize: number;
    view: string;
    week: string;
    calTech: string;
  };
}) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false);
  const [technicianId, setTechnicianId] = useState(technicians[0]?.id ?? "");
  const { updateParams } = useListUrlState({
    search: "",
    status: "all",
    type: "all",
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    view: "",
  });

  useEffect(() => {
    setSelectedIds([]);
    setIsAssignModalOpen(false);
    setIsCancelConfirmOpen(false);
  }, [params.search, params.status, params.type]);

  useEffect(() => {
    if (!technicians.some((technician) => technician.id === technicianId)) {
      setTechnicianId(technicians[0]?.id ?? "");
    }
  }, [technicianId, technicians]);

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
    fetchAllExportRows<Job, PaginatedData<Job>>(
      (page, pageSize) =>
        listJobsAction({
          search: params.search || undefined,
          status: params.status !== "all" ? params.status : undefined,
          type: params.type !== "all" ? params.type : undefined,
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
        title="Jobs"
        subtitle={`${jobs.total} total jobs`}
        actions={
          <button
            onClick={() => router.push("/jobs/new")}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700"
          >
            <Plus className="h-4 w-4" />
            Schedule Job
          </button>
        }
      />

      {/* View toggle */}
      <div className="mb-4 flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1 w-fit">
        {(
          [
            { value: "", label: "List", Icon: LayoutList },
            { value: "calendar", label: "Calendar", Icon: CalendarDays },
          ] as const
        ).map(({ value, label, Icon }) => (
          <button
            key={label}
            type="button"
            onClick={() => updateParams({ view: value || null })}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              params.view === value
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Calendar view */}
      {params.view === "calendar" && (
        <JobCalendar
          technicians={technicians}
          initialWeekStr={params.week}
          initialTechId={params.calTech}
        />
      )}

      {/* List view */}
      {params.view !== "calendar" && (
      <>
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <FilterBar
          className="mb-0 flex-1"
          searchValue={params.search}
          onSearchChange={(value) => updateParams({ search: value, page: 1 })}
          searchPlaceholder="Search by customer, technician, or job number..."
          onClearAll={() =>
            updateParams({
              search: "",
              status: "all",
              type: "all",
              page: 1,
            })
          }
          filters={[
            {
              label: "Status",
              value: params.status,
              onChange: (value) => updateParams({ status: value, page: 1 }),
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
              value: params.type,
              onChange: (value) => updateParams({ type: value, page: 1 }),
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
        <ExportMenu
          columns={jobExportColumns}
          filename="jobs-export"
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
            key: "cancel",
            label: "Cancel Jobs",
            onClick: () => setIsCancelConfirmOpen(true),
            disabled: Boolean(pendingAction),
            variant: "danger",
          },
        ]}
      />

      <DataTable<Job>
        page={jobs.page}
        pageSize={jobs.pageSize}
        totalCount={jobs.total}
        totalPages={jobs.totalPages}
        onPageChange={(page) => updateParams({ page })}
        onPageSizeChange={(pageSize) => updateParams({ pageSize, page: 1 })}
        getRowId={(job) => job.id}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        columns={[
          {
            key: "job",
            header: "Job",
            mobilePriority: "primary",
            render: (job) => (
              <div>
                <p className="font-medium text-slate-900">{job.jobNumber}</p>
                <p className="text-xs capitalize text-slate-500">{job.type}</p>
              </div>
            ),
          },
          {
            key: "customer",
            header: "Customer",
            mobilePriority: "secondary",
            render: (job) => (
              <div>
                <p className="text-sm text-slate-700">{job.customerName}</p>
                <p className="max-w-[200px] truncate text-xs text-slate-400">
                  {job.customerAddress}
                </p>
              </div>
            ),
          },
          {
            key: "asset",
            header: "Asset",
            mobilePriority: "hide",
            render: (job) => job.assetName || "-",
          },
          {
            key: "technician",
            header: "Technician",
            mobilePriority: "meta",
            mobileCardLabel: "Assigned to",
            render: (job) => (
              <span className="text-sm font-medium text-slate-700">
                {job.technicianName}
              </span>
            ),
          },
          {
            key: "scheduled",
            header: "Scheduled",
            mobilePriority: "meta",
            mobileCardLabel: "Scheduled",
            render: (job) => formatDate(job.scheduledDate),
          },
          {
            key: "status",
            header: "Status",
            mobilePriority: "meta",
            render: (job) => <StatusBadge status={job.status} />,
          },
        ]}
        data={jobs.data}
        rowHref={(job) => `/jobs/${job.id}`}
      />

      <Modal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        title="Assign Technician"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm leading-6 text-slate-600">
            Assign a technician to {selectedIds.length} selected job
            {selectedIds.length === 1 ? "" : "s"}.
          </p>
          <FormField
            as="select"
            label="Technician"
            name="technicianId"
            value={technicianId}
            onChange={(event) => setTechnicianId(event.target.value)}
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
              disabled={!technicianId}
              loading={pendingAction === "assign"}
              loadingText="Assigning..."
              onClick={async () => {
                await runBulkAction(
                  "assign",
                  bulkAssignJobsAction({ ids: selectedIds, technicianId }),
                  "Jobs assigned",
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
        isOpen={isCancelConfirmOpen}
        onClose={() => setIsCancelConfirmOpen(false)}
        onConfirm={async () => {
          await runBulkAction(
            "cancel",
            bulkCancelJobsAction({ ids: selectedIds }),
            "Jobs cancelled",
          );
          setIsCancelConfirmOpen(false);
        }}
        title="Cancel Selected Jobs"
        description={`Cancel ${selectedIds.length} selected job${selectedIds.length === 1 ? "" : "s"}? This action updates their status to cancelled.`}
        confirmLabel="Cancel Jobs"
        loading={pendingAction === "cancel"}
      />
      </>
      )}
    </div>
  );
}
