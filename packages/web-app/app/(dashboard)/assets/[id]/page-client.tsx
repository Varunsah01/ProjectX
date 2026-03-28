"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Calendar, Cpu, Edit, Hash, MapPin, Power, Shield, Trash2, User, Wrench, Clock } from "lucide-react";
import { toast } from "sonner";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { FormField } from "@/components/ui/FormField";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { deleteAssetAction, updateAssetAction } from "@/lib/actions/assets";
import { clearFormError, getFormErrors, type FormErrors } from "@/lib/form-errors";
import { updateAssetSchema } from "@/lib/validations/asset";
import { formatDate } from "@/lib/utils";
import type { Contract, Job } from "@/lib/types";

type AssetDetail = {
  asset: {
    id: string;
    customerId: string;
    customerName: string;
    name: string;
    model: string;
    serialNumber: string;
    installationDate: string;
    warrantyEnd: string;
    amcStatus: string;
    status: string;
    lastServiceDate: string;
    nextServiceDate: string;
    category: string;
    location?: string;
    notes?: string;
  };
  contracts: Contract[];
  jobs: Job[];
};

function getInitialFormState(asset: AssetDetail["asset"]) {
  return {
    customerId: asset.customerId,
    name: asset.name,
    model: asset.model,
    serialNumber: asset.serialNumber,
    installationDate: asset.installationDate,
    warrantyEnd: asset.warrantyEnd,
    category: asset.category,
    location: asset.location ?? "",
    notes: asset.notes ?? "",
    status: asset.status as "active" | "inactive" | "under_repair",
  };
}

export default function AssetDetailPageClient({
  detail,
  customers,
}: {
  detail: AssetDetail | null;
  customers: Array<{ id: string; name: string; city: string }>;
}) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [form, setForm] = useState(
    detail
      ? getInitialFormState(detail.asset)
      : {
          customerId: "",
          name: "",
          model: "",
          serialNumber: "",
          installationDate: "",
          warrantyEnd: "",
          category: "",
          location: "",
          notes: "",
          status: "active" as const,
        },
  );

  useEffect(() => {
    if (!detail) {
      return;
    }

    setForm(getInitialFormState(detail.asset));
    setErrors({});
    setIsEditing(false);
  }, [detail]);

  if (!detail) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-lg text-slate-500">Asset not found</p>
        <button
          onClick={() => router.push("/assets")}
          className="mt-4 text-sm text-brand-600 hover:underline"
        >
          Back to assets
        </button>
      </div>
    );
  }

  const { asset, contracts, jobs } = detail;
  const isBusy = (key: string) => pendingAction === key;

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
    const parsed = updateAssetSchema.safeParse({
      id: asset.id,
      ...form,
    });

    if (!parsed.success) {
      setErrors(getFormErrors(parsed.error));
      toast.error("Please fix the highlighted fields");
      return;
    }

    await runAction(
      "save",
      updateAssetAction(parsed.data),
      "Asset updated",
      () => {
        setIsEditing(false);
        router.refresh();
      },
    );
  };

  const toggleStatus = async () => {
    const nextStatus =
      asset.status === "active" ? "under_repair" : "active";

    await runAction(
      "status",
      updateAssetAction({ id: asset.id, status: nextStatus }),
      nextStatus === "active" ? "Asset activated" : "Asset marked under repair",
      () => {
        router.refresh();
      },
    );
  };

  const handleDelete = async () => {
    await runAction(
      "delete",
      deleteAssetAction(asset.id),
      "Asset deleted",
      () => {
        setIsDeleteOpen(false);
        router.push("/assets");
        router.refresh();
      },
    );
  };

  return (
    <div>
      <PageHeader
        title={asset.name}
        subtitle={`${asset.model} — ${asset.serialNumber}`}
        breadcrumbs={[
          { label: "Assets", href: "/assets" },
          { label: asset.name },
        ]}
        actions={
          <div className="flex items-center gap-2">
            {isEditing ? (
              <button
                type="button"
                disabled={Boolean(pendingAction)}
                onClick={() => {
                  setForm(getInitialFormState(asset));
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
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  <Power className="h-4 w-4" />
                  {isBusy("status")
                    ? "Updating..."
                    : asset.status === "active"
                      ? "Mark Under Repair"
                      : "Mark Active"}
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
              <h3 className="mb-4 font-semibold text-slate-900">Edit Asset</h3>
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
                  label="Status"
                  name="status"
                  value={form.status}
                  onChange={(e) => updateField("status", e.target.value)}
                  error={errors.status}
                  options={[
                    { value: "active", label: "Active" },
                    { value: "inactive", label: "Inactive" },
                    { value: "under_repair", label: "Under Repair" },
                  ]}
                />
                <FormField
                  label="Asset Name"
                  name="name"
                  required
                  value={form.name}
                  onChange={(e) => updateField("name", e.target.value)}
                  error={errors.name}
                  containerClassName="sm:col-span-2"
                />
                <FormField
                  label="Model"
                  name="model"
                  value={form.model}
                  onChange={(e) => updateField("model", e.target.value)}
                  error={errors.model}
                />
                <FormField
                  label="Serial Number"
                  name="serialNumber"
                  value={form.serialNumber}
                  onChange={(e) => updateField("serialNumber", e.target.value)}
                  error={errors.serialNumber}
                />
                <FormField
                  label="Category"
                  name="category"
                  required
                  value={form.category}
                  onChange={(e) => updateField("category", e.target.value)}
                  error={errors.category}
                />
                <FormField
                  label="Location"
                  name="location"
                  value={form.location}
                  onChange={(e) => updateField("location", e.target.value)}
                  error={errors.location}
                />
                <FormField
                  label="Installation Date"
                  name="installationDate"
                  type="date"
                  required
                  value={form.installationDate}
                  onChange={(e) => updateField("installationDate", e.target.value)}
                  error={errors.installationDate}
                />
                <FormField
                  label="Warranty End"
                  name="warrantyEnd"
                  type="date"
                  required
                  value={form.warrantyEnd}
                  onChange={(e) => updateField("warrantyEnd", e.target.value)}
                  error={errors.warrantyEnd}
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
                    setForm(getInitialFormState(asset));
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
              <h3 className="mb-4 font-semibold text-slate-900">Asset Details</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <InfoRow icon={Cpu} label="Model" value={asset.model} />
                <InfoRow icon={Hash} label="Serial Number" value={asset.serialNumber} />
                <InfoRow icon={Calendar} label="Installed" value={formatDate(asset.installationDate)} />
                <InfoRow icon={Shield} label="Warranty Until" value={formatDate(asset.warrantyEnd)} />
                <InfoRow icon={Wrench} label="Coverage" value={asset.amcStatus} />
                <InfoRow icon={Clock} label="Last Service" value={formatDate(asset.lastServiceDate)} />
                <InfoRow icon={Clock} label="Next Service" value={formatDate(asset.nextServiceDate)} />
                <InfoRow
                  icon={User}
                  label="Customer"
                  value={asset.customerName}
                  href={`/customers/${asset.customerId}`}
                />
                {asset.location && (
                  <InfoRow icon={MapPin} label="Location" value={asset.location} />
                )}
                {asset.notes && (
                  <div className="sm:col-span-2 rounded-lg bg-slate-50 p-4">
                    <p className="text-xs text-slate-500">Notes</p>
                    <p className="mt-1 text-sm text-slate-700">{asset.notes}</p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <h3 className="mb-3 font-semibold text-slate-900">Status</h3>
            <StatusBadge status={isEditing ? form.status : asset.status} />
            <div className="mt-4 rounded-lg bg-slate-50 p-3">
              <p className="text-xs font-medium text-slate-500">Category</p>
              <p className="text-sm font-medium text-slate-900">
                {isEditing ? form.category : asset.category}
              </p>
            </div>
          </div>

          {contracts.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="mb-3 font-semibold text-slate-900">Contracts</h3>
              <div className="space-y-3">
                {contracts.map((contract) => (
                  <Link
                    key={contract.id}
                    href={`/contracts/${contract.id}`}
                    className="block rounded-lg border border-slate-100 p-3 hover:bg-slate-50"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-slate-900">
                        {contract.plan}
                      </p>
                      <StatusBadge status={contract.status} />
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {formatDate(contract.startDate)} - {formatDate(contract.endDate)}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Visits: {contract.visitsUsed} / {contract.visitsCovered}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {jobs.length > 0 && (
        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6">
          <h3 className="mb-4 font-semibold text-slate-900">Service History</h3>
          <div className="space-y-3">
            {jobs.map((job) => (
              <Link
                key={job.id}
                href={`/jobs/${job.id}`}
                className="flex items-center justify-between rounded-lg border border-slate-100 p-4 hover:bg-slate-50"
              >
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    {job.jobNumber} &middot;{" "}
                    <span className="capitalize">{job.type}</span>
                  </p>
                  <p className="text-xs text-slate-500">
                    {job.technicianName} &middot; {formatDate(job.scheduledDate)}
                  </p>
                  {job.serviceReport && (
                    <p className="mt-1 text-xs text-slate-400">
                      {job.serviceReport}
                    </p>
                  )}
                </div>
                <StatusBadge status={job.status} />
              </Link>
            ))}
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={isDeleteOpen}
        onClose={() => {
          if (!isBusy("delete")) {
            setIsDeleteOpen(false);
          }
        }}
        onConfirm={handleDelete}
        title="Delete Asset"
        description={`Delete ${asset.name}? This cannot be undone.`}
        confirmLabel="Delete Asset"
        loading={isBusy("delete")}
      />
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  href?: string;
}) {
  const valueContent = href ? (
    <Link href={href} className="text-brand-600 hover:underline">
      {value}
    </Link>
  ) : (
    value
  );

  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 h-4 w-4 text-slate-400" />
      <div>
        <p className="text-xs text-slate-500">{label}</p>
        <p className="text-sm font-medium text-slate-900">{valueContent}</p>
      </div>
    </div>
  );
}
