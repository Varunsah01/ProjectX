"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Calendar,
  Hash,
  Cpu,
  User,
  Shield,
  Wrench,
  Clock,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatDate } from "@/lib/utils";
import { assets, contracts, jobs } from "@/lib/mock-data";

export default function AssetDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const asset = assets.find((a) => a.id === id);

  if (!asset) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-lg text-slate-500">Asset not found</p>
        <button
          onClick={() => router.push("/assets")}
          className="mt-4 text-sm text-brand-600 hover:underline"
        >
          Back to assets
        </button>
      </div>
    );
  }

  const assetContracts = contracts.filter((c) => c.assetId === id);
  const assetJobs = jobs.filter((j) => j.assetId === id);

  return (
    <div>
      <PageHeader
        title={asset.name}
        subtitle={`${asset.model} — ${asset.serialNumber}`}
        breadcrumbs={[
          { label: "Assets", href: "/assets" },
          { label: asset.name },
        ]}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Asset Details */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-2">
          <h3 className="font-semibold text-slate-900 mb-4">Asset Details</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <InfoRow icon={Cpu} label="Model" value={asset.model} />
            <InfoRow
              icon={Hash}
              label="Serial Number"
              value={asset.serialNumber}
            />
            <InfoRow
              icon={Calendar}
              label="Installed"
              value={formatDate(asset.installationDate)}
            />
            <InfoRow
              icon={Shield}
              label="Warranty Until"
              value={formatDate(asset.warrantyEnd)}
            />
            <InfoRow icon={Wrench} label="Coverage" value={asset.amcStatus} />
            <InfoRow
              icon={Clock}
              label="Last Service"
              value={formatDate(asset.lastServiceDate)}
            />
            <InfoRow
              icon={Clock}
              label="Next Service"
              value={formatDate(asset.nextServiceDate)}
            />
            <InfoRow
              icon={User}
              label="Customer"
              value={asset.customerName}
              href={`/customers/${asset.customerId}`}
            />
          </div>
        </div>

        {/* Status Card */}
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <h3 className="font-semibold text-slate-900 mb-3">Status</h3>
            <StatusBadge status={asset.status} />
            <div className="mt-4 rounded-lg bg-slate-50 p-3">
              <p className="text-xs font-medium text-slate-500">Category</p>
              <p className="text-sm font-medium text-slate-900">
                {asset.category}
              </p>
            </div>
          </div>

          {assetContracts.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="font-semibold text-slate-900 mb-3">Contracts</h3>
              <div className="space-y-3">
                {assetContracts.map((c) => (
                  <Link
                    key={c.id}
                    href={`/contracts/${c.id}`}
                    className="block rounded-lg border border-slate-100 p-3 hover:bg-slate-50"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-slate-900">
                        {c.plan}
                      </p>
                      <StatusBadge status={c.status} />
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {formatDate(c.startDate)} - {formatDate(c.endDate)}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Visits: {c.visitsUsed} / {c.visitsCovered}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Service History */}
      {assetJobs.length > 0 && (
        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6">
          <h3 className="font-semibold text-slate-900 mb-4">Service History</h3>
          <div className="space-y-3">
            {assetJobs.map((job) => (
              <Link
                key={job.id}
                href={`/jobs/${job.id}`}
                className="flex items-center justify-between rounded-lg border border-slate-100 p-4 hover:bg-slate-50"
              >
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    {job.jobNumber} &middot;{" "}
                    <span className="capitalize">{job.type}</span>
                  </p>
                  <p className="text-xs text-slate-500">
                    {job.technicianName} &middot;{" "}
                    {formatDate(job.scheduledDate)}
                  </p>
                  {job.serviceReport && (
                    <p className="mt-1 text-xs text-slate-400">
                      {job.serviceReport}
                    </p>
                  )}
                </div>
                <StatusBadge status={job.status} />
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  href?: string;
}) {
  const valueContent = href ? (
    <Link href={href} className="text-brand-600 hover:underline">
      {value}
    </Link>
  ) : (
    value
  );
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 h-4 w-4 text-slate-400" />
      <div>
        <p className="text-xs text-slate-500">{label}</p>
        <p className="text-sm font-medium text-slate-900">{valueContent}</p>
      </div>
    </div>
  );
}
