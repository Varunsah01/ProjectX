"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Calendar, User, Package, Shield, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatCurrency, formatDate, daysUntil } from "@/lib/utils";
import { contracts, jobs } from "@/lib/mock-data";

export default function ContractDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const contract = contracts.find((c) => c.id === id);

  if (!contract) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-lg text-slate-500">Contract not found</p>
        <button
          onClick={() => router.push("/contracts")}
          className="mt-4 text-sm text-brand-600 hover:underline"
        >
          Back to contracts
        </button>
      </div>
    );
  }

  const daysLeft = daysUntil(contract.endDate);
  const relatedJobs = jobs.filter((j) => j.assetId === contract.assetId);
  const visitsRemaining = contract.visitsCovered - contract.visitsUsed;
  const visitPercentage = (contract.visitsUsed / contract.visitsCovered) * 100;

  return (
    <div>
      <PageHeader
        title={contract.contractNumber}
        breadcrumbs={[
          { label: "Contracts", href: "/contracts" },
          { label: contract.contractNumber },
        ]}
        actions={
          <div className="flex items-center gap-2">
            {["expired", "expiring_soon"].includes(contract.status) && (
              <button className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">
                <RefreshCw className="h-4 w-4" />
                Renew Contract
              </button>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main Info */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-2">
          <div className="flex items-center gap-3 mb-6">
            <StatusBadge status={contract.status} />
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600 uppercase">
              {contract.type}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="flex gap-3">
              <Shield className="h-5 w-5 text-slate-400 shrink-0" />
              <div>
                <p className="text-xs text-slate-500">Plan</p>
                <p className="text-sm font-medium text-slate-900">
                  {contract.plan}
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <User className="h-5 w-5 text-slate-400 shrink-0" />
              <div>
                <p className="text-xs text-slate-500">Customer</p>
                <Link
                  href={`/customers/${contract.customerId}`}
                  className="text-sm font-medium text-brand-600 hover:underline"
                >
                  {contract.customerName}
                </Link>
              </div>
            </div>
            <div className="flex gap-3">
              <Package className="h-5 w-5 text-slate-400 shrink-0" />
              <div>
                <p className="text-xs text-slate-500">Asset</p>
                <Link
                  href={`/assets/${contract.assetId}`}
                  className="text-sm font-medium text-brand-600 hover:underline"
                >
                  {contract.assetName}
                </Link>
              </div>
            </div>
            <div className="flex gap-3">
              <Calendar className="h-5 w-5 text-slate-400 shrink-0" />
              <div>
                <p className="text-xs text-slate-500">Next Service</p>
                <p className="text-sm font-medium text-slate-900">
                  {formatDate(contract.nextServiceDate)}
                </p>
              </div>
            </div>
          </div>

          {/* Contract Period */}
          <div className="mt-6 border-t border-slate-100 pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-500">Contract Period</span>
              <span className="text-sm font-medium text-slate-900">
                {daysLeft > 0 ? `${daysLeft} days remaining` : "Expired"}
              </span>
            </div>
            <div className="flex items-center gap-4 text-sm text-slate-600">
              <span>{formatDate(contract.startDate)}</span>
              <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className={`h-full rounded-full ${daysLeft <= 0 ? "bg-red-500" : daysLeft <= 30 ? "bg-amber-500" : "bg-green-500"}`}
                  style={{
                    width: `${Math.max(0, Math.min(100, 100 - (daysLeft / 365) * 100))}%`,
                  }}
                />
              </div>
              <span>{formatDate(contract.endDate)}</span>
            </div>
          </div>

          {/* Visit Usage */}
          <div className="mt-6 border-t border-slate-100 pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-500">Service Visits</span>
              <span className="text-sm font-medium text-slate-900">
                {contract.visitsUsed} of {contract.visitsCovered} used
                ({visitsRemaining} remaining)
              </span>
            </div>
            <div className="h-3 rounded-full bg-slate-100 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${visitPercentage > 80 ? "bg-amber-500" : "bg-brand-500"}`}
                style={{ width: `${visitPercentage}%` }}
              />
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <h3 className="font-semibold text-slate-900 mb-3">Value</h3>
            <p className="text-2xl font-bold text-slate-900">
              {formatCurrency(contract.value)}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {contract.type === "amc" ? "Annual contract value" : "Warranty"}
            </p>
          </div>

          {relatedJobs.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="font-semibold text-slate-900 mb-3">
                Service History
              </h3>
              <div className="space-y-2">
                {relatedJobs.map((job) => (
                  <Link
                    key={job.id}
                    href={`/jobs/${job.id}`}
                    className="flex items-center justify-between rounded-lg border border-slate-100 p-3 hover:bg-slate-50"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-900 capitalize">
                        {job.type}
                      </p>
                      <p className="text-xs text-slate-500">
                        {formatDate(job.scheduledDate)}
                      </p>
                    </div>
                    <StatusBadge status={job.status} />
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
