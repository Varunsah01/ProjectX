import { z } from "zod";

export const updateBusinessProfileSchema = z.object({
  businessName: z.string().trim().min(1, "Business name is required"),
  phone: z.string().trim().min(1, "Phone is required"),
  email: z.string().trim().email("Invalid email"),
  address: z.string().trim().min(1, "Address is required"),
  city: z.string().trim().min(1, "City is required"),
  state: z.string().trim().default(""),
  gst: z.string().trim().default(""),
  logo: z.string().trim().optional().or(z.literal("")),
});

export const createTeamMemberSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  email: z.string().trim().email("Invalid email"),
  role: z.enum(["admin", "manager", "agent", "technician"]),
  status: z.enum(["active", "inactive"]).default("active"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const updateTeamMemberSchema = createTeamMemberSchema.partial().extend({
  id: z.string().uuid("Invalid team member id"),
});

export type UpdateBusinessProfileInput = z.infer<typeof updateBusinessProfileSchema>;
