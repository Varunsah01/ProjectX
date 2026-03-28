import { z } from "zod";

export const createCustomerSchema = z.object({
  name: z.string().trim().min(1, "Customer name is required"),
  phone: z.string().trim().min(1, "Phone is required"),
  email: z.string().trim().email("Invalid email").or(z.literal("")),
  address: z.string().trim().min(1, "Address is required"),
  city: z.string().trim().min(1, "City is required"),
  gst: z.string().trim().optional().or(z.literal("")),
  category: z.string().trim().min(1, "Category is required"),
  status: z.enum(["active", "inactive", "suspended"]).default("active"),
});

export const updateCustomerSchema = createCustomerSchema.partial().extend({
  id: z.string().uuid("Invalid customer id"),
});

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
