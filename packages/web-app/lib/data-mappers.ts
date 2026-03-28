import type { Prisma, UserRole } from "@prisma/client";
import {
  enumToUi,
  roleToUi,
  safelyParseJson,
  toDateString,
  toDateTimeString,
} from "@/lib/query-utils";
import { toUiBillingCycle } from "@/lib/billing";
import type {
  Asset,
  AuditLogEntry,
  Contract,
  Customer,
  Invoice,
  InvoiceItem,
  Job,
  Plan,
  TeamMember,
  Technician,
  Ticket,
  TicketTimelineEntry,
} from "@/lib/types";

export const customerSummaryInclude = {
  assets: {
    select: {
      id: true,
    },
  },
  invoices: {
    select: {
      id: true,
      amount: true,
      paidAmount: true,
      status: true,
    },
  },
} satisfies Prisma.CustomerInclude;

export const assetDetailsInclude = {
  customer: {
    select: {
      id: true,
      name: true,
      address: true,
      city: true,
    },
  },
} satisfies Prisma.AssetInclude;

export const contractDetailsInclude = {
  customer: {
    select: {
      id: true,
      name: true,
    },
  },
  asset: {
    select: {
      id: true,
      name: true,
    },
  },
  plan: {
    select: {
      id: true,
      name: true,
    },
  },
} satisfies Prisma.ContractInclude;

export const invoiceDetailsInclude = {
  customer: {
    select: {
      id: true,
      name: true,
    },
  },
  items: true,
} satisfies Prisma.InvoiceInclude;

export const ticketDetailsInclude = {
  customer: {
    select: {
      id: true,
      name: true,
    },
  },
  asset: {
    select: {
      id: true,
      name: true,
    },
  },
  assignedTo: {
    select: {
      id: true,
      name: true,
    },
  },
  timeline: {
    orderBy: {
      createdAt: "asc",
    },
    include: {
      byUser: {
        select: {
          name: true,
        },
      },
    },
  },
} satisfies Prisma.TicketInclude;

export const jobDetailsInclude = {
  customer: {
    select: {
      id: true,
      name: true,
      address: true,
      city: true,
    },
  },
  asset: {
    select: {
      id: true,
      name: true,
    },
  },
  technician: {
    select: {
      id: true,
      name: true,
    },
  },
} satisfies Prisma.JobInclude;

export const technicianSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  territory: true,
  status: true,
  activeJobs: true,
  completedToday: true,
  rating: true,
  specialization: true,
  totalJobs: true,
  avgRating: true,
  completedThisWeek: true,
  completedThisMonth: true,
  createdAt: true,
  skills: true,
  role: true,
  lastActiveAt: true,
} satisfies Prisma.UserSelect;

export function mapCustomer(
  customer: Prisma.CustomerGetPayload<{ include: typeof customerSummaryInclude }>,
): Customer {
  const activeInvoiceStatuses = new Set(["ISSUED", "OVERDUE", "PARTIAL"]);
  const totalPaid = customer.invoices.reduce((sum, invoice) => sum + invoice.paidAmount, 0);
  const totalDue = customer.invoices.reduce((sum, invoice) => {
    if (!activeInvoiceStatuses.has(invoice.status)) {
      return sum;
    }

    return sum + Math.max(0, invoice.amount - invoice.paidAmount);
  }, 0);

  return {
    id: customer.id,
    name: customer.name,
    phone: customer.phone,
    email: customer.email,
    address: customer.address,
    city: customer.city,
    gst: customer.gst ?? undefined,
    status: enumToUi(customer.status),
    category: customer.category,
    totalDue,
    totalPaid,
    assetsCount: customer.assets.length,
    createdAt: toDateString(customer.createdAt),
    updatedAt: toDateTimeString(customer.updatedAt),
  };
}

export function mapAsset(
  asset: Prisma.AssetGetPayload<{ include: typeof assetDetailsInclude }>,
): Asset {
  return {
    id: asset.id,
    customerId: asset.customerId,
    customerName: asset.customer.name,
    name: asset.name,
    model: asset.model,
    serialNumber: asset.serialNumber,
    installationDate: toDateString(asset.installationDate),
    warrantyEnd: toDateString(asset.warrantyEnd),
    amcStatus: asset.amcStatus ?? "No Coverage",
    status: enumToUi(asset.status),
    lastServiceDate: toDateString(asset.lastServiceDate),
    nextServiceDate: toDateString(asset.nextServiceDate),
    category: asset.category,
    location: asset.location ?? undefined,
    notes: asset.notes ?? undefined,
  };
}

export function mapInvoiceItem(item: Prisma.InvoiceItemGetPayload<object>): InvoiceItem {
  return {
    id: item.id,
    description: item.description,
    qty: item.qty,
    rate: item.rate,
    amount: item.amount,
  };
}

export function mapInvoice(
  invoice: Prisma.InvoiceGetPayload<{ include: typeof invoiceDetailsInclude }>,
): Invoice {
  return {
    id: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    customerId: invoice.customerId,
    customerName: invoice.customer.name,
    amount: invoice.amount,
    paidAmount: invoice.paidAmount,
    dueDate: toDateString(invoice.dueDate),
    issuedDate: toDateString(invoice.issuedDate),
    status: enumToUi(invoice.status),
    items: invoice.items.map(mapInvoiceItem),
    type: enumToUi(invoice.type),
    contractId: invoice.contractId ?? undefined,
    notes: invoice.notes ?? undefined,
    createdAt: toDateTimeString(invoice.createdAt),
    updatedAt: toDateTimeString(invoice.updatedAt),
  };
}

export function mapTicketTimelineEntry(
  entry: Prisma.TicketTimelineGetPayload<{
    include: {
      byUser: {
        select: {
          name: true;
        };
      };
    };
  }>,
): TicketTimelineEntry {
  return {
    id: entry.id,
    date: toDateTimeString(entry.createdAt),
    action: entry.action,
    by: entry.byUser.name,
    note: entry.note ?? undefined,
  };
}

export function mapTicket(
  ticket: Prisma.TicketGetPayload<{ include: typeof ticketDetailsInclude }>,
): Ticket {
  return {
    id: ticket.id,
    ticketNumber: ticket.ticketNumber,
    customerId: ticket.customerId,
    customerName: ticket.customer.name,
    assetId: ticket.assetId ?? undefined,
    assetName: ticket.asset?.name ?? undefined,
    subject: ticket.subject,
    description: ticket.description,
    category: ticket.category,
    priority: enumToUi(ticket.priority),
    status: enumToUi(ticket.status),
    assignedTo: ticket.assignedTo?.name ?? undefined,
    assignedTechnicianId: ticket.assignedToId ?? undefined,
    createdAt: toDateTimeString(ticket.createdAt),
    updatedAt: toDateTimeString(ticket.updatedAt),
    resolvedAt: toDateTimeString(ticket.resolvedAt) || undefined,
    slaDeadline: toDateTimeString(ticket.slaDeadline),
    timeline: ticket.timeline.map(mapTicketTimelineEntry),
  };
}

export function mapJob(
  job: Prisma.JobGetPayload<{ include: typeof jobDetailsInclude }>,
): Job {
  return {
    id: job.id,
    jobNumber: job.jobNumber,
    ticketId: job.ticketId ?? undefined,
    customerId: job.customerId,
    customerName: job.customer.name,
    customerAddress: [job.customer.address, job.customer.city].filter(Boolean).join(", "),
    assetId: job.assetId ?? undefined,
    assetName: job.asset?.name ?? undefined,
    technicianId: job.technicianId,
    technicianName: job.technician.name,
    type: enumToUi(job.type),
    status: enumToUi(job.status),
    scheduledDate: toDateString(job.scheduledDate),
    completedAt: toDateTimeString(job.completedAt) || undefined,
    notes: job.notes ?? undefined,
    serviceReport: job.serviceReport ?? undefined,
  };
}

export function mapContract(
  contract: Prisma.ContractGetPayload<{ include: typeof contractDetailsInclude }>,
): Contract {
  return {
    id: contract.id,
    contractNumber: contract.contractNumber,
    customerId: contract.customerId,
    customerName: contract.customer.name,
    assetId: contract.assetId,
    assetName: contract.asset.name,
    type: enumToUi(contract.type),
    billingCycle: toUiBillingCycle(contract.billingCycle),
    plan: contract.plan.name,
    planId: contract.planId,
    startDate: toDateString(contract.startDate),
    endDate: toDateString(contract.endDate),
    nextBillingDate: toDateString(contract.nextBillingDate),
    lastBilledDate: toDateString(contract.lastBilledDate) || undefined,
    status: enumToUi(contract.status),
    value: contract.value,
    visitsCovered: contract.visitsCovered,
    visitsUsed: contract.visitsUsed,
    nextServiceDate: toDateString(contract.nextServiceDate),
    notes: contract.notes ?? undefined,
  };
}

export function mapPlan(plan: Prisma.PlanGetPayload<object>): Plan {
  return {
    id: plan.id,
    name: plan.name,
    type: enumToUi(plan.type),
    duration: plan.durationMonths,
    price: plan.price,
    visitsCovered: plan.visitsCovered,
    description: plan.description,
    isActive: plan.isActive,
    createdAt: toDateTimeString(plan.createdAt),
    updatedAt: toDateTimeString(plan.updatedAt),
  };
}

export function mapTechnician(
  technician: Prisma.UserGetPayload<{ select: typeof technicianSelect }>,
): Technician {
  return {
    id: technician.id,
    name: technician.name,
    phone: technician.phone ?? "",
    email: technician.email,
    territory: technician.territory ?? "",
    status: (technician.status || "off_duty").toLowerCase() as Technician["status"],
    activeJobs: technician.activeJobs,
    completedToday: technician.completedToday,
    rating: technician.rating,
    specialization: technician.specialization ?? "",
    totalJobs: technician.totalJobs,
    avgRating: technician.avgRating,
    completedThisWeek: technician.completedThisWeek,
    completedThisMonth: technician.completedThisMonth,
    joinDate: toDateString(technician.createdAt),
    skills: technician.skills,
  };
}

export function mapTeamMember(
  member: Prisma.UserGetPayload<object>,
): TeamMember {
  return {
    id: member.id,
    name: member.name,
    email: member.email,
    role: roleToUi(member.role) as TeamMember["role"],
    status: member.status.toLowerCase() === "inactive" ? "inactive" : "active",
    lastActive: toDateTimeString(member.lastActiveAt ?? member.createdAt),
  };
}

export function mapAuditLogEntry(
  log: Prisma.AuditLogGetPayload<{
    include: {
      user: {
        select: {
          name: true;
          email: true;
        };
      };
    };
  }>,
): AuditLogEntry {
  return {
    id: log.id,
    action: log.action,
    entity: log.entity,
    entityId: log.entityId,
    createdAt: toDateTimeString(log.createdAt),
    userName: log.user.name,
    userEmail: log.user.email,
    changes: safelyParseJson<Record<string, unknown>>(log.changes, {}),
  };
}

export function isTechnicianRole(role: UserRole) {
  return role === "TECHNICIAN";
}
