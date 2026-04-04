"use server";

import bcrypt from "bcrypt";
import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { requireRole, UserRole } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { getSettingsDataForOrganization } from "@/lib/queries/settings";
import { actionFailure, actionSuccess, getActionError } from "@/lib/query-utils";
import {
  createTeamMemberSchema,
  updateBusinessProfileSchema,
  updateTeamMemberSchema,
} from "@/lib/validations/settings";

function generatePassword(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = randomBytes(10);
  return Array.from(bytes).map((b) => chars[b % chars.length]).join("");
}

export async function getSettingsAction() {
  try {
    const user = await requireRole([UserRole.ADMIN, UserRole.MANAGER]);
    const data = await getSettingsDataForOrganization(user.organizationId);
    return actionSuccess(data);
  } catch (error) {
    return actionFailure(getActionError(error, "Failed to load settings"));
  }
}

export async function updateBusinessProfileAction(input: unknown) {
  try {
    const user = await requireRole([UserRole.ADMIN]);
    const values = updateBusinessProfileSchema.parse(input);
    await db.organization.update({
      where: { id: user.organizationId },
      data: {
        name: values.businessName,
        phone: values.phone,
        email: values.email,
        address: values.address,
        city: values.city,
        gst: values.gst || null,
        logo: values.logo || null,
      },
    });

    const data = await getSettingsDataForOrganization(user.organizationId);
    revalidatePath("/settings");
    revalidatePath("/");
    return actionSuccess(data.businessProfile);
  } catch (error) {
    return actionFailure(getActionError(error, "Failed to update business profile"));
  }
}

export async function createTeamMemberAction(input: unknown) {
  try {
    const user = await requireRole([UserRole.ADMIN, UserRole.MANAGER]);
    const values = createTeamMemberSchema.parse(input);
    const generatedPassword = values.password ?? generatePassword();
    const passwordHash = await bcrypt.hash(generatedPassword, 10);
    const member = await db.user.create({
      data: {
        organizationId: user.organizationId,
        name: values.name,
        email: values.email,
        passwordHash,
        role: values.role.toUpperCase() as never,
        status: values.status,
      },
    });

    revalidatePath("/settings");
    return actionSuccess({ id: member.id, generatedPassword });
  } catch (error) {
    return actionFailure(getActionError(error, "Failed to create team member"));
  }
}

export async function resetTeamMemberPasswordAction(input: { id: string }) {
  try {
    const user = await requireRole([UserRole.ADMIN, UserRole.MANAGER]);
    const existing = await db.user.findFirst({
      where: { id: input.id, organizationId: user.organizationId },
    });

    if (!existing) {
      return actionFailure("Team member not found");
    }

    const generatedPassword = generatePassword();
    const passwordHash = await bcrypt.hash(generatedPassword, 10);
    await db.user.update({ where: { id: input.id }, data: { passwordHash } });

    return actionSuccess({ generatedPassword });
  } catch (error) {
    return actionFailure(getActionError(error, "Failed to reset password"));
  }
}

export async function removeTeamMemberAction(id: string) {
  try {
    const user = await requireRole([UserRole.ADMIN]);

    if (user.id === id) {
      return actionFailure("You cannot remove yourself");
    }

    const existing = await db.user.findFirst({
      where: { id, organizationId: user.organizationId },
    });

    if (!existing) {
      return actionFailure("Team member not found");
    }

    const activeJobs = await db.job.count({
      where: {
        technicianId: id,
        status: { in: ["PENDING", "ASSIGNED", "EN_ROUTE", "IN_PROGRESS"] },
      },
    });

    if (activeJobs > 0) {
      return actionFailure(
        `Cannot remove — ${activeJobs} active job${activeJobs === 1 ? "" : "s"} assigned. Reassign them first.`,
      );
    }

    // Check for historical records to decide hard vs soft delete
    const [jobCount, timelineCount, auditCount, noteCount] = await Promise.all([
      db.job.count({ where: { technicianId: id } }),
      db.ticketTimeline.count({ where: { byUserId: id } }),
      db.auditLog.count({ where: { userId: id } }),
      db.customerNote.count({ where: { userId: id } }),
    ]);

    if (jobCount > 0 || timelineCount > 0 || auditCount > 0 || noteCount > 0) {
      // Soft-delete: preserve historical records, filter from team list
      await db.user.update({ where: { id }, data: { status: "REMOVED" } });
    } else {
      await db.user.delete({ where: { id } });
    }

    revalidatePath("/settings");
    return actionSuccess({ id });
  } catch (error) {
    return actionFailure(getActionError(error, "Failed to remove team member"));
  }
}

export async function updateTeamMemberAction(input: unknown) {
  try {
    const user = await requireRole([UserRole.ADMIN, UserRole.MANAGER]);
    const values = updateTeamMemberSchema.parse(input);
    const existing = await db.user.findFirst({
      where: { id: values.id, organizationId: user.organizationId },
    });

    if (!existing) {
      return actionFailure("Team member not found");
    }

    await db.user.update({
      where: { id: values.id },
      data: {
        ...(values.name !== undefined ? { name: values.name } : {}),
        ...(values.email !== undefined ? { email: values.email } : {}),
        ...(values.role !== undefined ? { role: values.role.toUpperCase() as never } : {}),
        ...(values.status !== undefined ? { status: values.status } : {}),
        ...(values.password ? { passwordHash: await bcrypt.hash(values.password, 10) } : {}),
      },
    });

    revalidatePath("/settings");
    return actionSuccess({ id: values.id });
  } catch (error) {
    return actionFailure(getActionError(error, "Failed to update team member"));
  }
}
