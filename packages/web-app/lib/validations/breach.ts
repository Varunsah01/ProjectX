import { z } from "zod";

export const createBreachSchema = z.object({
  detectedAt: z.coerce.date(),
  scope: z.string().trim().min(1, "Scope description is required"),
  affectedPrincipals: z.number().int().min(0, "Must be zero or positive"),
  notes: z.string().trim().optional(),
});

export const updateBreachSchema = z.object({
  status: z.enum(["DETECTED", "REPORTED", "CLOSED"]).optional(),
  reportedToBoardAt: z.coerce.date().optional(),
  reportedToPrincipalsAt: z.coerce.date().optional(),
  notes: z.string().trim().optional(),
  affectedPrincipals: z.number().int().min(0).optional(),
});

export type CreateBreachInput = z.infer<typeof createBreachSchema>;
export type UpdateBreachInput = z.infer<typeof updateBreachSchema>;
