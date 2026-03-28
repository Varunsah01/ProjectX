"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { cleanOptional, parseDateInput } from "@/lib/actions/helpers";
import { getAssetDetailForOrganization, listAssetsForOrganization } from "@/lib/queries/assets";
import { actionFailure, actionSuccess, getActionError, getOrganizationContext } from "@/lib/query-utils";
import { createAssetSchema, updateAssetSchema } from "@/lib/validations/asset";

const listAssetsSchema = z.object({
  search: z.string().optional(),
  status: z.string().optional(),
  category: z.string().optional(),
  page: z.number().int().min(1).optional(),
  pageSize: z.number().int().min(1).max(100).optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
});

export async function listAssetsAction(input: z.infer<typeof listAssetsSchema> = {}) {
  try {
    const user = await getOrganizationContext();
    const params = listAssetsSchema.parse(input);
    const data = await listAssetsForOrganization(user.organizationId, params);
    return actionSuccess(data);
  } catch (error) {
    return actionFailure(getActionError(error, "Failed to load assets"));
  }
}

export async function createAssetAction(input: unknown) {
  try {
    const user = await getOrganizationContext();
    const values = createAssetSchema.parse(input);
    const asset = await db.asset.create({
      data: {
        organizationId: user.organizationId,
        customerId: values.customerId,
        name: values.name,
        model: values.model || "General",
        serialNumber: values.serialNumber || `AST-${Date.now()}`,
        category: values.category,
        installationDate: parseDateInput(values.installationDate),
        warrantyEnd: parseDateInput(values.warrantyEnd),
        status: values.status.toUpperCase() as never,
        location: cleanOptional(values.location),
        notes: cleanOptional(values.notes),
        amcStatus: "No Coverage",
        lastServiceDate: parseDateInput(values.installationDate),
        nextServiceDate: parseDateInput(values.installationDate),
      },
    });

    const detail = await getAssetDetailForOrganization(user.organizationId, asset.id);
    revalidatePath("/assets");
    revalidatePath(`/assets/${asset.id}`);
    revalidatePath("/customers");
    return actionSuccess(detail!.asset);
  } catch (error) {
    return actionFailure(getActionError(error, "Failed to create asset"));
  }
}

export async function updateAssetAction(input: unknown) {
  try {
    const user = await getOrganizationContext();
    const values = updateAssetSchema.parse(input);
    const existing = await db.asset.findFirst({
      where: { id: values.id, organizationId: user.organizationId },
    });

    if (!existing) {
      return actionFailure("Asset not found");
    }

    await db.asset.update({
      where: { id: values.id },
      data: {
        ...(values.customerId ? { customerId: values.customerId } : {}),
        ...(values.name !== undefined ? { name: values.name } : {}),
        ...(values.model !== undefined ? { model: values.model || "General" } : {}),
        ...(values.serialNumber !== undefined
          ? { serialNumber: values.serialNumber || existing.serialNumber }
          : {}),
        ...(values.category !== undefined ? { category: values.category } : {}),
        ...(values.installationDate !== undefined
          ? { installationDate: parseDateInput(values.installationDate) }
          : {}),
        ...(values.warrantyEnd !== undefined ? { warrantyEnd: parseDateInput(values.warrantyEnd) } : {}),
        ...(values.location !== undefined ? { location: cleanOptional(values.location) } : {}),
        ...(values.notes !== undefined ? { notes: cleanOptional(values.notes) } : {}),
        ...(values.status !== undefined ? { status: values.status.toUpperCase() as never } : {}),
      },
    });

    const detail = await getAssetDetailForOrganization(user.organizationId, values.id);
    revalidatePath("/assets");
    revalidatePath(`/assets/${values.id}`);
    return actionSuccess(detail!.asset);
  } catch (error) {
    return actionFailure(getActionError(error, "Failed to update asset"));
  }
}

export async function deleteAssetAction(id: string) {
  try {
    const user = await getOrganizationContext();
    const deleted = await db.asset.deleteMany({
      where: { id, organizationId: user.organizationId },
    });

    if (!deleted.count) {
      return actionFailure("Asset not found");
    }

    revalidatePath("/assets");
    revalidatePath("/customers");
    return actionSuccess({ id });
  } catch (error) {
    return actionFailure(getActionError(error, "Failed to delete asset"));
  }
}
