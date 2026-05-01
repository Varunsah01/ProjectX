import { z } from "zod";

export const updateJobStatusSchema = z.object({
  status: z.enum(["en_route", "arrived", "in_progress", "completed"]),
  comment: z.string().trim().optional().or(z.literal("")),
  serviceReport: z.string().trim().optional().or(z.literal("")),
});

export const failJobSchema = z.object({
  reason: z.string().trim().min(1, "Reason is required."),
});

export const updateJobNotesSchema = z.object({
  serviceReport: z.string().trim().optional().or(z.literal("")),
});

export const rescheduleJobSchema = z.object({
  scheduledDate: z.string().trim().min(1, "Scheduled date is required."),
  note: z.string().trim().optional().or(z.literal("")),
});

export const proofTypeSchema = z.enum([
  "before_photo",
  "after_photo",
  "installation_proof",
  "closure_proof",
]);

export const proofSourceSchema = z.enum(["camera", "gallery", "remote"]);

export const widthHeightSchema = z
  .string()
  .trim()
  .transform((value) => {
    if (!value) {
      return undefined;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
  });
