"use server";

import bcrypt from "bcrypt";
import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { requireRole, UserRole } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { buildAuditLog } from "@/lib/audit/log";
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

    const existing = await db.organization.findUniqueOrThrow({
      where: { id: user.organizationId },
    });

    const updateData = {
      name: values.businessName,
      phone: values.phone,
      email: values.email,
      address: values.address,
      city: values.city,
      gstin: values.gstin || null,
      placeOfBusinessState: values.placeOfBusinessState || null,
      legalName: values.legalName || null,
      logo: values.logo || null,
      signatureUrl: values.signatureUrl || null,
      pan: values.pan || null,
      bankName: values.bankName || null,
      bankAccountNumber: values.bankAccountNumber || null,
      bankIfsc: values.bankIfsc || null,
      bankBranch: values.bankBranch || null,
      upiId: values.upiId || null,
      invoiceTerms: values.invoiceTerms || null,
    };

    await db.$transaction([
      db.organization.update({ where: { id: user.organizationId }, data: updateData }),
      db.auditLog.create({
        data: buildAuditLog({
          actor: user,
          action: "UPDATE",
          entity: "Organization",
          entityId: user.organizationId,
          before: {
            name: existing.name,
            phone: existing.phone,
            email: existing.email,
            address: existing.address,
            city: existing.city,
            gstin: existing.gstin,
          },
          after: {
            name: values.businessName,
            phone: values.phone,
            email: values.email,
            address: values.address,
            city: values.city,
            gstin: values.gstin || null,
          },
        }),
      }),
    ]);

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

    const member = await db.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          organizationId: user.organizationId,
          name: values.name,
          email: values.email,
          passwordHash,
          role: values.role.toUpperCase() as never,
          status: values.status,
        },
      });

      await tx.orgMembership.create({
        data: {
          userId: created.id,
          organizationId: user.organizationId,
          role: values.role.toUpperCase() as never,
        },
      });

      await tx.auditLog.create({
        data: buildAuditLog({
          actor: user,
          action: "CREATE",
          entity: "TeamMember",
          entityId: created.id,
          after: { name: created.name, email: created.email, role: created.role },
        }),
      });

      return created;
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
    await db.user.update({
      where: { id: input.id },
      data: { passwordHash, tokenVersion: { increment: 1 } },
    });
    await db.session.deleteMany({ where: { userId: input.id } });

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
        organizationId: user.organizationId,
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
      db.job.count({ where: { organizationId: user.organizationId, technicianId: id } }),
      db.ticketTimeline.count({ where: { organizationId: user.organizationId, byUserId: id } }),
      db.auditLog.count({ where: { organizationId: user.organizationId, userId: id } }),
      db.customerNote.count({ where: { organizationId: user.organizationId, userId: id } }),
    ]);

    const hasHistory = jobCount > 0 || timelineCount > 0 || auditCount > 0 || noteCount > 0;

    await db.$transaction(async (tx) => {
      // Remove the org membership
      await tx.orgMembership.deleteMany({
        where: { userId: id, organizationId: user.organizationId },
      });

      if (hasHistory) {
        await tx.user.update({
          where: { id },
          data: { status: "REMOVED", tokenVersion: { increment: 1 } },
        });
      } else {
        await tx.user.delete({ where: { id } });
      }

      await tx.auditLog.create({
        data: buildAuditLog({
          actor: user,
          action: "DELETE",
          entity: "TeamMember",
          entityId: id,
          before: { name: existing.name, email: existing.email, role: existing.role },
        }),
      });
    });

    await db.session.deleteMany({ where: { userId: id } });

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

    const shouldInvalidateSessions = Boolean(values.password || values.role);

    const updateData = {
      ...(values.name !== undefined ? { name: values.name } : {}),
      ...(values.email !== undefined ? { email: values.email } : {}),
      ...(values.role !== undefined ? { role: values.role.toUpperCase() as never } : {}),
      ...(values.status !== undefined ? { status: values.status } : {}),
      ...(values.password ? { passwordHash: await bcrypt.hash(values.password, 10) } : {}),
      ...(shouldInvalidateSessions ? { tokenVersion: { increment: 1 } } : {}),
    };

    await db.$transaction(async (tx) => {
      await tx.user.update({ where: { id: values.id }, data: updateData });

      // Keep OrgMembership role in sync
      if (values.role !== undefined) {
        await tx.orgMembership.update({
          where: {
            userId_organizationId: {
              userId: values.id,
              organizationId: user.organizationId,
            },
          },
          data: { role: values.role.toUpperCase() as never },
        });
      }

      await tx.auditLog.create({
        data: buildAuditLog({
          actor: user,
          action: "UPDATE",
          entity: "TeamMember",
          entityId: values.id,
          before: { name: existing.name, email: existing.email, role: existing.role, status: existing.status },
          after: {
            name: values.name ?? existing.name,
            email: values.email ?? existing.email,
            role: values.role !== undefined ? values.role.toUpperCase() : existing.role,
            status: values.status ?? existing.status,
          },
        }),
      });
    });

    if (shouldInvalidateSessions) {
      await db.session.deleteMany({ where: { userId: values.id } });
    }

    revalidatePath("/settings");
    return actionSuccess({ id: values.id });
  } catch (error) {
    return actionFailure(getActionError(error, "Failed to update team member"));
  }
}
