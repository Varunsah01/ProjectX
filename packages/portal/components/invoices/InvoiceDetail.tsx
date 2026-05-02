import { StatusBadge } from "@/components/ui/StatusBadge";
import { Card } from "@/components/ui/Card";
import type { PortalInvoice } from "@/lib/portal-types";

const formatInr = (amount: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);

export function InvoiceDetail({ invoice }: { invoice: PortalInvoice }) {
  const balance = Math.max(0, invoice.amount - invoice.paidAmount);
  const hasGstBreakdown = invoice.subtotalAmount != null;
  const isInterState = Boolean(invoice.isInterState);

  return (
    <div className="space-y-4">
      {/* Header info */}
      <Card>
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="text-lg font-semibold text-slate-900">
              {invoice.invoiceNumber}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">{invoice.type}</p>
          </div>
          <StatusBadge status={invoice.status} />
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs text-slate-500">Issued</p>
            <p className="font-medium text-slate-900">{invoice.issuedDate}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Due</p>
            <p className="font-medium text-slate-900">{invoice.dueDate}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Total</p>
            <p className="font-semibold text-slate-900">
              {formatInr(invoice.amount)}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Balance Due</p>
            <p
              className={`font-semibold ${balance > 0 ? "text-red-600" : "text-green-600"}`}
            >
              {formatInr(balance)}
            </p>
          </div>
        </div>
      </Card>

      {/* Line items */}
      <Card>
        <h3 className="text-sm font-semibold text-slate-900 mb-3">
          Line Items
        </h3>
        <div className="overflow-x-auto -mx-4 px-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left">
                <th className="pb-2 pr-3 text-xs font-medium text-slate-500">
                  #
                </th>
                <th className="pb-2 pr-3 text-xs font-medium text-slate-500">
                  Description
                </th>
                <th className="pb-2 pr-3 text-xs font-medium text-slate-500 text-right">
                  Qty
                </th>
                <th className="pb-2 pr-3 text-xs font-medium text-slate-500 text-right">
                  Rate
                </th>
                {hasGstBreakdown && (
                  <th className="pb-2 pr-3 text-xs font-medium text-slate-500 text-right">
                    {isInterState ? "IGST" : "GST"}
                  </th>
                )}
                <th className="pb-2 text-xs font-medium text-slate-500 text-right">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item, idx) => {
                const taxable = item.taxableAmount ?? item.amount;
                const tax = hasGstBreakdown
                  ? (item.cgstAmount ?? 0) +
                    (item.sgstAmount ?? 0) +
                    (item.igstAmount ?? 0)
                  : 0;
                const lineTotal = hasGstBreakdown ? taxable + tax : item.amount;

                return (
                  <tr
                    key={item.id ?? idx}
                    className="border-b border-slate-50"
                  >
                    <td className="py-2 pr-3 text-slate-500">{idx + 1}</td>
                    <td className="py-2 pr-3 text-slate-900">
                      {item.description}
                      {item.hsnSac && (
                        <span className="text-xs text-slate-400 ml-1">
                          ({item.hsnSac})
                        </span>
                      )}
                    </td>
                    <td className="py-2 pr-3 text-right text-slate-700">
                      {item.qty}
                    </td>
                    <td className="py-2 pr-3 text-right text-slate-700">
                      {formatInr(item.rate)}
                    </td>
                    {hasGstBreakdown && (
                      <td className="py-2 pr-3 text-right text-slate-500">
                        {formatInr(tax)}
                        {item.gstRatePercent != null && (
                          <span className="text-xs ml-0.5">
                            ({item.gstRatePercent}%)
                          </span>
                        )}
                      </td>
                    )}
                    <td className="py-2 text-right font-medium text-slate-900">
                      {formatInr(lineTotal)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Tax summary */}
      <Card>
        <h3 className="text-sm font-semibold text-slate-900 mb-3">Summary</h3>
        <div className="space-y-2 text-sm">
          {hasGstBreakdown ? (
            <>
              <div className="flex justify-between">
                <span className="text-slate-500">Subtotal</span>
                <span className="text-slate-900">
                  {formatInr(invoice.subtotalAmount!)}
                </span>
              </div>
              {isInterState ? (
                <div className="flex justify-between">
                  <span className="text-slate-500">IGST</span>
                  <span className="text-slate-900">
                    {formatInr(invoice.igstAmount ?? 0)}
                  </span>
                </div>
              ) : (
                <>
                  <div className="flex justify-between">
                    <span className="text-slate-500">CGST</span>
                    <span className="text-slate-900">
                      {formatInr(invoice.cgstAmount ?? 0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">SGST</span>
                    <span className="text-slate-900">
                      {formatInr(invoice.sgstAmount ?? 0)}
                    </span>
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="flex justify-between">
              <span className="text-slate-500">Subtotal (incl. GST)</span>
              <span className="text-slate-900">
                {formatInr(invoice.amount)}
              </span>
            </div>
          )}
          <div className="flex justify-between border-t border-slate-100 pt-2 font-semibold">
            <span className="text-slate-900">Total</span>
            <span className="text-slate-900">{formatInr(invoice.amount)}</span>
          </div>
          {invoice.paidAmount > 0 && (
            <div className="flex justify-between">
              <span className="text-slate-500">Paid</span>
              <span className="text-green-600">
                {formatInr(invoice.paidAmount)}
              </span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-slate-500">Balance Due</span>
            <span
              className={`font-semibold ${balance > 0 ? "text-red-600" : "text-green-600"}`}
            >
              {formatInr(balance)}
            </span>
          </div>
        </div>
      </Card>

      {/* Payment history */}
      {invoice.payments.length > 0 && (
        <Card>
          <h3 className="text-sm font-semibold text-slate-900 mb-3">
            Payment History
          </h3>
          <div className="space-y-3">
            {invoice.payments.map((payment) => (
              <div
                key={payment.id}
                className="flex items-center justify-between text-sm"
              >
                <div>
                  <p className="text-slate-900 font-medium">
                    {formatInr(payment.amount)}
                  </p>
                  <p className="text-xs text-slate-500">
                    {payment.method} &middot; {payment.createdAt}
                  </p>
                </div>
                <StatusBadge status={payment.status.toLowerCase()} />
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
