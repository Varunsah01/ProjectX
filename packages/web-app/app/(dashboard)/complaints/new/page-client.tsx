"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PageHeader } from "@/components/ui/PageHeader";
import { FormField } from "@/components/ui/FormField";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { createTicketAction } from "@/lib/actions/tickets";
import { clearFormError, getFormErrors, type FormErrors } from "@/lib/form-errors";
import { createTicketSchema } from "@/lib/validations/ticket";
import type { Asset, Technician } from "@/lib/types";

export default function NewComplaintPageClient({
  customers,
  assets,
  technicians,
}: {
  customers: Array<{ id: string; name: string }>;
  assets: Asset[];
  technicians: Technician[];
}) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [form, setForm] = useState({
    customerId: "",
    assetId: "",
    subject: "",
    description: "",
    category: "",
    priority: "medium",
    assignTo: "",
  });

  const update = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    const errorField = field === "assignTo" ? "assignedToId" : field;
    setErrors((prev) => clearFormError(prev, errorField));
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
      subject: form.subject,
      description: form.description,
      category: form.category,
      priority: form.priority as "low" | "medium" | "high" | "critical",
      assignedToId: form.assignTo,
    };
    const parsed = createTicketSchema.safeParse(payload);

    if (!parsed.success) {
      setErrors(getFormErrors(parsed.error));
      toast.error("Please fix the highlighted fields");
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      const result = await createTicketAction(parsed.data);

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success("Complaint logged");
      router.push(`/complaints/${result.data.id}`);
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
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
          <FormField
            as="select"
            label="Customer"
            name="customerId"
            required
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
              className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${
                errors.customerId
                  ? "border-red-300 focus:border-red-500 focus:ring-red-200"
                  : "border-slate-200 focus:border-brand-500 focus:ring-brand-500"
              }`}
            >
              <option value="">Select customer</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                </option>
              ))}
            </select>
          </FormField>
          <FormField
            as="select"
            label="Asset"
            name="assetId"
            value={form.assetId}
            onChange={(e) => update("assetId", e.target.value)}
            error={errors.assetId}
          >
            <select
              name="assetId"
              value={form.assetId}
              onChange={(e) => update("assetId", e.target.value)}
              disabled={!form.customerId}
              className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 disabled:bg-slate-50 disabled:opacity-60 ${
                errors.assetId
                  ? "border-red-300 focus:border-red-500 focus:ring-red-200"
                  : "border-slate-200 focus:border-brand-500 focus:ring-brand-500"
              }`}
            >
              <option value="">Select asset (optional)</option>
              {customerAssets.map((asset) => (
                <option key={asset.id} value={asset.id}>
                  {asset.name} - {asset.model}
                </option>
              ))}
            </select>
          </FormField>
          <FormField
            label="Subject"
            name="subject"
            required
            value={form.subject}
            onChange={(e) => update("subject", e.target.value)}
            placeholder="Brief description of the issue"
            error={errors.subject}
            containerClassName="sm:col-span-2"
          />
          <FormField
            as="textarea"
            label="Description"
            name="description"
            required
            rows={4}
            value={form.description}
            onChange={(e) => update("description", e.target.value)}
            placeholder="Detailed description of the complaint..."
            error={errors.description}
            containerClassName="sm:col-span-2"
          />
          <FormField
            as="select"
            label="Category"
            name="category"
            required
            value={form.category}
            onChange={(e) => update("category", e.target.value)}
            error={errors.category}
          >
            <select
              name="category"
              value={form.category}
              onChange={(e) => update("category", e.target.value)}
              className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${
                errors.category
                  ? "border-red-300 focus:border-red-500 focus:ring-red-200"
                  : "border-slate-200 focus:border-brand-500 focus:ring-brand-500"
              }`}
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
          </FormField>
          <FormField
            as="select"
            label="Priority"
            name="priority"
            value={form.priority}
            onChange={(e) => update("priority", e.target.value)}
            error={errors.priority}
            options={[
              { value: "low", label: "Low" },
              { value: "medium", label: "Medium" },
              { value: "high", label: "High" },
              { value: "critical", label: "Critical" },
            ]}
          />
          <FormField
            as="select"
            label="Assign Technician"
            name="assignTo"
            value={form.assignTo}
            onChange={(e) => update("assignTo", e.target.value)}
            error={errors.assignedToId}
            containerClassName="sm:col-span-2"
          >
            <select
              name="assignTo"
              value={form.assignTo}
              onChange={(e) => update("assignTo", e.target.value)}
              className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${
                errors.assignedToId
                  ? "border-red-300 focus:border-red-500 focus:ring-red-200"
                  : "border-slate-200 focus:border-brand-500 focus:ring-brand-500"
              }`}
            >
              <option value="">Assign later</option>
              {technicians.map((technician) => (
                <option key={technician.id} value={technician.id}>
                  {technician.name} ({technician.territory}) - {technician.specialization}
                </option>
              ))}
            </select>
          </FormField>
        </div>

        <div className="mt-6 flex items-center gap-3 border-t border-slate-100 pt-6">
          <SubmitButton loading={isSubmitting} loadingText="Logging...">
            Log Complaint
          </SubmitButton>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => router.back()}
            className="rounded-lg border border-slate-200 px-6 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
