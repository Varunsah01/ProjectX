"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole, UserRole } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { notifyTicketCreated, notifyTicketResolved } from "@/lib/notifications";
import { cleanOptional, getNextNumber, getSlaDeadline } from "@/lib/actions/helpers";
import { getTicketDetailForOrganization, listTicketsForOrganization } from "@/lib/queries/tickets";
import { actionFailure, actionSuccess, getActionError } from "@/lib/query-utils";
import {
  assignTicketSchema,
  createTicketSchema,
  resolveTicketSchema,
  updateTicketSchema,
} from "@/lib/validations/ticket";

const listTicketsSchema = z.object({
  search: z.string().optional(),
  status: z.string().optional(),
  type: z.string().optional(),
  category: z.string().optional(),
  page: z.number().int().min(1).optional(),
  pageSize: z.number().int().min(1).max(100).optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
});

export async function listTicketsAction(input: z.infer<typeof listTicketsSchema> = {}) {
  try {
    const user = await requireRole([UserRole.ADMIN, UserRole.MANAGER, UserRole.AGENT]);
    const params = listTicketsSchema.parse(input);
    const data = await listTicketsForOrganization(user.organizationId, params);
    return actionSuccess(data);
  } catch (error) {
    return actionFailure(getActionError(error, "Failed to load complaints"));
  }
}

export async function createTicketAction(input: unknown) {
  try {
    const user = await requireRole([UserRole.ADMIN, UserRole.MANAGER, UserRole.AGENT]);
    const values = createTicketSchema.parse(input);
    const ticket = await db.ticket.create({
      data: {
        organizationId: user.organizationId,
        ticketNumber: await getNextNumber("TKT", user.organizationId, "ticket"),
        customerId: values.customerId,
        assetId: values.assetId || null,
        subject: values.subject,
        description: values.description,
        category: values.category,
        priority: values.priority.toUpperCase() as never,
        status: values.assignedToId ? "ASSIGNED" : "OPEN",
        assignedToId: values.assignedToId || null,
        slaDeadline: getSlaDeadline(values.priority),
        timeline: {
          create: [
            {
              organizationId: user.organizationId,
              byUserId: user.id,
              action: "Ticket created",
              note: cleanOptional(values.description),
            },
            ...(values.assignedToId
              ? [
                  {
                    organizationId: user.organizationId,
                    byUserId: user.id,
                    action: "Technician assigned",
                    note: null,
                  },
                ]
              : []),
          ],
        },
      },
    });

    const detail = await getTicketDetailForOrganization(user.organizationId, ticket.id);
    await notifyTicketCreated(ticket.id);
    revalidatePath("/complaints");
    revalidatePath(`/complaints/${ticket.id}`);
    revalidatePath("/");
    return actionSuccess(detail!.ticket);
  } catch (error) {
    return actionFailure(getActionError(error, "Failed to create complaint"));
  }
}

export async function updateTicketAction(input: unknown) {
  try {
    const user = await requireRole([UserRole.ADMIN, UserRole.MANAGER, UserRole.AGENT]);
    const values = updateTicketSchema.parse(input);
    const existing = await db.ticket.findFirst({
      where: { id: values.id, organizationId: user.organizationId },
    });

    if (!existing) {
      return actionFailure("Complaint not found");
    }

    await db.ticket.update({
      where: { id: values.id },
      data: {
        ...(values.customerId ? { customerId: values.customerId } : {}),
        ...(values.assetId !== undefined ? { assetId: values.assetId || null } : {}),
        ...(values.subject !== undefined ? { subject: values.subject } : {}),
        ...(values.description !== undefined ? { description: values.description } : {}),
        ...(values.category !== undefined ? { category: values.category } : {}),
        ...(values.priority !== undefined ? { priority: values.priority.toUpperCase() as never } : {}),
        ...(values.status !== undefined ? { status: values.status.toUpperCase() as never } : {}),
        ...(values.assignedToId !== undefined ? { assignedToId: values.assignedToId || null } : {}),
        ...(values.resolvedAt !== undefined
          ? { resolvedAt: values.resolvedAt ? new Date(values.resolvedAt) : null }
          : {}),
      },
    });

    const detail = await getTicketDetailForOrganization(user.organizationId, values.id);
    await notifyTicketResolved(values.id);
    revalidatePath("/complaints");
    revalidatePath(`/complaints/${values.id}`);
    revalidatePath("/");
    return actionSuccess(detail!.ticket);
  } catch (error) {
    return actionFailure(getActionError(error, "Failed to update complaint"));
  }
}

export async function assignTicketAction(input: unknown) {
  try {
    const user = await requireRole([UserRole.ADMIN, UserRole.MANAGER, UserRole.AGENT]);
    const values = assignTicketSchema.parse(input);
    const existing = await db.ticket.findFirst({
      where: { id: values.id, organizationId: user.organizationId },
    });

    if (!existing) {
      return actionFailure("Complaint not found");
    }

    await db.ticket.update({
      where: { id: values.id },
      data: {
        assignedToId: values.assignedToId,
        status: existing.status === "OPEN" ? "ASSIGNED" : existing.status,
        timeline: {
          create: {
            organizationId: user.organizationId,
            byUserId: user.id,
            action: "Technician assigned",
            note: null,
          },
        },
      },
    });

    const detail = await getTicketDetailForOrganization(user.organizationId, values.id);
    revalidatePath("/complaints");
    revalidatePath(`/complaints/${values.id}`);
    return actionSuccess(detail!.ticket);
  } catch (error) {
    return actionFailure(getActionError(error, "Failed to assign technician"));
  }
}

export async function resolveTicketAction(input: unknown) {
  try {
    const user = await requireRole([UserRole.ADMIN, UserRole.MANAGER, UserRole.AGENT]);
    const values = resolveTicketSchema.parse(input);
    const existing = await db.ticket.findFirst({
      where: { id: values.id, organizationId: user.organizationId },
    });

    if (!existing) {
      return actionFailure("Complaint not found");
    }

    await db.ticket.update({
      where: { id: values.id },
      data: {
        status: "RESOLVED",
        resolvedAt: new Date(),
        timeline: {
          create: {
            organizationId: user.organizationId,
            byUserId: user.id,
            action: "Ticket resolved",
            note: cleanOptional(values.note),
          },
        },
      },
    });

    const detail = await getTicketDetailForOrganization(user.organizationId, values.id);
    revalidatePath("/complaints");
    revalidatePath(`/complaints/${values.id}`);
    revalidatePath("/");
    return actionSuccess(detail!.ticket);
  } catch (error) {
    return actionFailure(getActionError(error, "Failed to resolve complaint"));
  }
}

export async function deleteTicketAction(id: string) {
  try {
    const user = await requireRole([UserRole.ADMIN, UserRole.MANAGER]);
    const deleted = await db.ticket.deleteMany({
      where: { id, organizationId: user.organizationId },
    });

    if (!deleted.count) {
      return actionFailure("Complaint not found");
    }

    revalidatePath("/complaints");
    revalidatePath("/");
    return actionSuccess({ id });
  } catch (error) {
    return actionFailure(getActionError(error, "Failed to delete complaint"));
  }
}
