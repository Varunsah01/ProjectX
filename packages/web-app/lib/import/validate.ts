import { z } from "zod";
import type { ImportRowError, ParsedImportRow } from "./types";
import { normalizeRow } from "./parse";

export const importCustomerRowSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  phone: z.string().trim().min(1, "Phone is required"),
  email: z.string().trim().email("Invalid email").or(z.literal("")).default(""),
  address: z.string().trim().default(""),
  city: z.string().trim().default(""),
  gstin: z.string().trim().optional().or(z.literal("")),
  category: z.enum(["Commercial", "Residential"]).default("Residential"),
});

export const importAssetRowSchema = z.object({
  customerPhone: z.string().trim().min(1, "Customer phone is required"),
  name: z.string().trim().min(1, "Asset name is required"),
  model: z.string().trim().default(""),
  serialNumber: z.string().trim().default(""),
  category: z.string().trim().min(1, "Category is required"),
  installationDate: z.string().trim().min(1, "Installation date is required"),
  warrantyEnd: z.string().trim().min(1, "Warranty end date is required"),
  location: z.string().trim().optional().or(z.literal("")),
  notes: z.string().trim().optional().or(z.literal("")),
  status: z.enum(["active", "inactive", "under_repair"]).default("active"),
});

export type ImportCustomerRow = z.infer<typeof importCustomerRowSchema>;
export type ImportAssetRow = z.infer<typeof importAssetRowSchema>;

/**
 * Validates an array of raw spreadsheet rows against a Zod schema.
 * Returns structured results with per-field errors for invalid rows.
 */
export function validateImportRows(
  rawRows: Record<string, string>[],
  schema: z.ZodSchema,
  aliases: Record<string, string>,
): ParsedImportRow[] {
  return rawRows.map((raw, index) => {
    const rowNumber = index + 2; // +2: 1-indexed + header row
    const normalized = normalizeRow(raw, aliases);
    const result = schema.safeParse(normalized);

    if (result.success) {
      return {
        rowNumber,
        data: result.data as Record<string, unknown>,
        errors: [],
      };
    }

    const errors: ImportRowError[] = result.error.issues.map((issue) => ({
      row: rowNumber,
      field: issue.path.join(".") || "unknown",
      message: issue.message,
    }));

    return {
      rowNumber,
      data: normalized,
      errors,
    };
  });
}
