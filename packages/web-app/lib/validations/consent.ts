import { z } from "zod";

const consentPurposeEnum = z.enum([
  "SERVICE_DELIVERY",
  "COMMUNICATION",
  "ANALYTICS",
  "MARKETING",
]);

export const grantWithdrawConsentSchema = z.object({
  purpose: consentPurposeEnum,
  action: z.enum(["grant", "withdraw"]),
});

export const recordConsentSchema = z.object({
  customerId: z.string().uuid("Invalid customer ID"),
  purposes: z.array(
    z.object({
      purpose: consentPurposeEnum,
      granted: z.boolean(),
    })
  ),
  legalBasis: z.string().trim().min(1, "Legal basis is required"),
  evidence: z.record(z.string(), z.unknown()).optional(),
});

export type GrantWithdrawConsentInput = z.infer<typeof grantWithdrawConsentSchema>;
export type RecordConsentInput = z.infer<typeof recordConsentSchema>;
