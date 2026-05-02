import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { PortalInvoice } from "@/lib/portal-types";

const formatInr = (amount: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);

export function InvoiceListCard({ invoice }: { invoice: PortalInvoice }) {
  const balance = Math.max(0, invoice.amount - invoice.paidAmount);

  return (
    <Link href={`/invoices/${invoice.id}`}>
      <Card className="hover:border-slate-300 hover:shadow-sm transition-all">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900 truncate">
              {invoice.invoiceNumber}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              Issued {invoice.issuedDate} &middot; Due {invoice.dueDate}
            </p>
          </div>
          <StatusBadge status={invoice.status} />
        </div>
        <div className="mt-3 flex items-baseline justify-between">
          <div>
            <p className="text-base font-semibold text-slate-900">
              {formatInr(invoice.amount)}
            </p>
            {balance > 0 && balance !== invoice.amount && (
              <p className="text-xs text-red-600 mt-0.5">
                Due: {formatInr(balance)}
              </p>
            )}
          </div>
          <span className="text-xs text-slate-400">{invoice.type}</span>
        </div>
      </Card>
    </Link>
  );
}
