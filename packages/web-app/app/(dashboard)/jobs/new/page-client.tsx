"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PageHeader } from "@/components/ui/PageHeader";
import { FormField } from "@/components/ui/FormField";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { createJobAction } from "@/lib/actions/jobs";
import { clearFormError, getFormErrors, type FormErrors } from "@/lib/form-errors";
import { createJobSchema } from "@/lib/validations/job";
import type { Asset, Technician } from "@/lib/types";

export default function CreateJobPageClient({
  customers,
  technicians,
  assets,
}: {
  customers: Array<{ id: string; name: string; city: string }>;
  technicians: Technician[];
  assets: Asset[];
}) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [form, setForm] = useState({
    customerId: "",
    assetId: "",
    technicianId: "",
    type: "scheduled",
    scheduledDate: "",
    notes: "",
    priority: "medium",
  });

  const update = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (field !== "priority") {
      setErrors((prev) => clearFormError(prev, field));
    }
  };

  const customerAssets = assets.filter((asset) => asset.customerId === form.customerId);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (isSubmitting) {
      return;
    }

    const payload = {
      customerId: form.customerId,
      assetId: form.assetId,
      technicianId: form.technicianId,
      type: form.type as "complaint" | "scheduled" | "installation" | "inspection",
      status: "assigned" as const,
      scheduledDate: form.scheduledDate,
      notes: form.notes,
      ticketId: "",
      serviceReport: "",
    };
    const parsed = createJobSchema.safeParse(payload);

    if (!parsed.success) {
      setErrors(getFormErrors(parsed.error));
      toast.error("Please fix the highlighted fields");
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      const result = await createJobAction(parsed.data);

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success("Job scheduled");
      router.push(`/jobs/${result.data.id}`);
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  };

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
        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-slate-200 bg-white p-6"
        >
          <h3 className="mb-6 text-lg font-semibold text-slate-900">
            Job Details
          </h3>

          <div className="space-y-5">
            <FormField label="Job Type" density="comfortable">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { value: "scheduled", label: "Scheduled Service" },
                  { value: "complaint", label: "Complaint" },
                  { value: "installation", label: "Installation" },
                  { value: "inspection", label: "Inspection" },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => update("type", option.value)}
                    className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition-all ${
                      form.type === option.value
                        ? "border-brand-500 bg-brand-50 text-brand-700"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </FormField>

            <FormField
              as="select"
              label="Customer"
              name="customerId"
              required
              density="comfortable"
              value={form.customerId}
              onChange={(e) => {
                update("customerId", e.target.value);
                update("assetId", "");
              }}
              error={errors.customerId}
            >
              <select
                name="customerId"
                value={form.customerId}
                onChange={(e) => {
                  update("customerId", e.target.value);
                  update("assetId", "");
                }}
                className={`w-full rounded-lg border px-3 py-2.5 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-brand-500/20 ${
                  errors.customerId
                    ? "border-red-300 focus:border-red-500 focus:ring-red-200"
                    : "border-slate-200 focus:border-brand-500"
                }`}
              >
                <option value="">Select customer...</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name} ({customer.city})
                  </option>
                ))}
              </select>
            </FormField>

            <FormField
              as="select"
              label="Asset"
              name="assetId"
              density="comfortable"
              value={form.assetId}
              onChange={(e) => update("assetId", e.target.value)}
              error={errors.assetId}
            >
              <select
                name="assetId"
                value={form.assetId}
                onChange={(e) => update("assetId", e.target.value)}
                disabled={!form.customerId}
                className={`w-full rounded-lg border px-3 py-2.5 text-sm transition-all disabled:bg-slate-50 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-brand-500/20 ${
                  errors.assetId
                    ? "border-red-300 focus:border-red-500 focus:ring-red-200"
                    : "border-slate-200 focus:border-brand-500"
                }`}
              >
                <option value="">
                  {form.customerId
                    ? "Select asset (optional)..."
                    : "Select customer first"}
                </option>
                {customerAssets.map((asset) => (
                  <option key={asset.id} value={asset.id}>
                    {asset.name} ({asset.model} - {asset.serialNumber})
                  </option>
                ))}
              </select>
            </FormField>

            <FormField
              as="select"
              label="Assign Technician"
              name="technicianId"
              required
              density="comfortable"
              value={form.technicianId}
              onChange={(e) => update("technicianId", e.target.value)}
              error={errors.technicianId}
            >
              <select
                name="technicianId"
                value={form.technicianId}
                onChange={(e) => update("technicianId", e.target.value)}
                className={`w-full rounded-lg border px-3 py-2.5 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-brand-500/20 ${
                  errors.technicianId
                    ? "border-red-300 focus:border-red-500 focus:ring-red-200"
                    : "border-slate-200 focus:border-brand-500"
                }`}
              >
                <option value="">Select technician...</option>
                {technicians.map((technician) => (
                  <option key={technician.id} value={technician.id}>
                    {technician.name} - {technician.territory} ({technician.specialization})
                    {technician.status === "available" ? " [Available]" : ""}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Priority" density="comfortable">
              <div className="grid grid-cols-4 gap-3">
                {[
                  { value: "low", label: "Low", color: "border-blue-300 bg-blue-50 text-blue-700" },
                  { value: "medium", label: "Medium", color: "border-amber-300 bg-amber-50 text-amber-700" },
                  { value: "high", label: "High", color: "border-orange-300 bg-orange-50 text-orange-700" },
                  { value: "critical", label: "Critical", color: "border-red-300 bg-red-50 text-red-700" },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => update("priority", option.value)}
                    className={`rounded-lg border px-3 py-2 text-sm font-medium transition-all ${
                      form.priority === option.value
                        ? option.color
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </FormField>

            <FormField
              label="Scheduled Date"
              name="scheduledDate"
              type="date"
              required
              density="comfortable"
              value={form.scheduledDate}
              onChange={(e) => update("scheduledDate", e.target.value)}
              error={errors.scheduledDate}
            />

            <FormField
              as="textarea"
              label="Notes"
              name="notes"
              density="comfortable"
              rows={3}
              value={form.notes}
              onChange={(e) => update("notes", e.target.value)}
              placeholder="Add any instructions or notes for the technician..."
              error={errors.notes}
              controlClassName="resize-none"
            />
          </div>

          <div className="mt-8 flex items-center gap-3 border-t border-slate-100 pt-6">
            <SubmitButton
              loading={isSubmitting}
              loadingText="Scheduling..."
              className="py-2.5 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:ring-offset-2"
            >
              Schedule Job
            </SubmitButton>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => router.back()}
              className="rounded-lg border border-slate-200 px-6 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
