import * as React from "react";
import { UserRole } from "@prisma/client";
import { db } from "@/lib/db";
import { notifyCustomer } from "@/lib/messaging/service";
import { sendEmail } from "@/lib/email";
import { ContractExpiredEmail } from "@/lib/email-templates/contract-expired";
import { ContractExpiringEmail } from "@/lib/email-templates/contract-expiring";
import { getAppUrl } from "@/lib/email-templates/_shared";
import { InvoiceCreatedEmail } from "@/lib/email-templates/invoice-created";
import { InvoiceOverdueEmail } from "@/lib/email-templates/invoice-overdue";
import { InvoiceReminderEmail } from "@/lib/email-templates/invoice-reminder";
import { JobCompletedEmail } from "@/lib/email-templates/job-completed";
import { JobScheduledEmail } from "@/lib/email-templates/job-scheduled";
import { RefundProcessedEmail } from "@/lib/email-templates/refund-processed";
import { TicketCreatedEmail } from "@/lib/email-templates/ticket-created";
import { TicketResolvedEmail } from "@/lib/email-templates/ticket-resolved";
import { WelcomeEmail } from "@/lib/email-templates/welcome";
import { sendPushToUser } from "@/lib/notifications/push";
import { renderEmailTemplate } from "@/lib/render-email-template";

const internalRoles = [UserRole.ADMIN, UserRole.MANAGER, UserRole.AGENT] as const;

async function renderComponent(
  component: React.ComponentType<any>,
  props: Record<string, unknown>,
) {
  return renderEmailTemplate(React.createElement(component, props));
}

function formatDate(value: Date | null | undefined) {
  if (!value) {
    return "N/A";
  }

  return value.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(value: Date | null | undefined) {
  if (!value) {
    return "N/A";
  }

  return value.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getDaysUntil(date: Date) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const target = new Date(date);
  target.setHours(0, 0, 0, 0);

  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

async function createInAppNotifications({
  organizationId,
  userIds,
  type,
  title,
  message,
  link,
}: {
  organizationId: string;
  userIds: string[];
  type: string;
  title: string;
  message: string;
  link?: string;
}) {
  const uniqueUserIds = [...new Set(userIds.filter(Boolean))];

  if (!uniqueUserIds.length) {
    return;
  }

  await db.notification.createMany({
    data: uniqueUserIds.map((userId) => ({
      organizationId,
      userId,
      type,
      title,
      message,
      link,
    })),
  });
}

async function getInternalRecipients(organizationId: string) {
  const users = await db.user.findMany({
    where: {
      organizationId,
      role: {
        in: [...internalRoles],
      },
    },
    select: {
      id: true,
    },
  });

  return users.map((user) => user.id);
}

async function safelyRun(name: string, fn: () => Promise<void>) {
  try {
    await fn();
  } catch (error) {
    console.error(`${name} notification failed`, error);
  }
}

export async function notifyInvoiceCreated(invoiceId: string) {
  return safelyRun("notifyInvoiceCreated", async () => {
    const invoice = await db.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        organization: true,
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            preferredChannel: true,
            whatsappOptOut: true,
          },
        },
      },
    });

    if (!invoice) {
      return;
    }

    const appUrl = getAppUrl();
    const invoiceUrl = `${appUrl}/invoices/${invoice.id}`;
    const internalUserIds = await getInternalRecipients(invoice.organizationId);

    await Promise.all([
      createInAppNotifications({
        organizationId: invoice.organizationId,
        userIds: internalUserIds,
        type: "invoice_created",
        title: `Invoice ${invoice.invoiceNumber} created`,
        message: `A new invoice has been issued to ${invoice.customer.name}.`,
        link: `/invoices/${invoice.id}`,
      }),
      sendEmail(
        invoice.customer.email,
        `Invoice ${invoice.invoiceNumber} from ${invoice.organization.name}`,
        await renderComponent(InvoiceCreatedEmail, {
          customerName: invoice.customer.name,
          organizationName: invoice.organization.name,
          invoiceNumber: invoice.invoiceNumber,
          amount: invoice.amount,
          dueDate: formatDate(invoice.dueDate),
          invoiceUrl,
        }),
      ),
    ]);

    await notifyCustomer(
      {
        id: invoice.customer.id,
        organizationId: invoice.organizationId,
        phone: invoice.customer.phone,
        preferredChannel: invoice.customer.preferredChannel,
        whatsappOptOut: invoice.customer.whatsappOptOut,
      },
      "invoice_issued",
      {
        invoiceNumber: invoice.invoiceNumber,
        amount: String(invoice.amount),
        dueDate: formatDate(invoice.dueDate),
        invoiceUrl,
      },
    );
  });
}

export async function notifyInvoiceReminder(invoiceId: string) {
  return safelyRun("notifyInvoiceReminder", async () => {
    const invoice = await db.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        organization: true,
        customer: true,
      },
    });

    if (!invoice) {
      return;
    }

    const balance = Math.max(0, invoice.amount - invoice.paidAmount);
    const invoiceUrl = `${getAppUrl()}/invoices/${invoice.id}`;

    await Promise.all([
      createInAppNotifications({
        organizationId: invoice.organizationId,
        userIds: await getInternalRecipients(invoice.organizationId),
        type: "invoice_reminder",
        title: `Invoice ${invoice.invoiceNumber} reminder`,
        message: `Reminder sent to ${invoice.customer.name} for outstanding balance.`,
        link: `/invoices/${invoice.id}`,
      }),
      sendEmail(
        invoice.customer.email,
        `Payment reminder for ${invoice.invoiceNumber}`,
        await renderComponent(InvoiceReminderEmail, {
          customerName: invoice.customer.name,
          organizationName: invoice.organization.name,
          invoiceNumber: invoice.invoiceNumber,
          amountDue: balance,
          dueDate: formatDate(invoice.dueDate),
          invoiceUrl,
        }),
      ),
    ]);
  });
}

export async function notifyInvoiceOverdue(invoiceId: string) {
  return safelyRun("notifyInvoiceOverdue", async () => {
    const invoice = await db.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        organization: true,
        customer: true,
      },
    });

    if (!invoice) {
      return;
    }

    const today = new Date();
    const overdueDays = Math.max(1, Math.ceil((today.getTime() - invoice.dueDate.getTime()) / (1000 * 60 * 60 * 24)));
    const balance = Math.max(0, invoice.amount - invoice.paidAmount);
    const invoiceUrl = `${getAppUrl()}/invoices/${invoice.id}`;

    await Promise.all([
      createInAppNotifications({
        organizationId: invoice.organizationId,
        userIds: await getInternalRecipients(invoice.organizationId),
        type: "invoice_overdue",
        title: `Invoice ${invoice.invoiceNumber} is overdue`,
        message: `${invoice.customer.name} has an overdue balance pending.`,
        link: `/invoices/${invoice.id}`,
      }),
      sendEmail(
        invoice.customer.email,
        `Overdue notice for ${invoice.invoiceNumber}`,
        await renderComponent(InvoiceOverdueEmail, {
          customerName: invoice.customer.name,
          organizationName: invoice.organization.name,
          invoiceNumber: invoice.invoiceNumber,
          amountDue: balance,
          dueDate: formatDate(invoice.dueDate),
          overdueDays,
          invoiceUrl,
        }),
      ),
    ]);
  });
}

export async function notifyContractExpiring(contractId: string) {
  return safelyRun("notifyContractExpiring", async () => {
    const contract = await db.contract.findUnique({
      where: { id: contractId },
      include: {
        organization: true,
        customer: true,
        asset: true,
      },
    });

    if (!contract) {
      return;
    }

    const contractUrl = `${getAppUrl()}/contracts/${contract.id}`;

    await Promise.all([
      createInAppNotifications({
        organizationId: contract.organizationId,
        userIds: await getInternalRecipients(contract.organizationId),
        type: "contract_expiring",
        title: `Contract ${contract.contractNumber} expires soon`,
        message: `${contract.customer.name}'s contract expires in ${getDaysUntil(contract.endDate)} days.`,
        link: `/contracts/${contract.id}`,
      }),
      sendEmail(
        contract.customer.email,
        `Contract ${contract.contractNumber} is expiring soon`,
        await renderComponent(ContractExpiringEmail, {
          customerName: contract.customer.name,
          organizationName: contract.organization.name,
          contractNumber: contract.contractNumber,
          assetName: contract.asset.name,
          expiryDate: formatDate(contract.endDate),
          contractUrl,
        }),
      ),
    ]);
  });
}

export async function notifyContractExpired(contractId: string) {
  return safelyRun("notifyContractExpired", async () => {
    const contract = await db.contract.findUnique({
      where: { id: contractId },
      include: {
        organization: true,
        customer: true,
        asset: true,
      },
    });

    if (!contract) {
      return;
    }

    const contractUrl = `${getAppUrl()}/contracts/${contract.id}`;

    await Promise.all([
      createInAppNotifications({
        organizationId: contract.organizationId,
        userIds: await getInternalRecipients(contract.organizationId),
        type: "contract_expired",
        title: `Contract ${contract.contractNumber} expired`,
        message: `${contract.customer.name}'s contract has expired.`,
        link: `/contracts/${contract.id}`,
      }),
      sendEmail(
        contract.customer.email,
        `Contract ${contract.contractNumber} has expired`,
        await renderComponent(ContractExpiredEmail, {
          customerName: contract.customer.name,
          organizationName: contract.organization.name,
          contractNumber: contract.contractNumber,
          assetName: contract.asset.name,
          expiryDate: formatDate(contract.endDate),
          contractUrl,
        }),
      ),
    ]);
  });
}

export async function notifyTicketCreated(ticketId: string) {
  return safelyRun("notifyTicketCreated", async () => {
    const ticket = await db.ticket.findUnique({
      where: { id: ticketId },
      include: {
        organization: true,
        customer: true,
        assignedTo: true,
      },
    });

    if (!ticket) {
      return;
    }

    const internalUserIds = await getInternalRecipients(ticket.organizationId);
    if (ticket.assignedToId) {
      internalUserIds.push(ticket.assignedToId);
    }

    await Promise.all([
      createInAppNotifications({
        organizationId: ticket.organizationId,
        userIds: internalUserIds,
        type: "ticket_created",
        title: `Complaint ${ticket.ticketNumber} created`,
        message: `${ticket.customer.name} reported "${ticket.subject}".`,
        link: `/complaints/${ticket.id}`,
      }),
      sendEmail(
        ticket.customer.email,
        `Complaint ${ticket.ticketNumber} has been created`,
        await renderComponent(TicketCreatedEmail, {
          customerName: ticket.customer.name,
          organizationName: ticket.organization.name,
          ticketNumber: ticket.ticketNumber,
          subject: ticket.subject,
          priority: ticket.priority.toLowerCase(),
          ticketUrl: `${getAppUrl()}/complaints/${ticket.id}`,
        }),
      ),
    ]);
  });
}

export async function notifyTicketResolved(ticketId: string) {
  return safelyRun("notifyTicketResolved", async () => {
    const ticket = await db.ticket.findUnique({
      where: { id: ticketId },
      include: {
        organization: true,
        customer: true,
        timeline: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    if (!ticket) {
      return;
    }

    const note = ticket.timeline[0]?.note || undefined;

    await Promise.all([
      createInAppNotifications({
        organizationId: ticket.organizationId,
        userIds: await getInternalRecipients(ticket.organizationId),
        type: "ticket_resolved",
        title: `Complaint ${ticket.ticketNumber} resolved`,
        message: `${ticket.customer.name}'s complaint was marked resolved.`,
        link: `/complaints/${ticket.id}`,
      }),
      sendEmail(
        ticket.customer.email,
        `Complaint ${ticket.ticketNumber} resolved`,
        await renderComponent(TicketResolvedEmail, {
          customerName: ticket.customer.name,
          organizationName: ticket.organization.name,
          ticketNumber: ticket.ticketNumber,
          subject: ticket.subject,
          resolutionNote: note,
          ticketUrl: `${getAppUrl()}/complaints/${ticket.id}`,
        }),
      ),
    ]);
  });
}

export async function notifyJobAssigned(jobId: string) {
  return safelyRun("notifyJobAssigned", async () => {
    const job = await db.job.findUnique({
      where: { id: jobId },
      include: {
        organization: true,
        customer: true,
        asset: true,
        technician: true,
      },
    });

    if (!job) {
      return;
    }

    await Promise.all([
      createInAppNotifications({
        organizationId: job.organizationId,
        userIds: [job.technicianId],
        type: "job_assigned",
        title: `Job ${job.jobNumber} assigned`,
        message: `You have been assigned a job for ${job.customer.name}.`,
        link: `/jobs/${job.id}`,
      }),
      sendEmail(
        job.technician.email,
        `Job ${job.jobNumber} assigned to you`,
        await renderComponent(JobScheduledEmail, {
          technicianName: job.technician.name,
          organizationName: job.organization.name,
          jobNumber: job.jobNumber,
          customerName: job.customer.name,
          assetName: job.asset?.name ?? "Unassigned asset",
          scheduledDate: formatDate(job.scheduledDate),
          jobUrl: `${getAppUrl()}/jobs/${job.id}`,
        }),
      ),
      sendPushToUser(job.technicianId, {
        title: `Job ${job.jobNumber} assigned`,
        body: `You have been assigned a job for ${job.customer.name}.`,
        data: { type: "job", id: job.id },
      }),
    ]);
  });
}

export async function notifyJobCompleted(jobId: string) {
  return safelyRun("notifyJobCompleted", async () => {
    const job = await db.job.findUnique({
      where: { id: jobId },
      include: {
        organization: true,
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            preferredChannel: true,
            whatsappOptOut: true,
          },
        },
        asset: true,
      },
    });

    if (!job) {
      return;
    }

    await Promise.all([
      createInAppNotifications({
        organizationId: job.organizationId,
        userIds: await getInternalRecipients(job.organizationId),
        type: "job_completed",
        title: `Job ${job.jobNumber} completed`,
        message: `${job.customer.name}'s service job has been completed.`,
        link: `/jobs/${job.id}`,
      }),
      sendEmail(
        job.customer.email,
        `Job ${job.jobNumber} completed`,
        await renderComponent(JobCompletedEmail, {
          customerName: job.customer.name,
          organizationName: job.organization.name,
          jobNumber: job.jobNumber,
          assetName: job.asset?.name ?? "Assigned asset",
          completedAt: formatDateTime(job.completedAt ?? new Date()),
          summary: job.serviceReport ?? job.notes ?? undefined,
          jobUrl: `${getAppUrl()}/jobs/${job.id}`,
        }),
      ),
    ]);

    await notifyCustomer(
      {
        id: job.customer.id,
        organizationId: job.organizationId,
        phone: job.customer.phone,
        preferredChannel: job.customer.preferredChannel,
        whatsappOptOut: job.customer.whatsappOptOut,
      },
      "job_completed",
      {
        jobNumber: job.jobNumber,
        summary: job.serviceReport ?? job.notes ?? "",
      },
    );
  });
}

export async function notifyRefundProcessed(refundId: string) {
  return safelyRun("notifyRefundProcessed", async () => {
    const refund = await db.refund.findUnique({
      where: { id: refundId },
      include: {
        payment: {
          include: {
            invoice: {
              include: {
                organization: true,
                customer: true,
              },
            },
          },
        },
      },
    });

    if (!refund) {
      return;
    }

    const invoice = refund.payment.invoice;
    const invoiceUrl = `${getAppUrl()}/invoices/${invoice.id}`;

    await Promise.all([
      createInAppNotifications({
        organizationId: invoice.organizationId,
        userIds: await getInternalRecipients(invoice.organizationId),
        type: "refund_processed",
        title: `Refund processed for ${invoice.invoiceNumber}`,
        message: `A refund of ₹${(refund.amountPaisa / 100).toFixed(2)} was processed for ${invoice.customer.name}.`,
        link: `/invoices/${invoice.id}`,
      }),
      sendEmail(
        invoice.customer.email,
        `Refund processed for ${invoice.invoiceNumber}`,
        await renderComponent(RefundProcessedEmail, {
          customerName: invoice.customer.name,
          organizationName: invoice.organization.name,
          invoiceNumber: invoice.invoiceNumber,
          refundAmount: refund.amountPaisa / 100,
          reason: refund.reason,
          invoiceUrl,
        }),
      ),
    ]);
  });
}

export async function notifyWelcomeUser(userId: string) {
  return safelyRun("notifyWelcomeUser", async () => {
    const user = await db.user.findUnique({
      where: { id: userId },
      include: {
        organization: true,
      },
    });

    if (!user) {
      return;
    }

    await Promise.all([
      createInAppNotifications({
        organizationId: user.organizationId!,
        userIds: [user.id],
        type: "welcome",
        title: `Welcome to ${user.organization!.name}`,
        message: "Your account is ready and you can start using the dashboard.",
        link: "/",
      }),
      sendEmail(
        user.email,
        `Welcome to ${user.organization!.name}`,
        await renderComponent(WelcomeEmail, {
          recipientName: user.name,
          organizationName: user.organization!.name,
          recipientType: "user",
          dashboardUrl: getAppUrl(),
        }),
      ),
    ]);
  });
}

export async function notifyJobRescheduled(jobId: string) {
  return safelyRun("notifyJobRescheduled", async () => {
    const job = await db.job.findUnique({
      where: { id: jobId },
      include: {
        organization: true,
        customer: true,
        asset: true,
        technician: true,
      },
    });

    if (!job) {
      return;
    }

    const internalUserIds = await getInternalRecipients(job.organizationId);

    await Promise.all([
      createInAppNotifications({
        organizationId: job.organizationId,
        userIds: [...internalUserIds, job.technicianId],
        type: "job_rescheduled",
        title: `Job ${job.jobNumber} rescheduled`,
        message: `Job for ${job.customer.name} has been rescheduled to ${formatDate(job.scheduledDate)}.`,
        link: `/jobs/${job.id}`,
      }),
      sendEmail(
        job.technician.email,
        `Job ${job.jobNumber} rescheduled`,
        await renderComponent(JobScheduledEmail, {
          technicianName: job.technician.name,
          organizationName: job.organization.name,
          jobNumber: job.jobNumber,
          customerName: job.customer.name,
          assetName: job.asset?.name ?? "Unassigned asset",
          scheduledDate: formatDate(job.scheduledDate),
          jobUrl: `${getAppUrl()}/jobs/${job.id}`,
        }),
      ),
      sendPushToUser(job.technicianId, {
        title: `Job ${job.jobNumber} rescheduled`,
        body: `Job for ${job.customer.name} rescheduled to ${formatDate(job.scheduledDate)}.`,
        data: { type: "job", id: job.id },
      }),
    ]);
  });
}

export async function notifyCustomerPaymentReceived(invoiceId: string) {
  return safelyRun("notifyCustomerPaymentReceived", async () => {
    const invoice = await db.invoice.findUnique({
      where: { id: invoiceId },
      select: {
        invoiceNumber: true,
        paidAmount: true,
        organizationId: true,
        customer: {
          select: {
            id: true,
            phone: true,
            preferredChannel: true,
            whatsappOptOut: true,
          },
        },
      },
    });

    if (!invoice) return;

    await notifyCustomer(
      {
        id: invoice.customer.id,
        organizationId: invoice.organizationId,
        phone: invoice.customer.phone,
        preferredChannel: invoice.customer.preferredChannel,
        whatsappOptOut: invoice.customer.whatsappOptOut,
      },
      "payment_received",
      {
        invoiceNumber: invoice.invoiceNumber,
        amount: String(invoice.paidAmount),
      },
    );
  });
}

export async function notifyTicketAssigned(ticketId: string) {
  return safelyRun("notifyTicketAssigned", async () => {
    const ticket = await db.ticket.findUnique({
      where: { id: ticketId },
      include: {
        organization: true,
        customer: true,
        assignedTo: true,
      },
    });

    if (!ticket || !ticket.assignedToId || !ticket.assignedTo) {
      return;
    }

    await Promise.all([
      createInAppNotifications({
        organizationId: ticket.organizationId,
        userIds: [ticket.assignedToId],
        type: "ticket_assigned",
        title: `Complaint ${ticket.ticketNumber} assigned`,
        message: `${ticket.customer.name}'s complaint "${ticket.subject}" has been assigned to you.`,
        link: `/complaints/${ticket.id}`,
      }),
      sendEmail(
        ticket.assignedTo.email,
        `Complaint ${ticket.ticketNumber} assigned to you`,
        await renderComponent(TicketCreatedEmail, {
          customerName: ticket.customer.name,
          organizationName: ticket.organization.name,
          ticketNumber: ticket.ticketNumber,
          subject: ticket.subject,
          priority: ticket.priority.toLowerCase(),
          ticketUrl: `${getAppUrl()}/complaints/${ticket.id}`,
        }),
      ),
      sendPushToUser(ticket.assignedToId, {
        title: `Complaint ${ticket.ticketNumber} assigned`,
        body: `${ticket.customer.name}'s complaint "${ticket.subject}" assigned to you.`,
        data: { type: "complaint", id: ticket.id },
      }),
    ]);
  });
}
