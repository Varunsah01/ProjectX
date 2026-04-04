"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Building, Edit, FileText, Mail, MapPin, MessageCircle, MessageSquare, Phone, Power, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { FormField } from "@/components/ui/FormField";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { Tabs } from "@/components/ui/Tabs";
import { DataTable } from "@/components/ui/DataTable";
import { addCustomerNoteAction, deleteCustomerAction, updateCustomerAction } from "@/lib/actions/customers";
import { clearFormError, getFormErrors, type FormErrors } from "@/lib/form-errors";
import { updateCustomerSchema } from "@/lib/validations/customer";
import { formatCurrency, formatDate, getInitials } from "@/lib/utils";
import type { Asset, Contract, CustomerNote, Invoice, Ticket } from "@/lib/types";

type CustomerDetail = {
  customer: {
    id: string;
    name: string;
    phone: string;
    email: string;
    address: string;
    city: string;
    gst?: string;
    status: string;
    category: string;
    totalDue: number;
    totalPaid: number;
    createdAt: string;
  };
  assets: Asset[];
  invoices: Invoice[];
  tickets: Ticket[];
  contracts: Contract[];
  notes: CustomerNote[];
};

function getInitialFormState(detail: CustomerDetail["customer"]) {
  return {
    name: detail.name,
    phone: detail.phone,
    email: detail.email,
    address: detail.address,
    city: detail.city,
    gst: detail.gst ?? "",
    category: detail.category,
    status: detail.status as "active" | "inactive" | "suspended",
  };
}

export default function CustomerDetailPageClient({
  detail,
}: {
  detail: CustomerDetail | null;
}) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [form, setForm] = useState(
    detail ? getInitialFormState(detail.customer) : getInitialFormState({
      id: "",
      name: "",
      phone: "",
      email: "",
      address: "",
      city: "",
      gst: "",
      status: "active",
      category: "Residential",
      totalDue: 0,
      totalPaid: 0,
      createdAt: "",
    }),
  );

  useEffect(() => {
    if (!detail) {
      return;
    }

    setForm(getInitialFormState(detail.customer));
    setErrors({});
    setIsEditing(false);
  }, [detail]);

  if (!detail) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-lg text-slate-500">Customer not found</p>
        <button
          onClick={() => router.push("/customers")}
          className="mt-4 text-sm text-brand-600 hover:underline"
        >
          Back to customers
        </button>
      </div>
    );
  }

  const { customer, assets, invoices, tickets, contracts, notes } = detail;
  const isBusy = (key: string) => pendingAction === key;

  const updateField = (
    field: keyof typeof form,
    value: string,
  ) => {
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
    const parsed = updateCustomerSchema.safeParse({
      id: customer.id,
      ...form,
    });

    if (!parsed.success) {
      setErrors(getFormErrors(parsed.error));
      toast.error("Please fix the highlighted fields");
      return;
    }

    await runAction(
      "save",
      updateCustomerAction(parsed.data),
      "Customer updated",
      () => {
        setIsEditing(false);
        router.refresh();
      },
    );
  };

  const toggleStatus = async () => {
    const nextStatus =
      customer.status === "active" ? "suspended" : "active";

    await runAction(
      "status",
      updateCustomerAction({ id: customer.id, status: nextStatus }),
      nextStatus === "active" ? "Customer activated" : "Customer suspended",
      () => {
        router.refresh();
      },
    );
  };

  const handleDelete = async () => {
    await runAction(
      "delete",
      deleteCustomerAction(customer.id),
      "Customer deleted",
      () => {
        setIsDeleteOpen(false);
        router.push("/customers");
        router.refresh();
      },
    );
  };

  return (
    <div>
      <PageHeader
        title={customer.name}
        breadcrumbs={[
          { label: "Customers", href: "/customers" },
          { label: customer.name },
        ]}
        actions={
          <div className="flex items-center gap-2">
            {isEditing ? (
              <button
                type="button"
                disabled={Boolean(pendingAction)}
                onClick={() => {
                  setForm(getInitialFormState(customer));
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
                    : customer.status === "active"
                      ? "Suspend"
                      : "Activate"}
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

      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-2">
          {isEditing ? (
            <div>
              <div className="mb-6 flex items-start gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-100 text-xl font-bold text-brand-700">
                  {getInitials(form.name || customer.name)}
                </div>
                <div className="flex-1">
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <FormField
                      label="Customer / Business Name"
                      name="name"
                      required
                      value={form.name}
                      onChange={(e) => updateField("name", e.target.value)}
                      error={errors.name}
                      containerClassName="sm:col-span-2"
                    />
                    <FormField
                      label="Phone"
                      name="phone"
                      required
                      value={form.phone}
                      onChange={(e) => updateField("phone", e.target.value)}
                      error={errors.phone}
                    />
                    <FormField
                      label="Email"
                      name="email"
                      type="email"
                      value={form.email}
                      onChange={(e) => updateField("email", e.target.value)}
                      error={errors.email}
                    />
                    <FormField
                      label="Address"
                      name="address"
                      required
                      value={form.address}
                      onChange={(e) => updateField("address", e.target.value)}
                      error={errors.address}
                      containerClassName="sm:col-span-2"
                    />
                    <FormField
                      label="City"
                      name="city"
                      required
                      value={form.city}
                      onChange={(e) => updateField("city", e.target.value)}
                      error={errors.city}
                    />
                    <FormField
                      as="select"
                      label="Category"
                      name="category"
                      value={form.category}
                      onChange={(e) => updateField("category", e.target.value)}
                      error={errors.category}
                      options={[
                        { value: "Residential", label: "Residential" },
                        { value: "Commercial", label: "Commercial" },
                      ]}
                    />
                    <FormField
                      label="GST Number"
                      name="gst"
                      value={form.gst}
                      onChange={(e) => updateField("gst", e.target.value)}
                      error={errors.gst}
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
                        { value: "suspended", label: "Suspended" },
                      ]}
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
                        setForm(getInitialFormState(customer));
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
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-100 text-xl font-bold text-brand-700">
                {getInitials(customer.name)}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-semibold text-slate-900">
                    {customer.name}
                  </h2>
                  <StatusBadge status={customer.status} />
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                    {customer.category}
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-500">
                  Customer since {formatDate(customer.createdAt)} &middot; ID:{" "}
                  {customer.id}
                </p>
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Phone className="h-4 w-4 text-slate-400" />
                    {customer.phone}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Mail className="h-4 w-4 text-slate-400" />
                    {customer.email}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <MapPin className="h-4 w-4 text-slate-400" />
                    {customer.address}, {customer.city}
                  </div>
                  {customer.gst && (
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Building className="h-4 w-4 text-slate-400" />
                      GST: {customer.gst}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <h3 className="mb-4 font-semibold text-slate-900">
            Financial Summary
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">Total Billed</span>
              <span className="font-medium text-slate-900">
                {formatCurrency(customer.totalPaid + customer.totalDue)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">Total Paid</span>
              <span className="font-medium text-green-600">
                {formatCurrency(customer.totalPaid)}
              </span>
            </div>
            <div className="border-t border-slate-100 pt-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700">
                  Outstanding
                </span>
                <span
                  className={`text-lg font-bold ${customer.totalDue > 0 ? "text-red-600" : "text-green-600"}`}
                >
                  {formatCurrency(customer.totalDue)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Tabs
        tabs={[
          {
            id: "assets",
            label: "Assets",
            count: assets.length,
            content: (
              <DataTable<Asset>
                columns={[
                  {
                    key: "name",
                    header: "Asset",
                    render: (asset) => (
                      <div>
                        <p className="font-medium text-slate-900">{asset.name}</p>
                        <p className="text-xs text-slate-500">{asset.model}</p>
                      </div>
                    ),
                  },
                  {
                    key: "serial",
                    header: "Serial No.",
                    render: (asset) => asset.serialNumber,
                  },
                  {
                    key: "installed",
                    header: "Installed",
                    render: (asset) => formatDate(asset.installationDate),
                  },
                  {
                    key: "amc",
                    header: "Coverage",
                    render: (asset) => asset.amcStatus,
                  },
                  {
                    key: "nextService",
                    header: "Next Service",
                    render: (asset) => formatDate(asset.nextServiceDate),
                  },
                  {
                    key: "status",
                    header: "Status",
                    render: (asset) => <StatusBadge status={asset.status} />,
                  },
                ]}
                data={assets}
                onRowClick={(asset) => router.push(`/assets/${asset.id}`)}
              />
            ),
          },
          {
            id: "invoices",
            label: "Invoices",
            count: invoices.length,
            content: (
              <DataTable<Invoice>
                columns={[
                  {
                    key: "number",
                    header: "Invoice",
                    render: (invoice) => (
                      <span className="font-medium">{invoice.invoiceNumber}</span>
                    ),
                  },
                  {
                    key: "amount",
                    header: "Amount",
                    render: (invoice) => formatCurrency(invoice.amount),
                  },
                  {
                    key: "paid",
                    header: "Paid",
                    render: (invoice) => formatCurrency(invoice.paidAmount),
                  },
                  {
                    key: "due",
                    header: "Due Date",
                    render: (invoice) => formatDate(invoice.dueDate),
                  },
                  {
                    key: "status",
                    header: "Status",
                    render: (invoice) => <StatusBadge status={invoice.status} />,
                  },
                ]}
                data={invoices}
                onRowClick={(invoice) => router.push(`/invoices/${invoice.id}`)}
              />
            ),
          },
          {
            id: "complaints",
            label: "Complaints",
            count: tickets.length,
            content: (
              <DataTable<Ticket>
                columns={[
                  {
                    key: "ticket",
                    header: "Ticket",
                    render: (ticket) => (
                      <div>
                        <p className="font-medium text-slate-900">
                          {ticket.subject}
                        </p>
                        <p className="text-xs text-slate-500">
                          {ticket.ticketNumber}
                        </p>
                      </div>
                    ),
                  },
                  {
                    key: "priority",
                    header: "Priority",
                    render: (ticket) => <StatusBadge status={ticket.priority} />,
                  },
                  {
                    key: "status",
                    header: "Status",
                    render: (ticket) => <StatusBadge status={ticket.status} />,
                  },
                  {
                    key: "created",
                    header: "Created",
                    render: (ticket) => formatDate(ticket.createdAt),
                  },
                ]}
                data={tickets}
                onRowClick={(ticket) => router.push(`/complaints/${ticket.id}`)}
              />
            ),
          },
          {
            id: "contracts",
            label: "Contracts",
            count: contracts.length,
            content: (
              <DataTable<Contract>
                columns={[
                  {
                    key: "contract",
                    header: "Contract",
                    render: (contract) => (
                      <div>
                        <p className="font-medium text-slate-900">{contract.plan}</p>
                        <p className="text-xs text-slate-500">
                          {contract.contractNumber}
                        </p>
                      </div>
                    ),
                  },
                  {
                    key: "asset",
                    header: "Asset",
                    render: (contract) => contract.assetName,
                  },
                  {
                    key: "period",
                    header: "Period",
                    render: (contract) =>
                      `${formatDate(contract.startDate)} - ${formatDate(contract.endDate)}`,
                  },
                  {
                    key: "visits",
                    header: "Visits",
                    render: (contract) =>
                      `${contract.visitsUsed} / ${contract.visitsCovered}`,
                  },
                  {
                    key: "status",
                    header: "Status",
                    render: (contract) => <StatusBadge status={contract.status} />,
                  },
                ]}
                data={contracts}
                onRowClick={(contract) => router.push(`/contracts/${contract.id}`)}
              />
            ),
          },
          {
            id: "communication",
            label: "Communication",
            count: notes.length,
            content: (
              <CommunicationTab
                customerId={customer.id}
                notes={notes}
                onRefresh={() => router.refresh()}
              />
            ),
          },
        ]}
      />

      <ConfirmModal
        isOpen={isDeleteOpen}
        onClose={() => {
          if (!isBusy("delete")) {
            setIsDeleteOpen(false);
          }
        }}
        onConfirm={handleDelete}
        title="Delete Customer"
        description={`Delete ${customer.name} and all related records? This cannot be undone.`}
        confirmLabel="Delete Customer"
        loading={isBusy("delete")}
      />
    </div>
  );
}

// ─── Communication tab ───────────────────────────────────────────────────────

const NOTE_TYPES = [
  { value: "call", label: "Call", Icon: Phone, color: "bg-emerald-100 text-emerald-600" },
  { value: "meeting", label: "Meeting", Icon: Users, color: "bg-purple-100 text-purple-600" },
  { value: "email", label: "Email", Icon: Mail, color: "bg-blue-100 text-blue-600" },
  { value: "whatsapp", label: "WhatsApp", Icon: MessageCircle, color: "bg-teal-100 text-teal-600" },
  { value: "note", label: "Note", Icon: FileText, color: "bg-slate-100 text-slate-600" },
] as const;

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function NoteTypeBadge({ type }: { type: string }) {
  const meta = NOTE_TYPES.find((t) => t.value === type) ?? NOTE_TYPES[4];
  const { Icon, color, label } = meta;
  return (
    <div
      title={label}
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${color}`}
    >
      <Icon className="h-4 w-4" />
    </div>
  );
}

function CommunicationTab({
  customerId,
  notes,
  onRefresh,
}: {
  customerId: string;
  notes: CustomerNote[];
  onRefresh: () => void;
}) {
  const [text, setText] = useState("");
  const [type, setType] = useState("call");
  const [loading, setLoading] = useState(false);

  const handleLog = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;

    setLoading(true);
    const result = await addCustomerNoteAction({ customerId, type, note: trimmed });
    setLoading(false);

    if (!result.success) {
      toast.error(result.error ?? "Failed to log note");
      return;
    }

    setText("");
    onRefresh();
  };

  return (
    <div className="space-y-5">
      {/* Quick-add form */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <div className="mb-3 flex items-center gap-2">
          {NOTE_TYPES.map(({ value, label, Icon, color }) => (
            <button
              key={value}
              type="button"
              title={label}
              onClick={() => setType(value)}
              className={`flex h-9 w-9 items-center justify-center rounded-full border-2 transition-colors ${
                type === value
                  ? `${color} border-current`
                  : "border-transparent bg-white text-slate-400 hover:bg-slate-100"
              }`}
            >
              <Icon className="h-4 w-4" />
            </button>
          ))}
          <span className="ml-1 text-xs font-medium text-slate-500 capitalize">
            {NOTE_TYPES.find((t) => t.value === type)?.label}
          </span>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Add a note, call log, or message..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleLog();
              }
            }}
            disabled={loading}
            className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:opacity-70"
          />
          <button
            type="button"
            disabled={loading || !text.trim()}
            onClick={handleLog}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Logging..." : "Log"}
          </button>
        </div>
      </div>

      {/* Timeline */}
      {notes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <MessageSquare className="mb-3 h-8 w-8 text-slate-300" />
          <p className="text-sm font-medium text-slate-500">No communication logged yet</p>
          <p className="mt-1 text-xs text-slate-400">
            Log calls, meetings, emails, and notes above.
          </p>
        </div>
      ) : (
        <div className="relative">
          <div className="absolute left-4 top-5 bottom-0 w-px bg-slate-100" />
          <div className="space-y-4">
            {notes.map((note) => (
              <div key={note.id} className="flex gap-3">
                <div className="relative z-10">
                  <NoteTypeBadge type={note.type} />
                </div>
                <div className="flex-1 rounded-lg border border-slate-100 bg-white px-4 py-3">
                  <p className="text-sm text-slate-800">{note.note}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    {note.userName} &middot; {timeAgo(note.createdAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
