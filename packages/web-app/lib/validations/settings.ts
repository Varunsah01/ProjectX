import { z } from "zod";

const GSTIN_REGEX =
  /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

export const updateBusinessProfileSchema = z.object({
  businessName: z.string().trim().min(1, "Business name is required"),
  phone: z.string().trim().min(1, "Phone is required"),
  email: z.string().trim().email("Invalid email"),
  address: z.string().trim().min(1, "Address is required"),
  city: z.string().trim().min(1, "City is required"),
  gstin: z
    .string()
    .trim()
    .regex(GSTIN_REGEX, "Invalid GSTIN format (e.g. 29ABCDE1234F1Z5)")
    .optional()
    .or(z.literal("")),
  placeOfBusinessState: z
    .string()
    .trim()
    .length(2, "State code must be 2 digits")
    .optional()
    .or(z.literal("")),
  legalName: z.string().trim().optional().or(z.literal("")),
  logo: z.string().trim().optional().or(z.literal("")),
  signatureUrl: z.string().trim().optional().or(z.literal("")),
  pan: z
    .string()
    .trim()
    .regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/, "Invalid PAN format (e.g. ABCDE1234F)")
    .optional()
    .or(z.literal("")),
  bankName: z.string().trim().max(100).optional().or(z.literal("")),
  bankAccountNumber: z.string().trim().max(20).optional().or(z.literal("")),
  bankIfsc: z
    .string()
    .trim()
    .regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, "Invalid IFSC format (e.g. SBIN0001234)")
    .optional()
    .or(z.literal("")),
  bankBranch: z.string().trim().max(100).optional().or(z.literal("")),
  upiId: z.string().trim().max(100).optional().or(z.literal("")),
  invoiceTerms: z.string().trim().max(1000).optional().or(z.literal("")),
  grievanceOfficerName: z.string().trim().max(200).optional().or(z.literal("")),
  grievanceOfficerEmail: z.string().trim().email("Invalid email").optional().or(z.literal("")),
  grievanceOfficerPhone: z.string().trim().max(20).optional().or(z.literal("")),
  accountantEmail: z.string().trim().email("Invalid email").optional().or(z.literal("")),
  exportFormat: z.enum(["tally", "zoho"]).optional().or(z.literal("")),
});

export const createTeamMemberSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  email: z.string().trim().email("Invalid email"),
  role: z.enum(["admin", "manager", "agent", "technician"]),
  status: z.enum(["active", "inactive"]).default("active"),
  password: z.string().min(8, "Password must be at least 8 characters").optional(),
});

export const updateTeamMemberSchema = createTeamMemberSchema.partial().extend({
  id: z.string().uuid("Invalid team member id"),
});

export type UpdateBusinessProfileInput = z.infer<typeof updateBusinessProfileSchema>;
