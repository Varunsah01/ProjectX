"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { customers } from "@/lib/mock-data";

const ASSET_CATEGORIES = [
  "Water Purifier",
  "AC / HVAC",
  "CCTV Camera",
  "Solar Panel",
  "Elevator",
  "Broadband Equipment",
  "Kitchen Appliance",
  "Fire Safety Equipment",
  "Other",
];

export default function AddAssetPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    customerId: "",
    name: "",
    model: "",
    serialNumber: "",
    category: "",
    installationDate: "",
    warrantyEnd: "",
    location: "",
    notes: "",
  });

  const update = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  return (
    <div>
      <PageHeader
        title="Add Asset"
        breadcrumbs={[
          { label: "Assets", href: "/assets" },
          { label: "New Asset" },
        ]}
      />

      <div className="max-w-2xl">
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-6">
            Asset Information
          </h3>

          <div className="space-y-5">
            {/* Customer */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Customer <span className="text-red-500">*</span>
              </label>
              <select
                value={form.customerId}
                onChange={(e) => update("customerId", e.target.value)}
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

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Category <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {ASSET_CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => update("category", cat)}
                    className={`rounded-lg border px-3 py-2 text-xs font-medium transition-all ${
                      form.category === cat
                        ? "border-brand-500 bg-brand-50 text-brand-700"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Asset Name */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Asset Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                placeholder="e.g. Kent Grand Plus RO"
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all"
              />
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              {/* Model */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Model
                </label>
                <input
                  type="text"
                  value={form.model}
                  onChange={(e) => update("model", e.target.value)}
                  placeholder="Model number"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all"
                />
              </div>

              {/* Serial Number */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Serial Number
                </label>
                <input
                  type="text"
                  value={form.serialNumber}
                  onChange={(e) => update("serialNumber", e.target.value)}
                  placeholder="Serial / barcode"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              {/* Installation Date */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Installation Date
                </label>
                <input
                  type="date"
                  value={form.installationDate}
                  onChange={(e) => update("installationDate", e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all"
                />
              </div>

              {/* Warranty End */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Warranty End Date
                </label>
                <input
                  type="date"
                  value={form.warrantyEnd}
                  onChange={(e) => update("warrantyEnd", e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all"
                />
              </div>
            </div>

            {/* Installation Location */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Installation Location
              </label>
              <input
                type="text"
                value={form.location}
                onChange={(e) => update("location", e.target.value)}
                placeholder="e.g. Kitchen, 2nd Floor, Server Room"
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
                placeholder="Any additional details about this asset..."
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all resize-none"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="mt-8 flex items-center gap-3 border-t border-slate-100 pt-6">
            <button
              onClick={() => router.push("/assets")}
              className="rounded-lg bg-brand-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-brand-700 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:ring-offset-2"
            >
              Add Asset
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
