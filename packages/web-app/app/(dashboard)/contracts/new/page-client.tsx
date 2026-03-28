"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PageHeader } from "@/components/ui/PageHeader";
import { FormField } from "@/components/ui/FormField";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { BILLING_CYCLE_OPTIONS, formatBillingCycleLabel } from "@/lib/billing";
import { createContractAction } from "@/lib/actions/contracts";
import { clearFormError, getFormErrors, type FormErrors } from "@/lib/form-errors";
import { createContractSchema } from "@/lib/validations/contract";
import type { Asset, BillingCycle, Plan } from "@/lib/types";

interface ContractFormState {
  customerId: string;
  assetId: string;
  planId: string;
  type: "amc" | "warranty";
  billingCycle: BillingCycle;
  startDate: string;
  notes: string;
}

export default function CreateContractPageClient({
  customers,
  assets,
  plans,
}: {
  customers: Array<{ id: string; name: string; city: string }>;
  assets: Asset[];
  plans: Plan[];
}) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [form, setForm] = useState<ContractFormState>({
    customerId: "",
    assetId: "",
    planId: "",
    type: "amc",
    billingCycle: "yearly",
    startDate: "",
    notes: "",
  });

  const update = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => clearFormError(prev, field));
  };

  const customerAssets = assets.filter((asset) => asset.customerId === form.customerId);
  const filteredPlans = plans.filter((plan) => plan.isActive && plan.type === form.type);
  const selectedPlan = plans.find((plan) => plan.id === form.planId);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (isSubmitting) {
      return;
    }

    const parsed = createContractSchema.safeParse(form);

    if (!parsed.success) {
      setErrors(getFormErrors(parsed.error));
      toast.error("Please fix the highlighted fields");
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      const result = await createContractAction(parsed.data);

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success("Contract created");
      router.push(`/contracts/${result.data.id}`);
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  };

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
        <div className="lg:col-span-2">
          <form
            onSubmit={handleSubmit}
            className="rounded-xl border border-slate-200 bg-white p-6"
          >
            <h3 className="mb-6 text-lg font-semibold text-slate-900">
              Contract Details
            </h3>

            <div className="space-y-5">
              <FormField label="Contract Type" density="comfortable">
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
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        update("type", option.value);
                        update("planId", "");
                      }}
                      className={`rounded-xl border p-4 text-left transition-all ${
                        form.type === option.value
                          ? "border-brand-500 bg-brand-50 ring-1 ring-brand-500"
                          : "border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <p
                        className={`text-sm font-semibold ${
                          form.type === option.value
                            ? "text-brand-700"
                            : "text-slate-900"
                        }`}
                      >
                        {option.label}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {option.desc}
                      </p>
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
                required
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
                    {form.customerId ? "Select asset..." : "Select customer first"}
                  </option>
                  {customerAssets.map((asset) => (
                    <option key={asset.id} value={asset.id}>
                      {asset.name} ({asset.model} - {asset.serialNumber})
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField
                label="Service Plan"
                required
                error={errors.planId}
                density="comfortable"
              >
                {filteredPlans.length === 0 ? (
                  <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-500">
                    No active plans available for {form.type === "amc" ? "AMC" : "Warranty"}. Create one in Settings.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {filteredPlans.map((plan) => (
                      <button
                        key={plan.id}
                        type="button"
                        onClick={() => update("planId", plan.id)}
                        className={`rounded-xl border p-4 text-left transition-all ${
                          form.planId === plan.id
                            ? "border-brand-500 bg-brand-50 ring-1 ring-brand-500"
                            : errors.planId
                              ? "border-red-200 hover:bg-slate-50"
                              : "border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        <p className="text-sm font-semibold text-slate-900">
                          {plan.name}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {plan.description}
                        </p>
                        <div className="mt-2 flex items-center justify-between">
                          <span className="tabular-nums text-sm font-bold text-brand-600">
                            {new Intl.NumberFormat("en-IN", {
                              style: "currency",
                              currency: "INR",
                              maximumFractionDigits: 0,
                            }).format(plan.price)}
                          </span>
                          <span className="text-xs text-slate-400">
                            {plan.duration}mo · {plan.visitsCovered} visits
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </FormField>

              <FormField
                as="select"
                label="Billing Cycle"
                name="billingCycle"
                required
                density="comfortable"
                value={form.billingCycle}
                onChange={(e) => update("billingCycle", e.target.value)}
                error={errors.billingCycle}
                options={BILLING_CYCLE_OPTIONS.map((option) => ({
                  value: option.value,
                  label: option.label,
                }))}
              />

              <FormField
                label="Start Date"
                name="startDate"
                type="date"
                required
                density="comfortable"
                value={form.startDate}
                onChange={(e) => update("startDate", e.target.value)}
                error={errors.startDate}
              />

              <FormField
                as="textarea"
                label="Notes"
                name="notes"
                density="comfortable"
                rows={3}
                value={form.notes}
                onChange={(e) => update("notes", e.target.value)}
                placeholder="Any additional terms or notes..."
                error={errors.notes}
                controlClassName="resize-none"
              />
            </div>

            <div className="mt-8 flex items-center gap-3 border-t border-slate-100 pt-6">
              <SubmitButton
                loading={isSubmitting}
                loadingText="Creating..."
                className="py-2.5 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:ring-offset-2"
              >
                Create Contract
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

        <div>
          <div className="sticky top-24 rounded-xl border border-slate-200 bg-white p-6">
            <h3 className="mb-4 font-semibold text-slate-900">Contract Summary</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Type</span>
                <span className="font-medium uppercase text-slate-900">
                  {form.type}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Plan</span>
                <span className="font-medium text-slate-900">
                  {selectedPlan?.name || "-"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Billing</span>
                <span className="text-slate-900">
                  {formatBillingCycleLabel(form.billingCycle)}
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
                  <div className="flex justify-between border-t border-slate-100 pt-3">
                    <span className="font-medium text-slate-700">Value</span>
                    <span className="font-bold text-slate-900">
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
