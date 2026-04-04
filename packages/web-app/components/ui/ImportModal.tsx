"use client";

import { useRef, useState, useTransition } from "react";
import { AlertCircle, CheckCircle2, Download, Upload } from "lucide-react";
import { toast } from "sonner";
import { Modal } from "./Modal";
import { SubmitButton } from "./SubmitButton";
import { bulkImportCustomersAction } from "@/lib/actions/customers";

interface ImportRow {
  name: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  gst: string;
  category: string;
}

interface ParsedRow extends ImportRow {
  rowNumber: number;
  errors: string[];
}

interface ImportResult {
  imported: number;
  skipped: number;
  errors: string[];
}

// Header aliases — maps common column name variants to internal fields
const HEADER_ALIASES: Record<string, keyof ImportRow> = {
  name: "name",
  "customer name": "name",
  customer: "name",
  phone: "phone",
  mobile: "phone",
  "phone number": "phone",
  "mobile number": "phone",
  contact: "phone",
  email: "email",
  "email address": "email",
  address: "address",
  city: "city",
  gst: "gst",
  "gst number": "gst",
  "gst no": "gst",
  category: "category",
  type: "category",
};

const TEMPLATE_CSV = [
  "Name,Phone,Email,Address,City,GST,Category",
  "John Doe,9876543210,john@example.com,123 Main St,Mumbai,,Residential",
  "Acme Corp,9123456789,billing@acme.com,456 Park Ave,Delhi,29ABCDE1234F1Z5,Commercial",
].join("\r\n");

// ── Parsing helpers ────────────────────────────────────────────────────────────

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

function normalizeRawRow(raw: Record<string, string>): ImportRow {
  const row: ImportRow = {
    name: "",
    phone: "",
    email: "",
    address: "",
    city: "",
    gst: "",
    category: "",
  };
  for (const [key, val] of Object.entries(raw)) {
    const field = HEADER_ALIASES[key.trim().toLowerCase()];
    if (field) row[field] = String(val ?? "").trim();
  }
  // Normalise category
  if (row.category && !["Commercial", "Residential"].includes(row.category)) {
    row.category = "Residential";
  }
  if (!row.category) row.category = "Residential";
  return row;
}

function validateRow(row: ImportRow, rowNumber: number): ParsedRow {
  const errors: string[] = [];
  if (!row.name) errors.push("Name required");
  if (!row.phone) errors.push("Phone required");
  return { ...row, rowNumber, errors };
}

async function parseFile(file: File): Promise<ParsedRow[]> {
  if (file.size > 5 * 1024 * 1024) {
    throw new Error("File too large. Maximum size is 5 MB.");
  }

  const isXlsx =
    file.name.endsWith(".xlsx") || file.name.endsWith(".xls");

  if (isXlsx) {
    const XLSX = await import("xlsx");
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(new Uint8Array(buffer), { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const raw = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, {
      defval: "",
    });
    return raw.map((r, i) => validateRow(normalizeRawRow(r), i + 1));
  }

  // CSV
  const text = await file.text();
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const headers = parseCSVLine(lines[0]);
  return lines.slice(1).map((line, i) => {
    const values = parseCSVLine(line);
    const raw: Record<string, string> = Object.fromEntries(
      headers.map((h, j) => [h, values[j] ?? ""]),
    );
    return validateRow(normalizeRawRow(raw), i + 1);
  });
}

function downloadTemplate() {
  const blob = new Blob([TEMPLATE_CSV], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "customer-import-template.csv";
  a.click();
  URL.revokeObjectURL(url);
}

// ── Component ──────────────────────────────────────────────────────────────────

export function ImportModal({
  isOpen,
  onClose,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [step, setStep] = useState<"upload" | "preview">("upload");
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [isPending, startTransition] = useTransition();

  function reset() {
    setRows([]);
    setParseError(null);
    setStep("upload");
    setImportResult(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  function handleClose() {
    if (!isPending) {
      onClose();
      reset();
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setParseError(null);
    try {
      const parsed = await parseFile(file);
      if (parsed.length === 0) {
        setParseError("No data rows found in the file.");
        return;
      }
      setRows(parsed);
      setStep("preview");
    } catch (err) {
      setParseError(err instanceof Error ? err.message : "Failed to parse file.");
    }
  }

  function handleImport() {
    const validRows = rows.filter((r) => r.errors.length === 0);
    if (validRows.length === 0) return;

    startTransition(async () => {
      const result = await bulkImportCustomersAction(
        validRows.map((row) => ({
          name: row.name,
          phone: row.phone,
          email: row.email,
          address: row.address,
          city: row.city,
          gst: row.gst,
          category: row.category,
        })),
      );

      if (!result.success) {
        setParseError(result.error ?? "Import failed");
        return;
      }

      const data = result.data;
      setImportResult(data);
      toast.success(
        `${data.imported} customer${data.imported !== 1 ? "s" : ""} imported` +
          (data.skipped > 0 ? ` · ${data.skipped} skipped` : ""),
      );
      onSuccess();
    });
  }

  const validCount = rows.filter((r) => r.errors.length === 0).length;
  const errorCount = rows.filter((r) => r.errors.length > 0).length;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Import Customers" size="lg">
      {importResult ? (
        /* ── Done state ── */
        <div className="space-y-4">
          <div className="rounded-xl border border-green-200 bg-green-50 p-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <p className="font-medium text-green-800">Import complete</p>
            </div>
            <div className="mt-2 space-y-1 text-sm text-green-700">
              <p>
                <span className="font-semibold">{importResult.imported}</span> customer
                {importResult.imported !== 1 ? "s" : ""} imported
              </p>
              {importResult.skipped > 0 && (
                <p>
                  <span className="font-semibold">{importResult.skipped}</span> skipped
                  (phone already exists)
                </p>
              )}
            </div>
          </div>

          {importResult.errors.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
              <p className="text-xs font-semibold text-amber-800">Rows with errors (skipped):</p>
              <ul className="mt-1.5 list-disc space-y-0.5 pl-4 text-xs text-amber-700">
                {importResult.errors.slice(0, 8).map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
                {importResult.errors.length > 8 && (
                  <li>…and {importResult.errors.length - 8} more</li>
                )}
              </ul>
            </div>
          )}

          <div className="flex justify-end border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="rounded-lg bg-brand-600 px-5 py-2 text-sm font-medium text-white hover:bg-brand-700"
            >
              Done
            </button>
          </div>
        </div>
      ) : step === "upload" ? (
        /* ── Upload step ── */
        <div className="space-y-4">
          <p className="text-sm text-slate-500">
            Upload a <span className="font-medium">.csv</span> or{" "}
            <span className="font-medium">.xlsx</span> file. Required columns:{" "}
            <span className="font-medium">Name</span>,{" "}
            <span className="font-medium">Phone</span>. Optional: Email, Address, City, GST,
            Category.
          </p>

          <label
            htmlFor="import-file-input"
            className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 py-10 transition-colors hover:border-brand-300 hover:bg-brand-50"
          >
            <Upload className="mb-2 h-8 w-8 text-slate-400" />
            <span className="text-sm font-medium text-slate-700">Click to upload file</span>
            <span className="mt-1 text-xs text-slate-400">.csv or .xlsx · max 5 MB</span>
          </label>
          <input
            ref={fileRef}
            id="import-file-input"
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={handleFileChange}
            className="hidden"
          />

          {parseError && (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {parseError}
            </div>
          )}

          <div className="flex items-center justify-between border-t border-slate-100 pt-3">
            <button
              type="button"
              onClick={downloadTemplate}
              className="inline-flex items-center gap-1.5 text-sm text-brand-600 hover:underline"
            >
              <Download className="h-3.5 w-3.5" />
              Download CSV template
            </button>
            <button
              type="button"
              onClick={handleClose}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        /* ── Preview step ── */
        <div className="space-y-4">
          {/* Summary line */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-600">
              <span className="font-semibold text-slate-900">{rows.length}</span> rows ·{" "}
              <span className="font-semibold text-green-700">{validCount}</span> valid
              {errorCount > 0 && (
                <>
                  {" "}·{" "}
                  <span className="font-semibold text-red-600">{errorCount} with errors</span>
                </>
              )}
            </span>
            <button
              type="button"
              onClick={reset}
              className="text-sm text-brand-600 hover:underline"
            >
              Change file
            </button>
          </div>

          {/* Preview table — first 5 rows */}
          <div className="overflow-hidden rounded-lg border border-slate-200">
            <div className="border-b border-slate-100 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-500">
              Preview — first {Math.min(5, rows.length)} of {rows.length} rows
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/80 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    <th className="px-3 py-2">#</th>
                    <th className="px-3 py-2">Name</th>
                    <th className="px-3 py-2">Phone</th>
                    <th className="px-3 py-2">Email</th>
                    <th className="px-3 py-2">City</th>
                    <th className="px-3 py-2">Category</th>
                    <th className="px-3 py-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.slice(0, 5).map((row) => (
                    <tr
                      key={row.rowNumber}
                      className={row.errors.length > 0 ? "bg-red-50" : "hover:bg-slate-50"}
                    >
                      <td className="px-3 py-2 text-slate-400">{row.rowNumber}</td>
                      <td className="px-3 py-2 font-medium text-slate-900">
                        {row.name || <span className="italic text-red-400">missing</span>}
                      </td>
                      <td className="px-3 py-2 text-slate-700">
                        {row.phone || <span className="italic text-red-400">missing</span>}
                      </td>
                      <td className="px-3 py-2 text-slate-500">{row.email || "—"}</td>
                      <td className="px-3 py-2 text-slate-500">{row.city || "—"}</td>
                      <td className="px-3 py-2 text-slate-500">{row.category}</td>
                      <td className="px-3 py-2">
                        {row.errors.length > 0 ? (
                          <span
                            className="rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-700"
                            title={row.errors.join(", ")}
                          >
                            {row.errors.join(" · ")}
                          </span>
                        ) : (
                          <span className="rounded-full bg-green-100 px-1.5 py-0.5 text-[10px] font-medium text-green-700">
                            OK
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {rows.length > 5 && (
              <div className="border-t border-slate-100 px-3 py-1.5 text-xs text-slate-400">
                +{rows.length - 5} more rows not shown
              </div>
            )}
          </div>

          {/* Rows-with-errors warning */}
          {errorCount > 0 && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                {errorCount} row{errorCount !== 1 ? "s" : ""} will be skipped (missing required
                fields).{validCount > 0 ? ` ${validCount} valid row${validCount !== 1 ? "s" : ""} will be imported.` : ""}
              </span>
            </div>
          )}

          {parseError && (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {parseError}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
            <button
              type="button"
              disabled={isPending}
              onClick={reset}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-70"
            >
              Back
            </button>
            <SubmitButton
              type="button"
              loading={isPending}
              loadingText="Importing…"
              disabled={validCount === 0}
              onClick={handleImport}
            >
              Import {validCount} Customer{validCount !== 1 ? "s" : ""}
            </SubmitButton>
          </div>
        </div>
      )}
    </Modal>
  );
}
