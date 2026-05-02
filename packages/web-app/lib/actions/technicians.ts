"use server";

import bcrypt from "bcrypt";
import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole, UserRole } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { buildAuditLog } from "@/lib/audit/log";
import { listTechniciansForOrganization } from "@/lib/queries/technicians";
import { actionFailure, actionSuccess, getActionError } from "@/lib/query-utils";
import { createTechnicianSchema, updateTechnicianSchema } from "@/lib/validations/technician";

function generatePassword(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = randomBytes(10);
  return Array.from(bytes).map((b) => chars[b % chars.length]).join("");
}

const listTechniciansSchema = z.object({
  search: z.string().optional(),
  status: z.string().optional(),
  page: z.number().int().min(1).optional(),
  pageSize: z.number().int().min(1).max(100).optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
});

export async function listTechniciansAction(input: z.infer<typeof listTechniciansSchema> = {}) {
  try {
    const user = await requireRole([UserRole.ADMIN, UserRole.MANAGER, UserRole.AGENT]);
    const params = listTechniciansSchema.parse(input);
    const data = await listTechniciansForOrganization(user.organizationId, params);
    return actionSuccess(data);
  } catch (error) {
    return actionFailure(getActionError(error, "Failed to load technicians"));
  }
}

export async function createTechnicianAction(input: unknown) {
  try {
    const user = await requireRole([UserRole.ADMIN, UserRole.MANAGER]);
    const values = createTechnicianSchema.parse(input);
    const generatedPassword = values.password ?? generatePassword();
    const passwordHash = await bcrypt.hash(generatedPassword, 10);

    const technician = await db.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          organizationId: user.organizationId,
          name: values.name,
          email: values.email,
          passwordHash,
          role: "TECHNICIAN",
          status: values.status,
          phone: values.phone,
          territory: values.territory,
          specialization: values.specialization,
        },
      });

      await tx.auditLog.create({
        data: buildAuditLog({
          actor: user,
          action: "CREATE",
          entity: "Technician",
          entityId: created.id,
          after: { name: created.name, email: created.email, role: created.role, status: created.status },
        }),
      });

      return created;
    });

    revalidatePath("/technicians");
    revalidatePath("/settings");
    return actionSuccess({ id: technician.id, generatedPassword });
  } catch (error) {
    return actionFailure(getActionError(error, "Failed to create technician"));
  }
}

export async function resetTechnicianPasswordAction(input: { id: string }) {
  try {
    const user = await requireRole([UserRole.ADMIN, UserRole.MANAGER]);
    const existing = await db.user.findFirst({
      where: { id: input.id, organizationId: user.organizationId, role: "TECHNICIAN" },
    });

    if (!existing) {
      return actionFailure("Technician not found");
    }

    const generatedPassword = generatePassword();
    const passwordHash = await bcrypt.hash(generatedPassword, 10);
    await db.user.update({ where: { id: input.id }, data: { passwordHash } });

    return actionSuccess({ generatedPassword });
  } catch (error) {
    return actionFailure(getActionError(error, "Failed to reset password"));
  }
}

export async function updateTechnicianAction(input: unknown) {
  try {
    const user = await requireRole([UserRole.ADMIN, UserRole.MANAGER]);
    const values = updateTechnicianSchema.parse(input);
    const existing = await db.user.findFirst({
      where: { id: values.id, organizationId: user.organizationId, role: "TECHNICIAN" },
    });

    if (!existing) {
      return actionFailure("Technician not found");
    }

    const updateData = {
      ...(values.name !== undefined ? { name: values.name } : {}),
      ...(values.email !== undefined ? { email: values.email } : {}),
      ...(values.phone !== undefined ? { phone: values.phone } : {}),
      ...(values.territory !== undefined ? { territory: values.territory } : {}),
      ...(values.specialization !== undefined ? { specialization: values.specialization } : {}),
      ...(values.status !== undefined ? { status: values.status } : {}),
      ...(values.password ? { passwordHash: await bcrypt.hash(values.password, 10) } : {}),
    };

    await db.$transaction([
      db.user.update({ where: { id: values.id }, data: updateData }),
      db.auditLog.create({
        data: buildAuditLog({
          actor: user,
          action: "UPDATE",
          entity: "Technician",
          entityId: values.id,
          before: { name: existing.name, email: existing.email, status: existing.status },
          after: {
            name: values.name ?? existing.name,
            email: values.email ?? existing.email,
            status: values.status ?? existing.status,
          },
        }),
      }),
    ]);

    revalidatePath("/technicians");
    revalidatePath(`/technicians/${values.id}`);
    revalidatePath("/settings");
    return actionSuccess({ id: values.id });
  } catch (error) {
    return actionFailure(getActionError(error, "Failed to update technician"));
  }
}

export async function deleteTechnicianAction(id: string) {
  try {
    const user = await requireRole([UserRole.ADMIN]);
    const existing = await db.user.findFirst({
      where: {
        id,
        organizationId: user.organizationId,
        role: "TECHNICIAN",
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    if (!existing) {
      return actionFailure("Technician not found");
    }

    const [jobCount, ticketCount] = await Promise.all([
      db.job.count({
        where: {
          organizationId: user.organizationId,
          technicianId: id,
        },
      }),
      db.ticket.count({
        where: {
          organizationId: user.organizationId,
          assignedToId: id,
        },
      }),
    ]);

    if (jobCount > 0 || ticketCount > 0) {
      return actionFailure(
        "Cannot delete a technician with linked jobs or assigned complaints",
      );
    }

    await db.$transaction([
      db.user.delete({ where: { id } }),
      db.auditLog.create({
        data: buildAuditLog({
          actor: user,
          action: "DELETE",
          entity: "Technician",
          entityId: id,
          before: { name: existing.name, email: existing.email },
        }),
      }),
    ]);

    revalidatePath("/technicians");
    revalidatePath("/settings");
    return actionSuccess({ id });
  } catch (error) {
    return actionFailure(getActionError(error, "Failed to delete technician"));
  }
}
