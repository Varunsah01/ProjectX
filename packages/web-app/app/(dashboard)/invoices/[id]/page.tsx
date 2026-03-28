"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Download, Send, CheckCircle } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { invoices } from "@/lib/mock-data";

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const invoice = invoices.find((i) => i.id === id);

  if (!invoice) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-lg text-slate-500">Invoice not found</p>
        <button
          onClick={() => router.push("/invoices")}
          className="mt-4 text-sm text-brand-600 hover:underline"
        >
          Back to invoices
        </button>
      </div>
    );
  }

  const balance = invoice.amount - invoice.paidAmount;

  return (
    <div>
      <PageHeader
        title={invoice.invoiceNumber}
        breadcrumbs={[
          { label: "Invoices", href: "/invoices" },
          { label: invoice.invoiceNumber },
        ]}
        actions={
          <div className="flex items-center gap-2">
            {balance > 0 && (
              <button className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700">
                <CheckCircle className="h-4 w-4" />
                Record Payment
              </button>
            )}
            <button className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              <Send className="h-4 w-4" />
              Send Reminder
            </button>
            <button className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              <Download className="h-4 w-4" />
              Download PDF
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Invoice Content */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-2">
          {/* Header */}
          <div className="flex items-start justify-between border-b border-slate-100 pb-6">
            <div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600">
                <span className="text-lg font-bold text-white">X</span>
              </div>
              <p className="mt-2 text-lg font-bold text-slate-900">
                {invoice.invoiceNumber}
              </p>
              <p className="text-sm text-slate-500 capitalize">
                {invoice.type} invoice
              </p>
            </div>
            <StatusBadge status={invoice.status} className="text-sm" />
          </div>

          {/* Dates & Customer */}
          <div className="grid grid-cols-2 gap-6 border-b border-slate-100 py-6">
            <div>
              <p className="text-xs font-medium text-slate-500">Bill To</p>
              <Link
                href={`/customers/${invoice.customerId}`}
                className="mt-1 text-sm font-medium text-brand-600 hover:underline"
              >
                {invoice.customerName}
              </Link>
            </div>
            <div className="text-right">
              <div className="mb-2">
                <p className="text-xs text-slate-500">Issue Date</p>
                <p className="text-sm font-medium text-slate-900">
                  {formatDate(invoice.issuedDate)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Due Date</p>
                <p className="text-sm font-medium text-slate-900">
                  {formatDate(invoice.dueDate)}
                </p>
              </div>
            </div>
          </div>

          {/* Line Items */}
          <div className="py-6">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs font-semibold uppercase text-slate-500">
                  <th className="pb-3">Description</th>
                  <th className="pb-3 text-center">Qty</th>
                  <th className="pb-3 text-right">Rate</th>
                  <th className="pb-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoice.items.map((item, i) => (
                  <tr key={i}>
                    <td className="py-3 text-sm text-slate-700">
                      {item.description}
                    </td>
                    <td className="py-3 text-center text-sm text-slate-600">
                      {item.qty}
                    </td>
                    <td className="py-3 text-right text-sm text-slate-600">
                      {formatCurrency(item.rate)}
                    </td>
                    <td className="py-3 text-right text-sm font-medium text-slate-900">
                      {formatCurrency(item.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="border-t border-slate-200 pt-4">
            <div className="flex justify-end">
              <div className="w-64 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Subtotal</span>
                  <span className="text-slate-900">
                    {formatCurrency(invoice.amount)}
                  </span>
                </div>
                {invoice.paidAmount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Paid</span>
                    <span className="text-green-600">
                      -{formatCurrency(invoice.paidAmount)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-semibold">
                  <span className="text-slate-900">Balance Due</span>
                  <span
                    className={
                      balance > 0 ? "text-red-600" : "text-green-600"
                    }
                  >
                    {formatCurrency(balance)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Side Info */}
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <h3 className="font-semibold text-slate-900 mb-3">Summary</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Total Amount</span>
                <span className="font-medium">
                  {formatCurrency(invoice.amount)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Paid</span>
                <span className="text-green-600">
                  {formatCurrency(invoice.paidAmount)}
                </span>
              </div>
              <div className="flex justify-between border-t border-slate-100 pt-2">
                <span className="font-medium text-slate-700">Outstanding</span>
                <span
                  className={`font-bold ${balance > 0 ? "text-red-600" : "text-green-600"}`}
                >
                  {formatCurrency(balance)}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <h3 className="font-semibold text-slate-900 mb-3">Activity</h3>
            <div className="space-y-3">
              <ActivityItem
                date={invoice.issuedDate}
                text="Invoice created and issued"
              />
              {invoice.paidAmount > 0 && (
                <ActivityItem
                  date={invoice.issuedDate}
                  text={`Payment received: ${formatCurrency(invoice.paidAmount)}`}
                />
              )}
              {invoice.status === "overdue" && (
                <ActivityItem
                  date={invoice.dueDate}
                  text="Invoice became overdue"
                  alert
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ActivityItem({
  date,
  text,
  alert,
}: {
  date: string;
  text: string;
  alert?: boolean;
}) {
  return (
    <div className="flex gap-3">
      <div
        className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${alert ? "bg-red-400" : "bg-slate-300"}`}
      />
      <div>
        <p className="text-sm text-slate-700">{text}</p>
        <p className="text-xs text-slate-400">{formatDate(date)}</p>
      </div>
    </div>
  );
}
