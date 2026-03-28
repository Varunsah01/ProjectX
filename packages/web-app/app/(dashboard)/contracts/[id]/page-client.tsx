"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Calendar, Edit, Package, Power, RefreshCw, Shield, Trash2, User } from "lucide-react";
import { toast } from "sonner";
import { BILLING_CYCLE_OPTIONS, formatBillingCycleLabel } from "@/lib/billing";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { FormField } from "@/components/ui/FormField";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { deleteContractAction, updateContractAction } from "@/lib/actions/contracts";
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

function getInitialFormState(contract: Contract) {
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
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [form, setForm] = useState<ContractFormState>(
    detail
      ? getInitialFormState(detail.contract)
      : {
          customerId: "",
          assetId: "",
          planId: "",
          type: "amc" as const,
          billingCycle: "yearly" as const,
          startDate: "",
          status: "active" as const,
          visitsUsed: "0",
          notes: "",
        },
  );

  useEffect(() => {
    if (!detail) {
      return;
    }

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
      ? (contract.visitsUsed / contract.visitsCovered) * 100
      : 0;
  const totalContractDays = Math.max(
    1,
    Math.ceil(
      (new Date(contract.endDate).getTime() - new Date(contract.startDate).getTime()) /
        (1000 * 60 * 60 * 24),
    ),
  );
  const elapsedDays = Math.max(0, totalContractDays - Math.max(daysLeft, 0));
  const contractProgress = Math.max(
    0,
    Math.min(100, (elapsedDays / totalContractDays) * 100),
  );

  const updateField = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => clearFormError(prev, field));
  };

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

    await runAction(
      "save",
      updateContractAction(parsed.data),
      "Contract updated",
      () => {
        setIsEditing(false);
        router.refresh();
      },
    );
  };

  const toggleStatus = async () => {
    const nextStatus =
      contract.status === "cancelled" ? "active" : "cancelled";

    await runAction(
      "status",
      updateContractAction({ id: contract.id, status: nextStatus }),
      nextStatus === "active" ? "Contract reactivated" : "Contract cancelled",
      () => {
        router.refresh();
      },
    );
  };

  const handleDelete = async () => {
    await runAction(
      "delete",
      deleteContractAction(contract.id),
      "Contract deleted",
      () => {
        setIsDeleteOpen(false);
        router.push("/contracts");
        router.refresh();
      },
    );
  };

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
                <button
                  type="button"
                  disabled={Boolean(pendingAction)}
                  onClick={toggleStatus}
                  className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  <RefreshCw className="h-4 w-4" />
                  {isBusy("status")
                    ? "Updating..."
                    : contract.status === "cancelled"
                      ? "Reactivate Contract"
                      : "Cancel Contract"}
                </button>
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
        <div className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-2">
          {isEditing ? (
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
                  options={BILLING_CYCLE_OPTIONS.map((option) => ({
                    value: option.value,
                    label: option.label,
                  }))}
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
                    {customerAssets.map((asset) => (
                      <option key={asset.id} value={asset.id}>
                        {asset.name} ({asset.model})
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
                    {filteredPlans.map((plan) => (
                      <option key={plan.id} value={plan.id}>
                        {plan.name} ({plan.duration} months)
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
            <>
              <div className="mb-6 flex items-center gap-3">
                <StatusBadge status={contract.status} />
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium uppercase text-slate-600">
                  {contract.type}
                </span>
              </div>

              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div className="flex gap-3">
                  <Shield className="h-5 w-5 shrink-0 text-slate-400" />
                  <div>
                    <p className="text-xs text-slate-500">Plan</p>
                    <p className="text-sm font-medium text-slate-900">
                      {contract.plan}
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <User className="h-5 w-5 shrink-0 text-slate-400" />
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
                  <Package className="h-5 w-5 shrink-0 text-slate-400" />
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
                  <Calendar className="h-5 w-5 shrink-0 text-slate-400" />
                  <div>
                    <p className="text-xs text-slate-500">Next Service</p>
                    <p className="text-sm font-medium text-slate-900">
                      {formatDate(contract.nextServiceDate)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 border-t border-slate-100 pt-6">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm text-slate-500">Contract Period</span>
                  <span className="text-sm font-medium text-slate-900">
                    {daysLeft > 0 ? `${daysLeft} days remaining` : "Expired"}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-sm text-slate-600">
                  <span>{formatDate(contract.startDate)}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full ${daysLeft <= 0 ? "bg-red-500" : daysLeft <= 30 ? "bg-amber-500" : "bg-green-500"}`}
                      style={{
                        width: `${contractProgress}%`,
                      }}
                    />
                  </div>
                  <span>{formatDate(contract.endDate)}</span>
                </div>
              </div>

              <div className="mt-6 border-t border-slate-100 pt-6">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm text-slate-500">Service Visits</span>
                  <span className="text-sm font-medium text-slate-900">
                    {contract.visitsUsed} of {contract.visitsCovered} used
                    ({visitsRemaining} remaining)
                  </span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full transition-all ${visitPercentage > 80 ? "bg-amber-500" : "bg-brand-500"}`}
                    style={{ width: `${visitPercentage}%` }}
                  />
                </div>
                {contract.notes && (
                  <div className="mt-4 rounded-lg bg-slate-50 p-4">
                    <p className="text-xs text-slate-500">Notes</p>
                    <p className="mt-1 text-sm text-slate-700">{contract.notes}</p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <h3 className="mb-3 font-semibold text-slate-900">Value</h3>
            <p className="text-2xl font-bold text-slate-900">
              {formatCurrency(contract.value)}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {formatBillingCycleLabel(contract.billingCycle)} recurring amount
            </p>
          </div>

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
                <span className="text-slate-500">Next Billing Date</span>
                <span className="font-medium text-slate-900">
                  {formatDate(contract.nextBillingDate)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Last Billed Date</span>
                <span className="font-medium text-slate-900">
                  {contract.lastBilledDate ? formatDate(contract.lastBilledDate) : "Not billed yet"}
                </span>
              </div>
            </div>

            <div className="mt-5 border-t border-slate-100 pt-4">
              <div className="mb-3 flex items-center justify-between">
                <h4 className="font-medium text-slate-900">Generated Invoices</h4>
                <span className="text-xs text-slate-500">
                  {invoices.length} total
                </span>
              </div>
              {invoices.length > 0 ? (
                <div className="space-y-2">
                  {invoices.map((invoice) => (
                    <Link
                      key={invoice.id}
                      href={`/invoices/${invoice.id}`}
                      className="flex items-center justify-between rounded-lg border border-slate-100 p-3 hover:bg-slate-50"
                    >
                      <div>
                        <p className="text-sm font-medium text-slate-900">
                          {invoice.invoiceNumber}
                        </p>
                        <p className="text-xs text-slate-500">
                          {formatDate(invoice.issuedDate)} · {formatCurrency(invoice.amount)}
                        </p>
                      </div>
                      <StatusBadge status={invoice.status} />
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500">
                  No invoices have been generated for this contract yet.
                </p>
              )}
            </div>
          </div>

          {jobs.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="mb-3 font-semibold text-slate-900">
                Service History
              </h3>
              <div className="space-y-2">
                {jobs.map((job) => (
                  <Link
                    key={job.id}
                    href={`/jobs/${job.id}`}
                    className="flex items-center justify-between rounded-lg border border-slate-100 p-3 hover:bg-slate-50"
                  >
                    <div>
                      <p className="text-sm font-medium capitalize text-slate-900">
                        {job.type}
                      </p>
                      <p className="text-xs text-slate-500">
                        {formatDate(job.scheduledDate)}
                      </p>
                    </div>
                    <StatusBadge status={job.status} />
                  </Link>
                ))}
              </div>
            </div>
          )}
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
        title="Delete Contract"
        description={`Delete ${contract.contractNumber}? This cannot be undone.`}
        confirmLabel="Delete Contract"
        loading={isBusy("delete")}
      />
    </div>
  );
}
