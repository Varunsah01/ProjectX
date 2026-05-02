import type { Prisma } from "@prisma/client";
import {
  enumToUi,
  toDateString,
  toDateTimeString,
  toUiBillingCycle,
} from "@/lib/query-utils";
import type {
  PortalInvoice,
  PortalContract,
  PortalJob,
  PortalTicket,
  PortalInvoiceItem,
  PortalPayment,
  PortalTicketTimelineEntry,
} from "@/lib/portal-types";

// -- Prisma includes for portal queries --

export const portalInvoiceInclude = {
  items: true,
  payments: {
    orderBy: { createdAt: "desc" as const },
    include: {
      refunds: {
        orderBy: { createdAt: "desc" as const },
      },
    },
  },
} satisfies Prisma.InvoiceInclude;

export const portalContractInclude = {
  asset: { select: { id: true, name: true } },
  plan: { select: { id: true, name: true } },
} satisfies Prisma.ContractInclude;

export const portalJobInclude = {
  asset: { select: { id: true, name: true } },
  technician: { select: { id: true, name: true } },
} satisfies Prisma.JobInclude;

export const portalTicketInclude = {
  asset: { select: { id: true, name: true } },
  timeline: {
    orderBy: { createdAt: "asc" as const },
    include: {
      byUser: { select: { name: true } },
    },
  },
} satisfies Prisma.TicketInclude;

// -- Mapper functions --

export function mapPortalInvoiceItem(
  item: Prisma.InvoiceItemGetPayload<object>,
): PortalInvoiceItem {
  return {
    id: item.id,
    description: item.description,
    qty: item.qty,
    rate: item.rate,
    amount: item.amount,
    hsnSac: item.hsnSac ?? undefined,
    gstRatePercent: item.gstRatePercent != null ? Number(item.gstRatePercent) : undefined,
    taxableAmount: item.taxableAmount ?? undefined,
    cgstAmount: item.cgstAmount ?? undefined,
    sgstAmount: item.sgstAmount ?? undefined,
    igstAmount: item.igstAmount ?? undefined,
  };
}

export function mapPortalPayment(
  payment: Prisma.PaymentGetPayload<object>,
): PortalPayment {
  return {
    id: payment.id,
    razorpayPaymentId: payment.razorpayPaymentId ?? undefined,
    razorpayOrderId: payment.razorpayOrderId,
    amount: payment.amount,
    status: payment.status,
    method: payment.method,
    createdAt: toDateTimeString(payment.createdAt),
  };
}

export function mapPortalInvoice(
  invoice: Prisma.InvoiceGetPayload<{ include: typeof portalInvoiceInclude }>,
): PortalInvoice {
  return {
    id: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    amount: invoice.amount,
    paidAmount: invoice.paidAmount,
    placeOfSupply: invoice.placeOfSupply ?? undefined,
    isInterState: invoice.isInterState ?? undefined,
    subtotalAmount: invoice.subtotalAmount ?? undefined,
    cgstAmount: invoice.cgstAmount ?? undefined,
    sgstAmount: invoice.sgstAmount ?? undefined,
    igstAmount: invoice.igstAmount ?? undefined,
    totalTaxAmount: invoice.totalTaxAmount ?? undefined,
    dueDate: toDateString(invoice.dueDate),
    issuedDate: toDateString(invoice.issuedDate),
    status: enumToUi(invoice.status) as PortalInvoice["status"],
    type: enumToUi(invoice.type),
    contractId: invoice.contractId ?? undefined,
    items: invoice.items.map(mapPortalInvoiceItem),
    payments: invoice.payments.map(mapPortalPayment),
    createdAt: toDateTimeString(invoice.createdAt),
    // Strips: notes (admin-facing)
  };
}

export function mapPortalContract(
  contract: Prisma.ContractGetPayload<{ include: typeof portalContractInclude }>,
): PortalContract {
  return {
    id: contract.id,
    contractNumber: contract.contractNumber,
    assetName: contract.asset.name,
    type: enumToUi(contract.type),
    billingCycle: toUiBillingCycle(contract.billingCycle),
    plan: contract.plan.name,
    startDate: toDateString(contract.startDate),
    endDate: toDateString(contract.endDate),
    status: enumToUi(contract.status),
    value: contract.value,
    visitsCovered: contract.visitsCovered,
    visitsUsed: contract.visitsUsed,
    nextServiceDate: toDateString(contract.nextServiceDate),
    nextBillingDate: toDateString(contract.nextBillingDate),
    // Strips: notes (internal), customerId, assetId, planId, lastBilledDate
  };
}

export function mapPortalJob(
  job: Prisma.JobGetPayload<{ include: typeof portalJobInclude }>,
): PortalJob {
  return {
    id: job.id,
    jobNumber: job.jobNumber,
    type: enumToUi(job.type),
    status: enumToUi(job.status),
    scheduledDate: toDateString(job.scheduledDate),
    completedAt: toDateTimeString(job.completedAt) || undefined,
    technicianName: job.technician.name,
    assetName: job.asset?.name ?? undefined,
    // Strips: notes, serviceReport, customerAddress, technicianId, customerId
  };
}

export function mapPortalTimelineEntry(
  entry: Prisma.TicketTimelineGetPayload<{
    include: { byUser: { select: { name: true } } };
  }>,
  isCustomerEntry: boolean,
): PortalTicketTimelineEntry {
  return {
    id: entry.id,
    date: toDateTimeString(entry.createdAt),
    action: entry.action,
    by: isCustomerEntry ? "You" : "Support Team",
    note: entry.note ?? undefined,
  };
}

export function mapPortalTicket(
  ticket: Prisma.TicketGetPayload<{ include: typeof portalTicketInclude }>,
): PortalTicket {
  return {
    id: ticket.id,
    ticketNumber: ticket.ticketNumber,
    subject: ticket.subject,
    description: ticket.description,
    category: ticket.category,
    priority: enumToUi(ticket.priority),
    status: enumToUi(ticket.status),
    createdAt: toDateTimeString(ticket.createdAt),
    resolvedAt: toDateTimeString(ticket.resolvedAt) || undefined,
    slaDeadline: toDateTimeString(ticket.slaDeadline),
    assetName: ticket.asset?.name ?? undefined,
    timeline: ticket.timeline.map((entry) =>
      mapPortalTimelineEntry(entry, !entry.byUserId),
    ),
    // Strips: customerId, assetId, assignedTo, assignedTechnicianId, updatedAt
  };
}
