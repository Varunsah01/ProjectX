import { z } from "zod";

const dataPrincipalTypeEnum = z.enum(["USER", "CUSTOMER"]);

export const dsrAccessSchema = z.object({
  dataPrincipalId: z.string().uuid("Invalid principal ID"),
  dataPrincipalType: dataPrincipalTypeEnum,
});

export const dsrCorrectionSchema = z.object({
  dataPrincipalId: z.string().uuid("Invalid principal ID"),
  dataPrincipalType: dataPrincipalTypeEnum,
  details: z.object({
    fieldsToCorrect: z.record(z.string(), z.string()).refine((obj) => Object.keys(obj).length > 0, {
      message: "At least one field correction is required",
    }),
    reason: z.string().trim().min(1, "Reason is required"),
  }),
});

export const dsrErasureSchema = z.object({
  dataPrincipalId: z.string().uuid("Invalid principal ID"),
  dataPrincipalType: dataPrincipalTypeEnum,
  reason: z.string().trim().min(1, "Reason is required"),
});

export const dsrProcessSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED", "COMPLETED"]),
  responseNotes: z.string().trim().optional(),
});

export type DsrAccessInput = z.infer<typeof dsrAccessSchema>;
export type DsrCorrectionInput = z.infer<typeof dsrCorrectionSchema>;
export type DsrErasureInput = z.infer<typeof dsrErasureSchema>;
export type DsrProcessInput = z.infer<typeof dsrProcessSchema>;
