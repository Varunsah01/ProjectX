"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Calendar, Edit, FileText, Package, RefreshCw, RotateCcw, Shield, Trash2, User, XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { BILLING_CYCLE_OPTIONS, formatBillingCycleLabel } from "@/lib/billing";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { BillingSchedulePreview } from "@/components/ui/BillingSchedulePreview";
import { DataTable } from "@/components/ui/DataTable";
import { FormField } from "@/components/ui/FormField";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { Tabs } from "@/components/ui/Tabs";
import {
  deleteContractAction,
  generateRenewalQuoteAction,
  renewContractAction,
  updateContractAction,
} from "@/lib/actions/contracts";
import { clearFormError, getFormErrors, type FormErrors } from "@/lib/form-errors";
import { updateContractSchema } from "@/lib/validations/contract";
import { formatCurrency, formatDate, daysUntil } from "@/lib/utils";
import type { Asset, BillingCycle, Contract, Invoice, Job, Plan } from "@/lib/types";

interface ContractFormState {
  customerId: string;
  assetId: string;
  planId: string;
  type: "amc" | "warranty";
  billingCycle: BillingCycle;
  startDate: string;
  status: Contract["status"];
  visitsUsed: string;
  notes: string;
}

function getInitialFormState(contract: Contract): ContractFormState {
  return {
    customerId: contract.customerId,
    assetId: contract.assetId,
    planId: contract.planId ?? "",
    type: contract.type,
    billingCycle: contract.billingCycle,
    startDate: contract.startDate,
    status: contract.status,
    visitsUsed: String(contract.visitsUsed),
    notes: contract.notes ?? "",
  };
}

function addMonths(dateStr: string, months: number): string {
  const d = new Date(dateStr);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().split("T")[0];
}

export default function ContractDetailPageClient({
  detail,
  customers,
  assets,
  plans,
}: {
  detail: { contract: Contract; jobs: Job[]; invoices: Invoice[] } | null;
  customers: Array<{ id: string; name: string; city: string }>;
  assets: Asset[];
  plans: Plan[];
}) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isCancelOpen, setIsCancelOpen] = useState(false);
  const [isRenewOpen, setIsRenewOpen] = useState(false);
  const [isQuoteOpen, setIsQuoteOpen] = useState(false);
  const [quoteForm, setQuoteForm] = useState({
    newStartDate: "",
    newEndDate: "",
    price: "",
    notes: "",
  });
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [form, setForm] = useState<ContractFormState>(
    detail
      ? getInitialFormState(detail.contract)
      : {
          customerId: "",
          assetId: "",
          planId: "",
          type: "amc",
          billingCycle: "yearly",
          startDate: "",
          status: "active",
          visitsUsed: "0",
          notes: "",
        },
  );
  const [renewEndDate, setRenewEndDate] = useState("");

  useEffect(() => {
    if (!detail) return;
    setForm(getInitialFormState(detail.contract));
    setErrors({});
    setIsEditing(false);
  }, [detail]);

  const customerAssets = useMemo(
    () => assets.filter((asset) => asset.customerId === form.customerId),
    [assets, form.customerId],
  );
  const filteredPlans = useMemo(
    () => plans.filter((plan) => plan.type === form.type),
    [form.type, plans],
  );

  if (!detail) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-lg text-slate-500">Contract not found</p>
        <button
          onClick={() => router.push("/contracts")}
          className="mt-4 text-sm text-brand-600 hover:underline"
        >
          Back to contracts
        </button>
      </div>
    );
  }

  const { contract, jobs, invoices } = detail;
  const isBusy = (key: string) => pendingAction === key;
  const daysLeft = daysUntil(contract.endDate);
  const visitsRemaining = contract.visitsCovered - contract.visitsUsed;
  const visitPercentage =
    contract.visitsCovered > 0
      ? Math.min(100, (contract.visitsUsed / contract.visitsCovered) * 100)
      : 0;
  const totalContractDays = Math.max(
    1,
    Math.ceil(
      (new Date(contract.endDate).getTime() - new Date(contract.startDate).getTime()) /
        (1000 * 60 * 60 * 24),
    ),
  );
  const elapsedDays = Math.max(0, totalContractDays - Math.max(daysLeft, 0));
  const contractProgress = Math.min(100, (elapsedDays / totalContractDays) * 100);

  // Financial summary from invoices
  const totalBilled = invoices.reduce((sum, inv) => sum + inv.amount, 0);
  const totalPaid = invoices.reduce((sum, inv) => sum + inv.paidAmount, 0);
  const outstanding = totalBilled - totalPaid;

  const currentPlan = plans.find((p) => p.id === contract.planId);

  const updateField = (field: keyof ContractFormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => clearFormError(prev, field));
  };

  const runAction = async <T,>(
    key: string,
    action: Promise<{ success: boolean; data?: T; error?: string }>,
    successMessage: string,
    onSuccess?: (data: T | undefined) => void,
  ) => {
    if (pendingAction) return;
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
    const parsed = updateContractSchema.safeParse({
      id: contract.id,
      ...form,
      visitsUsed: Number(form.visitsUsed),
    });
    if (!parsed.success) {
      setErrors(getFormErrors(parsed.error));
      toast.error("Please fix the highlighted fields");
      return;
    }
    await runAction("save", updateContractAction(parsed.data), "Contract updated", () => {
      setIsEditing(false);
      router.refresh();
    });
  };

  const handleCancel = async () => {
    await runAction(
      "status",
      updateContractAction({ id: contract.id, status: "cancelled" }),
      "Contract cancelled",
      () => {
        setIsCancelOpen(false);
        router.refresh();
      },
    );
  };

  const handleReactivate = async () => {
    await runAction(
      "status",
      updateContractAction({ id: contract.id, status: "active" }),
      "Contract reactivated",
      () => router.refresh(),
    );
  };

  const handleRenew = async () => {
    if (!renewEndDate) return;
    await runAction("renew", renewContractAction({ id: contract.id, newEndDate: renewEndDate }), "Contract renewed", () => {
      setIsRenewOpen(false);
      router.refresh();
    });
  };

  const handleDelete = async () => {
    await runAction("delete", deleteContractAction(contract.id), "Contract deleted", () => {
      setIsDeleteOpen(false);
      router.push("/contracts");
      router.refresh();
    });
  };

  const openRenewModal = () => {
    const durationMonths = currentPlan?.duration ?? 12;
    setRenewEndDate(addMonths(contract.endDate, durationMonths));
    setIsRenewOpen(true);
  };

  const openQuoteModal = () => {
    const newStart = (() => {
      const d = new Date(contract.endDate);
      d.setDate(d.getDate() + 1);
      return d.toISOString().split("T")[0];
    })();
    const durationMonths = currentPlan?.duration ?? 12;
    const newEnd = addMonths(newStart, durationMonths);
    setQuoteForm({
      newStartDate: newStart,
      newEndDate: newEnd,
      price: String(contract.value),
      notes: "",
    });
    setIsQuoteOpen(true);
  };

  const handleGenerateQuote = async () => {
    if (pendingAction) return;
    const price = parseFloat(quoteForm.price);
    if (!quoteForm.newStartDate || !quoteForm.newEndDate || !price || price < 1) return;
    setPendingAction("quote");
    try {
      const result = await generateRenewalQuoteAction({
        id: contract.id,
        newStartDate: quoteForm.newStartDate,
        newEndDate: quoteForm.newEndDate,
        price,
        notes: quoteForm.notes || undefined,
      });
      if (!result.success) {
        toast.error(result.error ?? "Failed to generate quote");
        return;
      }
      setIsQuoteOpen(false);
      const invoiceId = result.data.invoiceId;
      const invoiceNumber = result.data.invoiceNumber;
      toast.success(`Draft invoice ${invoiceNumber} generated`, {
        action: {
          label: "View Invoice",
          onClick: () => router.push(`/invoices/${invoiceId}`),
        },
      });
      router.refresh();
    } finally {
      setPendingAction(null);
    }
  };

  const isCancellable = !["cancelled"].includes(contract.status);

  // Days-left colour
  const daysColor =
    daysLeft <= 0
      ? "text-red-600 bg-red-50"
      : daysLeft <= 30
        ? "text-red-600 bg-red-50"
        : daysLeft <= 60
          ? "text-amber-600 bg-amber-50"
          : "text-green-700 bg-green-50";

  const progressColor =
    daysLeft <= 0 ? "bg-red-500" : daysLeft <= 30 ? "bg-amber-500" : "bg-green-500";

  return (
    <div>
      <PageHeader
        title={contract.contractNumber}
        breadcrumbs={[
          { label: "Contracts", href: "/contracts" },
          { label: contract.contractNumber },
        ]}
        actions={
          <div className="flex items-center gap-2">
            {isEditing ? (
              <button
                type="button"
                disabled={Boolean(pendingAction)}
                onClick={() => {
                  setForm(getInitialFormState(contract));
                  setErrors({});
                  setIsEditing(false);
                }}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
              >
                Cancel
              </button>
            ) : (
              <>
                <button
                  type="button"
                  disabled={Boolean(pendingAction)}
                  onClick={() => setIsEditing(true)}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  <Edit className="h-4 w-4" />
                  Edit
                </button>
                {contract.status === "cancelled" ? (
                  <button
                    type="button"
                    disabled={Boolean(pendingAction)}
                    onClick={handleReactivate}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    <RotateCcw className="h-4 w-4" />
                    {isBusy("status") ? "Reactivating..." : "Reactivate"}
                  </button>
                ) : (
                  <>
                    {["expiring_soon", "expired"].includes(contract.status) && (
                      <button
                        type="button"
                        disabled={Boolean(pendingAction)}
                        onClick={openQuoteModal}
                        className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        <FileText className="h-4 w-4" />
                        {isBusy("quote") ? "Generating..." : "Generate Renewal Quote"}
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={Boolean(pendingAction)}
                      onClick={openRenewModal}
                      className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      <RefreshCw className="h-4 w-4" />
                      Renew Contract
                    </button>
                    <button
                      type="button"
                      disabled={Boolean(pendingAction)}
                      onClick={() => setIsCancelOpen(true)}
                      className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      <XCircle className="h-4 w-4" />
                      Cancel Contract
                    </button>
                  </>
                )}
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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* ── Main panel ── */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-2">
          {isEditing ? (
            /* ── Edit Form ── */
            <div>
              <h3 className="mb-4 font-semibold text-slate-900">Edit Contract</h3>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <FormField
                  as="select"
                  label="Contract Type"
                  name="type"
                  value={form.type}
                  onChange={(e) => {
                    updateField("type", e.target.value);
                    updateField("planId", "");
                  }}
                  error={errors.type}
                  options={[
                    { value: "amc", label: "AMC" },
                    { value: "warranty", label: "Warranty" },
                  ]}
                />
                <FormField
                  as="select"
                  label="Billing Cycle"
                  name="billingCycle"
                  value={form.billingCycle}
                  onChange={(e) => updateField("billingCycle", e.target.value)}
                  error={errors.billingCycle}
                  options={BILLING_CYCLE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
                />
                <FormField
                  as="select"
                  label="Status"
                  name="status"
                  value={form.status}
                  onChange={(e) => updateField("status", e.target.value)}
                  error={errors.status}
                  options={[
                    { value: "active", label: "Active" },
                    { value: "expiring_soon", label: "Expiring Soon" },
                    { value: "expired", label: "Expired" },
                    { value: "renewed", label: "Renewed" },
                    { value: "cancelled", label: "Cancelled" },
                  ]}
                />
                <FormField
                  as="select"
                  label="Customer"
                  name="customerId"
                  required
                  value={form.customerId}
                  onChange={(e) => {
                    updateField("customerId", e.target.value);
                    updateField("assetId", "");
                  }}
                  error={errors.customerId}
                >
                  <select
                    name="customerId"
                    value={form.customerId}
                    onChange={(e) => {
                      updateField("customerId", e.target.value);
                      updateField("assetId", "");
                    }}
                    className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${
                      errors.customerId
                        ? "border-red-300 focus:border-red-500 focus:ring-red-200"
                        : "border-slate-200 focus:border-brand-500 focus:ring-brand-500"
                    }`}
                  >
                    <option value="">Select customer</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.city})
                      </option>
                    ))}
                  </select>
                </FormField>
                <FormField
                  as="select"
                  label="Asset"
                  name="assetId"
                  required
                  value={form.assetId}
                  onChange={(e) => updateField("assetId", e.target.value)}
                  error={errors.assetId}
                >
                  <select
                    name="assetId"
                    value={form.assetId}
                    onChange={(e) => updateField("assetId", e.target.value)}
                    className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${
                      errors.assetId
                        ? "border-red-300 focus:border-red-500 focus:ring-red-200"
                        : "border-slate-200 focus:border-brand-500 focus:ring-brand-500"
                    }`}
                  >
                    <option value="">Select asset</option>
                    {customerAssets.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({a.model})
                      </option>
                    ))}
                  </select>
                </FormField>
                <FormField
                  as="select"
                  label="Service Plan"
                  name="planId"
                  required
                  value={form.planId}
                  onChange={(e) => updateField("planId", e.target.value)}
                  error={errors.planId}
                >
                  <select
                    name="planId"
                    value={form.planId}
                    onChange={(e) => updateField("planId", e.target.value)}
                    className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${
                      errors.planId
                        ? "border-red-300 focus:border-red-500 focus:ring-red-200"
                        : "border-slate-200 focus:border-brand-500 focus:ring-brand-500"
                    }`}
                  >
                    <option value="">Select plan</option>
                    {filteredPlans.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.duration} months)
                      </option>
                    ))}
                  </select>
                </FormField>
                <FormField
                  label="Start Date"
                  name="startDate"
                  type="date"
                  required
                  value={form.startDate}
                  onChange={(e) => updateField("startDate", e.target.value)}
                  error={errors.startDate}
                />
                <FormField
                  label="Visits Used"
                  name="visitsUsed"
                  type="number"
                  min={0}
                  value={form.visitsUsed}
                  onChange={(e) => updateField("visitsUsed", e.target.value)}
                  error={errors.visitsUsed}
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
                    setForm(getInitialFormState(contract));
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
            /* ── View mode ── */
            <>
              {/* Status / type / billing badges */}
              <div className="mb-5 flex flex-wrap items-center gap-2">
                <StatusBadge status={contract.status} />
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold uppercase text-slate-600">
                  {contract.type}
                </span>
                <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700">
                  {formatBillingCycleLabel(contract.billingCycle)}
                </span>
              </div>

              {/* Info grid */}
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div className="flex gap-3">
                  <Shield className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                  <div>
                    <p className="text-xs text-slate-500">Plan</p>
                    <p className="text-sm font-medium text-slate-900">{contract.plan}</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <User className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                  <div>
                    <p className="text-xs text-slate-500">Customer</p>
                    <Link
                      href={`/customers/${contract.customerId}`}
                      className="text-sm font-medium text-brand-600 hover:underline"
                    >
                      {contract.customerName}
                    </Link>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Package className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                  <div>
                    <p className="text-xs text-slate-500">Asset</p>
                    <Link
                      href={`/assets/${contract.assetId}`}
                      className="text-sm font-medium text-brand-600 hover:underline"
                    >
                      {contract.assetName}
                    </Link>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                  <div>
                    <p className="text-xs text-slate-500">Next Service</p>
                    <p className="text-sm font-medium text-slate-900">
                      {formatDate(contract.nextServiceDate)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Key dates */}
              <div className="mt-6 border-t border-slate-100 pt-6">
                <h4 className="mb-4 text-sm font-semibold text-slate-700">Key Dates</h4>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <div className="rounded-lg bg-slate-50 p-3">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                      Start Date
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      {formatDate(contract.startDate)}
                    </p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-3">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                      End Date
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      {formatDate(contract.endDate)}
                    </p>
                  </div>
                  <div className={`rounded-lg p-3 ${daysColor}`}>
                    <p className="text-[11px] font-medium uppercase tracking-wide opacity-70">
                      Days to Expiry
                    </p>
                    <p className="mt-1 text-sm font-bold">
                      {daysLeft <= 0 ? "Expired" : `${daysLeft} days`}
                    </p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-3">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                      Next Billing
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      {formatDate(contract.nextBillingDate)}
                    </p>
                  </div>
                </div>

                {/* Contract period progress */}
                <div className="mt-4">
                  <div className="mb-1.5 flex items-center justify-between text-xs text-slate-500">
                    <span>{formatDate(contract.startDate)}</span>
                    <span>{formatDate(contract.endDate)}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full transition-all ${progressColor}`}
                      style={{ width: `${contractProgress}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Visit tracking */}
              <div className="mt-6 border-t border-slate-100 pt-6">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-700">Service Visits</span>
                  <span className="text-sm text-slate-600">
                    {contract.visitsUsed} of {contract.visitsCovered} used
                    {visitsRemaining > 0 && (
                      <span className="ml-1 text-slate-400">({visitsRemaining} remaining)</span>
                    )}
                  </span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full transition-all ${visitPercentage > 80 ? "bg-amber-500" : "bg-brand-500"}`}
                    style={{ width: `${visitPercentage}%` }}
                  />
                </div>
              </div>

              {/* Notes */}
              {contract.notes && (
                <div className="mt-6 rounded-lg bg-slate-50 p-4">
                  <p className="text-xs text-slate-500">Notes</p>
                  <p className="mt-1 text-sm text-slate-700">{contract.notes}</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Right sidebar ── */}
        <div className="space-y-4">
          {/* Financial summary */}
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <h3 className="mb-4 font-semibold text-slate-900">Financial Summary</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Contract Value</span>
                <span className="font-semibold text-slate-900">
                  {formatCurrency(contract.value)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">
                  {formatBillingCycleLabel(contract.billingCycle)} cycle
                </span>
              </div>
              {totalBilled > 0 && (
                <>
                  <div className="border-t border-slate-100 pt-3">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Total Billed</span>
                      <span className="font-medium text-slate-900">
                        {formatCurrency(totalBilled)}
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Total Paid</span>
                    <span className="font-medium text-green-600">
                      {formatCurrency(totalPaid)}
                    </span>
                  </div>
                  {outstanding > 0 && (
                    <div className="flex justify-between border-t border-slate-100 pt-3">
                      <span className="font-medium text-slate-700">Outstanding</span>
                      <span className="font-bold text-red-600">
                        {formatCurrency(outstanding)}
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Billing schedule */}
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <h3 className="mb-3 font-semibold text-slate-900">Billing Schedule</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Billing Cycle</span>
                <span className="font-medium text-slate-900">
                  {formatBillingCycleLabel(contract.billingCycle)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Next Billing</span>
                <span className="font-medium text-slate-900">
                  {formatDate(contract.nextBillingDate)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Last Billed</span>
                <span className="font-medium text-slate-900">
                  {contract.lastBilledDate ? formatDate(contract.lastBilledDate) : "—"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom tabs: Invoices + Jobs + Schedule ── */}
      <div className="mt-6">
        <Tabs
          tabs={[
            {
              id: "invoices",
              label: "Invoices",
              count: invoices.length,
              content: (
                <DataTable<Invoice>
                  data={invoices}
                  emptyMessage="No invoices have been generated for this contract yet."
                  onRowClick={(inv) => router.push(`/invoices/${inv.id}`)}
                  columns={[
                    {
                      key: "number",
                      header: "Invoice",
                      render: (inv) => (
                        <span className="font-medium text-slate-900">{inv.invoiceNumber}</span>
                      ),
                    },
                    {
                      key: "issued",
                      header: "Issued",
                      render: (inv) => formatDate(inv.issuedDate),
                    },
                    {
                      key: "due",
                      header: "Due",
                      render: (inv) => formatDate(inv.dueDate),
                    },
                    {
                      key: "amount",
                      header: "Amount",
                      render: (inv) => (
                        <span className="font-medium">{formatCurrency(inv.amount)}</span>
                      ),
                    },
                    {
                      key: "paid",
                      header: "Paid",
                      render: (inv) => (
                        <span className={inv.paidAmount > 0 ? "text-green-600" : "text-slate-400"}>
                          {inv.paidAmount > 0 ? formatCurrency(inv.paidAmount) : "—"}
                        </span>
                      ),
                    },
                    {
                      key: "status",
                      header: "Status",
                      render: (inv) => <StatusBadge status={inv.status} />,
                    },
                  ]}
                />
              ),
            },
            {
              id: "jobs",
              label: "Jobs",
              count: jobs.length,
              content: (
                <DataTable<Job>
                  data={jobs}
                  emptyMessage="No jobs associated with this contract's asset."
                  onRowClick={(job) => router.push(`/jobs/${job.id}`)}
                  columns={[
                    {
                      key: "number",
                      header: "Job",
                      render: (job) => (
                        <span className="font-medium text-slate-900">{job.jobNumber}</span>
                      ),
                    },
                    {
                      key: "type",
                      header: "Type",
                      render: (job) => (
                        <span className="capitalize">{job.type}</span>
                      ),
                    },
                    {
                      key: "technician",
                      header: "Technician",
                      render: (job) => job.technicianName,
                    },
                    {
                      key: "scheduled",
                      header: "Scheduled",
                      render: (job) => formatDate(job.scheduledDate),
                    },
                    {
                      key: "status",
                      header: "Status",
                      render: (job) => <StatusBadge status={job.status} />,
                    },
                  ]}
                />
              ),
            },
            {
              id: "schedule",
              label: "Billing Schedule",
              content: (
                <div className="rounded-xl border border-slate-200 bg-white">
                  <BillingSchedulePreview
                    startDate={contract.startDate}
                    endDate={contract.endDate}
                    billingCycle={contract.billingCycle}
                    price={contract.value}
                  />
                </div>
              ),
            },
          ]}
        />
      </div>

      {/* ── Modals ── */}
      <ConfirmModal
        isOpen={isCancelOpen}
        onClose={() => { if (!isBusy("status")) setIsCancelOpen(false); }}
        onConfirm={handleCancel}
        title="Cancel Contract"
        description={`Cancel ${contract.contractNumber}? The contract will be marked as cancelled but not deleted.`}
        confirmLabel="Cancel Contract"
        loading={isBusy("status")}
      />

      <ConfirmModal
        isOpen={isDeleteOpen}
        onClose={() => { if (!isBusy("delete")) setIsDeleteOpen(false); }}
        onConfirm={handleDelete}
        title="Delete Contract"
        description={`Delete ${contract.contractNumber}? This cannot be undone.`}
        confirmLabel="Delete Contract"
        loading={isBusy("delete")}
      />

      {/* Renew modal */}
      <Modal
        isOpen={isRenewOpen}
        onClose={() => { if (!isBusy("renew")) setIsRenewOpen(false); }}
        title="Renew Contract"
        size="sm"
      >
        <div className="space-y-4">
          <div className="rounded-lg bg-slate-50 p-3 text-sm">
            <p className="text-slate-500">Current period</p>
            <p className="font-medium text-slate-900">
              {formatDate(contract.startDate)} → {formatDate(contract.endDate)}
            </p>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              New End Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={renewEndDate}
              min={contract.endDate}
              onChange={(e) => setRenewEndDate(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
            <p className="mt-1.5 text-xs text-slate-500">
              New period will start {formatDate(contract.endDate)} + 1 day. A renewal invoice
              for {formatCurrency(contract.value)} will be generated.
            </p>
          </div>
          <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
            <button
              type="button"
              disabled={isBusy("renew")}
              onClick={() => setIsRenewOpen(false)}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-70"
            >
              Cancel
            </button>
            <SubmitButton
              type="button"
              loading={isBusy("renew")}
              loadingText="Renewing..."
              disabled={!renewEndDate}
              onClick={handleRenew}
            >
              Renew &amp; Generate Invoice
            </SubmitButton>
          </div>
        </div>
      </Modal>

      {/* Generate Renewal Quote modal */}
      <Modal
        isOpen={isQuoteOpen}
        onClose={() => { if (!isBusy("quote")) setIsQuoteOpen(false); }}
        title="Generate Renewal Quote"
        size="sm"
      >
        <div className="space-y-4">
          {/* Context banner */}
          <div className="rounded-lg bg-slate-50 p-3 text-sm">
            <p className="text-xs text-slate-500">Contract</p>
            <p className="font-medium text-slate-900">{contract.contractNumber}</p>
            <p className="mt-1 text-xs text-slate-500">
              Current period ends <span className="font-medium">{formatDate(contract.endDate)}</span>
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                New Start Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={quoteForm.newStartDate}
                onChange={(e) => setQuoteForm((f) => ({ ...f, newStartDate: e.target.value }))}
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                New End Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={quoteForm.newEndDate}
                min={quoteForm.newStartDate}
                onChange={(e) => setQuoteForm((f) => ({ ...f, newEndDate: e.target.value }))}
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Price (₹) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min={1}
              step={1}
              value={quoteForm.price}
              onChange={(e) => setQuoteForm((f) => ({ ...f, price: e.target.value }))}
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
            <p className="mt-1 text-xs text-slate-500">
              Plan price is {formatCurrency(contract.value)}. Edit to offer a custom rate.
            </p>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Notes{" "}
              <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <textarea
              rows={2}
              value={quoteForm.notes}
              onChange={(e) => setQuoteForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="Custom terms, discounts, special conditions…"
              className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </div>

          <p className="text-xs text-slate-500">
            A <span className="font-medium">draft invoice</span> will be created and linked to this
            contract. The contract dates will <span className="font-medium">not</span> change until
            payment is recorded.
          </p>

          <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
            <button
              type="button"
              disabled={isBusy("quote")}
              onClick={() => setIsQuoteOpen(false)}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-70"
            >
              Cancel
            </button>
            <SubmitButton
              type="button"
              loading={isBusy("quote")}
              loadingText="Generating..."
              disabled={
                !quoteForm.newStartDate ||
                !quoteForm.newEndDate ||
                !quoteForm.price ||
                parseFloat(quoteForm.price) < 1
              }
              onClick={handleGenerateQuote}
            >
              Generate Draft Invoice
            </SubmitButton>
          </div>
        </div>
      </Modal>
    </div>
  );
}
