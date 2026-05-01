"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PageHeader } from "@/components/ui/PageHeader";
import { FormField } from "@/components/ui/FormField";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { createCustomerAction } from "@/lib/actions/customers";
import { clearFormError, getFormErrors, type FormErrors } from "@/lib/form-errors";
import { createCustomerSchema } from "@/lib/validations/customer";

export default function NewCustomerPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    city: "",
    gstin: "",
    billingState: "",
    shippingState: "",
    category: "Residential",
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

    const parsed = createCustomerSchema.safeParse(form);

    if (!parsed.success) {
      setErrors(getFormErrors(parsed.error));
      toast.error("Please fix the highlighted fields");
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      const result = await createCustomerAction(parsed.data);

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success("Customer created");
      router.push(`/customers/${result.data.id}`);
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Add Customer"
        breadcrumbs={[
          { label: "Customers", href: "/customers" },
          { label: "Add Customer" },
        ]}
      />

      <form
        onSubmit={handleSubmit}
        className="max-w-2xl rounded-xl border border-slate-200 bg-white p-6"
      >
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <FormField
            label="Customer / Business Name"
            name="name"
            required
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            placeholder="e.g. Sharma Electronics"
            error={errors.name}
            containerClassName="sm:col-span-2"
          />
          <FormField
            label="Phone"
            name="phone"
            type="tel"
            required
            value={form.phone}
            onChange={(e) => update("phone", e.target.value)}
            placeholder="+91 98765 43210"
            error={errors.phone}
          />
          <FormField
            label="Email"
            name="email"
            type="email"
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            placeholder="email@example.com"
            error={errors.email}
          />
          <FormField
            label="Address"
            name="address"
            required
            value={form.address}
            onChange={(e) => update("address", e.target.value)}
            placeholder="Street address"
            error={errors.address}
            containerClassName="sm:col-span-2"
          />
          <FormField
            label="City"
            name="city"
            required
            value={form.city}
            onChange={(e) => update("city", e.target.value)}
            placeholder="e.g. Jaipur"
            error={errors.city}
          />
          <FormField
            as="select"
            label="Category"
            name="category"
            value={form.category}
            onChange={(e) => update("category", e.target.value)}
            error={errors.category}
            options={[
              { value: "Residential", label: "Residential" },
              { value: "Commercial", label: "Commercial" },
            ]}
          />
          <FormField
            label="GSTIN"
            name="gstin"
            value={form.gstin}
            onChange={(e) => update("gstin", e.target.value.toUpperCase())}
            placeholder="e.g. 29ABCDE1234F1Z5"
            error={errors.gstin}
          />
          <FormField
            as="select"
            label="Billing State"
            name="billingState"
            value={form.billingState}
            onChange={(e) => update("billingState", e.target.value)}
            error={errors.billingState}
            options={[
              { value: "", label: "Select State" },
              { value: "01", label: "01 - Jammu & Kashmir" },
              { value: "02", label: "02 - Himachal Pradesh" },
              { value: "03", label: "03 - Punjab" },
              { value: "04", label: "04 - Chandigarh" },
              { value: "05", label: "05 - Uttarakhand" },
              { value: "06", label: "06 - Haryana" },
              { value: "07", label: "07 - Delhi" },
              { value: "08", label: "08 - Rajasthan" },
              { value: "09", label: "09 - Uttar Pradesh" },
              { value: "10", label: "10 - Bihar" },
              { value: "11", label: "11 - Sikkim" },
              { value: "12", label: "12 - Arunachal Pradesh" },
              { value: "13", label: "13 - Nagaland" },
              { value: "14", label: "14 - Manipur" },
              { value: "15", label: "15 - Mizoram" },
              { value: "16", label: "16 - Tripura" },
              { value: "17", label: "17 - Meghalaya" },
              { value: "18", label: "18 - Assam" },
              { value: "19", label: "19 - West Bengal" },
              { value: "20", label: "20 - Jharkhand" },
              { value: "21", label: "21 - Odisha" },
              { value: "22", label: "22 - Chhattisgarh" },
              { value: "23", label: "23 - Madhya Pradesh" },
              { value: "24", label: "24 - Gujarat" },
              { value: "27", label: "27 - Maharashtra" },
              { value: "29", label: "29 - Karnataka" },
              { value: "30", label: "30 - Goa" },
              { value: "32", label: "32 - Kerala" },
              { value: "33", label: "33 - Tamil Nadu" },
              { value: "34", label: "34 - Puducherry" },
              { value: "36", label: "36 - Telangana" },
              { value: "37", label: "37 - Andhra Pradesh" },
              { value: "38", label: "38 - Ladakh" },
            ]}
          />
        </div>

        <div className="mt-6 flex items-center gap-3 border-t border-slate-100 pt-6">
          <SubmitButton loading={isSubmitting} loadingText="Adding...">
            Add Customer
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
