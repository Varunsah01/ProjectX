"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { FilterBar } from "@/components/ui/FilterBar";
import { DataTable } from "@/components/ui/DataTable";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { invoices, type Invoice } from "@/lib/mock-data";

export default function InvoicesPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = invoices.filter((i) => {
    const matchSearch =
      i.customerName.toLowerCase().includes(search.toLowerCase()) ||
      i.invoiceNumber.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || i.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalDue = invoices
    .filter((i) => ["issued", "overdue", "partial"].includes(i.status))
    .reduce((sum, i) => sum + (i.amount - i.paidAmount), 0);

  return (
    <div>
      <PageHeader
        title="Invoices"
        subtitle={`${invoices.length} invoices &middot; ${formatCurrency(totalDue)} outstanding`}
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

      <FilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by customer or invoice number..."
        filters={[
          {
            label: "Status",
            value: statusFilter,
            onChange: setStatusFilter,
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

      <DataTable<Invoice>
        totalCount={invoices.length}
        columns={[
          {
            key: "invoice",
            header: "Invoice",
            render: (i) => (
              <div>
                <p className="font-medium text-slate-900">{i.invoiceNumber}</p>
                <p className="text-xs text-slate-500 capitalize">{i.type}</p>
              </div>
            ),
          },
          {
            key: "customer",
            header: "Customer",
            render: (i) => i.customerName,
          },
          {
            key: "amount",
            header: "Amount",
            render: (i) => (
              <span className="font-medium">{formatCurrency(i.amount)}</span>
            ),
          },
          {
            key: "paid",
            header: "Paid",
            render: (i) => (
              <span
                className={
                  i.paidAmount > 0 ? "text-green-600" : "text-slate-400"
                }
              >
                {i.paidAmount > 0 ? formatCurrency(i.paidAmount) : "-"}
              </span>
            ),
          },
          {
            key: "balance",
            header: "Balance",
            render: (i) => {
              const balance = i.amount - i.paidAmount;
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
            render: (i) => formatDate(i.dueDate),
          },
          {
            key: "status",
            header: "Status",
            render: (i) => <StatusBadge status={i.status} />,
          },
        ]}
        data={filtered}
        onRowClick={(i) => router.push(`/invoices/${i.id}`)}
      />
    </div>
  );
}
