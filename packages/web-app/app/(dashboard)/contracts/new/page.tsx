"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { customers, assets, plans } from "@/lib/mock-data";

export default function CreateContractPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    customerId: "",
    assetId: "",
    planId: "",
    type: "amc",
    startDate: "",
    notes: "",
  });

  const update = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const customerAssets = assets.filter((a) => a.customerId === form.customerId);
  const filteredPlans = plans.filter(
    (p) => p.isActive && p.type === form.type
  );
  const selectedPlan = plans.find((p) => p.id === form.planId);

  return (
    <div>
      <PageHeader
        title="Create Contract"
        breadcrumbs={[
          { label: "Contracts", href: "/contracts" },
          { label: "New Contract" },
        ]}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Form */}
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-6">
              Contract Details
            </h3>

            <div className="space-y-5">
              {/* Contract Type */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Contract Type
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    {
                      value: "amc",
                      label: "AMC",
                      desc: "Annual Maintenance Contract",
                    },
                    {
                      value: "warranty",
                      label: "Warranty",
                      desc: "Manufacturer Warranty",
                    },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => {
                        update("type", opt.value);
                        update("planId", "");
                      }}
                      className={`rounded-xl border p-4 text-left transition-all ${
                        form.type === opt.value
                          ? "border-brand-500 bg-brand-50 ring-1 ring-brand-500"
                          : "border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <p
                        className={`text-sm font-semibold ${
                          form.type === opt.value
                            ? "text-brand-700"
                            : "text-slate-900"
                        }`}
                      >
                        {opt.label}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {opt.desc}
                      </p>
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
                  Asset <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.assetId}
                  onChange={(e) => update("assetId", e.target.value)}
                  disabled={!form.customerId}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all disabled:opacity-50 disabled:bg-slate-50"
                >
                  <option value="">
                    {form.customerId
                      ? "Select asset..."
                      : "Select customer first"}
                  </option>
                  {customerAssets.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.model} - {a.serialNumber})
                    </option>
                  ))}
                </select>
              </div>

              {/* Plan */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Service Plan <span className="text-red-500">*</span>
                </label>
                {filteredPlans.length === 0 ? (
                  <p className="text-sm text-slate-500 bg-slate-50 rounded-lg p-3">
                    No active plans available for {form.type === "amc" ? "AMC" : "Warranty"}. Create one in Settings.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {filteredPlans.map((plan) => (
                      <button
                        key={plan.id}
                        onClick={() => update("planId", plan.id)}
                        className={`rounded-xl border p-4 text-left transition-all ${
                          form.planId === plan.id
                            ? "border-brand-500 bg-brand-50 ring-1 ring-brand-500"
                            : "border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        <p className="text-sm font-semibold text-slate-900">
                          {plan.name}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          {plan.description}
                        </p>
                        <div className="mt-2 flex items-center justify-between">
                          <span className="text-sm font-bold text-brand-600 tabular-nums">
                            {new Intl.NumberFormat("en-IN", {
                              style: "currency",
                              currency: "INR",
                              maximumFractionDigits: 0,
                            }).format(plan.price)}
                          </span>
                          <span className="text-xs text-slate-400">
                            {plan.duration}mo &middot; {plan.visitsCovered}{" "}
                            visits
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Start Date */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Start Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => update("startDate", e.target.value)}
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
                  placeholder="Any additional terms or notes..."
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all resize-none"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="mt-8 flex items-center gap-3 border-t border-slate-100 pt-6">
              <button
                onClick={() => router.push("/contracts")}
                className="rounded-lg bg-brand-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-brand-700 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:ring-offset-2"
              >
                Create Contract
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

        {/* Summary Sidebar */}
        <div>
          <div className="rounded-xl border border-slate-200 bg-white p-6 sticky top-24">
            <h3 className="font-semibold text-slate-900 mb-4">
              Contract Summary
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Type</span>
                <span className="font-medium text-slate-900 uppercase">
                  {form.type}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Plan</span>
                <span className="font-medium text-slate-900">
                  {selectedPlan?.name || "-"}
                </span>
              </div>
              {selectedPlan && (
                <>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Duration</span>
                    <span className="text-slate-900">
                      {selectedPlan.duration} months
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Visits Included</span>
                    <span className="text-slate-900">
                      {selectedPlan.visitsCovered}
                    </span>
                  </div>
                  <div className="border-t border-slate-100 pt-3 flex justify-between">
                    <span className="font-medium text-slate-700">
                      Contract Value
                    </span>
                    <span className="text-lg font-bold text-brand-600 tabular-nums">
                      {new Intl.NumberFormat("en-IN", {
                        style: "currency",
                        currency: "INR",
                        maximumFractionDigits: 0,
                      }).format(selectedPlan.price)}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
