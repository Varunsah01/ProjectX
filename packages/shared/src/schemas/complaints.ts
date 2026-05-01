import { z } from "zod";

export const updateComplaintStatusSchema = z.object({
  status: z.enum(["in_progress", "on_hold", "resolved"]),
  note: z.string().trim().optional().or(z.literal("")),
});

export const createJobFromComplaintSchema = z.object({
  scheduledDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format."),
  notes: z.string().trim().optional().or(z.literal("")),
});
