"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { notifyInvoiceCreated } from "@/lib/notifications";
import { cleanOptional, getNextNumber, parseDateInput } from "@/lib/actions/helpers";
import {
  getCollectionsDataForOrganization,
  getInvoiceDetailForOrganization,
  listInvoicesForOrganization,
} from "@/lib/queries/invoices";
import { actionFailure, actionSuccess, getActionError, getOrganizationContext } from "@/lib/query-utils";
import {
  createInvoiceSchema,
  recordInvoicePaymentSchema,
  updateInvoiceSchema,
} from "@/lib/validations/invoice";

const listInvoicesSchema = z.object({
  search: z.string().optional(),
  status: z.string().optional(),
  type: z.string().optional(),
  page: z.number().int().min(1).optional(),
  pageSize: z.number().int().min(1).max(100).optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
});

const listCollectionsSchema = z.object({
  search: z.string().optional(),
  bucket: z.string().optional(),
  page: z.number().int().min(1).optional(),
  pageSize: z.number().int().min(1).max(100).optional(),
});

export async function listInvoicesAction(input: z.infer<typeof listInvoicesSchema> = {}) {
  try {
    const user = await getOrganizationContext();
    const params = listInvoicesSchema.parse(input);
    const data = await listInvoicesForOrganization(user.organizationId, params);
    return actionSuccess(data);
  } catch (error) {
    return actionFailure(getActionError(error, "Failed to load invoices"));
  }
}

export async function listCollectionsAction(
  input: z.infer<typeof listCollectionsSchema> = {},
) {
  try {
    const user = await getOrganizationContext();
    const params = listCollectionsSchema.parse(input);
    const data = await getCollectionsDataForOrganization(user.organizationId, params);
    return actionSuccess(data);
  } catch (error) {
    return actionFailure(getActionError(error, "Failed to load collections"));
  }
}

export async function createInvoiceAction(input: unknown) {
  try {
    const user = await getOrganizationContext();
    const values = createInvoiceSchema.parse(input);
    const total = values.items.reduce((sum, item) => sum + item.qty * item.rate, 0);
    const invoice = await db.invoice.create({
      data: {
        organizationId: user.organizationId,
        invoiceNumber: await getNextNumber("INV", user.organizationId, "invoice"),
        customerId: values.customerId,
        contractId: values.contractId || null,
        amount: total,
        paidAmount: 0,
        dueDate: parseDateInput(values.dueDate),
        issuedDate: new Date(),
        status: "ISSUED",
        type: values.type.toUpperCase() as never,
        notes: cleanOptional(values.notes),
        items: {
          create: values.items.map((item) => ({
            organizationId: user.organizationId,
            description: item.description,
            qty: item.qty,
            rate: item.rate,
            amount: item.qty * item.rate,
          })),
        },
      },
    });

    const detail = await getInvoiceDetailForOrganization(user.organizationId, invoice.id);
    await notifyInvoiceCreated(invoice.id);
    revalidatePath("/invoices");
    revalidatePath(`/invoices/${invoice.id}`);
    revalidatePath("/");
    return actionSuccess(detail!);
  } catch (error) {
    return actionFailure(getActionError(error, "Failed to create invoice"));
  }
}

export async function updateInvoiceAction(input: unknown) {
  try {
    const user = await getOrganizationContext();
    const values = updateInvoiceSchema.parse(input);
    const existing = await db.invoice.findFirst({
      where: { id: values.id, organizationId: user.organizationId },
    });

    if (!existing) {
      return actionFailure("Invoice not found");
    }

    await db.invoice.update({
      where: { id: values.id },
      data: {
        ...(values.customerId ? { customerId: values.customerId } : {}),
        ...(values.contractId !== undefined ? { contractId: values.contractId || null } : {}),
        ...(values.dueDate !== undefined ? { dueDate: parseDateInput(values.dueDate) } : {}),
        ...(values.type !== undefined ? { type: values.type.toUpperCase() as never } : {}),
        ...(values.status !== undefined ? { status: values.status.toUpperCase() as never } : {}),
        ...(values.paidAmount !== undefined ? { paidAmount: values.paidAmount } : {}),
        ...(values.notes !== undefined ? { notes: cleanOptional(values.notes) } : {}),
      },
    });

    if (values.items) {
      await db.invoiceItem.deleteMany({ where: { invoiceId: values.id, organizationId: user.organizationId } });
      await db.invoiceItem.createMany({
        data: values.items.map((item) => ({
          organizationId: user.organizationId,
          invoiceId: values.id,
          description: item.description,
          qty: item.qty,
          rate: item.rate,
          amount: item.qty * item.rate,
        })),
      });
    }

    const detail = await getInvoiceDetailForOrganization(user.organizationId, values.id);
    revalidatePath("/invoices");
    revalidatePath(`/invoices/${values.id}`);
    revalidatePath("/");
    return actionSuccess(detail!);
  } catch (error) {
    return actionFailure(getActionError(error, "Failed to update invoice"));
  }
}

export async function recordInvoicePaymentAction(input: unknown) {
  try {
    const user = await getOrganizationContext();
    const values = recordInvoicePaymentSchema.parse(input);
    const existing = await db.invoice.findFirst({
      where: { id: values.id, organizationId: user.organizationId },
    });

    if (!existing) {
      return actionFailure("Invoice not found");
    }

    const remaining = Math.max(0, existing.amount - existing.paidAmount);
    const paidDelta = values.amount ?? remaining;
    const paidAmount = Math.min(existing.amount, existing.paidAmount + paidDelta);
    const status =
      paidAmount >= existing.amount ? "PAID" : paidAmount > 0 ? "PARTIAL" : existing.status;

    await db.invoice.update({
      where: { id: existing.id },
      data: {
        paidAmount,
        status,
      },
    });

    const detail = await getInvoiceDetailForOrganization(user.organizationId, existing.id);
    revalidatePath("/invoices");
    revalidatePath(`/invoices/${existing.id}`);
    revalidatePath("/");
    return actionSuccess(detail!);
  } catch (error) {
    return actionFailure(getActionError(error, "Failed to record payment"));
  }
}

export async function deleteInvoiceAction(id: string) {
  try {
    const user = await getOrganizationContext();
    const deleted = await db.invoice.deleteMany({
      where: { id, organizationId: user.organizationId },
    });

    if (!deleted.count) {
      return actionFailure("Invoice not found");
    }

    revalidatePath("/invoices");
    revalidatePath("/");
    return actionSuccess({ id });
  } catch (error) {
    return actionFailure(getActionError(error, "Failed to delete invoice"));
  }
}
