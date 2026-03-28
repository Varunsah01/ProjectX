"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PageHeader } from "@/components/ui/PageHeader";
import { FormField } from "@/components/ui/FormField";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { createAssetAction } from "@/lib/actions/assets";
import { clearFormError, getFormErrors, type FormErrors } from "@/lib/form-errors";
import { createAssetSchema } from "@/lib/validations/asset";

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

export default function NewAssetPageClient({
  customers,
}: {
  customers: Array<{ id: string; name: string; city: string }>;
}) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
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

  const update = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => clearFormError(prev, field));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (isSubmitting) {
      return;
    }

    const parsed = createAssetSchema.safeParse(form);

    if (!parsed.success) {
      setErrors(getFormErrors(parsed.error));
      toast.error("Please fix the highlighted fields");
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      const result = await createAssetAction(parsed.data);

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success("Asset created");
      router.push(`/assets/${result.data.id}`);
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  };

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
        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-slate-200 bg-white p-6"
        >
          <h3 className="mb-6 text-lg font-semibold text-slate-900">
            Asset Information
          </h3>

          <div className="space-y-5">
            <FormField
              as="select"
              label="Customer"
              name="customerId"
              required
              density="comfortable"
              value={form.customerId}
              onChange={(e) => update("customerId", e.target.value)}
              error={errors.customerId}
            >
              <select
                name="customerId"
                value={form.customerId}
                onChange={(e) => update("customerId", e.target.value)}
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
              label="Category"
              required
              error={errors.category}
              containerClassName="space-y-0"
            >
              <div className="grid grid-cols-3 gap-2">
                {ASSET_CATEGORIES.map((category) => (
                  <button
                    key={category}
                    type="button"
                    onClick={() => update("category", category)}
                    className={`rounded-lg border px-3 py-2 text-xs font-medium transition-all ${
                      form.category === category
                        ? "border-brand-500 bg-brand-50 text-brand-700"
                        : errors.category
                          ? "border-red-200 text-slate-600 hover:bg-slate-50"
                          : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </FormField>

            <FormField
              label="Asset Name"
              name="name"
              required
              density="comfortable"
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              placeholder="e.g. Kent Grand Plus RO"
              error={errors.name}
            />

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <FormField
                label="Model"
                name="model"
                density="comfortable"
                value={form.model}
                onChange={(e) => update("model", e.target.value)}
                placeholder="Model number"
                error={errors.model}
              />
              <FormField
                label="Serial Number"
                name="serialNumber"
                density="comfortable"
                value={form.serialNumber}
                onChange={(e) => update("serialNumber", e.target.value)}
                placeholder="Serial / barcode"
                error={errors.serialNumber}
              />
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <FormField
                label="Installation Date"
                name="installationDate"
                type="date"
                required
                density="comfortable"
                value={form.installationDate}
                onChange={(e) => update("installationDate", e.target.value)}
                error={errors.installationDate}
              />
              <FormField
                label="Warranty End Date"
                name="warrantyEnd"
                type="date"
                required
                density="comfortable"
                value={form.warrantyEnd}
                onChange={(e) => update("warrantyEnd", e.target.value)}
                error={errors.warrantyEnd}
              />
            </div>

            <FormField
              label="Installation Location"
              name="location"
              density="comfortable"
              value={form.location}
              onChange={(e) => update("location", e.target.value)}
              placeholder="e.g. Kitchen, 2nd Floor, Server Room"
              error={errors.location}
            />

            <FormField
              as="textarea"
              label="Notes"
              name="notes"
              density="comfortable"
              rows={3}
              value={form.notes}
              onChange={(e) => update("notes", e.target.value)}
              placeholder="Any additional details about this asset..."
              error={errors.notes}
              controlClassName="resize-none"
            />
          </div>

          <div className="mt-8 flex items-center gap-3 border-t border-slate-100 pt-6">
            <SubmitButton
              loading={isSubmitting}
              loadingText="Adding..."
              className="py-2.5 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:ring-offset-2"
            >
              Add Asset
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
