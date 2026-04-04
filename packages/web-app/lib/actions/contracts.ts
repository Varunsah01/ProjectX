"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole, UserRole } from "@/lib/auth-utils";
import {
  addBillingCycle,
  addMonthsPreservingDay,
  toPrismaBillingCycle,
} from "@/lib/billing";
import { db } from "@/lib/db";
import { cleanOptional, getNextNumber, parseDateInput } from "@/lib/actions/helpers";
import { getContractDetailForOrganization, listContractsForOrganization } from "@/lib/queries/contracts";
import { actionFailure, actionSuccess, getActionError } from "@/lib/query-utils";
import { createContractSchema, updateContractSchema } from "@/lib/validations/contract";
import type { BillingCycle } from "@/lib/types";

const generateRenewalQuoteSchema = z.object({
  id: z.string().uuid("Invalid contract id"),
  newStartDate: z.string().min(1, "Start date is required"),
  newEndDate: z.string().min(1, "End date is required"),
  price: z.number().min(1, "Price must be at least 1"),
  notes: z.string().optional(),
});

const listContractsSchema = z.object({
  search: z.string().optional(),
  status: z.string().optional(),
  type: z.string().optional(),
  page: z.number().int().min(1).optional(),
  pageSize: z.number().int().min(1).max(100).optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
});

export async function listContractsAction(input: z.infer<typeof listContractsSchema> = {}) {
  try {
    const user = await requireRole([UserRole.ADMIN, UserRole.MANAGER, UserRole.AGENT]);
    const params = listContractsSchema.parse(input);
    const data = await listContractsForOrganization(user.organizationId, params);
    return actionSuccess(data);
  } catch (error) {
    return actionFailure(getActionError(error, "Failed to load contracts"));
  }
}

export async function createContractAction(input: unknown) {
  try {
    const user = await requireRole([UserRole.ADMIN, UserRole.MANAGER, UserRole.AGENT]);
    const values = createContractSchema.parse(input);
    const [plan, asset, customer] = await Promise.all([
      db.plan.findFirst({ where: { id: values.planId, organizationId: user.organizationId } }),
      db.asset.findFirst({ where: { id: values.assetId, organizationId: user.organizationId } }),
      db.customer.findFirst({ where: { id: values.customerId, organizationId: user.organizationId } }),
    ]);

    if (!plan || !asset || !customer) {
      return actionFailure("Customer, asset, or plan not found");
    }

    const startDate = parseDateInput(values.startDate);
    const endDate = addMonthsPreservingDay(startDate, plan.durationMonths);
    endDate.setDate(endDate.getDate() - 1);
    const contract = await db.contract.create({
      data: {
        organizationId: user.organizationId,
        contractNumber: await getNextNumber(values.type === "amc" ? "AMC" : "WRN", user.organizationId, "contract"),
        customerId: customer.id,
        assetId: asset.id,
        planId: plan.id,
        type: values.type.toUpperCase() as never,
        billingCycle: toPrismaBillingCycle(values.billingCycle),
        startDate,
        endDate,
        nextBillingDate: startDate,
        lastBilledDate: null,
        status: "ACTIVE",
        value: plan.price,
        visitsCovered: plan.visitsCovered,
        visitsUsed: 0,
        nextServiceDate: asset.nextServiceDate ?? startDate,
        notes: cleanOptional(values.notes),
      },
    });

    await db.asset.update({
      where: { id: asset.id },
      data: {
        amcStatus: values.type === "amc" ? "Active AMC" : "Warranty",
      },
    });

    const detail = await getContractDetailForOrganization(user.organizationId, contract.id);
    revalidatePath("/contracts");
    revalidatePath(`/contracts/${contract.id}`);
    revalidatePath("/assets");
    return actionSuccess(detail!.contract);
  } catch (error) {
    return actionFailure(getActionError(error, "Failed to create contract"));
  }
}

export async function updateContractAction(input: unknown) {
  try {
    const user = await requireRole([UserRole.ADMIN, UserRole.MANAGER, UserRole.AGENT]);
    const values = updateContractSchema.parse(input);
    const existing = await db.contract.findFirst({
      where: { id: values.id, organizationId: user.organizationId },
      include: { plan: true },
    });

    if (!existing) {
      return actionFailure("Contract not found");
    }

    const startDate =
      values.startDate !== undefined ? parseDateInput(values.startDate) : existing.startDate;
    const billingCycle = (
      values.billingCycle ?? existing.billingCycle.toLowerCase()
    ) as BillingCycle;
    const nextBillingDate =
      values.billingCycle !== undefined || values.startDate !== undefined
        ? existing.lastBilledDate
          ? addBillingCycle(existing.lastBilledDate, billingCycle)
          : startDate
        : existing.nextBillingDate;

    await db.contract.update({
      where: { id: values.id },
      data: {
        ...(values.planId ? { planId: values.planId } : {}),
        ...(values.customerId ? { customerId: values.customerId } : {}),
        ...(values.assetId ? { assetId: values.assetId } : {}),
        ...(values.type !== undefined ? { type: values.type.toUpperCase() as never } : {}),
        ...(values.billingCycle !== undefined
          ? { billingCycle: toPrismaBillingCycle(values.billingCycle) }
          : {}),
        ...(values.startDate !== undefined ? { startDate } : {}),
        ...(values.status !== undefined ? { status: values.status.toUpperCase() as never } : {}),
        ...(values.notes !== undefined ? { notes: cleanOptional(values.notes) } : {}),
        ...(values.visitsUsed !== undefined ? { visitsUsed: values.visitsUsed } : {}),
        ...(values.billingCycle !== undefined || values.startDate !== undefined
          ? { nextBillingDate }
          : {}),
      },
    });

    const detail = await getContractDetailForOrganization(user.organizationId, values.id);
    revalidatePath("/contracts");
    revalidatePath(`/contracts/${values.id}`);
    return actionSuccess(detail!.contract);
  } catch (error) {
    return actionFailure(getActionError(error, "Failed to update contract"));
  }
}

export async function renewContractAction(input: { id: string; newEndDate: string }) {
  try {
    const user = await requireRole([UserRole.ADMIN, UserRole.MANAGER]);
    const existing = await db.contract.findFirst({
      where: { id: input.id, organizationId: user.organizationId },
    });

    if (!existing) return actionFailure("Contract not found");

    const newStartDate = new Date(existing.endDate);
    newStartDate.setDate(newStartDate.getDate() + 1);
    const newEndDate = parseDateInput(input.newEndDate);

    await db.contract.update({
      where: { id: existing.id },
      data: {
        startDate: newStartDate,
        endDate: newEndDate,
        status: "ACTIVE",
        visitsUsed: 0,
        nextBillingDate: newStartDate,
        lastBilledDate: null,
      },
    });

    const invoiceNumber = await getNextNumber("INV", user.organizationId, "invoice");
    const dueDate = new Date(newStartDate);
    dueDate.setDate(dueDate.getDate() + 7);

    await db.invoice.create({
      data: {
        organizationId: user.organizationId,
        invoiceNumber,
        customerId: existing.customerId,
        contractId: existing.id,
        amount: existing.value,
        paidAmount: 0,
        dueDate,
        issuedDate: new Date(),
        status: "ISSUED",
        type: "RECURRING",
        notes: `Renewal for contract ${existing.contractNumber}`,
        items: {
          create: [
            {
              organizationId: user.organizationId,
              description: `Contract renewal (${existing.contractNumber})`,
              qty: 1,
              rate: existing.value,
              amount: existing.value,
            },
          ],
        },
      },
    });

    const detail = await getContractDetailForOrganization(user.organizationId, existing.id);
    revalidatePath("/contracts");
    revalidatePath(`/contracts/${existing.id}`);
    revalidatePath("/invoices");
    revalidatePath("/");
    return actionSuccess(detail!.contract);
  } catch (error) {
    return actionFailure(getActionError(error, "Failed to renew contract"));
  }
}

export async function generateRenewalQuoteAction(input: unknown) {
  try {
    const user = await requireRole([UserRole.ADMIN, UserRole.MANAGER, UserRole.AGENT]);
    const values = generateRenewalQuoteSchema.parse(input);

    const contract = await db.contract.findFirst({
      where: { id: values.id, organizationId: user.organizationId },
      include: { plan: true, customer: true },
    });

    if (!contract) return actionFailure("Contract not found");

    const newStart = parseDateInput(values.newStartDate);
    const newEnd = parseDateInput(values.newEndDate);

    if (newEnd <= newStart) {
      return actionFailure("End date must be after start date");
    }

    const startLabel = newStart.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
    const endLabel = newEnd.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
    const planName = contract.plan?.name ?? "Service Plan";
    const lineItemDescription = `${planName} Renewal – ${startLabel} to ${endLabel}`;

    const invoiceNumber = await getNextNumber("INV", user.organizationId, "invoice");

    const invoice = await db.invoice.create({
      data: {
        organizationId: user.organizationId,
        invoiceNumber,
        customerId: contract.customerId,
        contractId: contract.id,
        amount: values.price,
        paidAmount: 0,
        dueDate: newStart,
        issuedDate: new Date(),
        status: "DRAFT",
        type: "RECURRING",
        notes: cleanOptional(values.notes),
        items: {
          create: [
            {
              organizationId: user.organizationId,
              description: lineItemDescription,
              qty: 1,
              rate: values.price,
              amount: values.price,
            },
          ],
        },
      },
    });

    // Notify all admins/managers in-app (no customer email — it's a draft quote)
    const internalUsers = await db.user.findMany({
      where: {
        organizationId: user.organizationId,
        role: { in: [UserRole.ADMIN, UserRole.MANAGER] },
      },
      select: { id: true },
    });

    if (internalUsers.length > 0) {
      await db.notification.createMany({
        data: internalUsers.map((u) => ({
          organizationId: user.organizationId,
          userId: u.id,
          type: "renewal_quote_generated",
          title: `Renewal quote generated for ${contract.contractNumber}`,
          message: `Draft invoice ${invoiceNumber} created for ${contract.customer.name}'s contract renewal.`,
          link: `/invoices/${invoice.id}`,
        })),
      });
    }

    revalidatePath("/invoices");
    revalidatePath(`/contracts/${contract.id}`);
    revalidatePath("/");

    return actionSuccess({ invoiceId: invoice.id, invoiceNumber: invoice.invoiceNumber });
  } catch (error) {
    return actionFailure(getActionError(error, "Failed to generate renewal quote"));
  }
}

export async function deleteContractAction(id: string) {
  try {
    const user = await requireRole([UserRole.ADMIN, UserRole.MANAGER]);
    const deleted = await db.contract.deleteMany({
      where: { id, organizationId: user.organizationId },
    });

    if (!deleted.count) {
      return actionFailure("Contract not found");
    }

    revalidatePath("/contracts");
    revalidatePath("/assets");
    return actionSuccess({ id });
  } catch (error) {
    return actionFailure(getActionError(error, "Failed to delete contract"));
  }
}
