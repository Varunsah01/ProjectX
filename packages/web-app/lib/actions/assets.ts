"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole, UserRole } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { buildAuditLog } from "@/lib/audit/log";
import { cleanOptional, getNextNumber, parseDateInput } from "@/lib/actions/helpers";
import { getAssetDetailForOrganization, listAssetsForOrganization } from "@/lib/queries/assets";
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

    const asset = await db.$transaction(async (tx) => {
      const created = await tx.asset.create({
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
      await tx.auditLog.create({
        data: buildAuditLog({
          actor: user,
          action: "CREATE",
          entity: "Asset",
          entityId: created.id,
          after: {
            name: created.name,
            model: created.model,
            serialNumber: created.serialNumber,
            category: created.category,
            status: created.status,
          },
        }),
      });
      return created;
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

    const updateData = {
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
    };

    await db.$transaction([
      db.asset.update({ where: { id: values.id }, data: updateData }),
      db.auditLog.create({
        data: buildAuditLog({
          actor: user,
          action: "UPDATE",
          entity: "Asset",
          entityId: values.id,
          before: {
            name: existing.name,
            model: existing.model,
            serialNumber: existing.serialNumber,
            category: existing.category,
            status: existing.status,
          },
          after: {
            name: values.name ?? existing.name,
            model: values.model ?? existing.model,
            serialNumber: values.serialNumber ?? existing.serialNumber,
            category: values.category ?? existing.category,
            status: values.status !== undefined ? values.status.toUpperCase() : existing.status,
          },
        }),
      }),
    ]);

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

    const job = await db.$transaction(async (tx) => {
      const created = await tx.job.create({
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

      await tx.asset.update({
        where: { id: values.assetId },
        data: {
          lastServiceDate: serviceDate,
          ...(nextServiceDate ? { nextServiceDate } : {}),
        },
      });

      await tx.auditLog.create({
        data: buildAuditLog({
          actor: user,
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
            serviceJobId: created.id,
            serviceType: serviceTypeLabel,
          },
        }),
      });

      return created;
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

    const existing = await db.asset.findFirst({
      where: { id, organizationId: user.organizationId },
    });

    if (!existing) {
      return actionFailure("Asset not found");
    }

    const now = new Date();
    await db.$transaction([
      db.asset.updateMany({
        where: { id, organizationId: user.organizationId, deletedAt: null },
        data: { deletedAt: now },
      }),
      db.auditLog.create({
        data: buildAuditLog({
          actor: user,
          action: "DELETE",
          entity: "Asset",
          entityId: id,
          before: { name: existing.name, serialNumber: existing.serialNumber },
        }),
      }),
    ]);

    revalidatePath("/assets");
    revalidatePath("/customers");
    return actionSuccess({ id });
  } catch (error) {
    return actionFailure(getActionError(error, "Failed to delete asset"));
  }
}

export async function restoreAssetAction(id: string) {
  try {
    const user = await requireRole([UserRole.ADMIN, UserRole.MANAGER]);

    const existing = await db.asset.findFirst({
      where: { id, organizationId: user.organizationId, deletedAt: { not: null } },
    });

    if (!existing) {
      return actionFailure("Asset not found or not deleted");
    }

    await db.$transaction([
      db.asset.updateMany({
        where: { id, organizationId: user.organizationId },
        data: { deletedAt: null },
      }),
      db.auditLog.create({
        data: buildAuditLog({
          actor: user,
          action: "RESTORE",
          entity: "Asset",
          entityId: id,
          before: { deletedAt: existing.deletedAt },
        }),
      }),
    ]);

    revalidatePath("/assets");
    revalidatePath("/recycle-bin");
    return actionSuccess({ id });
  } catch (error) {
    return actionFailure(getActionError(error, "Failed to restore asset"));
  }
}
