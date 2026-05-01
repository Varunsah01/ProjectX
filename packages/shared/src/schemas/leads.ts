import { z } from "zod";

export const leadStatusSchema = z.enum([
  "NEW",
  "CONTACTED",
  "QUALIFIED",
  "CLOSED",
]);

export type LeadStatus = z.infer<typeof leadStatusSchema>;

export const leadCreateSchema = z.object({
  name: z.string().trim().min(2, "Name is required."),
  email: z.string().trim().email("Enter a valid email."),
  phone: z
    .string()
    .trim()
    .refine(
      (value) => value.replace(/\D/g, "").length >= 10,
      "Enter a valid phone number.",
    ),
  company: z.string().trim().min(1, "Company is required."),
  message: z
    .string()
    .trim()
    .max(4000, "Message is too long.")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  source: z.string().trim().min(1).max(64).default("book-demo"),
});

export type LeadCreateInput = z.infer<typeof leadCreateSchema>;

export const leadUpdateStatusSchema = z.object({
  status: leadStatusSchema,
});
