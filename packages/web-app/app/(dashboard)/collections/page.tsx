"use client";

import { useState } from "react";
import Link from "next/link";
import { IndianRupee, Clock, AlertTriangle, TrendingDown } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { MetricCard } from "@/components/ui/MetricCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { FilterBar } from "@/components/ui/FilterBar";
import { formatCurrency, formatDate, daysUntil } from "@/lib/utils";
import { invoices, customers } from "@/lib/mock-data";

export default function CollectionsPage() {
  const [search, setSearch] = useState("");
  const [bucketFilter, setBucketFilter] = useState("all");

  const unpaidInvoices = invoices.filter((i) =>
    ["issued", "overdue", "partial"].includes(i.status)
  );

  const withAging = unpaidInvoices.map((inv) => {
    const daysOverdue = -daysUntil(inv.dueDate);
    let bucket: string;
    if (daysOverdue <= 0) bucket = "not_due";
    else if (daysOverdue <= 30) bucket = "0-30";
    else if (daysOverdue <= 60) bucket = "30-60";
    else if (daysOverdue <= 90) bucket = "60-90";
    else bucket = "90+";
    return { ...inv, daysOverdue, bucket, balance: inv.amount - inv.paidAmount };
  });

  const totalOutstanding = withAging.reduce((s, i) => s + i.balance, 0);
  const overdueAmount = withAging
    .filter((i) => i.daysOverdue > 0)
    .reduce((s, i) => s + i.balance, 0);
  const criticalAmount = withAging
    .filter((i) => i.daysOverdue > 60)
    .reduce((s, i) => s + i.balance, 0);

  const buckets = [
    { label: "Not Yet Due", key: "not_due", amount: withAging.filter((i) => i.bucket === "not_due").reduce((s, i) => s + i.balance, 0), count: withAging.filter((i) => i.bucket === "not_due").length, color: "bg-blue-500" },
    { label: "0-30 Days", key: "0-30", amount: withAging.filter((i) => i.bucket === "0-30").reduce((s, i) => s + i.balance, 0), count: withAging.filter((i) => i.bucket === "0-30").length, color: "bg-amber-500" },
    { label: "30-60 Days", key: "30-60", amount: withAging.filter((i) => i.bucket === "30-60").reduce((s, i) => s + i.balance, 0), count: withAging.filter((i) => i.bucket === "30-60").length, color: "bg-orange-500" },
    { label: "60-90 Days", key: "60-90", amount: withAging.filter((i) => i.bucket === "60-90").reduce((s, i) => s + i.balance, 0), count: withAging.filter((i) => i.bucket === "60-90").length, color: "bg-red-500" },
    { label: "90+ Days", key: "90+", amount: withAging.filter((i) => i.bucket === "90+").reduce((s, i) => s + i.balance, 0), count: withAging.filter((i) => i.bucket === "90+").length, color: "bg-red-700" },
  ];

  const filtered = withAging.filter((i) => {
    const matchSearch = i.customerName
      .toLowerCase()
      .includes(search.toLowerCase());
    const matchBucket = bucketFilter === "all" || i.bucket === bucketFilter;
    return matchSearch && matchBucket;
  });

  return (
    <div>
      <PageHeader
        title="Collections"
        subtitle="Track and manage outstanding payments"
      />

      {/* Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-8">
        <MetricCard
          title="Total Outstanding"
          value={formatCurrency(totalOutstanding)}
          subtitle={`${unpaidInvoices.length} invoices`}
          icon={IndianRupee}
          iconColor="text-brand-600"
          iconBg="bg-brand-50"
        />
        <MetricCard
          title="Overdue Amount"
          value={formatCurrency(overdueAmount)}
          icon={Clock}
          iconColor="text-amber-600"
          iconBg="bg-amber-50"
        />
        <MetricCard
          title="Critical (60+ days)"
          value={formatCurrency(criticalAmount)}
          icon={AlertTriangle}
          iconColor="text-red-600"
          iconBg="bg-red-50"
        />
      </div>

      {/* Aging Buckets */}
      <div className="mb-8 rounded-xl border border-slate-200 bg-white p-6">
        <h3 className="font-semibold text-slate-900 mb-4">Aging Analysis</h3>
        <div className="flex gap-2 mb-4 h-8 rounded-full overflow-hidden">
          {buckets.map((b) =>
            b.amount > 0 ? (
              <div
                key={b.key}
                className={`${b.color} transition-all`}
                style={{
                  width: `${(b.amount / totalOutstanding) * 100}%`,
                  minWidth: b.amount > 0 ? "2%" : "0",
                }}
                title={`${b.label}: ${formatCurrency(b.amount)}`}
              />
            ) : null
          )}
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {buckets.map((b) => (
            <button
              key={b.key}
              onClick={() =>
                setBucketFilter(bucketFilter === b.key ? "all" : b.key)
              }
              className={`rounded-lg border p-3 text-left transition-colors ${
                bucketFilter === b.key
                  ? "border-brand-500 bg-brand-50"
                  : "border-slate-200 hover:bg-slate-50"
              }`}
            >
              <div className="flex items-center gap-2">
                <div className={`h-2.5 w-2.5 rounded-full ${b.color}`} />
                <span className="text-xs text-slate-500">{b.label}</span>
              </div>
              <p className="mt-1 text-sm font-bold text-slate-900">
                {formatCurrency(b.amount)}
              </p>
              <p className="text-xs text-slate-400">
                {b.count} invoice{b.count !== 1 ? "s" : ""}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Invoice List */}
      <FilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by customer..."
      />

      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
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
            {filtered
              .sort((a, b) => b.daysOverdue - a.daysOverdue)
              .map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/customers/${inv.customerId}`}
                      className="text-sm font-medium text-brand-600 hover:underline"
                    >
                      {inv.customerName}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/invoices/${inv.id}`}
                      className="text-sm text-slate-700 hover:text-brand-600"
                    >
                      {inv.invoiceNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold text-red-600">
                    {formatCurrency(inv.balance)}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {formatDate(inv.dueDate)}
                  </td>
                  <td className="px-4 py-3">
                    {inv.daysOverdue > 0 ? (
                      <span
                        className={`text-sm font-medium ${inv.daysOverdue > 60 ? "text-red-600" : inv.daysOverdue > 30 ? "text-orange-600" : "text-amber-600"}`}
                      >
                        {inv.daysOverdue} days
                      </span>
                    ) : (
                      <span className="text-sm text-slate-400">
                        Due in {-inv.daysOverdue} days
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <button className="rounded-lg bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700 hover:bg-brand-100">
                      Send Reminder
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
