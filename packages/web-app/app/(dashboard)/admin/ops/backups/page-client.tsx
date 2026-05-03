"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { DataTable } from "@/components/ui/DataTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { listBackupVerificationsAction } from "@/lib/actions/backup-verifications";
import { formatDateTime } from "@/lib/utils";
import type { BackupVerification } from "@prisma/client";

interface VerificationData {
  data: BackupVerification[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

function StatusBadge({ status }: { status: string }) {
  if (status === "OK") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700">
        <span className="h-1.5 w-1.5 rounded-full bg-green-600" />
        OK
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700">
      <span className="h-1.5 w-1.5 rounded-full bg-red-600" />
      FAIL
    </span>
  );
}

export default function BackupVerificationsPageClient({
  initialData,
}: {
  initialData: VerificationData;
}) {
  const [data, setData] = useState<VerificationData>(initialData);
  const [, startTransition] = useTransition();

  function handlePageChange(page: number) {
    startTransition(async () => {
      const result = await listBackupVerificationsAction({
        page,
        pageSize: data.pageSize,
      });
      if (result.success) {
        setData(result.data as VerificationData);
      } else {
        toast.error(result.error ?? "Failed to load verifications");
      }
    });
  }

  const columns = [
    {
      key: "status",
      header: "Status",
      className: "w-[90px]",
      render: (row: BackupVerification) => <StatusBadge status={row.status} />,
    },
    {
      key: "runAt",
      header: "Run At",
      className: "min-w-[160px]",
      render: (row: BackupVerification) =>
        formatDateTime(row.runAt.toISOString()),
    },
    {
      key: "durationMs",
      header: "Duration",
      className: "w-[110px]",
      render: (row: BackupVerification) => `${row.durationMs.toLocaleString()}ms`,
    },
    {
      key: "branchName",
      header: "Branch",
      className: "min-w-[180px]",
      render: (row: BackupVerification) => (
        <span className="font-mono text-xs text-slate-600">{row.branchName}</span>
      ),
    },
    {
      key: "error",
      header: "Error",
      className: "min-w-[200px]",
      render: (row: BackupVerification) =>
        row.error ? (
          <span className="text-xs text-red-600 line-clamp-1">{row.error}</span>
        ) : (
          <span className="text-xs text-slate-400">—</span>
        ),
    },
  ];

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Backup Verifications"
        subtitle="Weekly smoke-test results from Neon PITR branch restores"
        breadcrumbs={[
          { label: "Admin" },
          { label: "Backup Status" },
        ]}
      />

      <DataTable
        columns={columns}
        data={data.data}
        page={data.page}
        pageSize={data.pageSize}
        totalCount={data.total}
        totalPages={data.totalPages}
        onPageChange={handlePageChange}
        emptyMessage="No backup verifications recorded yet"
        renderExpandedRow={(row: BackupVerification) => (
          <div className="space-y-3 px-4 py-3 text-xs text-slate-700">
            <div>
              <span className="font-semibold text-slate-500 uppercase tracking-wide">Branch ID</span>
              <p className="mt-1 font-mono text-slate-800">{row.branchId}</p>
            </div>
            {row.error && (
              <div>
                <span className="font-semibold text-slate-500 uppercase tracking-wide">Error</span>
                <p className="mt-1 text-red-700 whitespace-pre-wrap">{row.error}</p>
              </div>
            )}
            <div>
              <span className="font-semibold text-slate-500 uppercase tracking-wide">Row Counts</span>
              <pre className="mt-1 rounded bg-slate-50 p-2 text-slate-700">
                {JSON.stringify(row.counts, null, 2)}
              </pre>
            </div>
          </div>
        )}
      />
    </div>
  );
}
