"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Upload,
  Users,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { commitImportAction, listImportJobsAction } from "@/lib/actions/imports";
import { formatDate } from "@/lib/utils";
import type { ImportPreviewResult, ImportStats, ParsedImportRow } from "@/lib/import/types";

type ImportKind = "customers" | "assets";
type Step = "upload" | "preview" | "result";

interface ImportJob {
  id: string;
  kind: string;
  status: string;
  stats: ImportStats;
  originalFileName: string | null;
  createdAt: string;
  createdByName: string;
}

export default function ImportPageClient() {
  const [step, setStep] = useState<Step>("upload");
  const [kind, setKind] = useState<ImportKind>("customers");
  const [uploading, setUploading] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [preview, setPreview] = useState<ImportPreviewResult | null>(null);
  const [resultMessage, setResultMessage] = useState<{ success: boolean; text: string } | null>(null);
  const [history, setHistory] = useState<ImportJob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadHistory = useCallback(async () => {
    const res = await listImportJobsAction();
    if (res.success) {
      setHistory(res.data);
    }
  }, []);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  const handleFileSelect = async (selectedKind: ImportKind, file: File) => {
    setKind(selectedKind);
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`/api/imports/${selectedKind}/preview`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Upload failed");
        return;
      }

      setPreview(data as ImportPreviewResult);
      setStep("preview");
    } catch {
      toast.error("Failed to upload file");
    } finally {
      setUploading(false);
    }
  };

  const handleCommit = async () => {
    if (!preview) return;
    setCommitting(true);

    try {
      const res = await commitImportAction(preview.importJobId);

      if (res.success) {
        setResultMessage({
          success: true,
          text: `Successfully imported ${res.data.importedCount} ${kind}.`,
        });
      } else {
        setResultMessage({
          success: false,
          text: res.error,
        });
      }

      setStep("result");
      void loadHistory();
    } catch {
      toast.error("Import failed unexpectedly");
    } finally {
      setCommitting(false);
    }
  };

  const handleReset = () => {
    setStep("upload");
    setPreview(null);
    setResultMessage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const downloadErrorReport = () => {
    if (!preview) return;
    const errorRows = preview.rows.filter((r) => r.errors.length > 0);
    if (errorRows.length === 0) return;

    const lines = ["Row,Field,Error"];
    for (const row of errorRows) {
      for (const err of row.errors) {
        lines.push(`${row.rowNumber},"${err.field}","${err.message}"`);
      }
    }

    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `import_errors_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <PageHeader
        title="Import Data"
        subtitle="Bulk import customers or assets from CSV or XLSX files"
      />

      {/* Stepper */}
      <div className="mb-8 flex items-center gap-4">
        {(["upload", "preview", "result"] as Step[]).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            {i > 0 && <div className="h-px w-8 bg-slate-300" />}
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                step === s
                  ? "bg-blue-600 text-white"
                  : i < (["upload", "preview", "result"] as Step[]).indexOf(step)
                    ? "bg-green-100 text-green-700"
                    : "bg-slate-100 text-slate-400"
              }`}
            >
              {i + 1}
            </div>
            <span
              className={`text-sm font-medium capitalize ${
                step === s ? "text-slate-900" : "text-slate-400"
              }`}
            >
              {s}
            </span>
          </div>
        ))}
      </div>

      {/* Step 1: Upload */}
      {step === "upload" && (
        <div className="grid gap-6 sm:grid-cols-2">
          <UploadCard
            kind="customers"
            icon={<Users className="h-8 w-8 text-blue-600" />}
            title="Import Customers"
            description="Upload a CSV or XLSX file with customer data"
            uploading={uploading && kind === "customers"}
            onFileSelect={(file) => handleFileSelect("customers", file)}
            fileInputRef={kind === "customers" ? fileInputRef : undefined}
          />
          <UploadCard
            kind="assets"
            icon={<Wrench className="h-8 w-8 text-emerald-600" />}
            title="Import Assets"
            description="Upload a CSV or XLSX file with asset data"
            uploading={uploading && kind === "assets"}
            onFileSelect={(file) => handleFileSelect("assets", file)}
            fileInputRef={kind === "assets" ? fileInputRef : undefined}
          />
        </div>
      )}

      {/* Step 2: Preview */}
      {step === "preview" && preview && (
        <div>
          {/* Summary bar */}
          <div className="mb-6 flex flex-wrap items-center gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-slate-500" />
              <span className="text-sm font-medium text-slate-700">
                {preview.stats.totalRows} total rows
              </span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <span className="text-sm font-medium text-green-700">
                {preview.stats.validRows} valid
              </span>
            </div>
            {preview.stats.invalidRows > 0 && (
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-500" />
                <span className="text-sm font-medium text-red-700">
                  {preview.stats.invalidRows} errors
                </span>
              </div>
            )}
          </div>

          {/* Preview table */}
          <div className="mb-6 max-h-[500px] overflow-auto rounded-lg border border-slate-200">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-slate-50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-slate-600">Row</th>
                  <th className="px-3 py-2 text-left font-medium text-slate-600">Status</th>
                  <th className="px-3 py-2 text-left font-medium text-slate-600">Data</th>
                  <th className="px-3 py-2 text-left font-medium text-slate-600">Errors</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {preview.rows.map((row) => (
                  <PreviewRow key={row.rowNumber} row={row} />
                ))}
              </tbody>
            </table>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleReset}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Back
            </button>
            {preview.stats.invalidRows > 0 && (
              <button
                onClick={downloadErrorReport}
                className="flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                <Download className="h-4 w-4" />
                Download Error Report
              </button>
            )}
            {preview.stats.validRows > 0 && (
              <button
                onClick={handleCommit}
                disabled={committing}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {committing
                  ? "Importing..."
                  : `Import ${preview.stats.validRows} ${kind}`}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Step 3: Result */}
      {step === "result" && resultMessage && (
        <div className="max-w-lg">
          <div
            className={`mb-6 rounded-lg border p-6 ${
              resultMessage.success
                ? "border-green-200 bg-green-50"
                : "border-red-200 bg-red-50"
            }`}
          >
            <div className="flex items-start gap-3">
              {resultMessage.success ? (
                <CheckCircle2 className="mt-0.5 h-5 w-5 text-green-600" />
              ) : (
                <AlertCircle className="mt-0.5 h-5 w-5 text-red-600" />
              )}
              <div>
                <h3
                  className={`font-medium ${
                    resultMessage.success ? "text-green-900" : "text-red-900"
                  }`}
                >
                  {resultMessage.success ? "Import Complete" : "Import Failed"}
                </h3>
                <p
                  className={`mt-1 text-sm ${
                    resultMessage.success ? "text-green-700" : "text-red-700"
                  }`}
                >
                  {resultMessage.text}
                </p>
              </div>
            </div>
          </div>
          <button
            onClick={handleReset}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Import More
          </button>
        </div>
      )}

      {/* Import History */}
      <div className="mt-12">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">
          Import History
        </h2>
        {history.length === 0 ? (
          <p className="text-sm text-slate-500">No imports yet.</p>
        ) : (
          <div className="overflow-auto rounded-lg border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Date</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Type</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">File</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Valid</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Errors</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {history.map((job) => (
                  <tr key={job.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-700">
                      {formatDate(job.createdAt)}
                    </td>
                    <td className="px-4 py-3 capitalize text-slate-700">
                      {job.kind.toLowerCase()}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {job.originalFileName || "-"}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={job.status} />
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {job.stats.validRows}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {job.stats.invalidRows}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {job.createdByName}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function UploadCard({
  kind,
  icon,
  title,
  description,
  uploading,
  onFileSelect,
  fileInputRef,
}: {
  kind: ImportKind;
  icon: React.ReactNode;
  title: string;
  description: string;
  uploading: boolean;
  onFileSelect: (file: File) => void;
  fileInputRef?: React.MutableRefObject<HTMLInputElement | null>;
}) {
  const localRef = useRef<HTMLInputElement | null>(null);
  const inputRef = fileInputRef ?? localRef;

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6">
      <div className="mb-4 flex items-center gap-3">
        {icon}
        <div>
          <h3 className="font-semibold text-slate-900">{title}</h3>
          <p className="text-sm text-slate-500">{description}</p>
        </div>
      </div>

      <div className="relative mb-4 rounded-lg border-2 border-dashed border-slate-200 bg-slate-50 p-8 text-center">
        <Upload className="mx-auto mb-2 h-8 w-8 text-slate-400" />
        <p className="mb-1 text-sm font-medium text-slate-600">
          {uploading ? "Uploading..." : "Drop file here or click to browse"}
        </p>
        <p className="text-xs text-slate-400">CSV or XLSX, max 5 MB, max 5000 rows</p>
        <input
          ref={(el) => { inputRef.current = el; }}
          type="file"
          accept=".csv,.xlsx,.xls"
          disabled={uploading}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onFileSelect(file);
          }}
          style={{ position: "absolute", inset: 0, cursor: "pointer", opacity: 0 }}
        />
      </div>

      <a
        href={`/api/imports/templates?kind=${kind}`}
        download
        className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700"
      >
        <Download className="h-4 w-4" />
        Download template
      </a>
    </div>
  );
}

function PreviewRow({ row }: { row: ParsedImportRow }) {
  const hasErrors = row.errors.length > 0;
  const dataEntries = row.data
    ? Object.entries(row.data).filter(
        ([k]) => k !== "customerId",
      )
    : [];

  return (
    <tr className={hasErrors ? "bg-red-50" : ""}>
      <td className="px-3 py-2 text-slate-600">{row.rowNumber}</td>
      <td className="px-3 py-2">
        {hasErrors ? (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600">
            <AlertCircle className="h-3.5 w-3.5" />
            Error
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Valid
          </span>
        )}
      </td>
      <td className="max-w-md px-3 py-2">
        <div className="flex flex-wrap gap-1">
          {dataEntries.slice(0, 4).map(([key, val]) => (
            <span
              key={key}
              className="inline-block rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600"
            >
              {key}: {String(val || "-")}
            </span>
          ))}
          {dataEntries.length > 4 && (
            <span className="text-xs text-slate-400">
              +{dataEntries.length - 4} more
            </span>
          )}
        </div>
      </td>
      <td className="px-3 py-2">
        {hasErrors && (
          <div className="space-y-0.5">
            {row.errors.map((err, i) => (
              <p key={i} className="text-xs text-red-600">
                <span className="font-medium">{err.field}:</span> {err.message}
              </p>
            ))}
          </div>
        )}
      </td>
    </tr>
  );
}
