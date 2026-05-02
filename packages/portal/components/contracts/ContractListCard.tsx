import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { PortalContract } from "@/lib/portal-types";

const formatInr = (amount: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);

export function ContractListCard({ contract }: { contract: PortalContract }) {
  return (
    <Link href={`/contracts/${contract.id}`}>
      <Card className="hover:border-slate-300 hover:shadow-sm transition-all">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900 truncate">
              {contract.contractNumber}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              {contract.assetName} &middot; {contract.type}
            </p>
          </div>
          <StatusBadge status={contract.status} />
        </div>
        <div className="mt-3 flex items-baseline justify-between">
          <div>
            <p className="text-base font-semibold text-slate-900">
              {formatInr(contract.value)}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              {contract.startDate} — {contract.endDate}
            </p>
          </div>
          <span className="text-xs text-slate-400">{contract.plan}</span>
        </div>
      </Card>
    </Link>
  );
}
