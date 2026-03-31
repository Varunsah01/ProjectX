"use client";

import Link from "next/link";
import { AlertTriangle, Clock, IndianRupee } from "lucide-react";
import { ExportMenu } from "@/components/ui/ExportMenu";
import { FilterBar } from "@/components/ui/FilterBar";
import { MetricCard } from "@/components/ui/MetricCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { PaginationControls } from "@/components/ui/PaginationControls";
import { listCollectionsAction } from "@/lib/actions/invoices";
import { fetchAllExportRows, type ExportColumn } from "@/lib/export";
import { useListUrlState } from "@/lib/use-list-url-state";
import { DEFAULT_PAGE_SIZE } from "@/lib/url-search-params";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { CollectionRow, CollectionsData } from "@/lib/types";

const collectionsExportColumns: ExportColumn<CollectionRow>[] = [
  { header: "Customer", value: (invoice) => invoice.customerName },
  { header: "Invoice Number", value: (invoice) => invoice.invoiceNumber },
  { header: "Balance", value: (invoice) => invoice.balance },
  { header: "Due Date", value: (invoice) => formatDate(invoice.dueDate) },
  { header: "Days Overdue", value: (invoice) => invoice.daysOverdue },
  { header: "Bucket", value: (invoice) => invoice.bucket },
  { header: "Status", value: (invoice) => invoice.status },
];

export default function CollectionsPageClient({
  data,
  params,
}: {
  data: CollectionsData;
  params: {
    search: string;
    bucket: string;
    page: number;
    pageSize: number;
  };
}) {
  const { updateParams } = useListUrlState({
    search: "",
    bucket: "all",
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
  });

  const loadExportData = () =>
    fetchAllExportRows<CollectionRow, CollectionsData>(
      (page, pageSize) =>
        listCollectionsAction({
          search: params.search || undefined,
          bucket: params.bucket !== "all" ? params.bucket : undefined,
          page,
          pageSize,
        }),
      {
        getRows: (pageData) => pageData.rows,
        getTotalPages: (pageData) => pageData.totalPages,
      },
    );

  return (
    <div>
      <PageHeader
        title="Collections"
        subtitle="Track and manage outstanding payments"
      />

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <MetricCard
          title="Total Outstanding"
          value={formatCurrency(data.totalOutstanding)}
          subtitle={`${data.totalCount} invoices`}
          icon={IndianRupee}
          iconColor="text-brand-600"
          iconBg="bg-brand-50"
        />
        <MetricCard
          title="Overdue Amount"
          value={formatCurrency(data.overdueAmount)}
          icon={Clock}
          iconColor="text-amber-600"
          iconBg="bg-amber-50"
        />
        <MetricCard
          title="Critical (60+ days)"
          value={formatCurrency(data.criticalAmount)}
          icon={AlertTriangle}
          iconColor="text-red-600"
          iconBg="bg-red-50"
        />
      </div>

      <div className="mb-8 rounded-xl border border-slate-200 bg-white p-6">
        <h3 className="mb-4 font-semibold text-slate-900">Aging Analysis</h3>
        <div className="mb-4 flex h-8 gap-2 overflow-hidden rounded-full">
          {data.buckets.map((bucket) =>
            bucket.amount > 0 ? (
              <div
                key={bucket.key}
                className={`${bucket.color} transition-all`}
                style={{
                  width: `${(bucket.amount / Math.max(data.totalOutstanding, 1)) * 100}%`,
                  minWidth: bucket.amount > 0 ? "2%" : "0",
                }}
                title={`${bucket.label}: ${formatCurrency(bucket.amount)}`}
              />
            ) : null,
          )}
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {data.buckets.map((bucket) => (
            <button
              key={bucket.key}
              onClick={() =>
                updateParams({
                  bucket: params.bucket === bucket.key ? "all" : bucket.key,
                  page: 1,
                })
              }
              className={`rounded-lg border p-3 text-left transition-colors ${
                params.bucket === bucket.key
                  ? "border-brand-500 bg-brand-50"
                  : "border-slate-200 hover:bg-slate-50"
              }`}
            >
              <div className="flex items-center gap-2">
                <div className={`h-2.5 w-2.5 rounded-full ${bucket.color}`} />
                <span className="text-xs text-slate-500">{bucket.label}</span>
              </div>
              <p className="mt-1 text-sm font-bold text-slate-900">
                {formatCurrency(bucket.amount)}
              </p>
              <p className="text-xs text-slate-400">
                {bucket.count} invoice{bucket.count !== 1 ? "s" : ""}
              </p>
            </button>
          ))}
        </div>
      </div>

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <FilterBar
          className="mb-0 flex-1"
          searchValue={params.search}
          onSearchChange={(value) => updateParams({ search: value, page: 1 })}
          searchPlaceholder="Search by customer..."
          onClearAll={() => updateParams({ search: "", bucket: "all", page: 1 })}
        />
        <ExportMenu
          columns={collectionsExportColumns}
          filename="collections-export"
          loadData={loadExportData}
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">
                Customer
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">
                Invoice
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">
                Balance
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">
                Due Date
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">
                Days Overdue
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-16 text-center">
                  <p className="text-sm font-medium text-slate-500">
                    No invoices found
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Try adjusting your search or bucket filter
                  </p>
                </td>
              </tr>
            ) : (
              data.rows.map((invoice) => (
                <tr key={invoice.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/customers/${invoice.customerId}`}
                      className="text-sm font-medium text-brand-600 hover:underline"
                    >
                      {invoice.customerName}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/invoices/${invoice.id}`}
                      className="text-sm text-slate-700 hover:text-brand-600"
                    >
                      {invoice.invoiceNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold text-red-600">
                    {formatCurrency(invoice.balance)}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {formatDate(invoice.dueDate)}
                  </td>
                  <td className="px-4 py-3">
                    {invoice.daysOverdue > 0 ? (
                      <span
                        className={`text-sm font-medium ${invoice.daysOverdue > 60 ? "text-red-600" : invoice.daysOverdue > 30 ? "text-orange-600" : "text-amber-600"}`}
                      >
                        {invoice.daysOverdue} days
                      </span>
                    ) : (
                      <span className="text-sm text-slate-400">
                        Due in {-invoice.daysOverdue} days
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <button className="rounded-lg bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700 hover:bg-brand-100">
                      Send Reminder
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        <PaginationControls
          page={data.page}
          pageSize={data.pageSize}
          totalCount={data.totalCount}
          totalPages={data.totalPages}
          onPageChange={(page) => updateParams({ page })}
          onPageSizeChange={(pageSize) => updateParams({ pageSize, page: 1 })}
        />
      </div>
    </div>
  );
}
