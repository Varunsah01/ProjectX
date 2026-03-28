import { z } from "zod";

export const invoiceItemSchema = z.object({
  id: z.string().uuid().optional(),
  description: z.string().trim().min(1, "Item description is required"),
  qty: z.number().int().min(1, "Qty must be at least 1"),
  rate: z.number().min(0, "Rate must be positive"),
  amount: z.number().min(0, "Amount must be positive"),
});

export const createInvoiceSchema = z.object({
  customerId: z.string().uuid("Customer is required"),
  contractId: z.string().uuid().optional().or(z.literal("")),
  dueDate: z.string().trim().min(1, "Due date is required"),
  type: z.enum(["recurring", "one_time", "service"]),
  items: z.array(invoiceItemSchema).min(1, "At least one line item is required"),
  notes: z.string().trim().optional().or(z.literal("")),
});

export const updateInvoiceSchema = createInvoiceSchema.partial().extend({
  id: z.string().uuid("Invalid invoice id"),
  status: z.enum(["draft", "issued", "paid", "overdue", "partial", "cancelled"]).optional(),
  paidAmount: z.number().min(0).optional(),
});

export const recordInvoicePaymentSchema = z.object({
  id: z.string().uuid("Invalid invoice id"),
  amount: z.number().min(0, "Payment amount must be positive").optional(),
});

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;
export type UpdateInvoiceInput = z.infer<typeof updateInvoiceSchema>;
