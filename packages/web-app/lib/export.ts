import * as XLSX from "xlsx";
import type { ActionResult } from "@/lib/types";

export interface ExportColumn<T> {
  header: string;
  value: (row: T) => string | number | boolean | null | undefined;
}

function normalizeFilename(filename: string, extension: string) {
  const trimmed = filename.trim() || "export";
  return trimmed.endsWith(`.${extension}`)
    ? trimmed
    : `${trimmed}.${extension}`;
}

function downloadTextFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = filename;
  anchor.click();

  URL.revokeObjectURL(url);
}

function toCellValue(value: string | number | boolean | null | undefined) {
  if (value == null) {
    return "";
  }

  return value;
}

function escapeCsvCell(value: string | number | boolean | null | undefined) {
  const normalized = String(toCellValue(value));

  if (/[",\n]/.test(normalized)) {
    return `"${normalized.replaceAll('"', '""')}"`;
  }

  return normalized;
}

export function exportToCSV<T>(
  data: T[],
  columns: ExportColumn<T>[],
  filename: string,
) {
  const rows = [
    columns.map((column) => escapeCsvCell(column.header)).join(","),
    ...data.map((row) =>
      columns
        .map((column) => escapeCsvCell(column.value(row)))
        .join(","),
    ),
  ];

  downloadTextFile(
    rows.join("\n"),
    normalizeFilename(filename, "csv"),
    "text/csv;charset=utf-8;",
  );
}

export function exportToExcel<T>(
  data: T[],
  columns: ExportColumn<T>[],
  filename: string,
) {
  const worksheet = XLSX.utils.aoa_to_sheet([
    columns.map((column) => column.header),
    ...data.map((row) => columns.map((column) => toCellValue(column.value(row)))),
  ]);
  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(workbook, worksheet, "Export");
  XLSX.writeFile(workbook, normalizeFilename(filename, "xlsx"));
}

export async function fetchAllExportRows<TRow, TPage>(
  fetchPage: (
    page: number,
    pageSize: number,
  ) => Promise<ActionResult<TPage>>,
  options: {
    getRows: (page: TPage) => TRow[];
    getTotalPages: (page: TPage) => number;
    pageSize?: number;
  },
) {
  const pageSize = options.pageSize ?? 100;
  const rows: TRow[] = [];
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages) {
    const result = await fetchPage(page, pageSize);

    if (!result.success) {
      throw new Error(result.error);
    }

    rows.push(...options.getRows(result.data));
    totalPages = Math.max(1, options.getTotalPages(result.data));
    page += 1;
  }

  return rows;
}
