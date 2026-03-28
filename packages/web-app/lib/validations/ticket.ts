import { z } from "zod";

export const createTicketSchema = z.object({
  customerId: z.string().uuid("Customer is required"),
  assetId: z.string().uuid().optional().or(z.literal("")),
  subject: z.string().trim().min(1, "Subject is required"),
  description: z.string().trim().min(1, "Description is required"),
  category: z.string().trim().min(1, "Category is required"),
  priority: z.enum(["low", "medium", "high", "critical"]).default("medium"),
  assignedToId: z.string().uuid().optional().or(z.literal("")),
});

export const updateTicketSchema = createTicketSchema.partial().extend({
  id: z.string().uuid("Invalid ticket id"),
  status: z
    .enum(["open", "assigned", "in_progress", "on_hold", "resolved", "closed", "reopened"])
    .optional(),
  resolvedAt: z.string().trim().optional().or(z.literal("")),
});

export const assignTicketSchema = z.object({
  id: z.string().uuid("Invalid ticket id"),
  assignedToId: z.string().uuid("Technician is required"),
});

export const resolveTicketSchema = z.object({
  id: z.string().uuid("Invalid ticket id"),
  note: z.string().trim().optional().or(z.literal("")),
});

export type CreateTicketInput = z.infer<typeof createTicketSchema>;
export type UpdateTicketInput = z.infer<typeof updateTicketSchema>;
