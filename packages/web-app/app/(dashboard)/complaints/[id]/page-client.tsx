"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertCircle, Briefcase, Clock, Edit, Package, Trash2, User } from "lucide-react";
import { toast } from "sonner";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { FormField, getFormControlClassName } from "@/components/ui/FormField";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { SubmitButton } from "@/components/ui/SubmitButton";
import {
  assignTicketAction,
  deleteTicketAction,
  resolveTicketAction,
  updateTicketAction,
} from "@/lib/actions/tickets";
import { createJobAction } from "@/lib/actions/jobs";
import { clearFormError, getFormErrors, type FormErrors } from "@/lib/form-errors";
import { updateTicketSchema } from "@/lib/validations/ticket";
import { createJobSchema } from "@/lib/validations/job";
import { formatDateTime } from "@/lib/utils";
import type { LinkedJob, Technician, Ticket } from "@/lib/types";

const TICKET_CATEGORIES = [
  "Cooling Issue",
  "Noise Issue",
  "Water Quality",
  "Equipment Offline",
  "Mechanical Issue",
  "Night Vision",
  "Remote/Control Issue",
  "Temperature Issue",
  "Other",
];

function getInitialFormState(ticket: Ticket) {
  return {
    customerId: ticket.customerId,
    assetId: ticket.assetId ?? "",
    subject: ticket.subject,
    description: ticket.description,
    category: ticket.category,
    priority: ticket.priority,
    status: ticket.status,
    assignedToId: ticket.assignedTechnicianId ?? "",
  };
}

function todayString() {
  return new Date().toISOString().split("T")[0];
}

export default function ComplaintDetailPageClient({
  detail,
  customers,
  technicians,
  assets,
}: {
  detail:
    | {
        ticket: Ticket;
        availableTechnicians: Technician[];
        linkedJobs: LinkedJob[];
      }
    | null;
  customers: Array<{ id: string; name: string }>;
  technicians: Technician[];
  assets: Array<{ id: string; customerId: string; name: string; model: string }>;
}) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isCreateJobOpen, setIsCreateJobOpen] = useState(false);
  const [jobForm, setJobForm] = useState({
    technicianId: "",
    assetId: "",
    scheduledDate: todayString(),
    notes: "",
  });
  const [jobErrors, setJobErrors] = useState<FormErrors>({});
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [form, setForm] = useState(
    detail
      ? getInitialFormState(detail.ticket)
      : {
          customerId: "",
          assetId: "",
          subject: "",
          description: "",
          category: "",
          priority: "medium" as const,
          status: "open" as const,
          assignedToId: "",
        },
  );

  useEffect(() => {
    if (!detail) {
      return;
    }

    setForm(getInitialFormState(detail.ticket));
    setErrors({});
    setIsEditing(false);
    setJobForm({
      technicianId: detail.ticket.assignedTechnicianId ?? "",
      assetId: detail.ticket.assetId ?? "",
      scheduledDate: todayString(),
      notes: detail.ticket.subject,
    });
  }, [detail]);

  const customerAssets = useMemo(
    () => assets.filter((asset) => asset.customerId === form.customerId),
    [assets, form.customerId],
  );

  if (!detail) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-lg text-slate-500">Complaint not found</p>
        <button
          onClick={() => router.push("/complaints")}
          className="mt-4 text-sm text-brand-600 hover:underline"
        >
          Back to complaints
        </button>
      </div>
    );
  }

  const { ticket, availableTechnicians, linkedJobs } = detail;
  const isBusy = (key: string) => pendingAction === key;
  const canCreateJob =
    ["open", "assigned", "in_progress"].includes(ticket.status) && linkedJobs.length === 0;

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
    const parsed = updateTicketSchema.safeParse({
      id: ticket.id,
      ...form,
    });

    if (!parsed.success) {
      setErrors(getFormErrors(parsed.error));
      toast.error("Please fix the highlighted fields");
      return;
    }

    await runAction(
      "save",
      updateTicketAction(parsed.data),
      "Complaint updated",
      () => {
        setIsEditing(false);
        router.refresh();
      },
    );
  };

  const handleResolve = async () => {
    await runAction(
      "resolve",
      resolveTicketAction({ id: ticket.id }),
      "Complaint resolved",
      () => {
        router.refresh();
      },
    );
  };

  const handleReopen = async () => {
    await runAction(
      "status",
      updateTicketAction({ id: ticket.id, status: "reopened", resolvedAt: "" }),
      "Complaint reopened",
      () => {
        router.refresh();
      },
    );
  };

  const handleDelete = async () => {
    await runAction(
      "delete",
      deleteTicketAction(ticket.id),
      "Complaint deleted",
      () => {
        setIsDeleteOpen(false);
        router.push("/complaints");
        router.refresh();
      },
    );
  };

  const handleQuickAssign = async (assignedToId: string) => {
    await runAction(
      "assign",
      assignTicketAction({ id: ticket.id, assignedToId }),
      "Technician assigned",
      () => {
        router.refresh();
      },
    );
  };

  const handleCreateJob = async () => {
    const payload = {
      ticketId: ticket.id,
      customerId: ticket.customerId,
      assetId: jobForm.assetId || undefined,
      technicianId: jobForm.technicianId,
      type: "complaint" as const,
      status: "pending" as const,
      scheduledDate: jobForm.scheduledDate,
      notes: jobForm.notes || undefined,
    };

    const parsed = createJobSchema.safeParse(payload);
    if (!parsed.success) {
      setJobErrors(getFormErrors(parsed.error));
      toast.error("Please fix the highlighted fields");
      return;
    }

    setJobErrors({});
    await runAction(
      "createJob",
      createJobAction(parsed.data),
      "Job created",
      async () => {
        await updateTicketAction({ id: ticket.id, status: "in_progress" });
        setIsCreateJobOpen(false);
        router.refresh();
      },
    );
  };

  return (
    <div>
      <PageHeader
        title={ticket.ticketNumber}
        breadcrumbs={[
          { label: "Complaints", href: "/complaints" },
          { label: ticket.ticketNumber },
        ]}
        actions={
          <div className="flex items-center gap-2">
            {isEditing ? (
              <button
                type="button"
                disabled={Boolean(pendingAction)}
                onClick={() => {
                  setForm(getInitialFormState(ticket));
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
                {!["resolved", "closed"].includes(ticket.status) ? (
                  <button
                    type="button"
                    disabled={Boolean(pendingAction)}
                    onClick={handleResolve}
                    className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isBusy("resolve") ? "Updating..." : "Mark Resolved"}
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={Boolean(pendingAction)}
                    onClick={handleReopen}
                    className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isBusy("status") ? "Updating..." : "Reopen"}
                  </button>
                )}
                {canCreateJob && (
                  <button
                    type="button"
                    disabled={Boolean(pendingAction)}
                    onClick={() => setIsCreateJobOpen(true)}
                    className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    <Briefcase className="h-4 w-4" />
                    Create Job
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
        <div className="space-y-6 lg:col-span-2">
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            {isEditing ? (
              <div>
                <h3 className="mb-4 font-semibold text-slate-900">Edit Complaint</h3>
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
                    onChange={(e) => updateField("subject", e.target.value)}
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
                    onChange={(e) => updateField("description", e.target.value)}
                    error={errors.description}
                    containerClassName="sm:col-span-2"
                  />
                  <FormField
                    as="select"
                    label="Category"
                    name="category"
                    required
                    value={form.category}
                    onChange={(e) => updateField("category", e.target.value)}
                    error={errors.category}
                  >
                    <select
                      name="category"
                      value={form.category}
                      onChange={(e) => updateField("category", e.target.value)}
                      className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${
                        errors.category
                          ? "border-red-300 focus:border-red-500 focus:ring-red-200"
                          : "border-slate-200 focus:border-brand-500 focus:ring-brand-500"
                      }`}
                    >
                      <option value="">Select category</option>
                      {TICKET_CATEGORIES.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  </FormField>
                  <FormField
                    as="select"
                    label="Priority"
                    name="priority"
                    value={form.priority}
                    onChange={(e) => updateField("priority", e.target.value)}
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
                    label="Status"
                    name="status"
                    value={form.status}
                    onChange={(e) => updateField("status", e.target.value)}
                    error={errors.status}
                    options={[
                      { value: "open", label: "Open" },
                      { value: "assigned", label: "Assigned" },
                      { value: "in_progress", label: "In Progress" },
                      { value: "on_hold", label: "On Hold" },
                      { value: "resolved", label: "Resolved" },
                      { value: "closed", label: "Closed" },
                      { value: "reopened", label: "Reopened" },
                    ]}
                  />
                  <FormField
                    as="select"
                    label="Assigned Technician"
                    name="assignedToId"
                    value={form.assignedToId}
                    onChange={(e) => updateField("assignedToId", e.target.value)}
                    error={errors.assignedToId}
                  >
                    <select
                      name="assignedToId"
                      value={form.assignedToId}
                      onChange={(e) => updateField("assignedToId", e.target.value)}
                      className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${
                        errors.assignedToId
                          ? "border-red-300 focus:border-red-500 focus:ring-red-200"
                          : "border-slate-200 focus:border-brand-500 focus:ring-brand-500"
                      }`}
                    >
                      <option value="">Assign later</option>
                      {technicians.map((technician) => (
                        <option key={technician.id} value={technician.id}>
                          {technician.name} ({technician.territory})
                        </option>
                      ))}
                    </select>
                  </FormField>
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
                      setForm(getInitialFormState(ticket));
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
                <div className="mb-4 flex items-start justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">
                      {ticket.subject}
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">{ticket.category}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={ticket.priority} />
                    <StatusBadge status={ticket.status} />
                  </div>
                </div>
                <p className="text-sm leading-relaxed text-slate-600">
                  {ticket.description}
                </p>
              </>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <h3 className="mb-4 font-semibold text-slate-900">Timeline</h3>
            <div className="relative space-y-0">
              {ticket.timeline.map((event, index) => (
                <div key={event.id ?? index} className="flex gap-4 pb-6 last:pb-0">
                  <div className="flex flex-col items-center">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-100">
                      <Clock className="h-4 w-4 text-brand-600" />
                    </div>
                    {index < ticket.timeline.length - 1 && (
                      <div className="mt-2 w-px flex-1 bg-slate-200" />
                    )}
                  </div>
                  <div className="flex-1 pt-1">
                    <p className="text-sm font-medium text-slate-900">
                      {event.action}
                    </p>
                    <p className="text-xs text-slate-500">
                      By {event.by} · {formatDateTime(event.date)}
                    </p>
                    {event.note && (
                      <p className="mt-1 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
                        {event.note}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <h3 className="mb-4 font-semibold text-slate-900">Details</h3>
            <div className="space-y-4">
              <DetailRow
                icon={User}
                label="Customer"
                value={ticket.customerName}
                href={`/customers/${ticket.customerId}`}
              />
              {ticket.assetName && (
                <DetailRow
                  icon={Package}
                  label="Asset"
                  value={ticket.assetName}
                  href={ticket.assetId ? `/assets/${ticket.assetId}` : undefined}
                />
              )}
              <DetailRow
                icon={AlertCircle}
                label="Priority"
                value={<StatusBadge status={ticket.priority} />}
              />
              <DetailRow
                icon={Clock}
                label="SLA Deadline"
                value={formatDateTime(ticket.slaDeadline)}
              />
              <DetailRow
                icon={Clock}
                label="Created"
                value={formatDateTime(ticket.createdAt)}
              />
              {ticket.resolvedAt && (
                <DetailRow
                  icon={Clock}
                  label="Resolved"
                  value={formatDateTime(ticket.resolvedAt)}
                />
              )}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold text-slate-900">Linked Jobs</h3>
              {canCreateJob && (
                <button
                  type="button"
                  disabled={Boolean(pendingAction)}
                  onClick={() => setIsCreateJobOpen(true)}
                  className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700 disabled:opacity-50"
                >
                  <Briefcase className="h-3.5 w-3.5" />
                  Create Job
                </button>
              )}
            </div>
            {linkedJobs.length === 0 ? (
              <p className="text-sm text-slate-500">No jobs linked to this complaint.</p>
            ) : (
              <div className="space-y-2">
                {linkedJobs.map((job) => (
                  <Link
                    key={job.id}
                    href={`/jobs/${job.id}`}
                    className="block rounded-lg border border-slate-100 bg-slate-50 p-3 hover:bg-slate-100"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-900">{job.jobNumber}</span>
                      <StatusBadge status={job.status} />
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {job.technicianName} · {job.scheduledDate}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <h3 className="mb-3 font-semibold text-slate-900">Assignment</h3>
            {ticket.assignedTo ? (
              <div className="flex items-center gap-3 rounded-lg bg-slate-50 p-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
                  {ticket.assignedTo
                    .split(" ")
                    .map((name) => name[0])
                    .join("")}
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    {ticket.assignedTo}
                  </p>
                  <p className="text-xs text-slate-500">Technician</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-500">No technician assigned</p>
            )}

            {!isEditing && (
              <div className="mt-4">
                <select
                  disabled={Boolean(pendingAction)}
                  onChange={(e) => {
                    const assignedToId = e.target.value;

                    if (!assignedToId) {
                      return;
                    }

                    handleQuickAssign(assignedToId);
                  }}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:bg-slate-50 disabled:opacity-60"
                >
                  <option value="">Assign technician...</option>
                  {availableTechnicians.map((technician) => (
                    <option key={technician.id} value={technician.id}>
                      {technician.name} ({technician.territory})
                    </option>
                  ))}
                </select>
              </div>
            )}
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
        title="Delete Complaint"
        description={`Delete ${ticket.ticketNumber}? This cannot be undone.`}
        confirmLabel="Delete Complaint"
        loading={isBusy("delete")}
      />

      <Modal
        isOpen={isCreateJobOpen}
        onClose={() => {
          if (!isBusy("createJob")) setIsCreateJobOpen(false);
        }}
        title="Create Job"
        size="md"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Customer
              </label>
              <input
                type="text"
                value={ticket.customerName}
                readOnly
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Type
              </label>
              <input
                type="text"
                value="Complaint"
                readOnly
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700"
              />
            </div>
            <FormField
              as="select"
              label="Asset"
              name="assetId"
              value={jobForm.assetId}
              onChange={(e) => {
                setJobForm((prev) => ({ ...prev, assetId: e.target.value }));
                setJobErrors((prev) => clearFormError(prev, "assetId"));
              }}
              error={jobErrors.assetId}
            >
              <select
                name="assetId"
                value={jobForm.assetId}
                onChange={(e) => {
                  setJobForm((prev) => ({ ...prev, assetId: e.target.value }));
                  setJobErrors((prev) => clearFormError(prev, "assetId"));
                }}
                className={getFormControlClassName({ error: jobErrors.assetId })}
              >
                <option value="">No specific asset</option>
                {assets
                  .filter((a) => a.customerId === ticket.customerId)
                  .map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} – {a.model}
                    </option>
                  ))}
              </select>
            </FormField>
            <FormField
              as="select"
              label="Technician"
              name="technicianId"
              required
              value={jobForm.technicianId}
              onChange={(e) => {
                setJobForm((prev) => ({ ...prev, technicianId: e.target.value }));
                setJobErrors((prev) => clearFormError(prev, "technicianId"));
              }}
              error={jobErrors.technicianId}
            >
              <select
                name="technicianId"
                value={jobForm.technicianId}
                onChange={(e) => {
                  setJobForm((prev) => ({ ...prev, technicianId: e.target.value }));
                  setJobErrors((prev) => clearFormError(prev, "technicianId"));
                }}
                className={getFormControlClassName({ error: jobErrors.technicianId })}
              >
                <option value="">Select technician</option>
                {availableTechnicians.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.territory})
                  </option>
                ))}
              </select>
            </FormField>
            <FormField
              label="Scheduled Date"
              name="scheduledDate"
              type="date"
              required
              value={jobForm.scheduledDate}
              onChange={(e) => {
                setJobForm((prev) => ({ ...prev, scheduledDate: e.target.value }));
                setJobErrors((prev) => clearFormError(prev, "scheduledDate"));
              }}
              error={jobErrors.scheduledDate}
            />
            <FormField
              as="textarea"
              label="Notes"
              name="notes"
              rows={3}
              value={jobForm.notes}
              onChange={(e) =>
                setJobForm((prev) => ({ ...prev, notes: e.target.value }))
              }
              error={jobErrors.notes}
              containerClassName="sm:col-span-2"
            />
          </div>
          <div className="flex items-center gap-3 border-t border-slate-100 pt-4">
            <SubmitButton
              type="button"
              loading={isBusy("createJob")}
              loadingText="Creating..."
              disabled={Boolean(pendingAction)}
              onClick={handleCreateJob}
            >
              Create Job
            </SubmitButton>
            <button
              type="button"
              disabled={Boolean(pendingAction)}
              onClick={() => setIsCreateJobOpen(false)}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-70"
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
  href?: string;
}) {
  const content =
    typeof value === "string" && href ? (
      <Link href={href} className="text-sm text-brand-600 hover:underline">
        {value}
      </Link>
    ) : typeof value === "string" ? (
      <span className="text-sm text-slate-900">{value}</span>
    ) : (
      value
    );

  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
      <div>
        <p className="text-xs text-slate-500">{label}</p>
        <div className="mt-0.5">{content}</div>
      </div>
    </div>
  );
}
