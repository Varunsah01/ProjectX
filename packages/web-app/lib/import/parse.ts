import * as XLSX from "xlsx";

export const CUSTOMER_HEADER_ALIASES: Record<string, string> = {
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
  gstin: "gstin",
  gst: "gstin",
  "gst number": "gstin",
  "gst no": "gstin",
  category: "category",
  type: "category",
};

export const ASSET_HEADER_ALIASES: Record<string, string> = {
  "customer phone": "customerPhone",
  "customer mobile": "customerPhone",
  phone: "customerPhone",
  mobile: "customerPhone",
  "asset name": "name",
  name: "name",
  model: "model",
  "serial number": "serialNumber",
  serial: "serialNumber",
  "serial no": "serialNumber",
  category: "category",
  type: "category",
  "installation date": "installationDate",
  installed: "installationDate",
  "warranty end": "warrantyEnd",
  "warranty expiry": "warrantyEnd",
  warranty: "warrantyEnd",
  location: "location",
  notes: "notes",
  status: "status",
};

/**
 * Parses a CSV or XLSX buffer into an array of raw row objects.
 * Keys are the original header strings from the first row.
 */
export function parseImportFile(
  buffer: Buffer,
  fileName: string,
): Record<string, string>[] {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error("File contains no sheets");
  }

  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
    raw: false,
  });

  // Convert all values to strings
  return rows.map((row) => {
    const stringRow: Record<string, string> = {};
    for (const [key, val] of Object.entries(row)) {
      stringRow[key] = String(val ?? "").trim();
    }
    return stringRow;
  });
}

/**
 * Normalizes a raw row by applying header aliases to produce canonical field names.
 */
export function normalizeRow(
  raw: Record<string, string>,
  aliases: Record<string, string>,
): Record<string, string> {
  const normalized: Record<string, string> = {};
  for (const [key, val] of Object.entries(raw)) {
    const canonical = aliases[key.trim().toLowerCase()];
    if (canonical) {
      normalized[canonical] = val;
    }
  }
  return normalized;
}
