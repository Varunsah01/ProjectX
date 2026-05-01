"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole, UserRole } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { notifyInvoiceCreated } from "@/lib/notifications";
import { cleanOptional, getNextNumber, parseDateInput } from "@/lib/actions/helpers";
import {
  getCollectionsDataForOrganization,
  getInvoiceDetailForOrganization,
  listInvoicesForOrganization,
} from "@/lib/queries/invoices";
import { actionFailure, actionSuccess, getActionError } from "@/lib/query-utils";
import {
  createInvoiceSchema,
  recordInvoicePaymentSchema,
  updateInvoiceSchema,
} from "@/lib/validations/invoice";
import { recalculateInvoice } from "@/lib/tax/invoice-totals";

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
    const user = await requireRole([UserRole.ADMIN, UserRole.MANAGER, UserRole.AGENT]);
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
    const user = await requireRole([UserRole.ADMIN, UserRole.MANAGER, UserRole.AGENT]);
    const params = listCollectionsSchema.parse(input);
    const data = await getCollectionsDataForOrganization(user.organizationId, params);
    return actionSuccess(data);
  } catch (error) {
    return actionFailure(getActionError(error, "Failed to load collections"));
  }
}

export async function createInvoiceAction(input: unknown) {
  try {
    const user = await requireRole([UserRole.ADMIN, UserRole.MANAGER, UserRole.AGENT]);
    const values = createInvoiceSchema.parse(input);

    // Fetch org and customer for GST computation
    const [org, customer] = await Promise.all([
      db.organization.findUniqueOrThrow({
        where: { id: user.organizationId },
        select: { placeOfBusinessState: true },
      }),
      db.customer.findUniqueOrThrow({
        where: { id: values.customerId },
        select: { billingState: true },
      }),
    ]);

    const supplierState = org.placeOfBusinessState || "";
    const buyerState = customer.billingState || "";

    // Build line items with GST info
    const recalcItems = values.items.map((item) => ({
      qty: item.qty,
      rate: item.rate,
      hsnSac: item.hsnSac || "",
      gstRatePercent: item.gstRatePercent ?? 0,
    }));

    // Compute tax if both states are known
    const canComputeGst = supplierState.length === 2 && buyerState.length === 2;
    const result = canComputeGst
      ? recalculateInvoice({ items: recalcItems, supplierState, buyerState })
      : null;

    const subtotal = values.items.reduce((sum, item) => sum + item.qty * item.rate, 0);
    const total = result ? result.totalAmount : subtotal;
    const status = values.draft ? "DRAFT" : "ISSUED";

    const invoice = await db.invoice.create({
      data: {
        organizationId: user.organizationId,
        invoiceNumber: await getNextNumber("INV", user.organizationId, "invoice"),
        customerId: values.customerId,
        contractId: values.contractId || null,
        amount: total,
        paidAmount: 0,
        placeOfSupply: result?.placeOfSupply ?? null,
        isInterState: result?.isInterState ?? null,
        subtotalAmount: result?.subtotalAmount ?? subtotal,
        cgstAmount: result?.cgstAmount ?? null,
        sgstAmount: result?.sgstAmount ?? null,
        igstAmount: result?.igstAmount ?? null,
        totalTaxAmount: result?.totalTaxAmount ?? null,
        dueDate: parseDateInput(values.dueDate),
        issuedDate: new Date(),
        status,
        type: values.type.toUpperCase() as never,
        notes: cleanOptional(values.notes),
        items: {
          create: values.items.map((item, i) => {
            const lineResult = result?.items[i];
            return {
              organizationId: user.organizationId,
              description: item.description,
              qty: item.qty,
              rate: item.rate,
              amount: item.qty * item.rate,
              hsnSac: item.hsnSac || null,
              gstRatePercent: item.gstRatePercent ?? null,
              taxableAmount: lineResult?.taxableAmount ?? item.qty * item.rate,
              cgstAmount: lineResult?.cgstAmount ?? null,
              sgstAmount: lineResult?.sgstAmount ?? null,
              igstAmount: lineResult?.igstAmount ?? null,
            };
          }),
        },
      },
    });

    const detail = await getInvoiceDetailForOrganization(user.organizationId, invoice.id);
    if (!values.draft) {
      await notifyInvoiceCreated(invoice.id);
    }
    revalidatePath("/invoices");
    revalidatePath(`/invoices/${invoice.id}`);
    revalidatePath("/");
    return actionSuccess(detail!);
  } catch (error) {
    return actionFailure(getActionError(error, "Failed to create invoice"));
  }
}

export async function issueInvoiceAction(id: string) {
  try {
    const user = await requireRole([UserRole.ADMIN, UserRole.MANAGER, UserRole.AGENT]);
    const existing = await db.invoice.findFirst({
      where: { id, organizationId: user.organizationId },
    });

    if (!existing) {
      return actionFailure("Invoice not found");
    }

    if (existing.status !== "DRAFT") {
      return actionFailure("Only draft invoices can be issued");
    }

    await db.invoice.update({
      where: { id },
      data: { status: "ISSUED" },
    });

    await notifyInvoiceCreated(id);
    revalidatePath("/invoices");
    revalidatePath(`/invoices/${id}`);
    revalidatePath("/");
    const detail = await getInvoiceDetailForOrganization(user.organizationId, id);
    return actionSuccess(detail!);
  } catch (error) {
    return actionFailure(getActionError(error, "Failed to issue invoice"));
  }
}

export async function updateInvoiceAction(input: unknown) {
  try {
    const user = await requireRole([UserRole.ADMIN, UserRole.MANAGER, UserRole.AGENT]);
    const values = updateInvoiceSchema.parse(input);
    const existing = await db.invoice.findFirst({
      where: { id: values.id, organizationId: user.organizationId },
    });

    if (!existing) {
      return actionFailure("Invoice not found");
    }

    // If items are being updated, recalculate totals
    let taxUpdate: Record<string, unknown> = {};
    if (values.items) {
      const [org, customer] = await Promise.all([
        db.organization.findUniqueOrThrow({
          where: { id: user.organizationId },
          select: { placeOfBusinessState: true },
        }),
        db.customer.findUniqueOrThrow({
          where: { id: values.customerId || existing.customerId },
          select: { billingState: true },
        }),
      ]);

      const supplierState = org.placeOfBusinessState || "";
      const buyerState = customer.billingState || "";

      const recalcItems = values.items.map((item) => ({
        qty: item.qty,
        rate: item.rate,
        hsnSac: item.hsnSac || "",
        gstRatePercent: item.gstRatePercent ?? 0,
      }));

      const canComputeGst = supplierState.length === 2 && buyerState.length === 2;
      const result = canComputeGst
        ? recalculateInvoice({ items: recalcItems, supplierState, buyerState })
        : null;

      const subtotal = values.items.reduce((sum, item) => sum + item.qty * item.rate, 0);

      taxUpdate = {
        amount: result ? result.totalAmount : subtotal,
        placeOfSupply: result?.placeOfSupply ?? null,
        isInterState: result?.isInterState ?? null,
        subtotalAmount: result?.subtotalAmount ?? subtotal,
        cgstAmount: result?.cgstAmount ?? null,
        sgstAmount: result?.sgstAmount ?? null,
        igstAmount: result?.igstAmount ?? null,
        totalTaxAmount: result?.totalTaxAmount ?? null,
      };

      await db.invoiceItem.deleteMany({ where: { invoiceId: values.id, organizationId: user.organizationId } });
      await db.invoiceItem.createMany({
        data: values.items.map((item, i) => {
          const lineResult = result?.items[i];
          return {
            organizationId: user.organizationId,
            invoiceId: values.id,
            description: item.description,
            qty: item.qty,
            rate: item.rate,
            amount: item.qty * item.rate,
            hsnSac: item.hsnSac || null,
            gstRatePercent: item.gstRatePercent ?? null,
            taxableAmount: lineResult?.taxableAmount ?? item.qty * item.rate,
            cgstAmount: lineResult?.cgstAmount ?? null,
            sgstAmount: lineResult?.sgstAmount ?? null,
            igstAmount: lineResult?.igstAmount ?? null,
          };
        }),
      });
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
        ...taxUpdate,
      },
    });

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
    const user = await requireRole([UserRole.ADMIN, UserRole.MANAGER, UserRole.AGENT]);
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
    const user = await requireRole([UserRole.ADMIN, UserRole.MANAGER]);
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
