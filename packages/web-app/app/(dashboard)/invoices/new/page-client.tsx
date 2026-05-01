"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/ui/PageHeader";
import { FormField, getFormControlClassName } from "@/components/ui/FormField";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { createInvoiceAction } from "@/lib/actions/invoices";
import { clearFormError, getFormErrors, type FormErrors } from "@/lib/form-errors";
import { createInvoiceSchema } from "@/lib/validations/invoice";
import { computeGstForLine, isInterStateSupply } from "@/lib/tax/gst";

interface LineItem {
  description: string;
  qty: number;
  rate: number;
  hsnSac: string;
  gstRatePercent: number;
}

export default function NewInvoicePageClient({
  customers,
  orgState,
}: {
  customers: Array<{ id: string; name: string; billingState?: string | null }>;
  orgState: string;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState<"issue" | "draft" | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [customerId, setCustomerId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [type, setType] = useState("recurring");
  const [items, setItems] = useState<LineItem[]>([
    { description: "", qty: 1, rate: 0, hsnSac: "", gstRatePercent: 18 },
  ]);

  const addItem = () =>
    setItems((prev) => [...prev, { description: "", qty: 1, rate: 0, hsnSac: "", gstRatePercent: 18 }]);

  const removeItem = (index: number) =>
    setItems((prev) => prev.filter((_, itemIndex) => itemIndex !== index));

  const updateItem = (
    index: number,
    field: keyof LineItem,
    value: string | number,
  ) => {
    setItems((prev) =>
      prev.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item,
      ),
    );
    setErrors((prev) => clearFormError(prev, `items.${index}.${field}`));
  };

  // Compute live tax preview
  const selectedCustomer = customers.find((c) => c.id === customerId);
  const buyerState = selectedCustomer?.billingState || "";
  const supplierState = orgState || "";
  const canShowTax = supplierState.length === 2 && buyerState.length === 2;
  const interState = canShowTax && isInterStateSupply(supplierState, buyerState);

  const subtotal = items.reduce((sum, item) => sum + item.qty * item.rate, 0);

  let totalCgst = 0;
  let totalSgst = 0;
  let totalIgst = 0;
  if (canShowTax) {
    for (const item of items) {
      const gst = computeGstForLine({
        taxableAmount: item.qty * item.rate,
        gstRatePercent: item.gstRatePercent,
        supplierState,
        buyerState,
      });
      totalCgst += gst.cgst;
      totalSgst += gst.sgst;
      totalIgst += gst.igst;
    }
  }
  const totalTax = totalCgst + totalSgst + totalIgst;
  const grandTotal = subtotal + totalTax;

  const handleCreate = async (draft: boolean) => {
    if (submitting) return;

    const payload = {
      customerId,
      dueDate,
      type: type as "recurring" | "one_time" | "service",
      items: items.map((item) => ({
        ...item,
        amount: item.qty * item.rate,
      })),
      draft,
    };
    const parsed = createInvoiceSchema.safeParse(payload);

    if (!parsed.success) {
      setErrors(getFormErrors(parsed.error));
      toast.error("Please fix the highlighted fields");
      return;
    }

    setSubmitting(draft ? "draft" : "issue");
    setErrors({});

    try {
      const result = await createInvoiceAction(parsed.data);

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success(draft ? "Draft saved" : "Invoice created");
      router.push(`/invoices/${result.data.id}`);
      router.refresh();
    } finally {
      setSubmitting(null);
    }
  };

  return (
    <div>
      <PageHeader
        title="Create Invoice"
        breadcrumbs={[
          { label: "Invoices", href: "/invoices" },
          { label: "Create Invoice" },
        ]}
      />

      <form
        onSubmit={(e) => e.preventDefault()}
        className="max-w-3xl rounded-xl border border-slate-200 bg-white p-6"
      >
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          <FormField
            as="select"
            label="Customer"
            name="customerId"
            required
            value={customerId}
            onChange={(e) => {
              setCustomerId(e.target.value);
              setErrors((prev) => clearFormError(prev, "customerId"));
            }}
            error={errors.customerId}
          >
            <select
              name="customerId"
              value={customerId}
              onChange={(e) => {
                setCustomerId(e.target.value);
                setErrors((prev) => clearFormError(prev, "customerId"));
              }}
              className={getFormControlClassName({ error: errors.customerId })}
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
            label="Due Date"
            name="dueDate"
            type="date"
            required
            value={dueDate}
            onChange={(e) => {
              setDueDate(e.target.value);
              setErrors((prev) => clearFormError(prev, "dueDate"));
            }}
            error={errors.dueDate}
          />
          <FormField
            as="select"
            label="Type"
            name="type"
            value={type}
            onChange={(e) => setType(e.target.value)}
            error={errors.type}
            options={[
              { value: "recurring", label: "Recurring" },
              { value: "one_time", label: "One Time" },
              { value: "service", label: "Service" },
            ]}
          />
        </div>

        <div className="mt-6">
          <h3 className="mb-3 text-sm font-medium text-slate-700">Line Items</h3>
          <div className="space-y-3">
            {items.map((item, index) => (
              <div key={index} className="flex items-start gap-3 flex-wrap">
                <div className="flex-1 min-w-[180px]">
                  <input
                    type="text"
                    placeholder="Description"
                    value={item.description}
                    onChange={(e) =>
                      updateItem(index, "description", e.target.value)
                    }
                    className={getFormControlClassName({
                      error: errors[`items.${index}.description`],
                    })}
                  />
                  {errors[`items.${index}.description`] && (
                    <p className="mt-1.5 text-sm text-red-600">
                      {errors[`items.${index}.description`]}
                    </p>
                  )}
                </div>
                <div className="w-24">
                  <input
                    type="text"
                    placeholder="HSN/SAC"
                    value={item.hsnSac}
                    onChange={(e) =>
                      updateItem(index, "hsnSac", e.target.value)
                    }
                    className={getFormControlClassName({})}
                  />
                </div>
                <div className="w-16">
                  <input
                    type="number"
                    placeholder="Qty"
                    min={1}
                    value={item.qty}
                    onChange={(e) =>
                      updateItem(index, "qty", parseInt(e.target.value, 10) || 0)
                    }
                    className={getFormControlClassName({
                      error: errors[`items.${index}.qty`],
                    })}
                  />
                </div>
                <div className="w-24">
                  <input
                    type="number"
                    placeholder="Rate"
                    min={0}
                    value={item.rate || ""}
                    onChange={(e) =>
                      updateItem(index, "rate", parseFloat(e.target.value) || 0)
                    }
                    className={getFormControlClassName({
                      error: errors[`items.${index}.rate`],
                    })}
                  />
                </div>
                <div className="w-20">
                  <input
                    type="number"
                    placeholder="GST %"
                    min={0}
                    max={28}
                    value={item.gstRatePercent}
                    onChange={(e) =>
                      updateItem(index, "gstRatePercent", parseFloat(e.target.value) || 0)
                    }
                    className={getFormControlClassName({})}
                  />
                </div>
                <div className="w-24 py-2 text-right text-sm font-medium text-slate-900">
                  Rs {(item.qty * item.rate).toLocaleString("en-IN")}
                </div>
                <button
                  type="button"
                  onClick={() => removeItem(index)}
                  disabled={items.length === 1 || Boolean(submitting)}
                  className="mt-1.5 rounded p-1 text-slate-400 hover:text-red-500 disabled:opacity-30"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
          {errors.items && (
            <p className="mt-3 text-sm text-red-600">{errors.items}</p>
          )}
          <button
            type="button"
            onClick={addItem}
            disabled={Boolean(submitting)}
            className="mt-3 inline-flex items-center gap-1 text-sm text-brand-600 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            <Plus className="h-4 w-4" />
            Add Line Item
          </button>
        </div>

        <div className="mt-6 flex justify-end border-t border-slate-100 pt-4">
          <div className="w-56 space-y-1">
            <div className="flex justify-between text-sm text-slate-600">
              <span>Subtotal</span>
              <span>Rs {subtotal.toLocaleString("en-IN")}</span>
            </div>
            {canShowTax && (
              interState ? (
                <div className="flex justify-between text-sm text-slate-600">
                  <span>IGST</span>
                  <span>Rs {totalIgst.toLocaleString("en-IN")}</span>
                </div>
              ) : (
                <>
                  <div className="flex justify-between text-sm text-slate-600">
                    <span>CGST</span>
                    <span>Rs {totalCgst.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between text-sm text-slate-600">
                    <span>SGST</span>
                    <span>Rs {totalSgst.toLocaleString("en-IN")}</span>
                  </div>
                </>
              )
            )}
            <div className="flex justify-between text-lg font-bold border-t border-slate-200 pt-1">
              <span className="text-slate-900">Total</span>
              <span className="text-slate-900">
                Rs {grandTotal.toLocaleString("en-IN")}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center gap-3 border-t border-slate-100 pt-6">
          <SubmitButton
            type="button"
            loading={submitting === "issue"}
            loadingText="Creating..."
            disabled={Boolean(submitting)}
            onClick={() => handleCreate(false)}
          >
            Create Invoice
          </SubmitButton>
          <button
            type="button"
            disabled={Boolean(submitting)}
            onClick={() => handleCreate(true)}
            className="rounded-lg border border-slate-200 px-6 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {submitting === "draft" ? "Saving..." : "Save as Draft"}
          </button>
          <button
            type="button"
            disabled={Boolean(submitting)}
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
