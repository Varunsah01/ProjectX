import { z } from "zod";

export const createPlanSchema = z.object({
  name: z.string().trim().min(1, "Plan name is required"),
  type: z.enum(["amc", "warranty"]),
  duration: z.number().int().min(1, "Duration must be at least 1 month"),
  price: z.number().min(0, "Price must be positive"),
  visitsCovered: z.number().int().min(0, "Visits must be positive"),
  description: z.string().trim().min(1, "Description is required"),
  isActive: z.boolean().default(true),
});

export const updatePlanSchema = createPlanSchema.partial().extend({
  id: z.string().uuid("Invalid plan id"),
});

export type CreatePlanInput = z.infer<typeof createPlanSchema>;
export type UpdatePlanInput = z.infer<typeof updatePlanSchema>;
