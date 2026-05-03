import type { BreachStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { renderEmailTemplate } from "@/lib/render-email-template";
import { BreachNotificationEmail } from "@/lib/email-templates/breach-notification";

export async function createBreach(
  organizationId: string,
  data: {
    detectedAt: Date;
    scope: string;
    affectedPrincipals: number;
    notes?: string;
  },
  userId: string
) {
  return db.breachLog.create({
    data: {
      organizationId,
      detectedAt: data.detectedAt,
      scope: data.scope,
      affectedPrincipals: data.affectedPrincipals,
      notes: data.notes,
      createdById: userId,
    },
  });
}

export async function updateBreach(
  breachId: string,
  data: {
    status?: BreachStatus;
    reportedToBoardAt?: Date;
    reportedToPrincipalsAt?: Date;
    notes?: string;
    affectedPrincipals?: number;
  }
) {
  return db.breachLog.update({
    where: { id: breachId },
    data,
  });
}

/**
 * Sends breach notification emails to all customers in the organization.
 * DPDPA requires notification to affected data principals within 72 hours.
 */
export async function sendBreachNotification(breachId: string) {
  const breach = await db.breachLog.findUniqueOrThrow({
    where: { id: breachId },
    include: {
      organization: {
        select: {
          id: true,
          name: true,
          grievanceOfficerName: true,
          grievanceOfficerEmail: true,
        },
      },
    },
  });

  // Fetch all active customers for this organization
  const customers = await db.customer.findMany({
    where: { organizationId: breach.organizationId },
    select: { name: true, email: true },
  });

  let sentCount = 0;
  for (const customer of customers) {
    if (!customer.email) continue;

    const html = await renderEmailTemplate(
      BreachNotificationEmail({
        customerName: customer.name,
        organizationName: breach.organization.name,
        breachDescription: breach.scope,
        detectedAt: breach.detectedAt.toLocaleDateString("en-IN", {
          day: "numeric",
          month: "long",
          year: "numeric",
        }),
        grievanceOfficerName: breach.organization.grievanceOfficerName ?? undefined,
        grievanceOfficerEmail: breach.organization.grievanceOfficerEmail ?? undefined,
      })
    );

    await sendEmail(
      customer.email,
      `Important: Data Breach Notification from ${breach.organization.name}`,
      html,
    );

    sentCount++;
  }

  // Mark notification timestamp
  await db.breachLog.update({
    where: { id: breachId },
    data: { reportedToPrincipalsAt: new Date() },
  });

  return { sentCount };
}
