import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Download } from "lucide-react";
import { getPortalSession } from "@/lib/portal-auth";
import { getInvoiceDetailForCustomer } from "@/lib/queries/invoices";
import { InvoiceDetail } from "@/components/invoices/InvoiceDetail";
import { RazorpayCheckout } from "@/components/payments/RazorpayCheckout";

export default async function InvoiceDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getPortalSession();
  if (!session) redirect("/login");

  const { customerId, organizationId } = session.user;
  const invoice = await getInvoiceDetailForCustomer(
    customerId,
    organizationId,
    params.id,
  );

  if (!invoice) notFound();

  const balance = Math.max(0, invoice.amount - invoice.paidAmount);
  const canPay = ["issued", "overdue", "partial"].includes(invoice.status);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <Link
          href="/invoices"
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
        <div className="flex items-center gap-2">
          <a
            href={`/api/invoices/${invoice.id}/pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            PDF
          </a>
          {canPay && balance > 0 && (
            <RazorpayCheckout invoiceId={invoice.id} />
          )}
        </div>
      </div>

      <InvoiceDetail invoice={invoice} />
    </div>
  );
}
