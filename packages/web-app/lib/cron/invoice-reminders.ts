import * as React from "react";
import * as Sentry from "@sentry/nextjs";
import { InvoiceReminderStage, UserRole } from "@prisma/client";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit/log";
import { sendEmail } from "@/lib/email";
import { getAppUrl } from "@/lib/email-templates/_shared";
import { InvoiceOverdueEmail } from "@/lib/email-templates/invoice-overdue";
import { InvoiceReminderEmail } from "@/lib/email-templates/invoice-reminder";
import { renderEmailTemplate } from "@/lib/render-email-template";
import { getISTDate } from "@/lib/cron/lock";

export interface InvoiceReminderResult {
  count: number;
  invoiceIds: string[];
}

const STAGES = [
  { stage: InvoiceReminderStage.D_3,  days: 3,  useOverdue: false },
  { stage: InvoiceReminderStage.D_7,  days: 7,  useOverdue: false },
  { stage: InvoiceReminderStage.D_15, days: 15, useOverdue: true  },
] as const;

function formatDate(value: Date) {
  return value.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const internalRoles = [UserRole.ADMIN, UserRole.MANAGER, UserRole.AGENT];

export async function sendInvoiceReminders(
  referenceDate = new Date(),
): Promise<InvoiceReminderResult> {
  const today = getISTDate(referenceDate);

  const invoices = await db.invoice.findMany({
    where: {
      OR: [
        { status: "OVERDUE" },
        { status: "ISSUED", dueDate: { lt: today } },
      ],
    },
    include: {
      customer: { select: { id: true, name: true, email: true } },
      organization: { select: { id: true, name: true } },
      reminders: true,
    },
    orderBy: [{ organizationId: "asc" }, { dueDate: "asc" }],
  });

  // Pre-fetch internal users and admins per org to avoid N+1
  const orgIds = [...new Set(invoices.map((i) => i.organizationId))];
  const allOrgUsers = orgIds.length > 0
    ? await db.user.findMany({
        where: { organizationId: { in: orgIds }, role: { in: [...internalRoles] } },
        select: { id: true, organizationId: true, role: true },
      })
    : [];
  const internalUsersByOrg = new Map<string, Array<{ id: string }>>();
  const adminByOrg = new Map<string, { id: string }>();
  for (const u of allOrgUsers) {
    const arr = internalUsersByOrg.get(u.organizationId!) ?? [];
    arr.push({ id: u.id });
    internalUsersByOrg.set(u.organizationId!, arr);
    if (u.role === UserRole.ADMIN && !adminByOrg.has(u.organizationId!)) {
      adminByOrg.set(u.organizationId!, { id: u.id });
    }
  }

  const sentInvoiceIds: string[] = [];

  for (const invoice of invoices) {
    try {
      if (!invoice.customer.email) {
        continue;
      }

      const daysSinceDue = Math.max(
        0,
        Math.round((today.getTime() - invoice.dueDate.getTime()) / 86_400_000),
      );
      const sentStages = new Set(invoice.reminders.map((r) => r.stage));

      let sent = false;

      for (const { stage, days, useOverdue } of STAGES) {
        if (daysSinceDue < days) continue;
        if (sentStages.has(stage)) continue;

        // Atomic check-and-create inside a transaction to prevent double-send
        // under concurrent cron runs. HTTP calls (email/notifications) happen
        // OUTSIDE the transaction after it commits.
        const didCreate = await db.$transaction(async (tx) => {
          const existing = await tx.invoiceReminder.findFirst({
            where: { invoiceId: invoice.id, stage },
          });
          if (existing) return false;
          await tx.invoiceReminder.create({ data: { invoiceId: invoice.id, stage } });
          return true;
        });

        if (!didCreate) break; // concurrent run already handled this stage

        const balance = Math.max(0, invoice.amount - invoice.paidAmount);
        const invoiceUrl = `${getAppUrl()}/invoices/${invoice.id}`;

        let html: string;
        let subject: string;

        if (useOverdue) {
          html = await renderEmailTemplate(
            React.createElement(InvoiceOverdueEmail, {
              customerName: invoice.customer.name,
              organizationName: invoice.organization.name,
              invoiceNumber: invoice.invoiceNumber,
              amountDue: balance,
              dueDate: formatDate(invoice.dueDate),
              overdueDays: daysSinceDue,
              // TODO: razorpay payment link — using dashboard URL today
              invoiceUrl,
            }),
          );
          subject = `Overdue notice for ${invoice.invoiceNumber}`;
        } else {
          html = await renderEmailTemplate(
            React.createElement(InvoiceReminderEmail, {
              customerName: invoice.customer.name,
              organizationName: invoice.organization.name,
              invoiceNumber: invoice.invoiceNumber,
              amountDue: balance,
              dueDate: formatDate(invoice.dueDate),
              // TODO: razorpay payment link — using dashboard URL today
              invoiceUrl,
            }),
          );
          subject = `Payment reminder for ${invoice.invoiceNumber}`;
        }

        await sendEmail(invoice.customer.email, subject, html);

        const internalUsers = internalUsersByOrg.get(invoice.organizationId) ?? [];

        if (internalUsers.length > 0) {
          await db.notification.createMany({
            data: internalUsers.map((u) => ({
              organizationId: invoice.organizationId,
              userId: u.id,
              type: "invoice_reminder",
              title: `Invoice ${invoice.invoiceNumber} reminder sent`,
              message: `Reminder sent to ${invoice.customer.name} for outstanding balance.`,
              link: `/invoices/${invoice.id}`,
            })),
          });
        }

        const admin = adminByOrg.get(invoice.organizationId) ?? null;

        if (admin) {
          await logAudit({
            actor: { id: admin.id, organizationId: invoice.organizationId },
            action: "REMINDER_SENT",
            entity: "Invoice",
            entityId: invoice.id,
            after: { stage, sentAt: new Date().toISOString() },
          });
        }

        sent = true;
        break; // one stage per run
      }

      if (sent) {
        sentInvoiceIds.push(invoice.id);
      }
    } catch (error) {
      Sentry.captureException(error, {
        tags: {
          job: "invoice-reminders",
          invoiceId: invoice.id,
          organizationId: invoice.organizationId,
        },
      });
      // record and continue — don't abort the loop on one failure
    }
  }

  return { count: sentInvoiceIds.length, invoiceIds: sentInvoiceIds };
}
