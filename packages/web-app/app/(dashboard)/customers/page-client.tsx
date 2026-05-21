"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Upload } from "lucide-react";
import { toast } from "sonner";
import { BulkActionBar } from "@/components/ui/BulkActionBar";
import { DataTable } from "@/components/ui/DataTable";
import { ExportMenu } from "@/components/ui/ExportMenu";
import { FilterBar } from "@/components/ui/FilterBar";
import { FormField } from "@/components/ui/FormField";
import { ImportModal } from "@/components/ui/ImportModal";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { bulkUpdateCustomerStatusAction } from "@/lib/actions/bulk";
import { listCustomersAction } from "@/lib/actions/customers";
import { fetchAllExportRows, type ExportColumn } from "@/lib/export";
import { useListUrlState } from "@/lib/use-list-url-state";
import { DEFAULT_PAGE_SIZE } from "@/lib/url-search-params";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Customer, PaginatedData } from "@/lib/types";

const customerExportColumns: ExportColumn<Customer>[] = [
  { header: "Name", value: (customer) => customer.name },
  { header: "Phone", value: (customer) => customer.phone },
  { header: "Email", value: (customer) => customer.email },
  { header: "Address", value: (customer) => customer.address },
  { header: "City", value: (customer) => customer.city },
  { header: "Category", value: (customer) => customer.category },
  { header: "Assets Count", value: (customer) => customer.assetsCount },
  { header: "Total Due", value: (customer) => customer.totalDue },
  { header: "Total Paid", value: (customer) => customer.totalPaid },
  { header: "Status", value: (customer) => customer.status },
  { header: "Created At", value: (customer) => formatDate(customer.createdAt) },
];

export default function CustomersPageClient({
  customers,
  params,
}: {
  customers: PaginatedData<Customer>;
  params: {
    search: string;
    status: string;
    category: string;
    page: number;
    pageSize: number;
  };
}) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [bulkStatus, setBulkStatus] = useState<Customer["status"]>("active");
  const { updateParams } = useListUrlState({
    search: "",
    status: "all",
    category: "all",
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
  });

  useEffect(() => {
    setSelectedIds([]);
    setIsStatusModalOpen(false);
  }, [params.search, params.status, params.category]);

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
    fetchAllExportRows<Customer, PaginatedData<Customer>>(
      (page, pageSize) =>
        listCustomersAction({
          search: params.search || undefined,
          status: params.status !== "all" ? params.status : undefined,
          category: params.category !== "all" ? params.category : undefined,
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
        title="Customers"
        subtitle={`${customers.total} total customers`}
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsImportOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <Upload className="h-4 w-4" />
              Import
            </button>
            <button
              onClick={() => router.push("/customers/new")}
              className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
            >
              <Plus className="h-4 w-4" />
              Add Customer
            </button>
          </div>
        }
      />

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <FilterBar
          className="mb-0 flex-1"
          searchValue={params.search}
          onSearchChange={(value) => updateParams({ search: value, page: 1 })}
          searchPlaceholder="Search by name, phone, or city..."
          onClearAll={() =>
            updateParams({
              search: "",
              status: "all",
              category: "all",
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
                { label: "Inactive", value: "inactive" },
                { label: "Suspended", value: "suspended" },
              ],
            },
            {
              label: "Category",
              value: params.category,
              onChange: (value) => updateParams({ category: value, page: 1 }),
              options: [
                { label: "All Categories", value: "all" },
                { label: "Commercial", value: "Commercial" },
                { label: "Residential", value: "Residential" },
              ],
            },
          ]}
        />
        <ExportMenu
          columns={customerExportColumns}
          filename="customers-export"
          loadData={loadExportData}
        />
      </div>

      <BulkActionBar
        selectedCount={selectedIds.length}
        onClear={() => setSelectedIds([])}
        actions={[
          {
            key: "change-status",
            label: "Change Status",
            onClick: () => setIsStatusModalOpen(true),
            disabled: Boolean(pendingAction),
            variant: "primary",
          },
        ]}
      />

      <DataTable<Customer>
        page={customers.page}
        pageSize={customers.pageSize}
        totalCount={customers.total}
        totalPages={customers.totalPages}
        onPageChange={(page) => updateParams({ page })}
        onPageSizeChange={(pageSize) => updateParams({ pageSize, page: 1 })}
        getRowId={(customer) => customer.id}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        columns={[
          {
            key: "name",
            header: "Customer",
            mobilePriority: "primary",
            render: (customer) => (
              <div>
                <p className="font-medium text-slate-900">{customer.name}</p>
                <p className="text-xs text-slate-500">{customer.city}</p>
              </div>
            ),
          },
          {
            key: "contact",
            header: "Contact",
            mobilePriority: "meta",
            mobileCardLabel: "Contact",
            render: (customer) => (
              <div>
                <p className="text-slate-700">{customer.phone}</p>
                <p className="text-xs text-slate-500">{customer.email}</p>
              </div>
            ),
          },
          {
            key: "category",
            header: "Category",
            mobilePriority: "hide",
            render: (customer) => (
              <span className="text-sm text-slate-600">{customer.category}</span>
            ),
          },
          {
            key: "assets",
            header: "Assets",
            mobilePriority: "hide",
            render: (customer) => customer.assetsCount,
          },
          {
            key: "due",
            header: "Due Amount",
            mobilePriority: "meta",
            mobileCardLabel: "Due",
            render: (customer) => (
              <span
                className={
                  customer.totalDue > 0
                    ? "font-medium text-red-600"
                    : "text-slate-500"
                }
              >
                {customer.totalDue > 0 ? formatCurrency(customer.totalDue) : "-"}
              </span>
            ),
          },
          {
            key: "status",
            header: "Status",
            mobilePriority: "secondary",
            render: (customer) => <StatusBadge status={customer.status} />,
          },
        ]}
        data={customers.data}
        rowHref={(customer) => `/customers/${customer.id}`}
      />

      <ImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onSuccess={() => router.refresh()}
      />

      <Modal
        isOpen={isStatusModalOpen}
        onClose={() => {
          if (!pendingAction) {
            setIsStatusModalOpen(false);
          }
        }}
        title="Change Customer Status"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm leading-6 text-slate-600">
            Update the status for {selectedIds.length} selected customer
            {selectedIds.length === 1 ? "" : "s"}.
          </p>
          <FormField
            as="select"
            label="New Status"
            name="bulkStatus"
            value={bulkStatus}
            onChange={(event) =>
              setBulkStatus(event.target.value as Customer["status"])
            }
            options={[
              { value: "active", label: "Active" },
              { value: "inactive", label: "Inactive" },
              { value: "suspended", label: "Suspended" },
            ]}
          />
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              disabled={Boolean(pendingAction)}
              onClick={() => setIsStatusModalOpen(false)}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
            >
              Cancel
            </button>
            <SubmitButton
              type="button"
              loading={pendingAction === "status"}
              loadingText="Updating..."
              onClick={async () => {
                await runBulkAction(
                  "status",
                  bulkUpdateCustomerStatusAction({
                    ids: selectedIds,
                    status: bulkStatus,
                  }),
                  "Customer statuses updated",
                );
                setIsStatusModalOpen(false);
              }}
            >
              Update Status
            </SubmitButton>
          </div>
        </div>
      </Modal>
    </div>
  );
}
