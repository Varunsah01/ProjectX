import { z } from "zod";

export const createJobSchema = z.object({
  ticketId: z.string().uuid().optional().or(z.literal("")),
  customerId: z.string().uuid("Customer is required"),
  assetId: z.string().uuid().optional().or(z.literal("")),
  technicianId: z.string().uuid("Technician is required"),
  type: z.enum(["complaint", "scheduled", "installation", "inspection"]),
  status: z
    .enum(["pending", "assigned", "en_route", "in_progress", "completed", "cancelled"])
    .default("pending"),
  scheduledDate: z.string().trim().min(1, "Scheduled date is required"),
  notes: z.string().trim().optional().or(z.literal("")),
  serviceReport: z.string().trim().optional().or(z.literal("")),
});

export const updateJobSchema = createJobSchema.partial().extend({
  id: z.string().uuid("Invalid job id"),
  completedAt: z.string().trim().optional().or(z.literal("")),
});

export type CreateJobInput = z.infer<typeof createJobSchema>;
export type UpdateJobInput = z.infer<typeof updateJobSchema>;
