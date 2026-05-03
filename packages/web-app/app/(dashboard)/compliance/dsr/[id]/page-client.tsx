"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";

type DsrData = {
  id: string;
  dataPrincipalId: string;
  dataPrincipalType: string;
  type: string;
  status: string;
  details: Record<string, unknown>;
  responseNotes?: string | null;
  processedAt?: string | null;
  createdAt: string;
  processedBy?: { id: string; name: string } | null;
};

export default function DsrDetailClient({ dsr }: { dsr: DsrData }) {
  const router = useRouter();
  const [processing, setProcessing] = useState(false);
  const [notes, setNotes] = useState("");

  async function handleProcess(status: "APPROVED" | "REJECTED" | "COMPLETED") {
    setProcessing(true);
    const response = await fetch(`/api/dsr/${dsr.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, responseNotes: notes || undefined }),
    });

    if (response.ok) {
      toast.success(`DSR request ${status.toLowerCase()}`);
      router.refresh();
    } else {
      toast.error("Failed to process request");
    }
    setProcessing(false);
  }

  return (
    <div>
      <PageHeader
        title={`DSR Request: ${dsr.type}`}
        breadcrumbs={[
          { label: "Compliance", href: "/compliance" },
          { label: `DSR ${dsr.type}` },
        ]}
      />

      <div className="max-w-2xl space-y-6">
        <div className="rounded-lg border border-slate-200 bg-white p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-slate-500">Type</p>
              <p className="font-medium">{dsr.type}</p>
            </div>
            <div>
              <p className="text-slate-500">Status</p>
              <StatusBadge status={dsr.status} />
            </div>
            <div>
              <p className="text-slate-500">Principal Type</p>
              <p className="font-medium">{dsr.dataPrincipalType}</p>
            </div>
            <div>
              <p className="text-slate-500">Principal ID</p>
              <p className="font-mono text-xs">{dsr.dataPrincipalId}</p>
            </div>
            <div>
              <p className="text-slate-500">Created</p>
              <p>{new Date(dsr.createdAt).toLocaleString("en-IN")}</p>
            </div>
            {dsr.processedAt && (
              <div>
                <p className="text-slate-500">Processed</p>
                <p>{new Date(dsr.processedAt).toLocaleString("en-IN")}</p>
              </div>
            )}
            {dsr.processedBy && (
              <div>
                <p className="text-slate-500">Processed By</p>
                <p>{dsr.processedBy.name}</p>
              </div>
            )}
          </div>

          {dsr.responseNotes && (
            <div className="rounded-lg bg-slate-50 p-4">
              <p className="mb-1 text-xs font-medium text-slate-500">Response Notes</p>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{dsr.responseNotes}</p>
            </div>
          )}

          {dsr.details && Object.keys(dsr.details).length > 0 && (
            <div className="rounded-lg bg-slate-50 p-4">
              <p className="mb-1 text-xs font-medium text-slate-500">Request Details</p>
              <pre className="text-xs text-slate-600 overflow-x-auto">
                {JSON.stringify(dsr.details, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {dsr.status === "PENDING" && (
          <div className="rounded-lg border border-slate-200 bg-white p-6 space-y-4">
            <h3 className="text-sm font-medium text-slate-700">Process Request</h3>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Response Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                rows={3}
                placeholder="Add notes about this decision..."
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => handleProcess("APPROVED")}
                disabled={processing}
                className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:bg-green-400"
              >
                Approve
              </button>
              <button
                onClick={() => handleProcess("REJECTED")}
                disabled={processing}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:bg-red-400"
              >
                Reject
              </button>
              <button
                onClick={() => handleProcess("COMPLETED")}
                disabled={processing}
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:bg-brand-400"
              >
                Mark Completed
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
