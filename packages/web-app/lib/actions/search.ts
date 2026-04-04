"use server";

import { getCurrentUser } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { actionFailure, actionSuccess, getActionError } from "@/lib/query-utils";

export type SearchResult =
  | { type: "customer"; id: string; name: string; city: string }
  | { type: "invoice"; id: string; invoiceNumber: string; customerName: string; status: string }
  | { type: "ticket"; id: string; subject: string; priority: string }
  | { type: "job"; id: string; jobNumber: string; jobType: string };

export async function globalSearchAction(query: string) {
  try {
    const user = await getCurrentUser();
    if (!user?.organizationId) {
      return actionFailure("Unauthorized");
    }

    const orgId = user.organizationId;
    const q = query.trim();

    if (q.length < 2) {
      return actionSuccess<SearchResult[]>([]);
    }

    const mode = "insensitive" as const;

    const [customers, invoices, tickets, jobs] = await Promise.all([
      db.customer.findMany({
        where: {
          organizationId: orgId,
          OR: [
            { name: { contains: q, mode } },
            { phone: { contains: q, mode } },
          ],
        },
        select: { id: true, name: true, city: true },
        take: 3,
      }),
      db.invoice.findMany({
        where: {
          organizationId: orgId,
          invoiceNumber: { contains: q, mode },
        },
        select: {
          id: true,
          invoiceNumber: true,
          status: true,
          customer: { select: { name: true } },
        },
        take: 3,
      }),
      db.ticket.findMany({
        where: {
          organizationId: orgId,
          OR: [
            { ticketNumber: { contains: q, mode } },
            { subject: { contains: q, mode } },
          ],
        },
        select: { id: true, subject: true, priority: true },
        take: 3,
      }),
      db.job.findMany({
        where: {
          organizationId: orgId,
          jobNumber: { contains: q, mode },
        },
        select: { id: true, jobNumber: true, type: true },
        take: 3,
      }),
    ]);

    const results: SearchResult[] = [
      ...customers.map((c) => ({ type: "customer" as const, id: c.id, name: c.name, city: c.city })),
      ...invoices.map((i) => ({
        type: "invoice" as const,
        id: i.id,
        invoiceNumber: i.invoiceNumber,
        customerName: i.customer.name,
        status: i.status,
      })),
      ...tickets.map((t) => ({ type: "ticket" as const, id: t.id, subject: t.subject, priority: t.priority })),
      ...jobs.map((j) => ({ type: "job" as const, id: j.id, jobNumber: j.jobNumber, jobType: j.type })),
    ];

    return actionSuccess(results);
  } catch (error) {
    return actionFailure(getActionError(error, "Search failed"));
  }
}
