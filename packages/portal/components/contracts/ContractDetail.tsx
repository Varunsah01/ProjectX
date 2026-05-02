import { StatusBadge } from "@/components/ui/StatusBadge";
import { Card } from "@/components/ui/Card";
import { VisitsTracker } from "@/components/contracts/VisitsTracker";
import { RenewalCTA } from "@/components/contracts/RenewalCTA";
import type { PortalContract } from "@/lib/portal-types";
import type { PortalInvoice } from "@/lib/portal-types";
import { InvoiceListCard } from "@/components/invoices/InvoiceListCard";

const formatInr = (amount: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);

interface ContractDetailProps {
  contract: PortalContract;
  relatedInvoices: PortalInvoice[];
}

export function ContractDetail({
  contract,
  relatedInvoices,
}: ContractDetailProps) {
  const showRenewalCta =
    contract.status === "expiring_soon" || contract.status === "expired";

  return (
    <div className="space-y-4">
      {/* Header info */}
      <Card>
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="text-lg font-semibold text-slate-900">
              {contract.contractNumber}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              {contract.type} &middot; {contract.plan}
            </p>
          </div>
          <StatusBadge status={contract.status} />
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs text-slate-500">Asset</p>
            <p className="font-medium text-slate-900">{contract.assetName}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Value</p>
            <p className="font-semibold text-slate-900">
              {formatInr(contract.value)}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Start Date</p>
            <p className="font-medium text-slate-900">{contract.startDate}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">End Date</p>
            <p className="font-medium text-slate-900">{contract.endDate}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Billing Cycle</p>
            <p className="font-medium text-slate-900">
              {contract.billingCycle}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Next Service</p>
            <p className="font-medium text-slate-900">
              {contract.nextServiceDate || "—"}
            </p>
          </div>
        </div>
      </Card>

      {/* Visits tracker */}
      {contract.visitsCovered > 0 && (
        <Card>
          <VisitsTracker
            used={contract.visitsUsed}
            covered={contract.visitsCovered}
          />
        </Card>
      )}

      {/* Renewal CTA */}
      {showRenewalCta && <RenewalCTA />}

      {/* Related invoices */}
      {relatedInvoices.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-900 mb-3">
            Related Invoices
          </h3>
          <div className="grid gap-3">
            {relatedInvoices.map((invoice) => (
              <InvoiceListCard key={invoice.id} invoice={invoice} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
