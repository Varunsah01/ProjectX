"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { listPlansForOrganization } from "@/lib/queries/plans";
import { actionFailure, actionSuccess, getActionError, getOrganizationContext } from "@/lib/query-utils";
import { createPlanSchema, updatePlanSchema } from "@/lib/validations/plan";

const listPlansSchema = z.object({
  search: z.string().optional(),
  status: z.string().optional(),
  type: z.string().optional(),
  page: z.number().int().min(1).optional(),
  pageSize: z.number().int().min(1).max(100).optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
});

export async function listPlansAction(input: z.infer<typeof listPlansSchema> = {}) {
  try {
    const user = await getOrganizationContext();
    const params = listPlansSchema.parse(input);
    const data = await listPlansForOrganization(user.organizationId, params);
    return actionSuccess(data);
  } catch (error) {
    return actionFailure(getActionError(error, "Failed to load plans"));
  }
}

export async function createPlanAction(input: unknown) {
  try {
    const user = await getOrganizationContext();
    const values = createPlanSchema.parse(input);
    const plan = await db.plan.create({
      data: {
        organizationId: user.organizationId,
        name: values.name,
        type: values.type.toUpperCase() as never,
        durationMonths: values.duration,
        price: values.price,
        visitsCovered: values.visitsCovered,
        description: values.description,
        isActive: values.isActive,
      },
    });

    revalidatePath("/settings");
    revalidatePath("/contracts/new");
    return actionSuccess({ id: plan.id });
  } catch (error) {
    return actionFailure(getActionError(error, "Failed to create plan"));
  }
}

export async function updatePlanAction(input: unknown) {
  try {
    const user = await getOrganizationContext();
    const values = updatePlanSchema.parse(input);
    const existing = await db.plan.findFirst({
      where: { id: values.id, organizationId: user.organizationId },
    });

    if (!existing) {
      return actionFailure("Plan not found");
    }

    await db.plan.update({
      where: { id: values.id },
      data: {
        ...(values.name !== undefined ? { name: values.name } : {}),
        ...(values.type !== undefined ? { type: values.type.toUpperCase() as never } : {}),
        ...(values.duration !== undefined ? { durationMonths: values.duration } : {}),
        ...(values.price !== undefined ? { price: values.price } : {}),
        ...(values.visitsCovered !== undefined ? { visitsCovered: values.visitsCovered } : {}),
        ...(values.description !== undefined ? { description: values.description } : {}),
        ...(values.isActive !== undefined ? { isActive: values.isActive } : {}),
      },
    });

    revalidatePath("/settings");
    revalidatePath("/contracts/new");
    return actionSuccess({ id: values.id });
  } catch (error) {
    return actionFailure(getActionError(error, "Failed to update plan"));
  }
}

export async function deletePlanAction(id: string) {
  try {
    const user = await getOrganizationContext();
    const deleted = await db.plan.deleteMany({
      where: { id, organizationId: user.organizationId },
    });

    if (!deleted.count) {
      return actionFailure("Plan not found");
    }

    revalidatePath("/settings");
    revalidatePath("/contracts/new");
    return actionSuccess({ id });
  } catch (error) {
    return actionFailure(getActionError(error, "Failed to delete plan"));
  }
}
