"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CreditCard, Download, Edit, Plus, RefreshCcw, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { FormField, getFormControlClassName } from "@/components/ui/FormField";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { SubmitButton } from "@/components/ui/SubmitButton";
import {
  deleteInvoiceAction,
  issueInvoiceAction,
  updateInvoiceAction,
} from "@/lib/actions/invoices";
import { RecordPaymentModal } from "../RecordPaymentModal";
import { RefundModal } from "../RefundModal";
import type { Payment } from "@/lib/types";
import { bulkSendInvoiceRemindersAction } from "@/lib/actions/bulk";
import { clearFormError, getFormErrors, type FormErrors } from "@/lib/form-errors";
import { updateInvoiceSchema } from "@/lib/validations/invoice";
import { formatCurrency, formatDate } from "@/lib/utils";
import { computeGstForLine, isInterStateSupply } from "@/lib/tax/gst";
import type { Invoice } from "@/lib/types";

interface LineItem {
  id?: string;
  description: string;
  qty: number;
  rate: number;
  hsnSac: string;
  gstRatePercent: number;
}

interface InvoiceFormState {
  customerId: string;
  dueDate: string;
  type: Invoice["type"];
  status: Invoice["status"];
  notes: string;
  items: LineItem[];
}

function getInitialFormState(invoice: Invoice) {
  return {
    customerId: invoice.customerId,
    dueDate: invoice.dueDate,
    type: invoice.type,
    status: invoice.status,
    notes: invoice.notes ?? "",
    items: invoice.items.map((item) => ({
      id: item.id,
      description: item.description,
      qty: item.qty,
      rate: item.rate,
      hsnSac: item.hsnSac ?? "",
      gstRatePercent: item.gstRatePercent ?? 18,
    })),
  };
}

export default function InvoiceDetailPageClient({
  invoice,
  customers,
  orgState,
}: {
  invoice: Invoice | null;
  customers: Array<{ id: string; name: string; billingState?: string | null }>;
  orgState: string;
}) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [refundPayment, setRefundPayment] = useState<Payment | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [form, setForm] = useState<InvoiceFormState>(
    invoice
      ? getInitialFormState(invoice)
      : {
          customerId: "",
          dueDate: "",
          type: "recurring" as const,
          status: "issued" as const,
          notes: "",
          items: [{ description: "", qty: 1, rate: 0, hsnSac: "", gstRatePercent: 18 }],
        },
  );

  useEffect(() => {
    if (!invoice) {
      return;
    }

    setForm(getInitialFormState(invoice));
    setErrors({});
    setIsEditing(false);
  }, [invoice]);

  if (!invoice) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-lg text-slate-500">Invoice not found</p>
        <button
          onClick={() => router.push("/invoices")}
          className="mt-4 text-sm text-brand-600 hover:underline"
        >
          Back to invoices
        </button>
      </div>
    );
  }

  const balance = invoice.amount - invoice.paidAmount;
  const isBusy = (key: string) => pendingAction === key;

  const updateField = (
    field: "customerId" | "dueDate" | "type" | "status" | "notes",
    value: string,
  ) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => clearFormError(prev, field));
  };

  const updateItem = (
    index: number,
    field: keyof LineItem,
    value: string | number,
  ) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item,
      ),
    }));
    setErrors((prev) => clearFormError(prev, `items.${index}.${field}`));
  };

  const addItem = () =>
    setForm((prev) => ({
      ...prev,
      items: [...prev.items, { description: "", qty: 1, rate: 0, hsnSac: "", gstRatePercent: 18 }],
    }));

  const removeItem = (index: number) =>
    setForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, itemIndex) => itemIndex !== index),
    }));

  const runAction = async <T,>(
    key: string,
    action: Promise<{ success: boolean; data?: T; error?: string }>,
    successMessage: string,
    onSuccess?: (data: T | undefined) => void,
  ) => {
    if (pendingAction) {
      return;
    }

    setPendingAction(key);

    try {
      const result = await action;

      if (!result.success) {
        toast.error(result.error ?? "Something went wrong");
        return;
      }

      toast.success(successMessage);
      onSuccess?.(result.data);
    } finally {
      setPendingAction(null);
    }
  };

  const handleSave = async () => {
    const parsed = updateInvoiceSchema.safeParse({
      id: invoice.id,
      customerId: form.customerId,
      dueDate: form.dueDate,
      type: form.type,
      status: form.status,
      paidAmount: invoice.paidAmount,
      notes: form.notes,
      items: form.items.map((item) => ({
        id: item.id,
        description: item.description,
        qty: item.qty,
        rate: item.rate,
        amount: item.qty * item.rate,
        hsnSac: item.hsnSac,
        gstRatePercent: item.gstRatePercent,
      })),
    });

    if (!parsed.success) {
      setErrors(getFormErrors(parsed.error));
      toast.error("Please fix the highlighted fields");
      return;
    }

    await runAction(
      "save",
      updateInvoiceAction(parsed.data),
      "Invoice updated",
      () => {
        setIsEditing(false);
        router.refresh();
      },
    );
  };

  const handleCancelInvoice = async () => {
    await runAction(
      "status",
      updateInvoiceAction({ id: invoice.id, status: "cancelled" }),
      "Invoice cancelled",
      () => {
        router.refresh();
      },
    );
  };

  const handleDelete = async () => {
    await runAction(
      "delete",
      deleteInvoiceAction(invoice.id),
      "Invoice deleted",
      () => {
        setIsDeleteOpen(false);
        router.push("/invoices");
        router.refresh();
      },
    );
  };

  const handleIssueInvoice = async () => {
    await runAction(
      "issue",
      issueInvoiceAction(invoice.id),
      "Invoice issued",
      () => router.refresh(),
    );
  };

  const handleSendReminder = async () => {
    await runAction(
      "reminder",
      bulkSendInvoiceRemindersAction({ ids: [invoice.id] }),
      "Reminder sent to customer",
    );
  };

  const canSendReminder = ["issued", "overdue", "partial"].includes(invoice.status);

  const formSubtotal = form.items.reduce((sum, item) => sum + item.qty * item.rate, 0);

  // Compute live tax preview in edit mode
  const selectedCustomer = customers.find((c) => c.id === form.customerId);
  const buyerState = selectedCustomer?.billingState || "";
  const supplierState = orgState || "";
  const canShowEditTax = supplierState.length === 2 && buyerState.length === 2;
  const editInterState = canShowEditTax && isInterStateSupply(supplierState, buyerState);

  let editCgst = 0;
  let editSgst = 0;
  let editIgst = 0;
  if (canShowEditTax) {
    for (const item of form.items) {
      const gst = computeGstForLine({
        taxableAmount: item.qty * item.rate,
        gstRatePercent: item.gstRatePercent,
        supplierState,
        buyerState,
      });
      editCgst += gst.cgst;
      editSgst += gst.sgst;
      editIgst += gst.igst;
    }
  }
  const editTotalTax = editCgst + editSgst + editIgst;
  const formTotal = formSubtotal + editTotalTax;

  return (
    <div>
      <PageHeader
        title={invoice.invoiceNumber}
        breadcrumbs={[
          { label: "Invoices", href: "/invoices" },
          { label: invoice.invoiceNumber },
        ]}
        actions={
          <div className="flex items-center gap-2">
            {isEditing ? (
              <button
                type="button"
                disabled={Boolean(pendingAction)}
                onClick={() => {
                  setForm(getInitialFormState(invoice));
                  setErrors({});
                  setIsEditing(false);
                }}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
              >
                Cancel
              </button>
            ) : (
              <>
                {invoice.status === "draft" && (
                  <button
                    type="button"
                    disabled={Boolean(pendingAction)}
                    onClick={handleIssueInvoice}
                    className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    <Send className="h-4 w-4" />
                    {isBusy("issue") ? "Issuing..." : "Issue Invoice"}
                  </button>
                )}
                <button
                  type="button"
                  disabled={Boolean(pendingAction)}
                  onClick={() => setIsEditing(true)}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  <Edit className="h-4 w-4" />
                  Edit
                </button>
                {!["paid", "cancelled"].includes(invoice.status) && (
                  <button
                    type="button"
                    disabled={Boolean(pendingAction)}
                    onClick={handleCancelInvoice}
                    className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isBusy("status") ? "Updating..." : "Cancel Invoice"}
                  </button>
                )}
                {canSendReminder && (
                  <button
                    type="button"
                    disabled={Boolean(pendingAction)}
                    onClick={handleSendReminder}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    <Send className="h-4 w-4" />
                    {isBusy("reminder") ? "Sending..." : "Send Reminder"}
                  </button>
                )}
                {["issued", "overdue", "partial"].includes(invoice.status) && balance > 0 && (
                  <button
                    type="button"
                    disabled={Boolean(pendingAction)}
                    onClick={() => setIsPaymentOpen(true)}
                    className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    <CreditCard className="h-4 w-4" />
                    Record Payment
                  </button>
                )}
                <a
                  href={`/api/invoices/${invoice.id}/pdf`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  <Download className="h-4 w-4" />
                  Download PDF
                </a>
              </>
            )}
            <button
              type="button"
              disabled={Boolean(pendingAction)}
              onClick={() => setIsDeleteOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-70"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
          </div>
        }
      />

      {invoice.status === "draft" && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-800">This invoice is a draft</p>
            <p className="text-xs text-amber-600">
              It has not been sent to the customer. Click{" "}
              <span className="font-medium">Issue Invoice</span> to issue it and send a notification.
            </p>
          </div>
          <button
            type="button"
            disabled={Boolean(pendingAction)}
            onClick={handleIssueInvoice}
            className="shrink-0 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isBusy("issue") ? "Issuing..." : "Issue Invoice"}
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-2">
          {isEditing ? (
            <div>
              <h3 className="mb-4 font-semibold text-slate-900">Edit Invoice</h3>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <FormField
                  as="select"
                  label="Customer"
                  name="customerId"
                  required
                  value={form.customerId}
                  onChange={(e) => updateField("customerId", e.target.value)}
                  error={errors.customerId}
                >
                  <select
                    name="customerId"
                    value={form.customerId}
                    onChange={(e) => updateField("customerId", e.target.value)}
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
                  value={form.dueDate}
                  onChange={(e) => updateField("dueDate", e.target.value)}
                  error={errors.dueDate}
                />
                <FormField
                  as="select"
                  label="Type"
                  name="type"
                  value={form.type}
                  onChange={(e) => updateField("type", e.target.value)}
                  error={errors.type}
                  options={[
                    { value: "recurring", label: "Recurring" },
                    { value: "one_time", label: "One Time" },
                    { value: "service", label: "Service" },
                  ]}
                />
                <FormField
                  as="select"
                  label="Status"
                  name="status"
                  value={form.status}
                  onChange={(e) => updateField("status", e.target.value)}
                  error={errors.status}
                  options={[
                    { value: "draft", label: "Draft" },
                    { value: "issued", label: "Issued" },
                    { value: "partial", label: "Partial" },
                    { value: "paid", label: "Paid" },
                    { value: "overdue", label: "Overdue" },
                    { value: "cancelled", label: "Cancelled" },
                    { value: "partially_refunded", label: "Partially Refunded" },
                    { value: "refunded", label: "Refunded" },
                  ]}
                />
                <FormField
                  as="textarea"
                  label="Notes"
                  name="notes"
                  rows={3}
                  value={form.notes}
                  onChange={(e) => updateField("notes", e.target.value)}
                  error={errors.notes}
                  containerClassName="sm:col-span-2"
                />
              </div>

              <div className="mt-6">
                <h3 className="mb-3 text-sm font-medium text-slate-700">Line Items</h3>
                <div className="space-y-3">
                  {form.items.map((item, index) => (
                    <div key={item.id ?? index} className="flex items-start gap-3 flex-wrap">
                      <div className="flex-1 min-w-[180px]">
                        <input
                          type="text"
                          placeholder="Description"
                          value={item.description}
                          onChange={(e) => updateItem(index, "description", e.target.value)}
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
                          onChange={(e) => updateItem(index, "hsnSac", e.target.value)}
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
                        {formatCurrency(item.qty * item.rate)}
                      </div>
                      <button
                        type="button"
                        disabled={form.items.length === 1 || Boolean(pendingAction)}
                        onClick={() => removeItem(index)}
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
                  disabled={Boolean(pendingAction)}
                  onClick={addItem}
                  className="mt-3 inline-flex items-center gap-1 text-sm text-brand-600 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  <Plus className="h-4 w-4" />
                  Add Line Item
                </button>
              </div>

              <div className="mt-6 flex items-center gap-3 border-t border-slate-100 pt-6">
                <SubmitButton
                  type="button"
                  loading={isBusy("save")}
                  loadingText="Saving..."
                  onClick={handleSave}
                >
                  Save Changes
                </SubmitButton>
                <button
                  type="button"
                  disabled={Boolean(pendingAction)}
                  onClick={() => {
                    setForm(getInitialFormState(invoice));
                    setErrors({});
                    setIsEditing(false);
                  }}
                  className="rounded-lg border border-slate-200 px-6 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-start justify-between border-b border-slate-100 pb-6">
                <div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600">
                    <span className="text-lg font-bold text-white">X</span>
                  </div>
                  <p className="mt-2 text-lg font-bold text-slate-900">
                    {invoice.invoiceNumber}
                  </p>
                  <p className="text-sm capitalize text-slate-500">
                    {invoice.type} invoice
                  </p>
                </div>
                <StatusBadge status={invoice.status} className="text-sm" />
              </div>

              <div className="grid grid-cols-2 gap-6 border-b border-slate-100 py-6">
                <div>
                  <p className="text-xs font-medium text-slate-500">Bill To</p>
                  <Link
                    href={`/customers/${invoice.customerId}`}
                    className="mt-1 text-sm font-medium text-brand-600 hover:underline"
                  >
                    {invoice.customerName}
                  </Link>
                </div>
                <div className="text-right">
                  <div className="mb-2">
                    <p className="text-xs text-slate-500">Issue Date</p>
                    <p className="text-sm font-medium text-slate-900">
                      {formatDate(invoice.issuedDate)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Due Date</p>
                    <p className="text-sm font-medium text-slate-900">
                      {formatDate(invoice.dueDate)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="py-6">
                {(() => {
                  const hasHsnSac = invoice.items.some((item) => item.hsnSac);
                  const hasGstBreakdown = invoice.subtotalAmount != null;
                  return (
                    <table className="w-full">
                      <thead>
                        <tr className="text-left text-xs font-semibold uppercase text-slate-500">
                          <th className="pb-3">Description</th>
                          {hasHsnSac && <th className="pb-3">HSN/SAC</th>}
                          <th className="pb-3 text-center">Qty</th>
                          <th className="pb-3 text-right">Rate</th>
                          {hasGstBreakdown && <th className="pb-3 text-right">GST %</th>}
                          <th className="pb-3 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {invoice.items.map((item, index) => (
                          <tr key={item.id ?? index}>
                            <td className="py-3 text-sm text-slate-700">
                              {item.description}
                            </td>
                            {hasHsnSac && (
                              <td className="py-3 text-sm text-slate-600">
                                {item.hsnSac || "—"}
                              </td>
                            )}
                            <td className="py-3 text-center text-sm text-slate-600">
                              {item.qty}
                            </td>
                            <td className="py-3 text-right text-sm text-slate-600">
                              {formatCurrency(item.rate)}
                            </td>
                            {hasGstBreakdown && (
                              <td className="py-3 text-right text-sm text-slate-600">
                                {item.gstRatePercent != null ? `${item.gstRatePercent}%` : "—"}
                              </td>
                            )}
                            <td className="py-3 text-right text-sm font-medium text-slate-900">
                              {formatCurrency(item.taxableAmount ?? item.amount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  );
                })()}
              </div>

              {invoice.notes && (
                <div className="mb-6 rounded-lg bg-slate-50 p-4">
                  <p className="text-xs text-slate-500">Notes</p>
                  <p className="mt-1 text-sm text-slate-700">{invoice.notes}</p>
                </div>
              )}

              <div className="border-t border-slate-200 pt-4">
                <div className="flex justify-end">
                  <div className="w-64 space-y-2">
                    {invoice.subtotalAmount != null ? (
                      <>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500">Subtotal</span>
                          <span className="text-slate-900">
                            {formatCurrency(invoice.subtotalAmount)}
                          </span>
                        </div>
                        {invoice.isInterState ? (
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-500">IGST</span>
                            <span className="text-slate-900">
                              {formatCurrency(invoice.igstAmount ?? 0)}
                            </span>
                          </div>
                        ) : (
                          <>
                            <div className="flex justify-between text-sm">
                              <span className="text-slate-500">CGST</span>
                              <span className="text-slate-900">
                                {formatCurrency(invoice.cgstAmount ?? 0)}
                              </span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-slate-500">SGST</span>
                              <span className="text-slate-900">
                                {formatCurrency(invoice.sgstAmount ?? 0)}
                              </span>
                            </div>
                          </>
                        )}
                        <div className="flex justify-between border-t border-slate-100 pt-2 text-sm font-semibold">
                          <span className="text-slate-900">Total</span>
                          <span className="text-slate-900">
                            {formatCurrency(invoice.amount)}
                          </span>
                        </div>
                      </>
                    ) : (
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Total</span>
                        <span className="text-slate-900">
                          {formatCurrency(invoice.amount)}
                        </span>
                      </div>
                    )}
                    {invoice.paidAmount > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Paid</span>
                        <span className="text-green-600">
                          -{formatCurrency(invoice.paidAmount)}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-semibold">
                      <span className="text-slate-900">Balance Due</span>
                      <span className={balance > 0 ? "text-red-600" : "text-green-600"}>
                        {formatCurrency(balance)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <h3 className="mb-3 font-semibold text-slate-900">Summary</h3>
            <div className="space-y-3 text-sm">
              {isEditing && canShowEditTax && (
                <>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Subtotal</span>
                    <span className="font-medium">{formatCurrency(formSubtotal)}</span>
                  </div>
                  {editInterState ? (
                    <div className="flex justify-between">
                      <span className="text-slate-500">IGST</span>
                      <span className="font-medium">{formatCurrency(editIgst)}</span>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between">
                        <span className="text-slate-500">CGST</span>
                        <span className="font-medium">{formatCurrency(editCgst)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">SGST</span>
                        <span className="font-medium">{formatCurrency(editSgst)}</span>
                      </div>
                    </>
                  )}
                </>
              )}
              <div className="flex justify-between">
                <span className="text-slate-500">Total Amount</span>
                <span className="font-medium">
                  {formatCurrency(isEditing ? formTotal : invoice.amount)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Paid</span>
                <span className="text-green-600">
                  {formatCurrency(invoice.paidAmount)}
                </span>
              </div>
              <div className="flex justify-between border-t border-slate-100 pt-2">
                <span className="font-medium text-slate-700">Outstanding</span>
                <span className={`font-bold ${balance > 0 ? "text-red-600" : "text-green-600"}`}>
                  {formatCurrency(Math.max(0, (isEditing ? formTotal : invoice.amount) - invoice.paidAmount))}
                </span>
              </div>
            </div>
          </div>

          {invoice.payments && invoice.payments.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="mb-3 font-semibold text-slate-900">Payments &amp; Refunds</h3>
              <div className="space-y-4">
                {invoice.payments.map((payment) => {
                  const refundable = payment.amount - payment.refundedAmountPaisa;
                  const canRefund = payment.status === "captured" && refundable > 0;
                  return (
                    <div
                      key={payment.id}
                      className="rounded-lg border border-slate-100 p-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs text-slate-500">
                            {payment.razorpayPaymentId ?? "Pending capture"}
                          </p>
                          <p className="text-sm font-semibold text-slate-900">
                            {formatCurrency(payment.amount / 100)}
                          </p>
                          <p className="mt-0.5 text-xs capitalize text-slate-500">
                            {payment.status} · {payment.method}
                          </p>
                          {payment.refundedAmountPaisa > 0 && (
                            <p className="mt-0.5 text-xs text-purple-600">
                              Refunded: {formatCurrency(payment.refundedAmountPaisa / 100)}
                            </p>
                          )}
                        </div>
                        {canRefund && (
                          <button
                            type="button"
                            disabled={Boolean(pendingAction)}
                            onClick={() => setRefundPayment(payment)}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
                          >
                            <RefreshCcw className="h-3.5 w-3.5" />
                            Refund
                          </button>
                        )}
                      </div>
                      {payment.refunds.length > 0 && (
                        <ul className="mt-3 space-y-2 border-t border-slate-100 pt-3">
                          {payment.refunds.map((refund) => (
                            <li
                              key={refund.id}
                              className="flex items-start justify-between text-xs"
                            >
                              <div>
                                <p className="font-medium text-slate-900">
                                  {formatCurrency(refund.amountPaisa / 100)}
                                </p>
                                <p className="text-slate-500">{refund.reason}</p>
                                <p className="text-slate-400">
                                  by {refund.initiatedByName} · {formatDate(refund.createdAt)}
                                </p>
                              </div>
                              <StatusBadge status={refund.status} />
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <h3 className="mb-3 font-semibold text-slate-900">Activity</h3>
            <div className="space-y-3">
              <ActivityItem
                date={invoice.issuedDate}
                text={invoice.status === "draft" ? "Invoice saved as draft" : "Invoice created and issued"}
              />
              {invoice.paidAmount > 0 && (
                <ActivityItem
                  date={invoice.issuedDate}
                  text={`Payment received: ${formatCurrency(invoice.paidAmount)}`}
                />
              )}
              {invoice.status === "overdue" && (
                <ActivityItem
                  date={invoice.dueDate}
                  text="Invoice became overdue"
                  alert
                />
              )}
            </div>
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={isDeleteOpen}
        onClose={() => {
          if (!isBusy("delete")) {
            setIsDeleteOpen(false);
          }
        }}
        onConfirm={handleDelete}
        title="Delete Invoice"
        description={`Delete ${invoice.invoiceNumber}? This cannot be undone.`}
        confirmLabel="Delete Invoice"
        loading={isBusy("delete")}
      />

      <RecordPaymentModal
        invoice={invoice}
        isOpen={isPaymentOpen}
        onClose={() => setIsPaymentOpen(false)}
        onSuccess={() => router.refresh()}
      />

      {refundPayment && (
        <RefundModal
          payment={refundPayment}
          isOpen={Boolean(refundPayment)}
          onClose={() => setRefundPayment(null)}
          onSuccess={() => {
            setRefundPayment(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

function ActivityItem({
  date,
  text,
  alert,
}: {
  date: string;
  text: string;
  alert?: boolean;
}) {
  return (
    <div className="flex gap-3">
      <div
        className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${alert ? "bg-red-400" : "bg-slate-300"}`}
      />
      <div>
        <p className="text-sm text-slate-700">{text}</p>
        <p className="text-xs text-slate-400">{formatDate(date)}</p>
      </div>
    </div>
  );
}
