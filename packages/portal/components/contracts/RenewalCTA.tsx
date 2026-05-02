import Link from "next/link";
import { RotateCw } from "lucide-react";

export function RenewalCTA() {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 flex-shrink-0">
          <RotateCw className="h-4 w-4 text-amber-600" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-amber-900">
            Time to renew?
          </p>
          <p className="text-xs text-amber-700 mt-0.5">
            This contract is expiring or has expired. Raise a ticket to request
            renewal.
          </p>
          <Link
            href="/tickets/new?category=Renewal+Request"
            className="mt-2 inline-flex items-center gap-1 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700 transition-colors"
          >
            Request Renewal
          </Link>
        </div>
      </div>
    </div>
  );
}
