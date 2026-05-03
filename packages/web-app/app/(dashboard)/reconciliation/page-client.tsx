"use client";

import { useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useListUrlState } from "@/lib/use-list-url-state";
import { formatCurrency } from "@/lib/utils";
import type { ReconciliationData, UnmatchedInvoice } from "@/lib/queries/reconciliation";
import { ReconcilePaymentModal } from "./ReconcilePaymentModal";

interface Props {
  data: ReconciliationData;
  params: { search: string; page: number; pageSize: number };
}

export default function ReconciliationPageClient({ data, params }: Props) {
  const { updateParams } = useListUrlState({
    search: "",
    page: 1,
    pageSize: 20,
  });
  const [selectedInvoice, setSelectedInvoice] = useState<UnmatchedInvoice | null>(null);

  return (
    <div>
      <PageHeader
        title="Payment Reconciliation"
        subtitle={`${data.totalCount} invoice${data.totalCount !== 1 ? "s" : ""} with outstanding balance`}
        breadcrumbs={[{ label: "Reconciliation" }]}
      />

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          defaultValue={params.search}
          placeholder="Search by invoice number or customer..."
          onChange={(e) => updateParams({ search: e.target.value, page: 1 })}
          className="w-full max-w-sm rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
        />
      </div>

      {/* Table */}
      {data.unmatchedInvoices.length === 0 ? (
        <div className="flex h-48 items-center justify-center rounded-lg border border-dashed border-slate-200 text-sm text-slate-500">
          No invoices with outstanding balances
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Invoice #</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Customer</th>
                <th className="px-4 py-3 text-right font-medium text-slate-600">Amount</th>
                <th className="px-4 py-3 text-right font-medium text-slate-600">Paid</th>
                <th className="px-4 py-3 text-right font-medium text-slate-600">Balance</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Due Date</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Status</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.unmatchedInvoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">{inv.invoiceNumber}</td>
                  <td className="px-4 py-3 text-slate-700">{inv.customerName}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(inv.amount)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-green-600">{formatCurrency(inv.paidAmount)}</td>
                  <td className="px-4 py-3 text-right tabular-nums font-medium text-red-600">{formatCurrency(inv.balance)}</td>
                  <td className="px-4 py-3 text-slate-500">
                    {new Date(inv.dueDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={inv.status} />
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setSelectedInvoice(inv)}
                      className="rounded-lg border border-brand-200 bg-brand-50 px-3 py-1.5 text-xs font-medium text-brand-700 hover:bg-brand-100 transition-colors"
                    >
                      Reconcile
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {data.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
          <span>
            Page {data.page} of {data.totalPages}
          </span>
          <div className="flex gap-2">
            <button
              disabled={data.page <= 1}
              onClick={() => updateParams({ page: data.page - 1 })}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm disabled:opacity-50 hover:bg-slate-50"
            >
              Previous
            </button>
            <button
              disabled={data.page >= data.totalPages}
              onClick={() => updateParams({ page: data.page + 1 })}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm disabled:opacity-50 hover:bg-slate-50"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Reconcile Modal */}
      {selectedInvoice && (
        <ReconcilePaymentModal
          invoice={selectedInvoice}
          isOpen={!!selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
        />
      )}
    </div>
  );
}
