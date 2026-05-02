export interface ImportRowError {
  row: number;
  field: string;
  message: string;
}

export interface ParsedImportRow {
  rowNumber: number;
  data: Record<string, unknown> | null;
  errors: ImportRowError[];
}

export interface ImportStats {
  totalRows: number;
  validRows: number;
  invalidRows: number;
}

export interface ImportPreviewResult {
  importJobId: string;
  stats: ImportStats;
  rows: ParsedImportRow[];
}
