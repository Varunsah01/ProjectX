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
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { bulkRenewContractsAction } from "@/lib/actions/bulk";
import { listContractsAction } from "@/lib/actions/contracts";
import { fetchAllExportRows, type ExportColumn } from "@/lib/export";
import { useListUrlState } from "@/lib/use-list-url-state";
import { DEFAULT_PAGE_SIZE } from "@/lib/url-search-params";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Contract, PaginatedData } from "@/lib/types";

const contractExportColumns: ExportColumn<Contract>[] = [
  { header: "Contract Number", value: (contract) => contract.contractNumber },
  { header: "Customer", value: (contract) => contract.customerName },
  { header: "Asset", value: (contract) => contract.assetName },
  { header: "Type", value: (contract) => contract.type },
  { header: "Billing Cycle", value: (contract) => contract.billingCycle },
  { header: "Plan", value: (contract) => contract.plan },
  { header: "Start Date", value: (contract) => formatDate(contract.startDate) },
  { header: "End Date", value: (contract) => formatDate(contract.endDate) },
  {
    header: "Next Billing Date",
    value: (contract) => formatDate(contract.nextBillingDate),
  },
  {
    header: "Last Billed Date",
    value: (contract) =>
      contract.lastBilledDate ? formatDate(contract.lastBilledDate) : "",
  },
  { header: "Visits Covered", value: (contract) => contract.visitsCovered },
  { header: "Visits Used", value: (contract) => contract.visitsUsed },
  { header: "Value", value: (contract) => contract.value },
  { header: "Status", value: (contract) => contract.status },
];

export default function ContractsPageClient({
  contracts,
  overview,
  params,
}: {
  contracts: PaginatedData<Contract>;
  overview: {
    total: number;
    expiringSoon: number;
    expired: number;
  };
  params: {
    search: string;
    status: string;
    type: string;
    page: number;
    pageSize: number;
  };
}) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [isRenewConfirmOpen, setIsRenewConfirmOpen] = useState(false);
  const { updateParams } = useListUrlState({
    search: "",
    status: "all",
    type: "all",
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
  });

  useEffect(() => {
    setSelectedIds([]);
    setIsRenewConfirmOpen(false);
  }, [params.search, params.status, params.type]);

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
    fetchAllExportRows<Contract, PaginatedData<Contract>>(
      (page, pageSize) =>
        listContractsAction({
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
        title="Contracts"
        subtitle={`${overview.total} contracts · ${overview.expiringSoon} expiring soon · ${overview.expired} expired`}
        actions={
          <button
            onClick={() => router.push("/contracts/new")}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700"
          >
            <Plus className="h-4 w-4" />
            Create Contract
          </button>
        }
      />

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <FilterBar
          className="mb-0 flex-1"
          searchValue={params.search}
          onSearchChange={(value) => updateParams({ search: value, page: 1 })}
          searchPlaceholder="Search by customer, asset, or contract number..."
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
                { label: "Active", value: "active" },
                { label: "Expiring Soon", value: "expiring_soon" },
                { label: "Expired", value: "expired" },
                { label: "Renewed", value: "renewed" },
                { label: "Cancelled", value: "cancelled" },
              ],
            },
            {
              label: "Type",
              value: params.type,
              onChange: (value) => updateParams({ type: value, page: 1 }),
              options: [
                { label: "All Types", value: "all" },
                { label: "AMC", value: "amc" },
                { label: "Warranty", value: "warranty" },
              ],
            },
          ]}
        />
        <ExportMenu
          columns={contractExportColumns}
          filename="contracts-export"
          loadData={loadExportData}
        />
      </div>

      <BulkActionBar
        selectedCount={selectedIds.length}
        onClear={() => setSelectedIds([])}
        actions={[
          {
            key: "renew",
            label: "Renew Contracts",
            onClick: () => setIsRenewConfirmOpen(true),
            disabled: Boolean(pendingAction),
            variant: "primary",
          },
        ]}
      />

      <DataTable<Contract>
        page={contracts.page}
        pageSize={contracts.pageSize}
        totalCount={contracts.total}
        totalPages={contracts.totalPages}
        onPageChange={(page) => updateParams({ page })}
        onPageSizeChange={(pageSize) => updateParams({ pageSize, page: 1 })}
        getRowId={(contract) => contract.id}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        columns={[
          {
            key: "contract",
            header: "Contract",
            render: (contract) => (
              <div>
                <p className="font-medium text-slate-900">{contract.contractNumber}</p>
                <p className="text-xs uppercase text-slate-500">{contract.type}</p>
              </div>
            ),
          },
          {
            key: "customer",
            header: "Customer",
            render: (contract) => contract.customerName,
          },
          {
            key: "asset",
            header: "Asset",
            render: (contract) => contract.assetName,
          },
          {
            key: "plan",
            header: "Plan",
            render: (contract) => contract.plan,
          },
          {
            key: "period",
            header: "Period",
            render: (contract) => (
              <div className="text-xs">
                <p>{formatDate(contract.startDate)}</p>
                <p className="text-slate-400">to {formatDate(contract.endDate)}</p>
              </div>
            ),
          },
          {
            key: "visits",
            header: "Visits",
            render: (contract) => (
              <div>
                <span className="font-medium">{contract.visitsUsed}</span>
                <span className="text-slate-400"> / {contract.visitsCovered}</span>
              </div>
            ),
          },
          {
            key: "value",
            header: "Value",
            render: (contract) => formatCurrency(contract.value),
          },
          {
            key: "status",
            header: "Status",
            render: (contract) => <StatusBadge status={contract.status} />,
          },
        ]}
        data={contracts.data}
        onRowClick={(contract) => router.push(`/contracts/${contract.id}`)}
      />

      <ConfirmModal
        isOpen={isRenewConfirmOpen}
        onClose={() => setIsRenewConfirmOpen(false)}
        onConfirm={async () => {
          await runBulkAction(
            "renew",
            bulkRenewContractsAction({ ids: selectedIds }),
            "Contracts renewed",
          );
          setIsRenewConfirmOpen(false);
        }}
        title="Renew Selected Contracts"
        description={`Renew ${selectedIds.length} selected contract${selectedIds.length === 1 ? "" : "s"} and reset the next billing cycle.`}
        confirmLabel="Renew"
        loading={pendingAction === "renew"}
      />
    </div>
  );
}
