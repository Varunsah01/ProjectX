"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Calendar,
  User,
  MapPin,
  Package,
  FileText,
  CheckCircle,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatDate, formatDateTime } from "@/lib/utils";
import { jobs } from "@/lib/mock-data";

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const job = jobs.find((j) => j.id === id);

  if (!job) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-lg text-slate-500">Job not found</p>
        <button
          onClick={() => router.push("/jobs")}
          className="mt-4 text-sm text-brand-600 hover:underline"
        >
          Back to jobs
        </button>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={job.jobNumber}
        breadcrumbs={[
          { label: "Jobs", href: "/jobs" },
          { label: job.jobNumber },
        ]}
        actions={
          <div className="flex items-center gap-2">
            {job.status !== "completed" && (
              <button className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700">
                <CheckCircle className="h-4 w-4" />
                Mark Complete
              </button>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Job Info */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-2">
          <div className="flex items-center gap-3 mb-6">
            <StatusBadge status={job.status} />
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600 capitalize">
              {job.type}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="flex gap-3">
              <User className="h-5 w-5 text-slate-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-slate-500">Customer</p>
                <Link
                  href={`/customers/${job.customerId}`}
                  className="text-sm font-medium text-brand-600 hover:underline"
                >
                  {job.customerName}
                </Link>
              </div>
            </div>
            <div className="flex gap-3">
              <MapPin className="h-5 w-5 text-slate-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-slate-500">Address</p>
                <p className="text-sm text-slate-900">{job.customerAddress}</p>
              </div>
            </div>
            {job.assetName && (
              <div className="flex gap-3">
                <Package className="h-5 w-5 text-slate-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-slate-500">Asset</p>
                  <Link
                    href={job.assetId ? `/assets/${job.assetId}` : "#"}
                    className="text-sm font-medium text-brand-600 hover:underline"
                  >
                    {job.assetName}
                  </Link>
                </div>
              </div>
            )}
            <div className="flex gap-3">
              <Calendar className="h-5 w-5 text-slate-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-slate-500">Scheduled</p>
                <p className="text-sm text-slate-900">
                  {formatDate(job.scheduledDate)}
                </p>
              </div>
            </div>
          </div>

          {job.notes && (
            <div className="mt-6 border-t border-slate-100 pt-6">
              <h3 className="text-sm font-medium text-slate-700 mb-2">
                Notes
              </h3>
              <p className="text-sm text-slate-600">{job.notes}</p>
            </div>
          )}

          {job.serviceReport && (
            <div className="mt-6 border-t border-slate-100 pt-6">
              <h3 className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Service Report
              </h3>
              <div className="rounded-lg bg-green-50 border border-green-200 p-4">
                <p className="text-sm text-green-800">{job.serviceReport}</p>
                {job.completedAt && (
                  <p className="mt-2 text-xs text-green-600">
                    Completed on {formatDateTime(job.completedAt)}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Technician */}
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <h3 className="font-semibold text-slate-900 mb-3">Technician</h3>
            <div className="flex items-center gap-3 rounded-lg bg-slate-50 p-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 font-semibold text-brand-700 text-sm">
                {job.technicianName
                  .split(" ")
                  .map((n) => n[0])
                  .join("")}
              </div>
              <div>
                <p className="text-sm font-medium text-slate-900">
                  {job.technicianName}
                </p>
                <Link
                  href="/technicians"
                  className="text-xs text-brand-600 hover:underline"
                >
                  View profile
                </Link>
              </div>
            </div>
          </div>

          {/* Related Ticket */}
          {job.ticketId && (
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="font-semibold text-slate-900 mb-3">
                Related Ticket
              </h3>
              <Link
                href={`/complaints/${job.ticketId}`}
                className="block rounded-lg border border-slate-100 p-3 hover:bg-slate-50"
              >
                <p className="text-sm font-medium text-brand-600">
                  {job.ticketId}
                </p>
                <p className="text-xs text-slate-500">View complaint details</p>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
