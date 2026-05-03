"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { Customer, Asset, Contract, Invoice, Ticket, Job } from "@prisma/client";
import { PageHeader } from "@/components/ui/PageHeader";
import { DataTable } from "@/components/ui/DataTable";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { restoreCustomerAction } from "@/lib/actions/customers";
import { restoreAssetAction } from "@/lib/actions/assets";
import { restoreContractAction } from "@/lib/actions/contracts";
import { restoreInvoiceAction } from "@/lib/actions/invoices";
import { restoreTicketAction } from "@/lib/actions/tickets";
import { restoreJobAction } from "@/lib/actions/jobs";

type TabKey = "customers" | "assets" | "contracts" | "invoices" | "tickets" | "jobs";

interface Props {
  customers: Customer[];
  assets: Asset[];
  contracts: Contract[];
  invoices: Invoice[];
  tickets: Ticket[];
  jobs: Job[];
}

function formatDate(date: Date | null | undefined) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function RecycleBinClient({
  customers,
  assets,
  contracts,
  invoices,
  tickets,
  jobs,
}: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabKey>("customers");
  const [restoreTarget, setRestoreTarget] = useState<{ id: string; label: string } | null>(null);
  const [restoring, setRestoring] = useState(false);

  const tabs: { key: TabKey; label: string; count: number }[] = [
    { key: "customers", label: "Customers", count: customers.length },
    { key: "assets", label: "Assets", count: assets.length },
    { key: "contracts", label: "Contracts", count: contracts.length },
    { key: "invoices", label: "Invoices", count: invoices.length },
    { key: "tickets", label: "Complaints", count: tickets.length },
    { key: "jobs", label: "Jobs", count: jobs.length },
  ];

  const restoreActionMap: Record<TabKey, (id: string) => Promise<{ success: boolean; error?: string }>> = {
    customers: restoreCustomerAction,
    assets: restoreAssetAction,
    contracts: restoreContractAction,
    invoices: restoreInvoiceAction,
    tickets: restoreTicketAction,
    jobs: restoreJobAction,
  };

  async function handleRestore() {
    if (!restoreTarget || restoring) return;
    setRestoring(true);
    try {
      const result = await restoreActionMap[activeTab](restoreTarget.id);
      if (!result.success) {
        toast.error(result.error ?? "Failed to restore");
        return;
      }
      toast.success(`${restoreTarget.label} restored`);
      router.refresh();
    } finally {
      setRestoring(false);
      setRestoreTarget(null);
    }
  }

  function RestoreButton({ id, label }: { id: string; label: string }) {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setRestoreTarget({ id, label });
        }}
        className="rounded-md border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700 hover:bg-brand-100 transition-colors"
      >
        Restore
      </button>
    );
  }

  const customerColumns = [
    { key: "name", header: "Name", render: (c: Customer) => <span className="font-medium text-slate-900">{c.name}</span> },
    { key: "phone", header: "Phone", render: (c: Customer) => c.phone },
    { key: "email", header: "Email", render: (c: Customer) => c.email },
    { key: "deleted", header: "Deleted At", render: (c: Customer) => formatDate(c.deletedAt) },
    { key: "actions", header: "", render: (c: Customer) => <RestoreButton id={c.id} label={c.name} /> },
  ];

  const assetColumns = [
    { key: "name", header: "Name", render: (a: Asset) => <span className="font-medium text-slate-900">{a.name}</span> },
    { key: "serial", header: "Serial #", render: (a: Asset) => a.serialNumber },
    { key: "model", header: "Model", render: (a: Asset) => a.model },
    { key: "deleted", header: "Deleted At", render: (a: Asset) => formatDate(a.deletedAt) },
    { key: "actions", header: "", render: (a: Asset) => <RestoreButton id={a.id} label={a.name} /> },
  ];

  const contractColumns = [
    { key: "number", header: "Contract #", render: (c: Contract) => <span className="font-medium text-slate-900">{c.contractNumber}</span> },
    { key: "type", header: "Type", render: (c: Contract) => c.type },
    { key: "status", header: "Status", render: (c: Contract) => c.status },
    { key: "deleted", header: "Deleted At", render: (c: Contract) => formatDate(c.deletedAt) },
    { key: "actions", header: "", render: (c: Contract) => <RestoreButton id={c.id} label={c.contractNumber} /> },
  ];

  const invoiceColumns = [
    { key: "number", header: "Invoice #", render: (i: Invoice) => <span className="font-medium text-slate-900">{i.invoiceNumber}</span> },
    { key: "amount", header: "Amount", render: (i: Invoice) => `Rs ${i.amount.toLocaleString("en-IN")}` },
    { key: "status", header: "Status", render: (i: Invoice) => i.status },
    { key: "deleted", header: "Deleted At", render: (i: Invoice) => formatDate(i.deletedAt) },
    { key: "actions", header: "", render: (i: Invoice) => <RestoreButton id={i.id} label={i.invoiceNumber} /> },
  ];

  const ticketColumns = [
    { key: "number", header: "Ticket #", render: (t: Ticket) => <span className="font-medium text-slate-900">{t.ticketNumber}</span> },
    { key: "subject", header: "Subject", render: (t: Ticket) => t.subject },
    { key: "status", header: "Status", render: (t: Ticket) => t.status },
    { key: "deleted", header: "Deleted At", render: (t: Ticket) => formatDate(t.deletedAt) },
    { key: "actions", header: "", render: (t: Ticket) => <RestoreButton id={t.id} label={t.ticketNumber} /> },
  ];

  const jobColumns = [
    { key: "number", header: "Job #", render: (j: Job) => <span className="font-medium text-slate-900">{j.jobNumber}</span> },
    { key: "type", header: "Type", render: (j: Job) => j.type },
    { key: "status", header: "Status", render: (j: Job) => j.status },
    { key: "deleted", header: "Deleted At", render: (j: Job) => formatDate(j.deletedAt) },
    { key: "actions", header: "", render: (j: Job) => <RestoreButton id={j.id} label={j.jobNumber} /> },
  ];

  const tableProps: Record<TabKey, { data: unknown[]; columns: unknown[] }> = {
    customers: { data: customers, columns: customerColumns },
    assets: { data: assets, columns: assetColumns },
    contracts: { data: contracts, columns: contractColumns },
    invoices: { data: invoices, columns: invoiceColumns },
    tickets: { data: tickets, columns: ticketColumns },
    jobs: { data: jobs, columns: jobColumns },
  };

  const active = tableProps[activeTab];

  return (
    <div>
      <PageHeader
        title="Recycle Bin"
        subtitle="Restore soft-deleted records within 90 days before permanent deletion."
        breadcrumbs={[{ label: "Recycle Bin" }]}
      />

      {/* Tabs */}
      <div className="mb-4 flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? "bg-brand-600 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            {tab.label}
            {tab.count > 0 && (
              <span
                className={`rounded-full px-1.5 py-0.5 text-xs font-semibold ${
                  activeTab === tab.key
                    ? "bg-white/20 text-white"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      <DataTable
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        columns={active.columns as any}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data={active.data as any}
        emptyMessage="Nothing in the recycle bin for this category."
      />

      <ConfirmModal
        isOpen={Boolean(restoreTarget)}
        onClose={() => setRestoreTarget(null)}
        onConfirm={handleRestore}
        title="Restore record"
        description={`Restore "${restoreTarget?.label}"? It will reappear in its original list.`}
        confirmLabel="Restore"
        loading={restoring}
      />
    </div>
  );
}
