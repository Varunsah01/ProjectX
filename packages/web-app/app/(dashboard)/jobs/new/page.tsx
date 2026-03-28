"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { customers, assets, technicians } from "@/lib/mock-data";

export default function CreateJobPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    customerId: "",
    assetId: "",
    technicianId: "",
    type: "scheduled",
    scheduledDate: "",
    notes: "",
    priority: "medium",
  });

  const update = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const customerAssets = assets.filter((a) => a.customerId === form.customerId);
  const availableTechs = technicians.filter(
    (t) => t.status === "available" || t.status === "on_job"
  );

  return (
    <div>
      <PageHeader
        title="Schedule Job"
        breadcrumbs={[
          { label: "Jobs", href: "/jobs" },
          { label: "New Job" },
        ]}
      />

      <div className="max-w-2xl">
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-6">
            Job Details
          </h3>

          <div className="space-y-5">
            {/* Job Type */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Job Type
              </label>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { value: "scheduled", label: "Scheduled Service" },
                  { value: "complaint", label: "Complaint" },
                  { value: "installation", label: "Installation" },
                  { value: "inspection", label: "Inspection" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => update("type", opt.value)}
                    className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition-all ${
                      form.type === opt.value
                        ? "border-brand-500 bg-brand-50 text-brand-700"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Customer */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Customer <span className="text-red-500">*</span>
              </label>
              <select
                value={form.customerId}
                onChange={(e) => {
                  update("customerId", e.target.value);
                  update("assetId", "");
                }}
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all"
              >
                <option value="">Select customer...</option>
                {customers
                  .filter((c) => c.status === "active")
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.city})
                    </option>
                  ))}
              </select>
            </div>

            {/* Asset */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Asset
              </label>
              <select
                value={form.assetId}
                onChange={(e) => update("assetId", e.target.value)}
                disabled={!form.customerId}
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all disabled:opacity-50 disabled:bg-slate-50"
              >
                <option value="">
                  {form.customerId
                    ? "Select asset (optional)..."
                    : "Select customer first"}
                </option>
                {customerAssets.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.model} - {a.serialNumber})
                  </option>
                ))}
              </select>
            </div>

            {/* Technician */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Assign Technician <span className="text-red-500">*</span>
              </label>
              <select
                value={form.technicianId}
                onChange={(e) => update("technicianId", e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all"
              >
                <option value="">Select technician...</option>
                {availableTechs.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} - {t.territory} ({t.specialization})
                    {t.status === "available" ? " [Available]" : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Priority */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Priority
              </label>
              <div className="grid grid-cols-4 gap-3">
                {[
                  { value: "low", label: "Low", color: "border-blue-300 bg-blue-50 text-blue-700" },
                  { value: "medium", label: "Medium", color: "border-amber-300 bg-amber-50 text-amber-700" },
                  { value: "high", label: "High", color: "border-orange-300 bg-orange-50 text-orange-700" },
                  { value: "critical", label: "Critical", color: "border-red-300 bg-red-50 text-red-700" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => update("priority", opt.value)}
                    className={`rounded-lg border px-3 py-2 text-sm font-medium transition-all ${
                      form.priority === opt.value
                        ? opt.color
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Scheduled Date */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Scheduled Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={form.scheduledDate}
                onChange={(e) => update("scheduledDate", e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Notes
              </label>
              <textarea
                value={form.notes}
                onChange={(e) => update("notes", e.target.value)}
                rows={3}
                placeholder="Add any instructions or notes for the technician..."
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all resize-none"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="mt-8 flex items-center gap-3 border-t border-slate-100 pt-6">
            <button
              onClick={() => router.push("/jobs")}
              className="rounded-lg bg-brand-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-brand-700 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:ring-offset-2"
            >
              Schedule Job
            </button>
            <button
              onClick={() => router.back()}
              className="rounded-lg border border-slate-200 px-6 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
