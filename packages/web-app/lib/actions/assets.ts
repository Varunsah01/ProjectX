"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole, UserRole } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { cleanOptional, getNextNumber, parseDateInput } from "@/lib/actions/helpers";
import { getAssetDetailForOrganization, listAssetsForOrganization } from "@/lib/queries/assets";
import { logAuditEvent } from "@/lib/security/audit";
import { actionFailure, actionSuccess, getActionError } from "@/lib/query-utils";
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
    const user = await requireRole([UserRole.ADMIN, UserRole.MANAGER, UserRole.AGENT]);
    const params = listAssetsSchema.parse(input);
    const data = await listAssetsForOrganization(user.organizationId, params);
    return actionSuccess(data);
  } catch (error) {
    return actionFailure(getActionError(error, "Failed to load assets"));
  }
}

export async function createAssetAction(input: unknown) {
  try {
    const user = await requireRole([UserRole.ADMIN, UserRole.MANAGER, UserRole.AGENT]);
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
    const user = await requireRole([UserRole.ADMIN, UserRole.MANAGER, UserRole.AGENT]);
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

const SERVICE_TYPE_LABELS: Record<string, string> = {
  preventive_maintenance: "Preventive Maintenance",
  repair: "Repair",
  inspection: "Inspection",
  part_replacement: "Part Replacement",
};

const logAssetServiceSchema = z.object({
  assetId: z.string().min(1),
  serviceDate: z.string().min(1, "Service date is required"),
  serviceType: z.enum(["preventive_maintenance", "repair", "inspection", "part_replacement"]),
  technicianId: z.string().min(1, "Technician is required"),
  notes: z.string().optional(),
  nextServiceDate: z.string().optional(),
});

export async function logAssetServiceAction(input: unknown) {
  try {
    const user = await requireRole([UserRole.ADMIN, UserRole.MANAGER, UserRole.AGENT]);
    const values = logAssetServiceSchema.parse(input);

    const asset = await db.asset.findFirst({
      where: { id: values.assetId, organizationId: user.organizationId },
    });

    if (!asset) {
      return actionFailure("Asset not found");
    }

    const serviceDate = parseDateInput(values.serviceDate);
    const nextServiceDate = values.nextServiceDate ? parseDateInput(values.nextServiceDate) : null;
    const jobType = values.serviceType === "inspection" ? "INSPECTION" : "SCHEDULED";
    const serviceTypeLabel = SERVICE_TYPE_LABELS[values.serviceType];

    const job = await db.job.create({
      data: {
        organizationId: user.organizationId,
        jobNumber: await getNextNumber("JOB", user.organizationId, "job"),
        customerId: asset.customerId,
        assetId: values.assetId,
        technicianId: values.technicianId,
        type: jobType as never,
        status: "COMPLETED",
        scheduledDate: serviceDate,
        completedAt: serviceDate,
        serviceReport: serviceTypeLabel,
        notes: cleanOptional(values.notes),
      },
    });

    await db.asset.update({
      where: { id: values.assetId },
      data: {
        lastServiceDate: serviceDate,
        ...(nextServiceDate ? { nextServiceDate } : {}),
      },
    });

    await logAuditEvent({
      organizationId: user.organizationId,
      userId: user.id,
      action: "UPDATE",
      entity: "Asset",
      entityId: values.assetId,
      before: {
        lastServiceDate: asset.lastServiceDate,
        nextServiceDate: asset.nextServiceDate,
      },
      after: {
        lastServiceDate: serviceDate,
        nextServiceDate: nextServiceDate ?? asset.nextServiceDate,
        serviceJobId: job.id,
        serviceType: serviceTypeLabel,
      },
    });

    revalidatePath(`/assets/${values.assetId}`);
    revalidatePath("/assets");
    revalidatePath("/jobs");
    return actionSuccess({ jobId: job.id });
  } catch (error) {
    return actionFailure(getActionError(error, "Failed to log service"));
  }
}

export async function deleteAssetAction(id: string) {
  try {
    const user = await requireRole([UserRole.ADMIN, UserRole.MANAGER]);
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
