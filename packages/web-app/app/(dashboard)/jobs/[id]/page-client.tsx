"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Calendar,
  CheckCircle,
  Download,
  Edit,
  FileText,
  MapPin,
  Package,
  Power,
  Trash2,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { FormField } from "@/components/ui/FormField";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { completeJobAction, deleteJobAction, updateJobAction } from "@/lib/actions/jobs";
import { clearFormError, getFormErrors, type FormErrors } from "@/lib/form-errors";
import { updateJobSchema } from "@/lib/validations/job";
import { formatDate, formatDateTime } from "@/lib/utils";
import type { Asset, Job, Technician } from "@/lib/types";

function getInitialFormState(job: Job) {
  return {
    customerId: job.customerId,
    assetId: job.assetId ?? "",
    technicianId: job.technicianId,
    type: job.type,
    status: job.status,
    scheduledDate: job.scheduledDate,
    notes: job.notes ?? "",
    serviceReport: job.serviceReport ?? "",
  };
}

export default function JobDetailPageClient({
  job,
  customers,
  technicians,
  assets,
}: {
  job: Job | null;
  customers: Array<{ id: string; name: string; city: string }>;
  technicians: Technician[];
  assets: Asset[];
}) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [form, setForm] = useState(
    job
      ? getInitialFormState(job)
      : {
          customerId: "",
          assetId: "",
          technicianId: "",
          type: "scheduled" as const,
          status: "assigned" as const,
          scheduledDate: "",
          notes: "",
          serviceReport: "",
        },
  );

  useEffect(() => {
    if (!job) {
      return;
    }

    setForm(getInitialFormState(job));
    setErrors({});
    setIsEditing(false);
  }, [job]);

  const customerAssets = useMemo(
    () => assets.filter((asset) => asset.customerId === form.customerId),
    [assets, form.customerId],
  );

  if (!job) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-lg text-slate-500">Job not found</p>
        <button
          onClick={() => router.push("/jobs")}
          className="mt-4 text-sm text-brand-600 hover:underline"
        >
          Back to jobs
        </button>
      </div>
    );
  }

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
    const parsed = updateJobSchema.safeParse({
      id: job.id,
      ticketId: job.ticketId ?? "",
      ...form,
    });

    if (!parsed.success) {
      setErrors(getFormErrors(parsed.error));
      toast.error("Please fix the highlighted fields");
      return;
    }

    await runAction(
      "save",
      updateJobAction(parsed.data),
      "Job updated",
      () => {
        setIsEditing(false);
        router.refresh();
      },
    );
  };

  const handleComplete = async () => {
    await runAction(
      "complete",
      completeJobAction(job.id, form.serviceReport || undefined),
      "Job marked complete",
      () => {
        router.refresh();
      },
    );
  };

  const handleCancel = async () => {
    await runAction(
      "status",
      updateJobAction({ id: job.id, status: "cancelled" }),
      "Job cancelled",
      () => {
        router.refresh();
      },
    );
  };

  const handleDelete = async () => {
    await runAction(
      "delete",
      deleteJobAction(job.id),
      "Job deleted",
      () => {
        setIsDeleteOpen(false);
        router.push("/jobs");
        router.refresh();
      },
    );
  };

  return (
    <div>
      <PageHeader
        title={job.jobNumber}
        breadcrumbs={[
          { label: "Jobs", href: "/jobs" },
          { label: job.jobNumber },
        ]}
        actions={
          <div className="flex items-center gap-2">
            {isEditing ? (
              <button
                type="button"
                disabled={Boolean(pendingAction)}
                onClick={() => {
                  setForm(getInitialFormState(job));
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
                {job.status !== "completed" && (
                  <button
                    type="button"
                    disabled={Boolean(pendingAction)}
                    onClick={handleComplete}
                    className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    <CheckCircle className="h-4 w-4" />
                    {isBusy("complete") ? "Updating..." : "Mark Complete"}
                  </button>
                )}
                {job.status === "completed" && (
                  <a
                    href={`/api/jobs/${job.id}/report-pdf`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    <Download className="h-4 w-4" />
                    Download PDF
                  </a>
                )}
                {!["completed", "cancelled"].includes(job.status) && (
                  <button
                    type="button"
                    disabled={Boolean(pendingAction)}
                    onClick={handleCancel}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    <Power className="h-4 w-4" />
                    {isBusy("status") ? "Updating..." : "Cancel Job"}
                  </button>
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
        <div className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-2">
          {isEditing ? (
            <div>
              <h3 className="mb-4 font-semibold text-slate-900">Edit Job</h3>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
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
                  label="Technician"
                  name="technicianId"
                  required
                  value={form.technicianId}
                  onChange={(e) => updateField("technicianId", e.target.value)}
                  error={errors.technicianId}
                >
                  <select
                    name="technicianId"
                    value={form.technicianId}
                    onChange={(e) => updateField("technicianId", e.target.value)}
                    className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${
                      errors.technicianId
                        ? "border-red-300 focus:border-red-500 focus:ring-red-200"
                        : "border-slate-200 focus:border-brand-500 focus:ring-brand-500"
                    }`}
                  >
                    <option value="">Select technician</option>
                    {technicians.map((technician) => (
                      <option key={technician.id} value={technician.id}>
                        {technician.name} ({technician.territory})
                      </option>
                    ))}
                  </select>
                </FormField>
                <FormField
                  as="select"
                  label="Type"
                  name="type"
                  value={form.type}
                  onChange={(e) => updateField("type", e.target.value)}
                  error={errors.type}
                  options={[
                    { value: "complaint", label: "Complaint" },
                    { value: "scheduled", label: "Scheduled" },
                    { value: "installation", label: "Installation" },
                    { value: "inspection", label: "Inspection" },
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
                    { value: "pending", label: "Pending" },
                    { value: "assigned", label: "Assigned" },
                    { value: "en_route", label: "En Route" },
                    { value: "in_progress", label: "In Progress" },
                    { value: "completed", label: "Completed" },
                    { value: "cancelled", label: "Cancelled" },
                  ]}
                />
                <FormField
                  label="Scheduled Date"
                  name="scheduledDate"
                  type="date"
                  required
                  value={form.scheduledDate}
                  onChange={(e) => updateField("scheduledDate", e.target.value)}
                  error={errors.scheduledDate}
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
                <FormField
                  as="textarea"
                  label="Service Report"
                  name="serviceReport"
                  rows={4}
                  value={form.serviceReport}
                  onChange={(e) => updateField("serviceReport", e.target.value)}
                  error={errors.serviceReport}
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
                    setForm(getInitialFormState(job));
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
                <StatusBadge status={job.status} />
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium capitalize text-slate-600">
                  {job.type}
                </span>
              </div>

              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div className="flex gap-3">
                  <User className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" />
                  <div>
                    <p className="text-xs text-slate-500">Customer</p>
                    <Link
                      href={`/customers/${job.customerId}`}
                      className="text-sm font-medium text-brand-600 hover:underline"
                    >
                      {job.customerName}
                    </Link>
                  </div>
                </div>
                <div className="flex gap-3">
                  <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" />
                  <div>
                    <p className="text-xs text-slate-500">Address</p>
                    <p className="text-sm text-slate-900">{job.customerAddress}</p>
                  </div>
                </div>
                {job.assetName && (
                  <div className="flex gap-3">
                    <Package className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" />
                    <div>
                      <p className="text-xs text-slate-500">Asset</p>
                      <Link
                        href={job.assetId ? `/assets/${job.assetId}` : "#"}
                        className="text-sm font-medium text-brand-600 hover:underline"
                      >
                        {job.assetName}
                      </Link>
                    </div>
                  </div>
                )}
                <div className="flex gap-3">
                  <Calendar className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" />
                  <div>
                    <p className="text-xs text-slate-500">Scheduled</p>
                    <p className="text-sm text-slate-900">
                      {formatDate(job.scheduledDate)}
                    </p>
                  </div>
                </div>
              </div>

              {job.notes && (
                <div className="mt-6 border-t border-slate-100 pt-6">
                  <h3 className="mb-2 text-sm font-medium text-slate-700">Notes</h3>
                  <p className="text-sm text-slate-600">{job.notes}</p>
                </div>
              )}

              {job.serviceReport && (
                <div className="mt-6 border-t border-slate-100 pt-6">
                  <h3 className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
                    <FileText className="h-4 w-4" />
                    Service Report
                  </h3>
                  <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                    <p className="text-sm text-green-800">{job.serviceReport}</p>
                    {job.completedAt && (
                      <p className="mt-2 text-xs text-green-600">
                        Completed on {formatDateTime(job.completedAt)}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <h3 className="mb-3 font-semibold text-slate-900">Technician</h3>
            <div className="flex items-center gap-3 rounded-lg bg-slate-50 p-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
                {job.technicianName
                  .split(" ")
                  .map((name) => name[0])
                  .join("")}
              </div>
              <div>
                <p className="text-sm font-medium text-slate-900">
                  {job.technicianName}
                </p>
                <Link
                  href="/technicians"
                  className="text-xs text-brand-600 hover:underline"
                >
                  View profile
                </Link>
              </div>
            </div>
          </div>

          {job.ticketId && (
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="mb-3 font-semibold text-slate-900">Related Ticket</h3>
              <Link
                href={`/complaints/${job.ticketId}`}
                className="block rounded-lg border border-slate-100 p-3 hover:bg-slate-50"
              >
                <p className="text-sm font-medium text-brand-600">
                  {job.ticketId}
                </p>
                <p className="text-xs text-slate-500">View complaint details</p>
              </Link>
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
        title="Delete Job"
        description={`Delete ${job.jobNumber}? This cannot be undone.`}
        confirmLabel="Delete Job"
        loading={isBusy("delete")}
      />
    </div>
  );
}
