"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole, UserRole } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { buildAuditLog } from "@/lib/audit/log";
import { listPlansForOrganization } from "@/lib/queries/plans";
import { actionFailure, actionSuccess, getActionError } from "@/lib/query-utils";
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
    const user = await requireRole([UserRole.ADMIN, UserRole.MANAGER, UserRole.AGENT]);
    const params = listPlansSchema.parse(input);
    const data = await listPlansForOrganization(user.organizationId, params);
    return actionSuccess(data);
  } catch (error) {
    return actionFailure(getActionError(error, "Failed to load plans"));
  }
}

export async function createPlanAction(input: unknown) {
  try {
    const user = await requireRole([UserRole.ADMIN, UserRole.MANAGER]);
    const values = createPlanSchema.parse(input);

    const plan = await db.$transaction(async (tx) => {
      const created = await tx.plan.create({
        data: {
          organizationId: user.organizationId,
          name: values.name,
          type: values.type.toUpperCase() as never,
          durationMonths: values.duration,
          price: values.price,
          visitsCovered: values.visitsCovered,
          description: values.description,
          hsnSac: values.hsnSac,
          gstRatePercent: values.gstRatePercent,
          gstApplicable: values.gstApplicable,
          isActive: values.isActive,
        },
      });

      await tx.auditLog.create({
        data: buildAuditLog({
          actor: user,
          action: "CREATE",
          entity: "Plan",
          entityId: created.id,
          after: { name: created.name, type: created.type, price: created.price },
        }),
      });

      return created;
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
    const user = await requireRole([UserRole.ADMIN, UserRole.MANAGER]);
    const values = updatePlanSchema.parse(input);
    const existing = await db.plan.findFirst({
      where: { id: values.id, organizationId: user.organizationId },
    });

    if (!existing) {
      return actionFailure("Plan not found");
    }

    const updateData = {
      ...(values.name !== undefined ? { name: values.name } : {}),
      ...(values.type !== undefined ? { type: values.type.toUpperCase() as never } : {}),
      ...(values.duration !== undefined ? { durationMonths: values.duration } : {}),
      ...(values.price !== undefined ? { price: values.price } : {}),
      ...(values.visitsCovered !== undefined ? { visitsCovered: values.visitsCovered } : {}),
      ...(values.description !== undefined ? { description: values.description } : {}),
      ...(values.hsnSac !== undefined ? { hsnSac: values.hsnSac } : {}),
      ...(values.gstRatePercent !== undefined ? { gstRatePercent: values.gstRatePercent } : {}),
      ...(values.gstApplicable !== undefined ? { gstApplicable: values.gstApplicable } : {}),
      ...(values.isActive !== undefined ? { isActive: values.isActive } : {}),
    };

    await db.$transaction([
      db.plan.update({ where: { id: values.id }, data: updateData }),
      db.auditLog.create({
        data: buildAuditLog({
          actor: user,
          action: "UPDATE",
          entity: "Plan",
          entityId: values.id,
          before: { name: existing.name, type: existing.type, price: existing.price, isActive: existing.isActive },
          after: {
            name: values.name ?? existing.name,
            type: values.type !== undefined ? values.type.toUpperCase() : existing.type,
            price: values.price ?? existing.price,
            isActive: values.isActive ?? existing.isActive,
          },
        }),
      }),
    ]);

    revalidatePath("/settings");
    revalidatePath("/contracts/new");
    return actionSuccess({ id: values.id });
  } catch (error) {
    return actionFailure(getActionError(error, "Failed to update plan"));
  }
}

export async function deletePlanAction(id: string) {
  try {
    const user = await requireRole([UserRole.ADMIN, UserRole.MANAGER]);

    const existing = await db.plan.findFirst({
      where: { id, organizationId: user.organizationId },
    });

    if (!existing) {
      return actionFailure("Plan not found");
    }

    await db.$transaction([
      db.plan.deleteMany({ where: { id, organizationId: user.organizationId } }),
      db.auditLog.create({
        data: buildAuditLog({
          actor: user,
          action: "DELETE",
          entity: "Plan",
          entityId: id,
          before: { name: existing.name, type: existing.type, price: existing.price },
        }),
      }),
    ]);

    revalidatePath("/settings");
    revalidatePath("/contracts/new");
    return actionSuccess({ id });
  } catch (error) {
    return actionFailure(getActionError(error, "Failed to delete plan"));
  }
}
