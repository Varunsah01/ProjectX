"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { customers, assets, technicians } from "@/lib/mock-data";

export default function NewComplaintPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    customerId: "",
    assetId: "",
    subject: "",
    description: "",
    category: "",
    priority: "medium",
    assignTo: "",
  });

  const update = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const customerAssets = assets.filter((a) => a.customerId === form.customerId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    router.push("/complaints");
  };

  return (
    <div>
      <PageHeader
        title="Log Complaint"
        breadcrumbs={[
          { label: "Complaints", href: "/complaints" },
          { label: "Log Complaint" },
        ]}
      />

      <form
        onSubmit={handleSubmit}
        className="max-w-2xl rounded-xl border border-slate-200 bg-white p-6"
      >
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Customer *
            </label>
            <select
              required
              value={form.customerId}
              onChange={(e) => {
                update("customerId", e.target.value);
                update("assetId", "");
              }}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              <option value="">Select customer</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Asset
            </label>
            <select
              value={form.assetId}
              onChange={(e) => update("assetId", e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              disabled={!form.customerId}
            >
              <option value="">Select asset (optional)</option>
              {customerAssets.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} - {a.model}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Subject *
            </label>
            <input
              type="text"
              required
              value={form.subject}
              onChange={(e) => update("subject", e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              placeholder="Brief description of the issue"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Description *
            </label>
            <textarea
              required
              rows={4}
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              placeholder="Detailed description of the complaint..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Category *
            </label>
            <select
              required
              value={form.category}
              onChange={(e) => update("category", e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              <option value="">Select category</option>
              <option value="Cooling Issue">Cooling Issue</option>
              <option value="Noise Issue">Noise Issue</option>
              <option value="Water Quality">Water Quality</option>
              <option value="Equipment Offline">Equipment Offline</option>
              <option value="Mechanical Issue">Mechanical Issue</option>
              <option value="Night Vision">Night Vision</option>
              <option value="Remote/Control Issue">Remote/Control Issue</option>
              <option value="Temperature Issue">Temperature Issue</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Priority *
            </label>
            <select
              value={form.priority}
              onChange={(e) => update("priority", e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Assign Technician
            </label>
            <select
              value={form.assignTo}
              onChange={(e) => update("assignTo", e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              <option value="">Assign later</option>
              {technicians
                .filter((t) => t.status !== "off_duty")
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.territory}) - {t.specialization}
                  </option>
                ))}
            </select>
          </div>
        </div>

        <div className="mt-6 flex items-center gap-3 border-t border-slate-100 pt-6">
          <button
            type="submit"
            className="rounded-lg bg-brand-600 px-6 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            Log Complaint
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-lg border border-slate-200 px-6 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
