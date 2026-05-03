"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { updateBreachAction, sendBreachNotificationAction } from "@/lib/actions/compliance";

type BreachData = {
  id: string;
  detectedAt: string;
  scope: string;
  affectedPrincipals: number;
  status: string;
  reportedToBoardAt?: string | null;
  reportedToPrincipalsAt?: string | null;
  notes?: string | null;
  createdAt: string;
  createdBy?: { id: string; name: string } | null;
};

export default function BreachDetailClient({ breach }: { breach: BreachData }) {
  const router = useRouter();
  const [updating, setUpdating] = useState(false);
  const [notifying, setNotifying] = useState(false);

  async function handleStatusUpdate(status: "DETECTED" | "REPORTED" | "CLOSED") {
    setUpdating(true);
    const data: Record<string, unknown> = { status };
    if (status === "REPORTED") {
      data.reportedToBoardAt = new Date();
    }

    const result = await updateBreachAction(breach.id, data);
    if (result.success) {
      toast.success(`Status updated to ${status}`);
      router.refresh();
    } else {
      toast.error(result.error);
    }
    setUpdating(false);
  }

  async function handleNotify() {
    setNotifying(true);
    const result = await sendBreachNotificationAction(breach.id);
    if (result.success) {
      toast.success(`Notification sent to ${result.data.sentCount} principals`);
      router.refresh();
    } else {
      toast.error(result.error);
    }
    setNotifying(false);
  }

  return (
    <div>
      <PageHeader
        title="Breach Log Detail"
        breadcrumbs={[
          { label: "Compliance", href: "/compliance" },
          { label: "Breach Detail" },
        ]}
      />

      <div className="max-w-2xl space-y-6">
        <div className="rounded-lg border border-slate-200 bg-white p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-slate-500">Status</p>
              <StatusBadge status={breach.status} />
            </div>
            <div>
              <p className="text-slate-500">Detected</p>
              <p>{new Date(breach.detectedAt).toLocaleString("en-IN")}</p>
            </div>
            <div>
              <p className="text-slate-500">Affected Principals</p>
              <p className="font-medium">{breach.affectedPrincipals}</p>
            </div>
            <div>
              <p className="text-slate-500">Created By</p>
              <p>{breach.createdBy?.name ?? "-"}</p>
            </div>
            <div>
              <p className="text-slate-500">Reported to Board</p>
              <p>
                {breach.reportedToBoardAt
                  ? new Date(breach.reportedToBoardAt).toLocaleString("en-IN")
                  : "Not yet"}
              </p>
            </div>
            <div>
              <p className="text-slate-500">Principals Notified</p>
              <p>
                {breach.reportedToPrincipalsAt
                  ? new Date(breach.reportedToPrincipalsAt).toLocaleString("en-IN")
                  : "Not yet"}
              </p>
            </div>
          </div>

          <div>
            <p className="mb-1 text-xs font-medium text-slate-500">Scope</p>
            <p className="text-sm text-slate-700 whitespace-pre-wrap">{breach.scope}</p>
          </div>

          {breach.notes && (
            <div className="rounded-lg bg-slate-50 p-4">
              <p className="mb-1 text-xs font-medium text-slate-500">Notes</p>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{breach.notes}</p>
            </div>
          )}
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-6 space-y-4">
          <h3 className="text-sm font-medium text-slate-700">Actions</h3>
          <div className="flex flex-wrap gap-3">
            {breach.status === "DETECTED" && (
              <button
                onClick={() => handleStatusUpdate("REPORTED")}
                disabled={updating}
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:bg-brand-400"
              >
                Mark Reported to Board
              </button>
            )}
            {breach.status !== "CLOSED" && (
              <button
                onClick={() => handleStatusUpdate("CLOSED")}
                disabled={updating}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Close Breach
              </button>
            )}
            {!breach.reportedToPrincipalsAt && (
              <button
                onClick={handleNotify}
                disabled={notifying}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:bg-red-400"
              >
                {notifying ? "Sending..." : "Notify Affected Principals"}
              </button>
            )}
          </div>
          {!breach.reportedToPrincipalsAt && (
            <p className="text-xs text-amber-600">
              DPDPA requires notification to affected data principals within 72 hours of detection.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
