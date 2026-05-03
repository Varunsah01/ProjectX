"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole, UserRole } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { buildAuditLog } from "@/lib/audit/log";
import { notifyJobAssigned, notifyJobCompleted, notifyJobRescheduled } from "@/lib/notifications";
import { cleanOptional, getNextNumber, parseDateInput } from "@/lib/actions/helpers";
import { getJobDetailForOrganization, listJobsForOrganization } from "@/lib/queries/jobs";
import { actionFailure, actionSuccess, getActionError } from "@/lib/query-utils";
import { createJobSchema, updateJobSchema } from "@/lib/validations/job";

const listJobsSchema = z.object({
  search: z.string().optional(),
  status: z.string().optional(),
  type: z.string().optional(),
  page: z.number().int().min(1).optional(),
  pageSize: z.number().int().min(1).max(100).optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
  technicianId: z.string().optional(),
});

export async function listJobsAction(input: z.infer<typeof listJobsSchema> = {}) {
  try {
    const user = await requireRole([UserRole.ADMIN, UserRole.MANAGER, UserRole.AGENT, UserRole.TECHNICIAN]);
    const params = listJobsSchema.parse(input);
    const data = await listJobsForOrganization(user.organizationId, params);
    return actionSuccess(data);
  } catch (error) {
    return actionFailure(getActionError(error, "Failed to load jobs"));
  }
}

export async function createJobAction(input: unknown) {
  try {
    const user = await requireRole([UserRole.ADMIN, UserRole.MANAGER, UserRole.AGENT]);
    const values = createJobSchema.parse(input);

    const job = await db.$transaction(async (tx) => {
      const created = await tx.job.create({
        data: {
          organizationId: user.organizationId,
          jobNumber: await getNextNumber("JOB", user.organizationId, "job"),
          ticketId: values.ticketId || null,
          customerId: values.customerId,
          assetId: values.assetId || null,
          technicianId: values.technicianId,
          type: values.type.toUpperCase() as never,
          status: values.status.toUpperCase() as never,
          scheduledDate: parseDateInput(values.scheduledDate),
          notes: cleanOptional(values.notes),
          serviceReport: cleanOptional(values.serviceReport),
        },
      });

      await tx.auditLog.create({
        data: buildAuditLog({
          actor: user,
          action: "CREATE",
          entity: "Job",
          entityId: created.id,
          after: {
            jobNumber: created.jobNumber,
            type: created.type,
            status: created.status,
            technicianId: created.technicianId,
          },
        }),
      });

      return created;
    });

    const detail = await getJobDetailForOrganization(user.organizationId, job.id);
    await notifyJobAssigned(job.id);
    revalidatePath("/jobs");
    revalidatePath(`/jobs/${job.id}`);
    revalidatePath("/complaints");
    return actionSuccess(detail!);
  } catch (error) {
    return actionFailure(getActionError(error, "Failed to create job"));
  }
}

export async function updateJobAction(input: unknown) {
  try {
    const user = await requireRole([UserRole.ADMIN, UserRole.MANAGER, UserRole.AGENT, UserRole.TECHNICIAN]);
    const values = updateJobSchema.parse(input);
    const existing = await db.job.findFirst({
      where: { id: values.id, organizationId: user.organizationId },
    });

    if (!existing) {
      return actionFailure("Job not found");
    }

    const updateData = {
      ...(values.ticketId !== undefined ? { ticketId: values.ticketId || null } : {}),
      ...(values.customerId ? { customerId: values.customerId } : {}),
      ...(values.assetId !== undefined ? { assetId: values.assetId || null } : {}),
      ...(values.technicianId ? { technicianId: values.technicianId } : {}),
      ...(values.type !== undefined ? { type: values.type.toUpperCase() as never } : {}),
      ...(values.status !== undefined ? { status: values.status.toUpperCase() as never } : {}),
      ...(values.scheduledDate !== undefined ? { scheduledDate: parseDateInput(values.scheduledDate) } : {}),
      ...(values.completedAt !== undefined
        ? { completedAt: values.completedAt ? new Date(values.completedAt) : null }
        : {}),
      ...(values.notes !== undefined ? { notes: cleanOptional(values.notes) } : {}),
      ...(values.serviceReport !== undefined ? { serviceReport: cleanOptional(values.serviceReport) } : {}),
    };

    await db.$transaction([
      db.job.update({ where: { id: values.id }, data: updateData }),
      db.auditLog.create({
        data: buildAuditLog({
          actor: user,
          action: "UPDATE",
          entity: "Job",
          entityId: values.id,
          before: {
            type: existing.type,
            status: existing.status,
            technicianId: existing.technicianId,
          },
          after: {
            type: values.type !== undefined ? values.type.toUpperCase() : existing.type,
            status: values.status !== undefined ? values.status.toUpperCase() : existing.status,
            technicianId: values.technicianId ?? existing.technicianId,
          },
        }),
      }),
    ]);

    const detail = await getJobDetailForOrganization(user.organizationId, values.id);
    if (values.technicianId !== undefined && values.technicianId !== existing.technicianId) {
      await notifyJobAssigned(values.id);
    }
    if (
      values.scheduledDate !== undefined &&
      parseDateInput(values.scheduledDate).getTime() !== existing.scheduledDate.getTime()
    ) {
      await notifyJobRescheduled(values.id);
    }
    revalidatePath("/jobs");
    revalidatePath(`/jobs/${values.id}`);
    return actionSuccess(detail!);
  } catch (error) {
    return actionFailure(getActionError(error, "Failed to update job"));
  }
}

export async function completeJobAction(id: string, serviceReport?: string) {
  try {
    const user = await requireRole([UserRole.ADMIN, UserRole.MANAGER, UserRole.AGENT, UserRole.TECHNICIAN]);
    const existing = await db.job.findFirst({
      where: { id, organizationId: user.organizationId },
    });

    if (!existing) {
      return actionFailure("Job not found");
    }

    await db.$transaction([
      db.job.update({
        where: { id },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
          ...(serviceReport ? { serviceReport } : {}),
        },
      }),
      db.auditLog.create({
        data: buildAuditLog({
          actor: user,
          action: "STATUS_CHANGE",
          entity: "Job",
          entityId: id,
          before: { status: existing.status },
          after: { status: "COMPLETED" },
        }),
      }),
    ]);

    const detail = await getJobDetailForOrganization(user.organizationId, id);
    await notifyJobCompleted(id);
    revalidatePath("/jobs");
    revalidatePath(`/jobs/${id}`);
    return actionSuccess(detail!);
  } catch (error) {
    return actionFailure(getActionError(error, "Failed to complete job"));
  }
}

export async function deleteJobAction(id: string) {
  try {
    const user = await requireRole([UserRole.ADMIN, UserRole.MANAGER]);

    const existing = await db.job.findFirst({
      where: { id, organizationId: user.organizationId },
    });

    if (!existing) {
      return actionFailure("Job not found");
    }

    const now = new Date();
    await db.$transaction([
      db.job.updateMany({
        where: { id, organizationId: user.organizationId, deletedAt: null },
        data: { deletedAt: now },
      }),
      db.auditLog.create({
        data: buildAuditLog({
          actor: user,
          action: "DELETE",
          entity: "Job",
          entityId: id,
          before: { jobNumber: existing.jobNumber, type: existing.type, status: existing.status },
        }),
      }),
    ]);

    revalidatePath("/jobs");
    return actionSuccess({ id });
  } catch (error) {
    return actionFailure(getActionError(error, "Failed to delete job"));
  }
}

export async function restoreJobAction(id: string) {
  try {
    const user = await requireRole([UserRole.ADMIN, UserRole.MANAGER]);

    const existing = await db.job.findFirst({
      where: { id, organizationId: user.organizationId, deletedAt: { not: null } },
    });

    if (!existing) {
      return actionFailure("Job not found or not deleted");
    }

    await db.$transaction([
      db.job.updateMany({
        where: { id, organizationId: user.organizationId },
        data: { deletedAt: null },
      }),
      db.auditLog.create({
        data: buildAuditLog({
          actor: user,
          action: "RESTORE",
          entity: "Job",
          entityId: id,
          before: { deletedAt: existing.deletedAt },
        }),
      }),
    ]);

    revalidatePath("/jobs");
    revalidatePath("/recycle-bin");
    return actionSuccess({ id });
  } catch (error) {
    return actionFailure(getActionError(error, "Failed to restore job"));
  }
}
