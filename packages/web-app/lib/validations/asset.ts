import { z } from "zod";

export const createAssetSchema = z.object({
  customerId: z.string().uuid("Customer is required"),
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

export const updateAssetSchema = createAssetSchema.partial().extend({
  id: z.string().uuid("Invalid asset id"),
});

export type CreateAssetInput = z.infer<typeof createAssetSchema>;
export type UpdateAssetInput = z.infer<typeof updateAssetSchema>;
