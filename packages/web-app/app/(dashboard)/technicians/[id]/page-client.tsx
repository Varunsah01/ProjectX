"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Briefcase,
  CheckCircle,
  Edit,
  Mail,
  MapPin,
  Phone,
  Power,
  Star,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { FormField } from "@/components/ui/FormField";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { Tabs } from "@/components/ui/Tabs";
import { DataTable } from "@/components/ui/DataTable";
import {
  deleteTechnicianAction,
  updateTechnicianAction,
} from "@/lib/actions/technicians";
import { clearFormError, getFormErrors, type FormErrors } from "@/lib/form-errors";
import { updateTechnicianSchema } from "@/lib/validations/technician";
import { formatDate, getInitials } from "@/lib/utils";
import type { Job, Technician, Ticket } from "@/lib/types";

function getInitialFormState(technician: Technician) {
  return {
    name: technician.name,
    email: technician.email,
    phone: technician.phone,
    territory: technician.territory,
    specialization: technician.specialization,
    status: technician.status,
    password: "",
  };
}

export default function TechnicianDetailPageClient({
  detail,
}: {
  detail:
    | {
        technician: Technician;
        jobs: Job[];
        tickets: Ticket[];
      }
    | null;
}) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [form, setForm] = useState(
    detail
      ? getInitialFormState(detail.technician)
      : {
          name: "",
          email: "",
          phone: "",
          territory: "",
          specialization: "",
          status: "available" as const,
          password: "",
        },
  );

  useEffect(() => {
    if (!detail) {
      return;
    }

    setForm(getInitialFormState(detail.technician));
    setErrors({});
    setIsEditing(false);
  }, [detail]);

  if (!detail) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-lg text-slate-500">Technician not found</p>
        <button
          onClick={() => router.push("/technicians")}
          className="mt-4 text-sm text-brand-600 hover:underline"
        >
          Back to technicians
        </button>
      </div>
    );
  }

  const { technician, jobs, tickets } = detail;
  const filledStars = Math.round(technician.rating);
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
    const parsed = updateTechnicianSchema.safeParse({
      id: technician.id,
      ...form,
      password: form.password || undefined,
    });

    if (!parsed.success) {
      setErrors(getFormErrors(parsed.error));
      toast.error("Please fix the highlighted fields");
      return;
    }

    await runAction(
      "save",
      updateTechnicianAction(parsed.data),
      "Technician updated",
      () => {
        setIsEditing(false);
        router.refresh();
      },
    );
  };

  const toggleStatus = async () => {
    const nextStatus =
      technician.status === "available" ? "off_duty" : "available";

    await runAction(
      "status",
      updateTechnicianAction({ id: technician.id, status: nextStatus }),
      nextStatus === "available" ? "Technician marked available" : "Technician marked off duty",
      () => {
        router.refresh();
      },
    );
  };

  const handleDelete = async () => {
    await runAction(
      "delete",
      deleteTechnicianAction(technician.id),
      "Technician deleted",
      () => {
        setIsDeleteOpen(false);
        router.push("/technicians");
        router.refresh();
      },
    );
  };

  return (
    <div>
      <PageHeader
        title={technician.name}
        breadcrumbs={[
          { label: "Technicians", href: "/technicians" },
          { label: technician.name },
        ]}
        actions={
          <div className="flex items-center gap-2">
            {isEditing ? (
              <button
                type="button"
                disabled={Boolean(pendingAction)}
                onClick={() => {
                  setForm(getInitialFormState(technician));
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
                    : technician.status === "available"
                      ? "Mark Off Duty"
                      : "Mark Available"}
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
        <div className="space-y-6 lg:col-span-2">
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            {isEditing ? (
              <div>
                <div className="mb-6 flex items-start gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-brand-100 to-brand-200 text-xl font-bold text-brand-700">
                    {getInitials(form.name || technician.name)}
                  </div>
                  <div className="flex-1">
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                      <FormField
                        label="Name"
                        name="name"
                        required
                        value={form.name}
                        onChange={(e) => updateField("name", e.target.value)}
                        error={errors.name}
                      />
                      <FormField
                        label="Email"
                        name="email"
                        type="email"
                        required
                        value={form.email}
                        onChange={(e) => updateField("email", e.target.value)}
                        error={errors.email}
                      />
                      <FormField
                        label="Phone"
                        name="phone"
                        value={form.phone}
                        onChange={(e) => updateField("phone", e.target.value)}
                        error={errors.phone}
                      />
                      <FormField
                        as="select"
                        label="Status"
                        name="status"
                        value={form.status}
                        onChange={(e) => updateField("status", e.target.value)}
                        error={errors.status}
                        options={[
                          { value: "available", label: "Available" },
                          { value: "on_job", label: "On Job" },
                          { value: "en_route", label: "En Route" },
                          { value: "off_duty", label: "Off Duty" },
                        ]}
                      />
                      <FormField
                        label="Territory"
                        name="territory"
                        value={form.territory}
                        onChange={(e) => updateField("territory", e.target.value)}
                        error={errors.territory}
                      />
                      <FormField
                        label="Specialization"
                        name="specialization"
                        value={form.specialization}
                        onChange={(e) => updateField("specialization", e.target.value)}
                        error={errors.specialization}
                      />
                      <FormField
                        label="New Password"
                        name="password"
                        type="password"
                        value={form.password}
                        onChange={(e) => updateField("password", e.target.value)}
                        error={errors.password}
                        description="Leave blank to keep the current password"
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
                          setForm(getInitialFormState(technician));
                          setErrors({});
                          setIsEditing(false);
                        }}
                        className="rounded-lg border border-slate-200 px-6 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-brand-100 to-brand-200 text-xl font-bold text-brand-700">
                  {getInitials(technician.name)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h2 className="text-lg font-semibold text-slate-900">
                      {technician.name}
                    </h2>
                    <StatusBadge status={technician.status} />
                  </div>
                  <p className="mt-1 text-sm text-slate-500">
                    {technician.specialization}
                  </p>
                  <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Phone className="h-4 w-4 text-slate-400" />
                      {technician.phone}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Mail className="h-4 w-4 text-slate-400" />
                      <span className="truncate">{technician.email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <MapPin className="h-4 w-4 text-slate-400" />
                      <span className="truncate">{technician.territory}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4 transition-all hover:shadow-md">
              <div className="mb-1 flex items-center gap-2 text-slate-500">
                <Briefcase className="h-4 w-4" />
                <span className="text-xs font-medium">Active Jobs</span>
              </div>
              <p className="tabular-nums text-2xl font-bold text-slate-900">
                {technician.activeJobs}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 transition-all hover:shadow-md">
              <div className="mb-1 flex items-center gap-2 text-slate-500">
                <CheckCircle className="h-4 w-4" />
                <span className="text-xs font-medium">Completed Today</span>
              </div>
              <p className="tabular-nums text-2xl font-bold text-slate-900">
                {technician.completedToday}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 transition-all hover:shadow-md">
              <div className="mb-1 flex items-center gap-2 text-slate-500">
                <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                <span className="text-xs font-medium">Total Rating</span>
              </div>
              <p className="tabular-nums text-2xl font-bold text-slate-900">
                {technician.rating}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 transition-all hover:shadow-md">
              <div className="mb-1 flex items-center gap-2 text-slate-500">
                <MapPin className="h-4 w-4" />
                <span className="text-xs font-medium">Territory</span>
              </div>
              <p className="truncate text-sm font-semibold text-slate-900">
                {technician.territory}
              </p>
            </div>
          </div>

          <Tabs
            tabs={[
              {
                id: "jobs",
                label: "Job History",
                count: jobs.length,
                content: (
                  <DataTable<Job>
                    columns={[
                      {
                        key: "jobNumber",
                        header: "Job #",
                        render: (jobRow) => (
                          <span className="font-medium text-slate-900">
                            {jobRow.jobNumber}
                          </span>
                        ),
                      },
                      {
                        key: "customer",
                        header: "Customer",
                        render: (jobRow) => jobRow.customerName,
                      },
                      {
                        key: "type",
                        header: "Type",
                        render: (jobRow) => <span className="capitalize">{jobRow.type}</span>,
                      },
                      {
                        key: "date",
                        header: "Date",
                        render: (jobRow) => formatDate(jobRow.scheduledDate),
                      },
                      {
                        key: "status",
                        header: "Status",
                        render: (jobRow) => <StatusBadge status={jobRow.status} />,
                      },
                    ]}
                    data={jobs}
                    onRowClick={(jobRow) => router.push(`/jobs/${jobRow.id}`)}
                  />
                ),
              },
              {
                id: "tickets",
                label: "Assigned Tickets",
                count: tickets.length,
                content: (
                  <DataTable<Ticket>
                    columns={[
                      {
                        key: "ticketNumber",
                        header: "Ticket #",
                        render: (ticketRow) => (
                          <span className="font-medium text-slate-900">
                            {ticketRow.ticketNumber}
                          </span>
                        ),
                      },
                      {
                        key: "subject",
                        header: "Subject",
                        render: (ticketRow) => ticketRow.subject,
                      },
                      {
                        key: "customer",
                        header: "Customer",
                        render: (ticketRow) => ticketRow.customerName,
                      },
                      {
                        key: "priority",
                        header: "Priority",
                        render: (ticketRow) => <StatusBadge status={ticketRow.priority} />,
                      },
                      {
                        key: "status",
                        header: "Status",
                        render: (ticketRow) => <StatusBadge status={ticketRow.status} />,
                      },
                    ]}
                    data={tickets}
                    onRowClick={(ticketRow) => router.push(`/complaints/${ticketRow.id}`)}
                  />
                ),
              },
            ]}
          />
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <h3 className="mb-4 font-semibold text-slate-900">Performance</h3>
            <div className="space-y-4">
              <div>
                <p className="mb-1 text-xs text-slate-500">Rating</p>
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <Star
                      key={index}
                      className={`h-5 w-5 ${
                        index < filledStars
                          ? "fill-amber-400 text-amber-400"
                          : "text-slate-200"
                      }`}
                    />
                  ))}
                  <span className="ml-2 tabular-nums text-sm font-semibold text-slate-900">
                    {technician.rating}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Active Jobs</span>
                <span className="tabular-nums font-medium text-slate-900">
                  {technician.activeJobs}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Completed Today</span>
                <span className="tabular-nums font-medium text-slate-900">
                  {technician.completedToday}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Completed This Week</span>
                <span className="tabular-nums font-medium text-slate-900">
                  {technician.completedThisWeek}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Completed This Month</span>
                <span className="tabular-nums font-medium text-slate-900">
                  {technician.completedThisMonth}
                </span>
              </div>
              <div className="border-t border-slate-100 pt-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700">
                    Total Jobs
                  </span>
                  <span className="tabular-nums text-lg font-bold text-slate-900">
                    {technician.totalJobs}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <h3 className="mb-3 font-semibold text-slate-900">
              Skills & Specialization
            </h3>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-brand-100 px-3 py-1 text-xs font-medium text-brand-700">
                {technician.specialization}
              </span>
              {technician.skills.map((skill) => (
                <span
                  key={skill}
                  className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <h3 className="mb-3 font-semibold text-slate-900">Availability</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Current Status</span>
                <StatusBadge status={technician.status} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Territory</span>
                <span className="text-sm font-medium text-slate-900">
                  {technician.territory}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Joined</span>
                <span className="text-sm font-medium text-slate-900">
                  {formatDate(technician.joinDate)}
                </span>
              </div>
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
        title="Delete Technician"
        description={`Delete ${technician.name}? This cannot be undone.`}
        confirmLabel="Delete Technician"
        loading={isBusy("delete")}
      />
    </div>
  );
}
