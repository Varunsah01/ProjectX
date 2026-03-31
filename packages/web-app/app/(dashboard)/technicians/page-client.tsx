"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Mail, MapPin, Phone, Plus, Star } from "lucide-react";
import { toast } from "sonner";
import { ExportMenu } from "@/components/ui/ExportMenu";
import { FilterBar } from "@/components/ui/FilterBar";
import { FormField } from "@/components/ui/FormField";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";
import { PasswordRevealModal } from "@/components/ui/PasswordRevealModal";
import { PaginationControls } from "@/components/ui/PaginationControls";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { createTechnicianAction, listTechniciansAction } from "@/lib/actions/technicians";
import { fetchAllExportRows, type ExportColumn } from "@/lib/export";
import { clearFormError, getFormErrors, type FormErrors } from "@/lib/form-errors";
import { useListUrlState } from "@/lib/use-list-url-state";
import { DEFAULT_PAGE_SIZE } from "@/lib/url-search-params";
import { getInitials } from "@/lib/utils";
import { createTechnicianSchema } from "@/lib/validations/technician";
import type { PaginatedData, Technician } from "@/lib/types";

const technicianExportColumns: ExportColumn<Technician>[] = [
  { header: "Name", value: (technician) => technician.name },
  { header: "Email", value: (technician) => technician.email },
  { header: "Phone", value: (technician) => technician.phone },
  { header: "Territory", value: (technician) => technician.territory },
  {
    header: "Specialization",
    value: (technician) => technician.specialization,
  },
  { header: "Status", value: (technician) => technician.status },
  { header: "Active Jobs", value: (technician) => technician.activeJobs },
  { header: "Completed Today", value: (technician) => technician.completedToday },
  { header: "Rating", value: (technician) => technician.rating },
];

const BLANK_FORM = {
  name: "",
  email: "",
  phone: "",
  territory: "",
  specialization: "",
  status: "available" as const,
};

export default function TechniciansPageClient({
  technicians,
  overview,
  params,
}: {
  technicians: PaginatedData<Technician>;
  overview: {
    total: number;
    available: number;
  };
  params: {
    search: string;
    status: string;
    page: number;
    pageSize: number;
  };
}) {
  const router = useRouter();
  const { updateParams } = useListUrlState({
    search: "",
    status: "all",
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
  });

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [form, setForm] = useState(BLANK_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isPending, startTransition] = useTransition();
  const [revealPassword, setRevealPassword] = useState<string | null>(null);

  const updateField = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => clearFormError(prev, field));
  };

  const handleCreate = () => {
    const parsed = createTechnicianSchema.safeParse(form);
    if (!parsed.success) {
      setErrors(getFormErrors(parsed.error));
      toast.error("Please fix the highlighted fields");
      return;
    }

    startTransition(async () => {
      const result = await createTechnicianAction(parsed.data);
      if (!result.success) {
        toast.error(result.error ?? "Failed to create technician");
        return;
      }
      setIsCreateOpen(false);
      setForm(BLANK_FORM);
      setErrors({});
      router.refresh();
      if (result.data?.generatedPassword) {
        setRevealPassword(result.data.generatedPassword);
      }
    });
  };

  const loadExportData = () =>
    fetchAllExportRows<Technician, PaginatedData<Technician>>(
      (page, pageSize) =>
        listTechniciansAction({
          search: params.search || undefined,
          status: params.status !== "all" ? params.status : undefined,
          page,
          pageSize,
          sortBy: "name",
          sortOrder: "asc",
        }),
      {
        getRows: (pageData) => pageData.data,
        getTotalPages: (pageData) => pageData.totalPages,
      },
    );

  return (
    <div>
      <PageHeader
        title="Technicians"
        subtitle={`${overview.total} technicians · ${overview.available} available`}
      />

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <FilterBar
          className="mb-0 flex-1"
          searchValue={params.search}
          onSearchChange={(value) => updateParams({ search: value, page: 1 })}
          searchPlaceholder="Search by name, territory, or specialization..."
          onClearAll={() => updateParams({ search: "", status: "all", page: 1 })}
          filters={[
            {
              label: "Status",
              value: params.status,
              onChange: (value) => updateParams({ status: value, page: 1 }),
              options: [
                { label: "All Status", value: "all" },
                { label: "Available", value: "available" },
                { label: "On Job", value: "on_job" },
                { label: "En Route", value: "en_route" },
                { label: "Off Duty", value: "off_duty" },
              ],
            },
          ]}
        />
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            New Technician
          </button>
          <ExportMenu
            columns={technicianExportColumns}
            filename="technicians-export"
            loadData={loadExportData}
          />
        </div>
      </div>

      {technicians.data.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white py-16">
          <div className="mb-3 rounded-full bg-slate-100 p-3">
            <svg className="h-6 w-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-slate-500">No technicians found</p>
          <p className="mt-1 text-xs text-slate-400">Try adjusting your search or filters</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {technicians.data.map((technician) => (
              <div
                key={technician.id}
                onClick={() => router.push(`/technicians/${technician.id}`)}
                className="cursor-pointer rounded-xl border border-slate-200 bg-white p-6 transition-all duration-200 hover:border-slate-300 hover:shadow-md"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-brand-100 to-brand-200 font-semibold text-brand-700">
                      {getInitials(technician.name)}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">{technician.name}</p>
                      <p className="text-xs text-slate-500">{technician.specialization}</p>
                    </div>
                  </div>
                  <StatusBadge status={technician.status} />
                </div>

                <div className="mt-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <MapPin className="h-4 w-4 shrink-0 text-slate-400" />
                    <span className="truncate">{technician.territory}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Phone className="h-4 w-4 shrink-0 text-slate-400" />
                    {technician.phone}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Mail className="h-4 w-4 shrink-0 text-slate-400" />
                    <span className="truncate">{technician.email}</span>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-3 border-t border-slate-100 pt-4">
                  <div className="text-center">
                    <p className="tabular-nums text-lg font-bold text-slate-900">
                      {technician.activeJobs}
                    </p>
                    <p className="text-xs text-slate-500">Active</p>
                  </div>
                  <div className="text-center">
                    <p className="tabular-nums text-lg font-bold text-slate-900">
                      {technician.completedToday}
                    </p>
                    <p className="text-xs text-slate-500">Today</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                      <span className="tabular-nums text-lg font-bold text-slate-900">
                        {technician.rating}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">Rating</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <PaginationControls
            className="mt-4 rounded-xl border border-slate-200 bg-white"
            page={technicians.page}
            pageSize={technicians.pageSize}
            totalCount={technicians.total}
            totalPages={technicians.totalPages}
            onPageChange={(page) => updateParams({ page })}
            onPageSizeChange={(pageSize) => updateParams({ pageSize, page: 1 })}
          />
        </>
      )}

      <Modal
        isOpen={isCreateOpen}
        onClose={() => {
          if (!isPending) {
            setIsCreateOpen(false);
            setForm(BLANK_FORM);
            setErrors({});
          }
        }}
        title="New Technician"
        size="lg"
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
        </div>
        <p className="mt-3 text-xs text-slate-500">
          A random password will be generated automatically.
        </p>
        <div className="mt-5 flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
          <button
            type="button"
            disabled={isPending}
            onClick={() => {
              setIsCreateOpen(false);
              setForm(BLANK_FORM);
              setErrors({});
            }}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
          >
            Cancel
          </button>
          <SubmitButton
            type="button"
            loading={isPending}
            loadingText="Creating..."
            onClick={handleCreate}
          >
            Create Technician
          </SubmitButton>
        </div>
      </Modal>

      {revealPassword && (
        <PasswordRevealModal
          password={revealPassword}
          onClose={() => setRevealPassword(null)}
        />
      )}
    </div>
  );
}
