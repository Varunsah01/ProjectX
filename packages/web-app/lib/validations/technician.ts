import { z } from "zod";

export const createTechnicianSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  email: z.string().trim().email("Invalid email"),
  phone: z.string().trim().default(""),
  territory: z.string().trim().default(""),
  specialization: z.string().trim().default(""),
  password: z.string().min(8, "Password must be at least 8 characters").optional(),
  status: z.enum(["available", "on_job", "en_route", "off_duty"]).default("available"),
});

export const updateTechnicianSchema = createTechnicianSchema.partial().extend({
  id: z.string().uuid("Invalid technician id"),
});

export type CreateTechnicianInput = z.infer<typeof createTechnicianSchema>;
export type UpdateTechnicianInput = z.infer<typeof updateTechnicianSchema>;
