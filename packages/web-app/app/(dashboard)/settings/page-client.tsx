"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { UserRole } from "@prisma/client";
import { MoreVertical } from "lucide-react";
import { toast } from "sonner";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { FormField } from "@/components/ui/FormField";
import { ImageUpload } from "@/components/ui/ImageUpload";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";
import { PasswordRevealModal } from "@/components/ui/PasswordRevealModal";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { Tabs } from "@/components/ui/Tabs";
import {
  createPlanAction,
  updatePlanAction,
  deletePlanAction,
} from "@/lib/actions/plans";
import {
  createTeamMemberAction,
  removeTeamMemberAction,
  resetTeamMemberPasswordAction,
  updateBusinessProfileAction,
  updateTeamMemberAction,
} from "@/lib/actions/settings";
import Link from "next/link";
import {
  createInvitationAction,
  listPendingInvitationsAction,
  revokeInvitationAction,
} from "@/lib/actions/invitations";
import { updateNotificationSettingsAction } from "@/lib/actions/notifications-settings";
import { clearFormError, getFormErrors, type FormErrors } from "@/lib/form-errors";
import { createTeamMemberSchema } from "@/lib/validations/settings";
import { formatCurrency, formatDateTime, getInitials } from "@/lib/utils";
import type { Plan, SettingsData, TeamMember } from "@/lib/types";

export default function SettingsPageClient({
  data,
  currentRole,
  currentUserId,
}: {
  data: SettingsData;
  currentRole: UserRole;
  currentUserId: string;
}) {
  const tabs = [
    data.businessProfile
      ? {
          id: "business",
          label: "Business Profile",
          content: <BusinessProfileTab initialProfile={data.businessProfile} />,
        }
      : null,
    data.teamMembers.length > 0 || currentRole === "ADMIN"
      ? {
          id: "team",
          label: "Team",
          count: data.teamMembers.length,
          content: (
            <TeamTab
              teamMembers={data.teamMembers}
              currentUserId={currentUserId}
              currentRole={currentRole}
            />
          ),
        }
      : null,
    currentRole === "ADMIN"
      ? {
          id: "invitations",
          label: "Invitations",
          content: <InvitationsTab />,
        }
      : null,
    {
      id: "plans",
      label: "Service Plans",
      count: data.plans.length,
      content: <PlansTab plans={data.plans} />,
    },
    {
      id: "notifications",
      label: "Notifications",
      content: <NotificationsTab initialNotificationSettings={data.notificationSettings} />,
    },
    currentRole === "ADMIN"
      ? {
          id: "compliance",
          label: "Compliance",
          content: <ComplianceSettingsTab initialProfile={data.businessProfile} />,
        }
      : null,
    currentRole === "ADMIN"
      ? {
          id: "audit",
          label: "Audit Logs",
          count: data.auditLogs.length,
          content: <AuditLogsTab logs={data.auditLogs} />,
        }
      : null,
  ].filter(Boolean) as Array<{
    id: string;
    label: string;
    count?: number;
    content: React.ReactNode;
  }>;

  return (
    <div>
      <PageHeader title="Settings" subtitle="Manage your business settings" />

      <Tabs tabs={tabs} />
    </div>
  );
}

function BusinessProfileTab({
  initialProfile,
}: {
  initialProfile: NonNullable<SettingsData["businessProfile"]>;
}) {
  const [form, setForm] = useState(initialProfile);
  const [isPending, startTransition] = useTransition();

  const update = (field: keyof typeof form, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  return (
    <div className="max-w-2xl rounded-xl border border-slate-200 bg-white p-6">
      <h3 className="text-lg font-semibold text-slate-900 mb-5">
        Business Information
      </h3>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Business Name
          </label>
          <input
            type="text"
            value={form.businessName}
            onChange={(e) => update("businessName", e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Phone
          </label>
          <input
            type="tel"
            value={form.phone}
            onChange={(e) => update("phone", e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Email
          </label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Address
          </label>
          <input
            type="text"
            value={form.address}
            onChange={(e) => update("address", e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            City
          </label>
          <input
            type="text"
            value={form.city}
            onChange={(e) => update("city", e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            GSTIN
          </label>
          <input
            type="text"
            value={form.gstin}
            onChange={(e) => update("gstin", e.target.value.toUpperCase())}
            placeholder="e.g. 29ABCDE1234F1Z5"
            className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Place of Business State
          </label>
          <select
            value={form.placeOfBusinessState}
            onChange={(e) => update("placeOfBusinessState", e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all"
          >
            <option value="">Select State</option>
            <option value="01">01 - Jammu &amp; Kashmir</option>
            <option value="02">02 - Himachal Pradesh</option>
            <option value="03">03 - Punjab</option>
            <option value="04">04 - Chandigarh</option>
            <option value="05">05 - Uttarakhand</option>
            <option value="06">06 - Haryana</option>
            <option value="07">07 - Delhi</option>
            <option value="08">08 - Rajasthan</option>
            <option value="09">09 - Uttar Pradesh</option>
            <option value="10">10 - Bihar</option>
            <option value="11">11 - Sikkim</option>
            <option value="12">12 - Arunachal Pradesh</option>
            <option value="13">13 - Nagaland</option>
            <option value="14">14 - Manipur</option>
            <option value="15">15 - Mizoram</option>
            <option value="16">16 - Tripura</option>
            <option value="17">17 - Meghalaya</option>
            <option value="18">18 - Assam</option>
            <option value="19">19 - West Bengal</option>
            <option value="20">20 - Jharkhand</option>
            <option value="21">21 - Odisha</option>
            <option value="22">22 - Chhattisgarh</option>
            <option value="23">23 - Madhya Pradesh</option>
            <option value="24">24 - Gujarat</option>
            <option value="25">25 - Daman &amp; Diu</option>
            <option value="26">26 - Dadra &amp; Nagar Haveli</option>
            <option value="27">27 - Maharashtra</option>
            <option value="29">29 - Karnataka</option>
            <option value="30">30 - Goa</option>
            <option value="32">32 - Kerala</option>
            <option value="33">33 - Tamil Nadu</option>
            <option value="34">34 - Puducherry</option>
            <option value="36">36 - Telangana</option>
            <option value="37">37 - Andhra Pradesh</option>
            <option value="38">38 - Ladakh</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Legal Name
          </label>
          <input
            type="text"
            value={form.legalName || ""}
            onChange={(e) => update("legalName", e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            PAN
          </label>
          <input
            type="text"
            value={form.pan || ""}
            onChange={(e) => update("pan", e.target.value.toUpperCase())}
            placeholder="e.g. ABCDE1234F"
            className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all"
          />
        </div>
      </div>

      <div className="mt-6 border-t border-slate-100 pt-6">
        <h4 className="text-sm font-semibold text-slate-900 mb-4">Logo & Signature</h4>
        <div className="flex gap-6 flex-wrap">
          <ImageUpload
            kind="logo"
            currentKey={form.logo}
            previewUrl={initialProfile.logoPreviewUrl}
            onUploaded={(key) => update("logo", key)}
            label="Business Logo"
          />
          <ImageUpload
            kind="signature"
            currentKey={form.signatureUrl}
            previewUrl={initialProfile.signaturePreviewUrl}
            onUploaded={(key) => update("signatureUrl", key)}
            label="Authorized Signature"
          />
        </div>
      </div>

      <div className="mt-6 border-t border-slate-100 pt-6">
        <h4 className="text-sm font-semibold text-slate-900 mb-4">Bank Details</h4>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Bank Name
            </label>
            <input
              type="text"
              value={form.bankName || ""}
              onChange={(e) => update("bankName", e.target.value)}
              placeholder="e.g. State Bank of India"
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Account Number
            </label>
            <input
              type="text"
              value={form.bankAccountNumber || ""}
              onChange={(e) => update("bankAccountNumber", e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              IFSC Code
            </label>
            <input
              type="text"
              value={form.bankIfsc || ""}
              onChange={(e) => update("bankIfsc", e.target.value.toUpperCase())}
              placeholder="e.g. SBIN0001234"
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Branch
            </label>
            <input
              type="text"
              value={form.bankBranch || ""}
              onChange={(e) => update("bankBranch", e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              UPI ID
            </label>
            <input
              type="text"
              value={form.upiId || ""}
              onChange={(e) => update("upiId", e.target.value)}
              placeholder="e.g. business@upi"
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all"
            />
          </div>
        </div>
      </div>

      <div className="mt-6 border-t border-slate-100 pt-6">
        <h4 className="text-sm font-semibold text-slate-900 mb-4">Invoice Settings</h4>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Terms & Conditions
          </label>
          <textarea
            rows={3}
            value={form.invoiceTerms || ""}
            onChange={(e) => update("invoiceTerms", e.target.value)}
            placeholder="Payment terms and conditions to appear on invoices"
            className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all"
          />
        </div>
      </div>

      <div className="mt-6 border-t border-slate-100 pt-6 flex items-center gap-3">
        <button
          onClick={() =>
            startTransition(async () => {
              const result = await updateBusinessProfileAction(form);
              if (!result.success) {
                toast.error(result.error);
                return;
              }
              toast.success("Business profile updated");
            })
          }
          disabled={isPending}
          className="rounded-lg bg-brand-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-brand-700 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:ring-offset-2"
        >
          {isPending ? "Saving..." : "Save Changes"}
        </button>
        <button
          onClick={() => setForm(initialProfile)}
          className="rounded-lg border border-slate-200 px-6 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function AuditLogsTab({ logs }: { logs: SettingsData["auditLogs"] }) {
  if (!logs.length) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <p className="text-sm text-slate-500">No audit logs recorded yet.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      <div className="border-b border-slate-100 px-6 py-4">
        <h3 className="font-semibold text-slate-900">Recent Audit Activity</h3>
        <p className="mt-1 text-sm text-slate-500">
          Showing the latest 100 create, update, and delete events.
        </p>
      </div>
      <div className="divide-y divide-slate-100">
        {logs.map((log) => (
          <div key={log.id} className="px-6 py-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-medium text-slate-900">
                  {log.action} {log.entity}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {log.userName} ({log.userEmail}) · {formatDateTime(log.createdAt)}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Entity ID: {log.entityId}
                </p>
              </div>
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium uppercase text-slate-600">
                {log.action}
              </span>
            </div>
            <pre className="mt-3 overflow-x-auto rounded-lg bg-slate-950/95 p-3 text-xs leading-6 text-slate-100">
              {JSON.stringify(log.changes, null, 2)}
            </pre>
          </div>
        ))}
      </div>
    </div>
  );
}

const BLANK_MEMBER_FORM = {
  name: "",
  email: "",
  role: "agent" as "admin" | "manager" | "agent" | "technician",
  status: "active" as "active" | "inactive",
};

function TeamTab({
  teamMembers,
  currentUserId,
  currentRole,
}: {
  teamMembers: SettingsData["teamMembers"];
  currentUserId: string;
  currentRole: UserRole;
}) {
  const router = useRouter();

  // Create member
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [form, setForm] = useState(BLANK_MEMBER_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isPending, startTransition] = useTransition();
  const [revealPassword, setRevealPassword] = useState<string | null>(null);
  const [resettingId, setResettingId] = useState<string | null>(null);

  // Kebab menu
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLTableCellElement>(null);

  // Edit role modal
  const [editMember, setEditMember] = useState<TeamMember | null>(null);
  const [editForm, setEditForm] = useState({ role: "agent", status: "active" });

  // Deactivate confirm
  const [deactivateMember, setDeactivateMember] = useState<TeamMember | null>(null);

  // Remove confirm
  const [removeMember, setRemoveMember] = useState<TeamMember | null>(null);
  const [removeConfirmText, setRemoveConfirmText] = useState("");

  // Generic pending action
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  useEffect(() => {
    const close = () => setOpenMenuId(null);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, []);

  useEffect(() => {
    if (editMember) {
      setEditForm({ role: editMember.role, status: editMember.status });
    }
  }, [editMember]);

  const updateField = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => clearFormError(prev, field));
  };

  const handleCreate = () => {
    const parsed = createTeamMemberSchema.safeParse(form);
    if (!parsed.success) {
      setErrors(getFormErrors(parsed.error));
      toast.error("Please fix the highlighted fields");
      return;
    }
    startTransition(async () => {
      const result = await createTeamMemberAction(parsed.data);
      if (!result.success) {
        toast.error(result.error ?? "Failed to create team member");
        return;
      }
      setIsCreateOpen(false);
      setForm(BLANK_MEMBER_FORM);
      setErrors({});
      if (result.data?.generatedPassword) {
        setRevealPassword(result.data.generatedPassword);
      }
    });
  };

  const handleResetPassword = (id: string) => {
    setResettingId(id);
    startTransition(async () => {
      const result = await resetTeamMemberPasswordAction({ id });
      setResettingId(null);
      if (!result.success) {
        toast.error(result.error ?? "Failed to reset password");
        return;
      }
      if (result.data?.generatedPassword) {
        setRevealPassword(result.data.generatedPassword);
      }
    });
  };

  const handleEditSave = async () => {
    if (pendingAction || !editMember) return;
    setPendingAction("edit");
    try {
      const result = await updateTeamMemberAction({
        id: editMember.id,
        role: editForm.role as never,
        status: editForm.status as never,
      });
      if (!result.success) {
        toast.error(result.error ?? "Failed to update member");
        return;
      }
      toast.success("Member updated");
      setEditMember(null);
      router.refresh();
    } finally {
      setPendingAction(null);
    }
  };

  const handleDeactivateConfirm = async () => {
    if (pendingAction || !deactivateMember) return;
    const goingInactive = deactivateMember.status === "active";
    setPendingAction("deactivate");
    try {
      const result = await updateTeamMemberAction({
        id: deactivateMember.id,
        status: goingInactive ? "inactive" : "active",
      });
      if (!result.success) {
        toast.error(result.error ?? "Failed to update member");
        return;
      }
      toast.success(goingInactive ? "Member deactivated" : "Member activated");
      setDeactivateMember(null);
      router.refresh();
    } finally {
      setPendingAction(null);
    }
  };

  const handleRemoveConfirm = async () => {
    if (pendingAction || !removeMember) return;
    setPendingAction("remove");
    try {
      const result = await removeTeamMemberAction(removeMember.id);
      if (!result.success) {
        toast.error(result.error ?? "Failed to remove member");
        return;
      }
      toast.success("Member removed");
      setRemoveMember(null);
      setRemoveConfirmText("");
      router.refresh();
    } finally {
      setPendingAction(null);
    }
  };

  return (
    <>
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h3 className="font-semibold text-slate-900">Team Members</h3>
          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700 transition-colors"
          >
            Add Member
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80">
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-slate-500">
                  Member
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-slate-500">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-slate-500">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-slate-500">
                  Last Active
                </th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {teamMembers.map((member) => {
                const isSelf = member.id === currentUserId;
                const menuOpen = openMenuId === member.id;
                return (
                  <tr key={member.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-brand-100 to-brand-200 text-sm font-semibold text-brand-700">
                          {getInitials(member.name)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-slate-900">
                              {member.name}
                            </p>
                            {isSelf && (
                              <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-600">
                                You
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500">{member.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600 capitalize">
                        {member.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={member.status} />
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">
                      {formatDateTime(member.lastActive)}
                    </td>
                    <td className="px-6 py-4 text-right" ref={menuRef}>
                      {isSelf ? null : (
                        <div
                          className="relative inline-block"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            disabled={Boolean(pendingAction) || resettingId === member.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenMenuId(menuOpen ? null : member.id);
                            }}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </button>
                          {menuOpen && (
                            <div className="absolute right-0 top-9 z-20 w-48 rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditMember(member);
                                  setOpenMenuId(null);
                                }}
                                className="flex w-full items-center px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                              >
                                Edit Role &amp; Status
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setDeactivateMember(member);
                                  setOpenMenuId(null);
                                }}
                                className="flex w-full items-center px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                              >
                                {member.status === "active" ? "Deactivate" : "Activate"}
                              </button>
                              <button
                                type="button"
                                disabled={resettingId === member.id || isPending}
                                onClick={() => {
                                  handleResetPassword(member.id);
                                  setOpenMenuId(null);
                                }}
                                className="flex w-full items-center px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {resettingId === member.id ? "Resetting..." : "Reset Password"}
                              </button>
                              {currentRole === "ADMIN" && (
                                <>
                                  <div className="my-1 border-t border-slate-100" />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setRemoveMember(member);
                                      setRemoveConfirmText("");
                                      setOpenMenuId(null);
                                    }}
                                    className="flex w-full items-center px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                                  >
                                    Remove Member
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add member modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => {
          if (!isPending) {
            setIsCreateOpen(false);
            setForm(BLANK_MEMBER_FORM);
            setErrors({});
          }
        }}
        title="Add Team Member"
        size="md"
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
            as="select"
            label="Role"
            name="role"
            value={form.role}
            onChange={(e) => updateField("role", e.target.value)}
            error={errors.role}
            options={[
              { value: "admin", label: "Admin" },
              { value: "manager", label: "Manager" },
              { value: "agent", label: "Agent" },
              { value: "technician", label: "Technician" },
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
              { value: "active", label: "Active" },
              { value: "inactive", label: "Inactive" },
            ]}
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
              setForm(BLANK_MEMBER_FORM);
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
            Create Member
          </SubmitButton>
        </div>
      </Modal>

      {/* Edit role & status modal */}
      <Modal
        isOpen={Boolean(editMember)}
        onClose={() => { if (!pendingAction) setEditMember(null); }}
        title="Edit Member"
        size="sm"
      >
        <div className="space-y-4">
          <div className="rounded-lg bg-slate-50 px-4 py-3">
            <p className="text-sm font-medium text-slate-900">{editMember?.name}</p>
            <p className="text-xs text-slate-500">{editMember?.email}</p>
          </div>
          <FormField
            as="select"
            label="Role"
            name="role"
            value={editForm.role}
            onChange={(e) => setEditForm((prev) => ({ ...prev, role: e.target.value }))}
            options={[
              { value: "admin", label: "Admin" },
              { value: "manager", label: "Manager" },
              { value: "agent", label: "Agent" },
              { value: "technician", label: "Technician" },
            ]}
          />
          <FormField
            as="select"
            label="Status"
            name="status"
            value={editForm.status}
            onChange={(e) => setEditForm((prev) => ({ ...prev, status: e.target.value }))}
            options={[
              { value: "active", label: "Active" },
              { value: "inactive", label: "Inactive" },
            ]}
          />
          <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
            <button
              type="button"
              disabled={Boolean(pendingAction)}
              onClick={() => setEditMember(null)}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
            >
              Cancel
            </button>
            <SubmitButton
              type="button"
              loading={pendingAction === "edit"}
              loadingText="Saving..."
              onClick={handleEditSave}
            >
              Save Changes
            </SubmitButton>
          </div>
        </div>
      </Modal>

      {/* Deactivate / Activate confirmation */}
      <ConfirmModal
        isOpen={Boolean(deactivateMember)}
        onClose={() => { if (!pendingAction) setDeactivateMember(null); }}
        onConfirm={handleDeactivateConfirm}
        title={deactivateMember?.status === "active" ? "Deactivate Member" : "Activate Member"}
        description={
          deactivateMember?.status === "active"
            ? `Deactivate ${deactivateMember?.name}? They will no longer be able to log in. Active sessions remain valid until they expire.`
            : `Reactivate ${deactivateMember?.name}? They will be able to log in again.`
        }
        confirmLabel={deactivateMember?.status === "active" ? "Deactivate" : "Activate"}
        loading={pendingAction === "deactivate"}
      />

      {/* Remove confirmation — type name to confirm */}
      <Modal
        isOpen={Boolean(removeMember)}
        onClose={() => {
          if (!pendingAction) {
            setRemoveMember(null);
            setRemoveConfirmText("");
          }
        }}
        title="Remove Member"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            This permanently removes{" "}
            <span className="font-semibold text-slate-900">{removeMember?.name}</span> from
            your team. If they have historical records (jobs, audit logs), the account will
            be deactivated instead of deleted.
          </p>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Type <span className="font-semibold">{removeMember?.name}</span> to confirm
            </label>
            <input
              type="text"
              value={removeConfirmText}
              onChange={(e) => setRemoveConfirmText(e.target.value)}
              placeholder={removeMember?.name ?? ""}
              disabled={Boolean(pendingAction)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-red-400 focus:outline-none focus:ring-1 focus:ring-red-300 disabled:opacity-70"
            />
          </div>
          <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
            <button
              type="button"
              disabled={Boolean(pendingAction)}
              onClick={() => {
                setRemoveMember(null);
                setRemoveConfirmText("");
              }}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
            >
              Cancel
            </button>
            <SubmitButton
              type="button"
              loading={pendingAction === "remove"}
              loadingText="Removing..."
              disabled={removeConfirmText !== removeMember?.name}
              onClick={handleRemoveConfirm}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Remove Member
            </SubmitButton>
          </div>
        </div>
      </Modal>

      {revealPassword && (
        <PasswordRevealModal
          password={revealPassword}
          onClose={() => setRevealPassword(null)}
        />
      )}
    </>
  );
}

// ── Invitations Tab ─────────────────────────────────────────────────────────

type PendingInvitation = {
  id: string;
  email: string;
  role: string;
  createdAt: string;
  expiresAt: string;
};

function InvitationsTab() {
  const router = useRouter();
  const [invitations, setInvitations] = useState<PendingInvitation[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Invite form
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("AGENT");
  const [inviteError, setInviteError] = useState("");

  // Revoke confirm
  const [revokeId, setRevokeId] = useState<string | null>(null);

  useEffect(() => {
    listPendingInvitationsAction().then((res) => {
      if (res.success) {
        setInvitations(res.data as unknown as PendingInvitation[]);
      }
      setLoaded(true);
    });
  }, []);

  const handleInvite = () => {
    if (!inviteEmail.trim()) {
      setInviteError("Email is required.");
      return;
    }
    setInviteError("");
    startTransition(async () => {
      const result = await createInvitationAction({ email: inviteEmail.trim(), role: inviteRole });
      if (!result.success) {
        setInviteError(result.error ?? "Failed to send invitation");
        return;
      }
      toast.success("Invitation sent");
      setShowInviteForm(false);
      setInviteEmail("");
      setInviteRole("AGENT");
      // Refresh list
      const listRes = await listPendingInvitationsAction();
      if (listRes.success) {
        setInvitations(listRes.data as unknown as PendingInvitation[]);
      }
    });
  };

  const handleRevoke = (id: string) => {
    startTransition(async () => {
      const result = await revokeInvitationAction(id);
      if (!result.success) {
        toast.error(result.error ?? "Failed to revoke invitation");
        return;
      }
      toast.success("Invitation revoked");
      setRevokeId(null);
      setInvitations((prev) => prev.filter((inv) => inv.id !== id));
    });
  };

  return (
    <>
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h3 className="font-semibold text-slate-900">Pending Invitations</h3>
          <button
            type="button"
            onClick={() => setShowInviteForm(true)}
            className="rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700 transition-colors"
          >
            Invite Member
          </button>
        </div>

        {!loaded ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
          </div>
        ) : invitations.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-slate-500">
            No pending invitations.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/80">
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-slate-500">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-slate-500">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-slate-500">Sent</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-slate-500">Expires</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invitations.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-slate-900">{inv.email}</td>
                    <td className="px-6 py-4">
                      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600 capitalize">
                        {inv.role.toLowerCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">{formatDateTime(inv.createdAt)}</td>
                    <td className="px-6 py-4 text-sm text-slate-500">{formatDateTime(inv.expiresAt)}</td>
                    <td className="px-6 py-4 text-right">
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => setRevokeId(inv.id)}
                        className="text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
                      >
                        Revoke
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Invite modal */}
      <Modal
        isOpen={showInviteForm}
        onClose={() => {
          if (!isPending) {
            setShowInviteForm(false);
            setInviteEmail("");
            setInviteRole("AGENT");
            setInviteError("");
          }
        }}
        title="Invite Team Member"
        size="sm"
      >
        <div className="space-y-4">
          <FormField
            label="Email"
            name="invite-email"
            type="email"
            required
            value={inviteEmail}
            onChange={(e) => { setInviteEmail(e.target.value); setInviteError(""); }}
            placeholder="colleague@company.com"
          />
          <FormField
            as="select"
            label="Role"
            name="invite-role"
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value)}
            options={[
              { value: "ADMIN", label: "Admin" },
              { value: "MANAGER", label: "Manager" },
              { value: "AGENT", label: "Agent" },
              { value: "TECHNICIAN", label: "Technician" },
            ]}
          />
          {inviteError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {inviteError}
            </div>
          )}
          <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
            <button
              type="button"
              disabled={isPending}
              onClick={() => {
                setShowInviteForm(false);
                setInviteEmail("");
                setInviteRole("AGENT");
                setInviteError("");
              }}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
            >
              Cancel
            </button>
            <SubmitButton
              type="button"
              loading={isPending}
              loadingText="Sending..."
              onClick={handleInvite}
            >
              Send Invitation
            </SubmitButton>
          </div>
        </div>
      </Modal>

      {/* Revoke confirmation */}
      <ConfirmModal
        isOpen={Boolean(revokeId)}
        onClose={() => { if (!isPending) setRevokeId(null); }}
        onConfirm={() => { if (revokeId) handleRevoke(revokeId); }}
        title="Revoke Invitation"
        description="This will permanently revoke the invitation. The recipient will no longer be able to accept it."
        confirmLabel="Revoke"
        loading={isPending}
      />
    </>
  );
}

const BLANK_PLAN_FORM = {
  name: "",
  type: "amc" as "amc" | "warranty",
  description: "",
  price: 0,
  duration: 12,
  visitsCovered: 0,
  hsnSac: "",
  gstRatePercent: 18,
  gstApplicable: true,
  isActive: true,
};

type PlanFormState = typeof BLANK_PLAN_FORM;

function PlansTab({ plans }: { plans: SettingsData["plans"] }) {
  const router = useRouter();
  const [planModal, setPlanModal] = useState<{ open: boolean; plan: Plan | null }>({ open: false, plan: null });
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; plan: Plan | null }>({ open: false, plan: null });
  const [isPending, startTransition] = useTransition();

  const handleSave = (form: PlanFormState) => {
    startTransition(async () => {
      const result = planModal.plan
        ? await updatePlanAction({ id: planModal.plan.id, ...form })
        : await createPlanAction(form);
      if (!result.success) {
        toast.error(result.error ?? "Failed to save plan");
        return;
      }
      toast.success(planModal.plan ? "Plan updated" : "Plan created");
      setPlanModal({ open: false, plan: null });
      router.refresh();
    });
  };

  const handleDelete = () => {
    if (!deleteModal.plan) return;
    const planId = deleteModal.plan.id;
    startTransition(async () => {
      const result = await deletePlanAction(planId);
      if (!result.success) {
        toast.error(result.error ?? "Failed to delete plan");
        return;
      }
      toast.success("Plan deleted");
      setDeleteModal({ open: false, plan: null });
      router.refresh();
    });
  };

  return (
    <>
      <div>
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-slate-500">
            Manage your service plans and pricing
          </p>
          <button
            type="button"
            onClick={() => setPlanModal({ open: true, plan: null })}
            className="rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700 transition-colors"
          >
            Add Plan
          </button>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className="rounded-xl border border-slate-200 bg-white p-5 hover:shadow-md hover:border-slate-300 transition-all duration-200"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-semibold text-slate-900">{plan.name}</h4>
                  <span className="text-xs uppercase text-slate-500">
                    {plan.type}
                  </span>
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    plan.isActive
                      ? "bg-green-100 text-green-700"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {plan.isActive ? "Active" : "Inactive"}
                </span>
              </div>
              <p className="mt-2 text-sm text-slate-500">{plan.description}</p>
              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
                <div>
                  <p className="text-lg font-bold text-slate-900 tabular-nums">
                    {formatCurrency(plan.price)}
                  </p>
                  <p className="text-xs text-slate-500">
                    {plan.duration} months · {plan.visitsCovered} visits · GST {plan.gstRatePercent}%
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setPlanModal({ open: true, plan })}
                    className="text-sm text-brand-600 hover:text-brand-700 font-medium transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteModal({ open: true, plan })}
                    className="text-sm text-red-500 hover:text-red-600 font-medium transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <PlanFormModal
        isOpen={planModal.open}
        plan={planModal.plan}
        isPending={isPending}
        onClose={() => { if (!isPending) setPlanModal({ open: false, plan: null }); }}
        onSave={handleSave}
      />

      <ConfirmModal
        isOpen={deleteModal.open}
        onClose={() => { if (!isPending) setDeleteModal({ open: false, plan: null }); }}
        onConfirm={handleDelete}
        title="Delete Plan"
        description={`Delete "${deleteModal.plan?.name}"? Existing contracts will not be affected.`}
        confirmLabel="Delete Plan"
        loading={isPending}
      />
    </>
  );
}

function PlanFormModal({
  isOpen,
  plan,
  isPending,
  onClose,
  onSave,
}: {
  isOpen: boolean;
  plan: Plan | null;
  isPending: boolean;
  onClose: () => void;
  onSave: (form: PlanFormState) => void;
}) {
  const [form, setForm] = useState<PlanFormState>(BLANK_PLAN_FORM);

  useEffect(() => {
    if (isOpen) {
      setForm(
        plan
          ? {
              name: plan.name,
              type: plan.type,
              description: plan.description,
              price: plan.price,
              duration: plan.duration,
              visitsCovered: plan.visitsCovered,
              hsnSac: plan.hsnSac,
              gstRatePercent: plan.gstRatePercent,
              gstApplicable: plan.gstApplicable,
              isActive: plan.isActive,
            }
          : BLANK_PLAN_FORM,
      );
    }
  }, [isOpen, plan]);

  const update = <K extends keyof PlanFormState>(key: K, value: PlanFormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={plan ? "Edit Plan" : "Add Plan"}
      size="md"
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField
          label="Plan Name"
          name="name"
          required
          value={form.name}
          onChange={(e) => update("name", e.target.value)}
          containerClassName="sm:col-span-2"
        />
        <FormField
          as="select"
          label="Type"
          name="type"
          value={form.type}
          onChange={(e) => update("type", e.target.value as "amc" | "warranty")}
          options={[
            { value: "amc", label: "AMC" },
            { value: "warranty", label: "Warranty" },
          ]}
        />
        <FormField
          label="Price (INR)"
          name="price"
          type="number"
          required
          value={String(form.price)}
          onChange={(e) => update("price", parseFloat(e.target.value) || 0)}
        />
        <FormField
          label="Duration (months)"
          name="duration"
          type="number"
          required
          value={String(form.duration)}
          onChange={(e) => update("duration", parseInt(e.target.value, 10) || 1)}
        />
        <FormField
          label="Visits Covered"
          name="visitsCovered"
          type="number"
          required
          value={String(form.visitsCovered)}
          onChange={(e) => update("visitsCovered", parseInt(e.target.value, 10) || 0)}
        />
        <FormField
          label="HSN/SAC Code"
          name="hsnSac"
          required
          value={form.hsnSac}
          onChange={(e) => update("hsnSac", e.target.value)}
          description="Harmonized System / Service Accounting Code"
        />
        <FormField
          label="GST Rate (%)"
          name="gstRatePercent"
          type="number"
          required
          value={String(form.gstRatePercent)}
          onChange={(e) => update("gstRatePercent", parseFloat(e.target.value) || 0)}
        />
        <FormField
          as="textarea"
          label="Description"
          name="description"
          required
          rows={3}
          value={form.description}
          onChange={(e) => update("description", e.target.value)}
          containerClassName="sm:col-span-2"
        />
      </div>
      <div className="mt-4 flex items-center gap-5">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-slate-700">GST Applicable</span>
          <button
            type="button"
            onClick={() => update("gstApplicable", !form.gstApplicable)}
            className={`relative h-6 w-11 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:ring-offset-2 ${
              form.gstApplicable ? "bg-brand-600" : "bg-slate-200"
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                form.gstApplicable ? "translate-x-5" : ""
              }`}
            />
          </button>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-slate-700">Active</span>
          <button
            type="button"
            onClick={() => update("isActive", !form.isActive)}
            className={`relative h-6 w-11 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:ring-offset-2 ${
              form.isActive ? "bg-brand-600" : "bg-slate-200"
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                form.isActive ? "translate-x-5" : ""
              }`}
            />
          </button>
        </div>
      </div>
      <div className="mt-5 flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
        <button
          type="button"
          disabled={isPending}
          onClick={onClose}
          className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
        >
          Cancel
        </button>
        <SubmitButton
          type="button"
          loading={isPending}
          loadingText="Saving..."
          onClick={() => onSave(form)}
        >
          {plan ? "Save Changes" : "Create Plan"}
        </SubmitButton>
      </div>
    </Modal>
  );
}

function NotificationsTab({
  initialNotificationSettings,
}: {
  initialNotificationSettings: Record<string, unknown>;
}) {
  const saved = initialNotificationSettings;
  const [settings, setSettings] = useState({
    paymentReminders: (saved.paymentReminders as boolean) ?? true,
    overdueAlerts: (saved.overdueAlerts as boolean) ?? true,
    complaintUpdates: (saved.complaintUpdates as boolean) ?? true,
    contractExpiry: (saved.contractExpiry as boolean) ?? true,
    jobCompletion: (saved.jobCompletion as boolean) ?? true,
    smsEnabled: (saved.smsEnabled as boolean) ?? true,
    emailEnabled: (saved.emailEnabled as boolean) ?? true,
    whatsappEnabled: (saved.whatsappEnabled as boolean) ?? false,
  });
  const [isPending, startTransition] = useTransition();

  const toggle = (key: keyof typeof settings) =>
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));

  const handleSave = () => {
    startTransition(async () => {
      const result = await updateNotificationSettingsAction(settings);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Preferences saved");
    });
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h3 className="font-semibold text-slate-900 mb-5">
          Notification Events
        </h3>
        <div className="space-y-5">
          {[
            {
              key: "paymentReminders" as const,
              label: "Payment Reminders",
              desc: "Send reminders before invoice due date",
            },
            {
              key: "overdueAlerts" as const,
              label: "Overdue Alerts",
              desc: "Alert when invoices become overdue",
            },
            {
              key: "complaintUpdates" as const,
              label: "Complaint Updates",
              desc: "Notify on complaint status changes",
            },
            {
              key: "contractExpiry" as const,
              label: "Contract Expiry",
              desc: "Alert 30 days before contract expires",
            },
            {
              key: "jobCompletion" as const,
              label: "Job Completion",
              desc: "Notify when technician completes a job",
            },
          ].map((item) => (
            <div
              key={item.key}
              className="flex items-center justify-between"
            >
              <div>
                <p className="text-sm font-medium text-slate-900">
                  {item.label}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">{item.desc}</p>
              </div>
              <button
                onClick={() => toggle(item.key)}
                className={`relative h-6 w-11 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:ring-offset-2 ${
                  settings[item.key] ? "bg-brand-600" : "bg-slate-200"
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                    settings[item.key] ? "translate-x-5" : ""
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h3 className="font-semibold text-slate-900 mb-5">Channels</h3>
        <div className="space-y-5">
          {[
            {
              key: "smsEnabled" as const,
              label: "SMS",
              desc: "Send notifications via SMS",
            },
            {
              key: "emailEnabled" as const,
              label: "Email",
              desc: "Send notifications via email",
            },
            {
              key: "whatsappEnabled" as const,
              label: "WhatsApp",
              desc: "Send notifications via WhatsApp (coming soon)",
            },
          ].map((item) => (
            <div
              key={item.key}
              className="flex items-center justify-between"
            >
              <div>
                <p className="text-sm font-medium text-slate-900">
                  {item.label}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">{item.desc}</p>
              </div>
              <button
                onClick={() => toggle(item.key)}
                className={`relative h-6 w-11 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:ring-offset-2 ${
                  settings[item.key] ? "bg-brand-600" : "bg-slate-200"
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                    settings[item.key] ? "translate-x-5" : ""
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={isPending}
          className="rounded-lg bg-brand-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-brand-700 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:ring-offset-2 disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {isPending ? "Saving..." : "Save Preferences"}
        </button>
      </div>
    </div>
  );
}

function ComplianceSettingsTab({
  initialProfile,
}: {
  initialProfile: NonNullable<SettingsData["businessProfile"]> | null;
}) {
  const [form, setForm] = useState({
    grievanceOfficerName: initialProfile?.grievanceOfficerName ?? "",
    grievanceOfficerEmail: initialProfile?.grievanceOfficerEmail ?? "",
    grievanceOfficerPhone: initialProfile?.grievanceOfficerPhone ?? "",
  });
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    startTransition(async () => {
      if (!initialProfile) return;
      const result = await updateBusinessProfileAction({
        ...initialProfile,
        grievanceOfficerName: form.grievanceOfficerName,
        grievanceOfficerEmail: form.grievanceOfficerEmail,
        grievanceOfficerPhone: form.grievanceOfficerPhone,
      });

      if (result.success) {
        toast.success("Compliance settings saved");
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
        <p className="text-sm font-medium text-amber-800">
          These settings support DPDPA compliance. Verify all configurations with legal counsel.
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h3 className="mb-4 text-base font-semibold text-slate-900">
          Grievance Officer (DPDPA Section 13)
        </h3>
        <p className="mb-4 text-sm text-slate-500">
          Every Data Fiduciary must designate a grievance officer to address data principal concerns.
          This information is displayed on the customer portal.
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            label="Name"
            name="grievanceOfficerName"
            value={form.grievanceOfficerName}
            onChange={(e) => setForm((f) => ({ ...f, grievanceOfficerName: e.target.value }))}
            placeholder="Full name of grievance officer"
          />
          <FormField
            label="Email"
            name="grievanceOfficerEmail"
            type="email"
            value={form.grievanceOfficerEmail}
            onChange={(e) => setForm((f) => ({ ...f, grievanceOfficerEmail: e.target.value }))}
            placeholder="grievance@company.com"
          />
          <FormField
            label="Phone"
            name="grievanceOfficerPhone"
            type="tel"
            value={form.grievanceOfficerPhone}
            onChange={(e) => setForm((f) => ({ ...f, grievanceOfficerPhone: e.target.value }))}
            placeholder="+91 98765 43210"
          />
        </div>
        <div className="mt-4">
          <button
            onClick={handleSave}
            disabled={isPending}
            className="rounded-lg bg-brand-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-70"
          >
            {isPending ? "Saving..." : "Save Grievance Officer"}
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h3 className="mb-2 text-base font-semibold text-slate-900">
          Compliance Dashboard
        </h3>
        <p className="mb-4 text-sm text-slate-500">
          Manage consents, data subject rights requests, breach logs, and view cross-border data flows.
        </p>
        <Link
          href="/compliance"
          className="inline-block rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200"
        >
          Open Compliance Dashboard
        </Link>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h3 className="mb-2 text-base font-semibold text-slate-900">
          Data Residency
        </h3>
        <p className="text-sm text-slate-500">
          Database region is verified at startup via the <code className="text-xs bg-slate-100 px-1 py-0.5 rounded">EXPECTED_DB_REGION</code> environment
          variable. The application will refuse to start in production if the database host does not
          match the expected region.
        </p>
      </div>
    </div>
  );
}
