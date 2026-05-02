"use server";

import * as React from "react";
import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { UserRole } from "@prisma/client";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth-utils";
import { sendEmail } from "@/lib/email";
import { getAppUrl } from "@/lib/email-templates/_shared";
import { OrgInvitationEmail } from "@/lib/email-templates/org-invitation";
import { renderEmailTemplate } from "@/lib/render-email-template";
import { actionSuccess, actionFailure, getActionError } from "@/lib/query-utils";

const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function formatRole(role: UserRole): string {
  return role.charAt(0) + role.slice(1).toLowerCase();
}

export async function createInvitationAction(input: {
  email: string;
  role: string;
}) {
  try {
    const user = await requireRole([UserRole.ADMIN]);

    const email = input.email.trim().toLowerCase();
    const role = input.role.toUpperCase() as UserRole;

    if (!email || !Object.values(UserRole).includes(role)) {
      return actionFailure("Invalid email or role");
    }

    // Check if user already has a membership in this org
    const existingUser = await db.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existingUser) {
      const existingMembership = await db.orgMembership.findUnique({
        where: {
          userId_organizationId: {
            userId: existingUser.id,
            organizationId: user.organizationId,
          },
        },
      });

      if (existingMembership) {
        return actionFailure("This user is already a member of this organization");
      }
    }

    // Check for pending invitation
    const pendingInvitation = await db.orgInvitation.findFirst({
      where: {
        email,
        organizationId: user.organizationId,
        acceptedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    if (pendingInvitation) {
      return actionFailure("A pending invitation already exists for this email");
    }

    const token = randomBytes(32).toString("hex");

    const invitation = await db.orgInvitation.create({
      data: {
        email,
        organizationId: user.organizationId,
        role,
        token,
        expiresAt: new Date(Date.now() + INVITATION_TTL_MS),
        invitedById: user.id,
      },
    });

    // Fetch org name for email
    const org = await db.organization.findUnique({
      where: { id: user.organizationId },
      select: { name: true },
    });

    const acceptUrl = `${getAppUrl()}/accept-invitation?token=${token}`;

    sendEmail(
      email,
      `You've been invited to join ${org?.name ?? "an organization"}`,
      await renderEmailTemplate(
        React.createElement(OrgInvitationEmail, {
          recipientEmail: email,
          organizationName: org?.name ?? "Organization",
          role: formatRole(role),
          invitedByName: user.name,
          acceptUrl,
        }),
      ),
    ).catch((err) => console.error("Failed to send invitation email", err));

    revalidatePath("/settings");
    return actionSuccess({ id: invitation.id });
  } catch (error) {
    return actionFailure(getActionError(error, "Failed to send invitation"));
  }
}

export async function listPendingInvitationsAction() {
  try {
    const user = await requireRole([UserRole.ADMIN, UserRole.MANAGER]);

    const invitations = await db.orgInvitation.findMany({
      where: {
        organizationId: user.organizationId,
        acceptedAt: null,
        expiresAt: { gt: new Date() },
      },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        expiresAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return actionSuccess(invitations);
  } catch (error) {
    return actionFailure(getActionError(error, "Failed to load invitations"));
  }
}

export async function revokeInvitationAction(id: string) {
  try {
    const user = await requireRole([UserRole.ADMIN]);

    await db.orgInvitation.deleteMany({
      where: {
        id,
        organizationId: user.organizationId,
        acceptedAt: null,
      },
    });

    revalidatePath("/settings");
    return actionSuccess({ id });
  } catch (error) {
    return actionFailure(getActionError(error, "Failed to revoke invitation"));
  }
}
