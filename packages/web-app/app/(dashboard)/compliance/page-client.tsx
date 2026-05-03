"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ShieldAlert, Download, FileText, Globe, AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Tabs } from "@/components/ui/Tabs";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  getComplianceDashboardAction,
  createBreachAction,
  createDsrAccessAction,
  createDsrErasureAction,
} from "@/lib/actions/compliance";
import { DATA_FLOWS } from "@/lib/compliance/data-flows";

type DashboardData = {
  consentStats: { total: number; granted: number; withdrawn: number };
  dsrRequests: Array<{
    id: string;
    dataPrincipalId: string;
    dataPrincipalType: string;
    type: string;
    status: string;
    createdAt: string;
    responseNotes?: string | null;
    processedBy?: { name: string } | null;
  }>;
  breaches: Array<{
    id: string;
    detectedAt: string;
    scope: string;
    affectedPrincipals: number;
    status: string;
    reportedToBoardAt?: string | null;
    reportedToPrincipalsAt?: string | null;
    createdBy?: { name: string } | null;
  }>;
};

export default function ComplianceDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const result = await getComplianceDashboardAction();
    if (result.success) {
      setData(result.data as unknown as DashboardData);
    } else {
      toast.error(result.error);
    }
    setLoading(false);
  }

  if (loading) {
    return (
      <div>
        <PageHeader title="Compliance" breadcrumbs={[{ label: "Compliance" }]} />
        <div className="flex h-64 items-center justify-center text-sm text-slate-500">
          Loading compliance data...
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Compliance" breadcrumbs={[{ label: "Compliance" }]} />

      <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-600" />
          <div>
            <p className="text-sm font-medium text-amber-800">
              Verify with counsel
            </p>
            <p className="mt-1 text-xs text-amber-700">
              This dashboard assists with DPDPA compliance tracking. It is not legal advice.
              Consult a qualified legal professional to ensure full compliance.
            </p>
          </div>
        </div>
      </div>

      <Tabs
        tabs={[
          {
            id: "consents",
            label: "Consents",
            content: data ? <ConsentsTab stats={data.consentStats} /> : null,
          },
          {
            id: "dsr",
            label: "Data Subject Requests",
            content: data ? <DsrTab requests={data.dsrRequests} onRefresh={loadData} /> : null,
          },
          {
            id: "breaches",
            label: "Breach Log",
            content: data ? <BreachesTab breaches={data.breaches} onRefresh={loadData} /> : null,
          },
          {
            id: "data-flows",
            label: "Data Flows",
            content: <DataFlowsTab />,
          },
        ]}
        defaultTab="consents"
      />
    </div>
  );
}

function ConsentsTab({ stats }: { stats: DashboardData["consentStats"] }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total Consent Records" value={stats.total} />
        <StatCard label="Granted" value={stats.granted} color="green" />
        <StatCard label="Withdrawn" value={stats.withdrawn} color="red" />
      </div>
      <p className="text-sm text-slate-500">
        Consent records are created when users sign up, customers are onboarded, or
        technicians register via the mobile app. View individual consent records in
        customer and user profiles.
      </p>
    </div>
  );
}

function DsrTab({
  requests,
  onRefresh,
}: {
  requests: DashboardData["dsrRequests"];
  onRefresh: () => void;
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">
        Data Subject Rights requests (access, correction, erasure) under DPDPA Section 11-14.
      </p>
      {requests.length === 0 ? (
        <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-slate-200 text-sm text-slate-500">
          No DSR requests yet
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Type</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Principal Type</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Status</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Created</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Processed By</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {requests.map((req) => (
                <tr key={req.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium">{req.type}</td>
                  <td className="px-4 py-3">{req.dataPrincipalType}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={req.status} />
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {new Date(req.createdAt).toLocaleDateString("en-IN")}
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {req.processedBy?.name ?? "-"}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/compliance/dsr/${req.id}`}
                      className="text-brand-600 hover:text-brand-700 text-sm font-medium"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function BreachesTab({
  breaches,
  onRefresh,
}: {
  breaches: DashboardData["breaches"];
  onRefresh: () => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [breachForm, setBreachForm] = useState({
    scope: "",
    affectedPrincipals: 0,
    notes: "",
  });

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    const result = await createBreachAction({
      detectedAt: new Date(),
      scope: breachForm.scope,
      affectedPrincipals: breachForm.affectedPrincipals,
      notes: breachForm.notes || undefined,
    });
    setCreating(false);

    if (result.success) {
      toast.success("Breach log created");
      setShowForm(false);
      setBreachForm({ scope: "", affectedPrincipals: 0, notes: "" });
      onRefresh();
    } else {
      toast.error(result.error);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          Record and track data breaches per DPDPA Section 8. Notify the Board within 72 hours.
        </p>
        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
        >
          {showForm ? "Cancel" : "Report Breach"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="rounded-lg border border-slate-200 bg-white p-4 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Scope / Description
            </label>
            <textarea
              required
              value={breachForm.scope}
              onChange={(e) => setBreachForm((f) => ({ ...f, scope: e.target.value }))}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              rows={3}
              placeholder="Describe the nature and scope of the breach"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Affected Data Principals (estimate)
            </label>
            <input
              type="number"
              required
              min={0}
              value={breachForm.affectedPrincipals}
              onChange={(e) => setBreachForm((f) => ({ ...f, affectedPrincipals: Number(e.target.value) }))}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Notes (optional)
            </label>
            <textarea
              value={breachForm.notes}
              onChange={(e) => setBreachForm((f) => ({ ...f, notes: e.target.value }))}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              rows={2}
            />
          </div>
          <button
            type="submit"
            disabled={creating}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:bg-red-400"
          >
            {creating ? "Creating..." : "Create Breach Log"}
          </button>
        </form>
      )}

      {breaches.length === 0 ? (
        <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-slate-200 text-sm text-slate-500">
          No breach logs recorded
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Detected</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Scope</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Affected</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Status</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Board</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Principals</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {breaches.map((b) => (
                <tr key={b.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-500">
                    {new Date(b.detectedAt).toLocaleDateString("en-IN")}
                  </td>
                  <td className="max-w-xs truncate px-4 py-3">{b.scope}</td>
                  <td className="px-4 py-3">{b.affectedPrincipals}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={b.status} />
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {b.reportedToBoardAt
                      ? new Date(b.reportedToBoardAt).toLocaleDateString("en-IN")
                      : "Not yet"}
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {b.reportedToPrincipalsAt
                      ? new Date(b.reportedToPrincipalsAt).toLocaleDateString("en-IN")
                      : "Not yet"}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/compliance/breaches/${b.id}`}
                      className="text-brand-600 hover:text-brand-700 text-sm font-medium"
                    >
                      Manage
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function DataFlowsTab() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">
        All external services that process personal data. Required for DPDPA cross-border transfer documentation.
      </p>
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Provider</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Purpose</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Data Categories</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Region</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Cross-border</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {DATA_FLOWS.map((flow) => (
              <tr key={flow.provider} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium">
                  {flow.dpaUrl ? (
                    <a href={flow.dpaUrl} target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline">
                      {flow.provider}
                    </a>
                  ) : (
                    flow.provider
                  )}
                </td>
                <td className="px-4 py-3">{flow.purpose}</td>
                <td className="max-w-xs px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {flow.dataCategories.map((cat) => (
                      <span key={cat} className="inline-block rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                        {cat}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-500">{flow.region}</td>
                <td className="px-4 py-3">
                  {flow.crossBorder ? (
                    <span className="inline-flex items-center gap-1 text-amber-600">
                      <Globe className="h-3.5 w-3.5" /> Yes
                    </span>
                  ) : (
                    <span className="text-green-600">No</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  color = "blue",
}: {
  label: string;
  value: number;
  color?: "blue" | "green" | "red";
}) {
  const colorMap = {
    blue: "bg-brand-50 text-brand-700",
    green: "bg-green-50 text-green-700",
    red: "bg-red-50 text-red-700",
  };

  return (
    <div className={`rounded-lg p-4 ${colorMap[color]}`}>
      <p className="text-2xl font-semibold">{value}</p>
      <p className="mt-1 text-sm opacity-80">{label}</p>
    </div>
  );
}
