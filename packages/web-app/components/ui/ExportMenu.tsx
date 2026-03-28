"use client";

import { useRef, useState } from "react";
import { ChevronDown, Download, FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/cn";
import { exportToCSV, exportToExcel, type ExportColumn } from "@/lib/export";

interface ExportMenuProps<T> {
  columns: ExportColumn<T>[];
  filename: string;
  loadData: () => Promise<T[]>;
  className?: string;
}

export function ExportMenu<T>({
  columns,
  filename,
  loadData,
  className,
}: ExportMenuProps<T>) {
  const detailsRef = useRef<HTMLDetailsElement | null>(null);
  const [loadingFormat, setLoadingFormat] = useState<"csv" | "excel" | null>(null);

  const runExport = async (format: "csv" | "excel") => {
    if (loadingFormat) {
      return;
    }

    setLoadingFormat(format);

    try {
      const data = await loadData();

      if (!data.length) {
        toast.error("No records available for export");
        return;
      }

      if (format === "csv") {
        exportToCSV(data, columns, filename);
      } else {
        exportToExcel(data, columns, filename);
      }

      toast.success(
        `${format === "csv" ? "CSV" : "Excel"} export started for ${data.length} record${data.length === 1 ? "" : "s"}`,
      );
      detailsRef.current?.removeAttribute("open");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to export records",
      );
    } finally {
      setLoadingFormat(null);
    }
  };

  return (
    <details ref={detailsRef} className={cn("relative shrink-0", className)}>
      <summary className="flex cursor-pointer list-none items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50">
        {loadingFormat ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Download className="h-4 w-4" />
        )}
        Export
        <ChevronDown className="h-4 w-4 text-slate-400" />
      </summary>
      <div className="absolute right-0 z-20 mt-2 w-44 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
        <button
          type="button"
          disabled={Boolean(loadingFormat)}
          onClick={() => runExport("csv")}
          className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
        >
          <FileText className="h-4 w-4 text-slate-500" />
          Export CSV
        </button>
        <button
          type="button"
          disabled={Boolean(loadingFormat)}
          onClick={() => runExport("excel")}
          className="flex w-full items-center gap-2 border-t border-slate-100 px-4 py-3 text-left text-sm text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
        >
          <FileSpreadsheet className="h-4 w-4 text-slate-500" />
          Export Excel
        </button>
      </div>
    </details>
  );
}
