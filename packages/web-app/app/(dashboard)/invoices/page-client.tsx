"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CreditCard, Download, Plus } from "lucide-react";
import { toast } from "sonner";
import { BulkActionBar } from "@/components/ui/BulkActionBar";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { DataTable } from "@/components/ui/DataTable";
import { ExportMenu } from "@/components/ui/ExportMenu";
import { FilterBar } from "@/components/ui/FilterBar";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  bulkMarkInvoicesPaidAction,
  bulkSendInvoiceRemindersAction,
} from "@/lib/actions/bulk";
import { listInvoicesAction } from "@/lib/actions/invoices";
import { RecordPaymentModal } from "./RecordPaymentModal";
import { fetchAllExportRows, type ExportColumn } from "@/lib/export";
import { useListUrlState } from "@/lib/use-list-url-state";
import { DEFAULT_PAGE_SIZE } from "@/lib/url-search-params";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Invoice, PaginatedData } from "@/lib/types";

const invoiceExportColumns: ExportColumn<Invoice>[] = [
  { header: "Invoice Number", value: (invoice) => invoice.invoiceNumber },
  { header: "Customer", value: (invoice) => invoice.customerName },
  { header: "Type", value: (invoice) => invoice.type },
  { header: "Amount", value: (invoice) => invoice.amount },
  { header: "Paid Amount", value: (invoice) => invoice.paidAmount },
  {
    header: "Balance",
    value: (invoice) => Math.max(0, invoice.amount - invoice.paidAmount),
  },
  { header: "Issued Date", value: (invoice) => formatDate(invoice.issuedDate) },
  { header: "Due Date", value: (invoice) => formatDate(invoice.dueDate) },
  { header: "Status", value: (invoice) => invoice.status },
  { header: "Notes", value: (invoice) => invoice.notes ?? "" },
];

export default function InvoicesPageClient({
  invoices,
  overview,
  params,
}: {
  invoices: PaginatedData<Invoice>;
  overview: {
    total: number;
    totalDue: number;
  };
  params: {
    search: string;
    status: string;
    page: number;
    pageSize: number;
  };
}) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [paymentInvoice, setPaymentInvoice] = useState<Invoice | null>(null);
  const [confirmAction, setConfirmAction] = useState<"reminders" | "paid" | null>(
    null,
  );
  const { updateParams } = useListUrlState({
    search: "",
    status: "all",
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
  });

  useEffect(() => {
    setSelectedIds([]);
    setConfirmAction(null);
  }, [params.search, params.status]);

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
    fetchAllExportRows<Invoice, PaginatedData<Invoice>>(
      (page, pageSize) =>
        listInvoicesAction({
          search: params.search || undefined,
          status: params.status !== "all" ? params.status : undefined,
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
        title="Invoices"
        subtitle={`${overview.total} invoices · ${formatCurrency(overview.totalDue)} outstanding`}
        actions={
          <button
            onClick={() => router.push("/invoices/new")}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            <Plus className="h-4 w-4" />
            Create Invoice
          </button>
        }
      />

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <FilterBar
          className="mb-0 flex-1"
          searchValue={params.search}
          onSearchChange={(value) => updateParams({ search: value, page: 1 })}
          searchPlaceholder="Search by customer or invoice number..."
          onClearAll={() => updateParams({ search: "", status: "all", page: 1 })}
          filters={[
            {
              label: "Status",
              value: params.status,
              onChange: (value) => updateParams({ status: value, page: 1 }),
              options: [
                { label: "All Status", value: "all" },
                { label: "Issued", value: "issued" },
                { label: "Paid", value: "paid" },
                { label: "Overdue", value: "overdue" },
                { label: "Partial", value: "partial" },
                { label: "Draft", value: "draft" },
                { label: "Cancelled", value: "cancelled" },
              ],
            },
          ]}
        />
        <ExportMenu
          columns={invoiceExportColumns}
          filename="invoices-export"
          loadData={loadExportData}
        />
      </div>

      <BulkActionBar
        selectedCount={selectedIds.length}
        onClear={() => setSelectedIds([])}
        actions={[
          {
            key: "reminders",
            label: "Send Reminders",
            onClick: () => setConfirmAction("reminders"),
            disabled: Boolean(pendingAction),
            variant: "secondary",
          },
          {
            key: "paid",
            label: "Mark as Paid",
            onClick: () => setConfirmAction("paid"),
            disabled: Boolean(pendingAction),
            variant: "primary",
          },
        ]}
      />

      <DataTable<Invoice>
        page={invoices.page}
        pageSize={invoices.pageSize}
        totalCount={invoices.total}
        totalPages={invoices.totalPages}
        onPageChange={(page) => updateParams({ page })}
        onPageSizeChange={(pageSize) => updateParams({ pageSize, page: 1 })}
        getRowId={(invoice) => invoice.id}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        columns={[
          {
            key: "invoice",
            header: "Invoice",
            mobilePriority: "primary",
            render: (invoice) => (
              <div>
                <p className="font-medium text-slate-900">{invoice.invoiceNumber}</p>
                <p className="text-xs capitalize text-slate-500">{invoice.type}</p>
              </div>
            ),
          },
          {
            key: "customer",
            header: "Customer",
            mobilePriority: "secondary",
            render: (invoice) => invoice.customerName,
          },
          {
            key: "amount",
            header: "Amount",
            mobilePriority: "meta",
            mobileCardLabel: "Amount",
            render: (invoice) => (
              <span className="font-medium">{formatCurrency(invoice.amount)}</span>
            ),
          },
          {
            key: "paid",
            header: "Paid",
            mobilePriority: "hide",
            render: (invoice) => (
              <span
                className={
                  invoice.paidAmount > 0 ? "text-green-600" : "text-slate-400"
                }
              >
                {invoice.paidAmount > 0 ? formatCurrency(invoice.paidAmount) : "-"}
              </span>
            ),
          },
          {
            key: "balance",
            header: "Balance",
            mobilePriority: "hide",
            render: (invoice) => {
              const balance = invoice.amount - invoice.paidAmount;
              return balance > 0 ? (
                <span className="font-medium text-red-600">
                  {formatCurrency(balance)}
                </span>
              ) : (
                <span className="text-slate-400">-</span>
              );
            },
          },
          {
            key: "due",
            header: "Due Date",
            mobilePriority: "hide",
            render: (invoice) => formatDate(invoice.dueDate),
          },
          {
            key: "status",
            header: "Status",
            mobilePriority: "meta",
            render: (invoice) => <StatusBadge status={invoice.status} />,
          },
          {
            key: "actions",
            header: "Actions",
            mobilePriority: "secondary",
            className: "w-48",
            render: (invoice) => {
              const balance = invoice.amount - invoice.paidAmount;
              const canRecordPayment =
                ["issued", "overdue", "partial"].includes(invoice.status) && balance > 0;
              return (
                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  {canRecordPayment && (
                    <button
                      type="button"
                      onClick={() => setPaymentInvoice(invoice)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-brand-50 px-3 py-1.5 text-xs font-medium text-brand-700 hover:bg-brand-100"
                    >
                      <CreditCard className="h-3.5 w-3.5" />
                      Pay
                    </button>
                  )}
                  <a
                    href={`/api/invoices/${invoice.id}/pdf`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100"
                  >
                    <Download className="h-3.5 w-3.5" />
                    PDF
                  </a>
                </div>
              );
            },
          },
        ]}
        data={invoices.data}
        rowHref={(invoice) => `/invoices/${invoice.id}`}
      />

      <ConfirmModal
        isOpen={confirmAction !== null}
        onClose={() => setConfirmAction(null)}
        onConfirm={async () => {
          if (confirmAction === "reminders") {
            await runBulkAction(
              "reminders",
              bulkSendInvoiceRemindersAction({ ids: selectedIds }),
              "Invoice reminders sent",
            );
          }

          if (confirmAction === "paid") {
            await runBulkAction(
              "paid",
              bulkMarkInvoicesPaidAction({ ids: selectedIds }),
              "Invoices marked as paid",
            );
          }

          setConfirmAction(null);
        }}
        title={
          confirmAction === "paid"
            ? "Mark Selected Invoices Paid"
            : "Send Invoice Reminders"
        }
        description={
          confirmAction === "paid"
            ? `Mark ${selectedIds.length} selected invoice${selectedIds.length === 1 ? "" : "s"} as paid?`
            : `Send payment reminders for ${selectedIds.length} selected invoice${selectedIds.length === 1 ? "" : "s"}?`
        }
        confirmLabel={confirmAction === "paid" ? "Mark Paid" : "Send Reminders"}
        loading={pendingAction === confirmAction}
      />

      {paymentInvoice && (
        <RecordPaymentModal
          invoice={paymentInvoice}
          isOpen={Boolean(paymentInvoice)}
          onClose={() => setPaymentInvoice(null)}
          onSuccess={() => {
            setPaymentInvoice(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
