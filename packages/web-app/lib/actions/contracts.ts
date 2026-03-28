"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  addBillingCycle,
  addMonthsPreservingDay,
  toPrismaBillingCycle,
} from "@/lib/billing";
import { db } from "@/lib/db";
import { cleanOptional, getNextNumber, parseDateInput } from "@/lib/actions/helpers";
import { getContractDetailForOrganization, listContractsForOrganization } from "@/lib/queries/contracts";
import { actionFailure, actionSuccess, getActionError, getOrganizationContext } from "@/lib/query-utils";
import { createContractSchema, updateContractSchema } from "@/lib/validations/contract";
import type { BillingCycle } from "@/lib/types";

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
    const user = await getOrganizationContext();
    const params = listContractsSchema.parse(input);
    const data = await listContractsForOrganization(user.organizationId, params);
    return actionSuccess(data);
  } catch (error) {
    return actionFailure(getActionError(error, "Failed to load contracts"));
  }
}

export async function createContractAction(input: unknown) {
  try {
    const user = await getOrganizationContext();
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
    const user = await getOrganizationContext();
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

export async function deleteContractAction(id: string) {
  try {
    const user = await getOrganizationContext();
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
