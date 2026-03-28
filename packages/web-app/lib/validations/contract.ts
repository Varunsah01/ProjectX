import { z } from "zod";

export const createContractSchema = z.object({
  customerId: z.string().uuid("Customer is required"),
  assetId: z.string().uuid("Asset is required"),
  planId: z.string().uuid("Plan is required"),
  type: z.enum(["amc", "warranty"]),
  billingCycle: z.enum(["monthly", "quarterly", "half_yearly", "yearly"]),
  startDate: z.string().trim().min(1, "Start date is required"),
  notes: z.string().trim().optional().or(z.literal("")),
});

export const updateContractSchema = createContractSchema.partial().extend({
  id: z.string().uuid("Invalid contract id"),
  status: z.enum(["active", "expired", "expiring_soon", "renewed", "cancelled"]).optional(),
  visitsUsed: z.number().int().min(0).optional(),
});

export type CreateContractInput = z.infer<typeof createContractSchema>;
export type UpdateContractInput = z.infer<typeof updateContractSchema>;
