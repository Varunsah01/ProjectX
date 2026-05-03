"use server";

import { requireSupport } from "@/lib/auth-utils";
import { db } from "@/lib/db";

export interface LookupUser {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  status: string;
  orgId: string;
  orgName: string;
  role: string;
}

export interface LookupOrg {
  id: string;
  name: string;
  slug: string;
  email: string;
  phone: string;
}

export interface LookupInvoice {
  id: string;
  invoiceNumber: string;
  organizationId: string;
  customerName: string;
  amount: number;
  status: string;
}

export interface LookupTicket {
  id: string;
  subject: string;
  organizationId: string;
  customerName: string;
  status: string;
}

export interface LookupResults {
  users: LookupUser[];
  orgs: LookupOrg[];
  invoices: LookupInvoice[];
  tickets: LookupTicket[];
}

export async function lookupAccountAction(query: string): Promise<LookupResults> {
  await requireSupport();

  const q = query.trim();
  if (q.length < 3) {
    return { users: [], orgs: [], invoices: [], tickets: [] };
  }

  const [rawUsers, rawOrgs, rawInvoices, rawTickets] = await Promise.all([
    db.user.findMany({
      where: {
        OR: [
          { email: { contains: q, mode: "insensitive" } },
          { phone: { contains: q } },
          { name: { contains: q, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        status: true,
        memberships: {
          select: {
            organizationId: true,
            role: true,
            organization: { select: { name: true } },
          },
          take: 1,
        },
      },
      take: 10,
    }),
    db.organization.findMany({
      where: { name: { contains: q, mode: "insensitive" } },
      select: { id: true, name: true, slug: true, email: true, phone: true },
      take: 10,
    }),
    db.invoice.findMany({
      where: {
        deletedAt: null,
        OR: [
          { invoiceNumber: { contains: q, mode: "insensitive" } },
          { payments: { some: { razorpayPaymentId: { contains: q } } } },
        ],
      },
      select: {
        id: true,
        invoiceNumber: true,
        organizationId: true,
        amount: true,
        status: true,
        customer: { select: { name: true } },
      },
      take: 10,
    }),
    db.ticket.findMany({
      where: {
        OR: [
          { ticketNumber: { contains: q, mode: "insensitive" } },
          { subject: { contains: q, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        subject: true,
        organizationId: true,
        status: true,
        customer: { select: { name: true } },
      },
      take: 10,
    }),
  ]);

  const users: LookupUser[] = rawUsers
    .filter((u) => u.memberships.length > 0)
    .map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      phone: u.phone,
      status: u.status,
      orgId: u.memberships[0].organizationId,
      orgName: u.memberships[0].organization.name,
      role: u.memberships[0].role,
    }));

  const orgs: LookupOrg[] = rawOrgs.map((o) => ({
    id: o.id,
    name: o.name,
    slug: o.slug,
    email: o.email,
    phone: o.phone,
  }));

  const invoices: LookupInvoice[] = rawInvoices.map((inv) => ({
    id: inv.id,
    invoiceNumber: inv.invoiceNumber,
    organizationId: inv.organizationId,
    customerName: inv.customer.name,
    amount: inv.amount,
    status: inv.status,
  }));

  const tickets: LookupTicket[] = rawTickets.map((t) => ({
    id: t.id,
    subject: t.subject,
    organizationId: t.organizationId,
    customerName: t.customer.name,
    status: t.status,
  }));

  return { users, orgs, invoices, tickets };
}
