"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { PreferredChannel } from "@prisma/client";
import { requireRole, UserRole } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { buildAuditLog } from "@/lib/audit/log";
import { getCustomerDetailForOrganization, listCustomersForOrganization } from "@/lib/queries/customers";
import { actionFailure, actionSuccess, getActionError } from "@/lib/query-utils";
import { createCustomerSchema, updateCustomerSchema } from "@/lib/validations/customer";

const importCustomerRowSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  phone: z.string().trim().min(1, "Phone is required"),
  email: z.string().trim().email("Invalid email").or(z.literal("")).default(""),
  address: z.string().trim().default(""),
  city: z.string().trim().default(""),
  gstin: z.string().trim().optional().or(z.literal("")),
  category: z.enum(["Commercial", "Residential"]).default("Residential"),
});

const listCustomersSchema = z.object({
  search: z.string().optional(),
  status: z.string().optional(),
  category: z.string().optional(),
  page: z.number().int().min(1).optional(),
  pageSize: z.number().int().min(1).max(100).optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
});

export async function listCustomersAction(input: z.infer<typeof listCustomersSchema> = {}) {
  try {
    const user = await requireRole([UserRole.ADMIN, UserRole.MANAGER, UserRole.AGENT]);
    const params = listCustomersSchema.parse(input);
    const data = await listCustomersForOrganization(user.organizationId, params);
    return actionSuccess(data);
  } catch (error) {
    return actionFailure(getActionError(error, "Failed to load customers"));
  }
}

export async function createCustomerAction(input: unknown) {
  try {
    const user = await requireRole([UserRole.ADMIN, UserRole.MANAGER, UserRole.AGENT]);
    const values = createCustomerSchema.parse(input);

    const customer = await db.$transaction(async (tx) => {
      const created = await tx.customer.create({
        data: {
          organizationId: user.organizationId,
          name: values.name,
          phone: values.phone,
          email: values.email,
          address: values.address,
          city: values.city,
          gstin: values.gstin || null,
          billingState: values.billingState || null,
          shippingState: values.shippingState || null,
          category: values.category,
          status: values.status.toUpperCase() as never,
        },
      });
      await tx.auditLog.create({
        data: buildAuditLog({
          actor: user,
          action: "CREATE",
          entity: "Customer",
          entityId: created.id,
          after: {
            name: created.name,
            phone: created.phone,
            email: created.email,
            category: created.category,
            status: created.status,
          },
        }),
      });
      return created;
    });

    const detail = await getCustomerDetailForOrganization(user.organizationId, customer.id);
    revalidatePath("/customers");
    revalidatePath("/");
    return actionSuccess(detail!.customer);
  } catch (error) {
    return actionFailure(getActionError(error, "Failed to create customer"));
  }
}

export async function updateCustomerAction(input: unknown) {
  try {
    const user = await requireRole([UserRole.ADMIN, UserRole.MANAGER, UserRole.AGENT]);
    const values = updateCustomerSchema.parse(input);
    const existing = await db.customer.findFirst({
      where: {
        id: values.id,
        organizationId: user.organizationId,
      },
    });

    if (!existing) {
      return actionFailure("Customer not found");
    }

    const updateData = {
      ...(values.name !== undefined ? { name: values.name } : {}),
      ...(values.phone !== undefined ? { phone: values.phone } : {}),
      ...(values.email !== undefined ? { email: values.email } : {}),
      ...(values.address !== undefined ? { address: values.address } : {}),
      ...(values.city !== undefined ? { city: values.city } : {}),
      ...(values.gstin !== undefined ? { gstin: values.gstin || null } : {}),
      ...(values.billingState !== undefined ? { billingState: values.billingState || null } : {}),
      ...(values.shippingState !== undefined ? { shippingState: values.shippingState || null } : {}),
      ...(values.category !== undefined ? { category: values.category } : {}),
      ...(values.status !== undefined ? { status: values.status.toUpperCase() as never } : {}),
    };

    await db.$transaction([
      db.customer.update({ where: { id: values.id }, data: updateData }),
      db.auditLog.create({
        data: buildAuditLog({
          actor: user,
          action: "UPDATE",
          entity: "Customer",
          entityId: values.id,
          before: {
            name: existing.name,
            phone: existing.phone,
            email: existing.email,
            address: existing.address,
            city: existing.city,
            gstin: existing.gstin,
            billingState: existing.billingState,
            shippingState: existing.shippingState,
            category: existing.category,
            status: existing.status,
          },
          after: {
            name: values.name ?? existing.name,
            phone: values.phone ?? existing.phone,
            email: values.email ?? existing.email,
            address: values.address ?? existing.address,
            city: values.city ?? existing.city,
            gstin: values.gstin !== undefined ? (values.gstin || null) : existing.gstin,
            billingState: values.billingState !== undefined ? (values.billingState || null) : existing.billingState,
            shippingState: values.shippingState !== undefined ? (values.shippingState || null) : existing.shippingState,
            category: values.category ?? existing.category,
            status: values.status !== undefined ? values.status.toUpperCase() : existing.status,
          },
        }),
      }),
    ]);

    const detail = await getCustomerDetailForOrganization(user.organizationId, values.id);
    revalidatePath("/customers");
    revalidatePath(`/customers/${values.id}`);
    revalidatePath("/");
    return actionSuccess(detail!.customer);
  } catch (error) {
    return actionFailure(getActionError(error, "Failed to update customer"));
  }
}

export async function bulkImportCustomersAction(rows: unknown[]) {
  try {
    const user = await requireRole([UserRole.ADMIN, UserRole.MANAGER, UserRole.AGENT]);

    if (!Array.isArray(rows) || rows.length === 0) {
      return actionFailure("No rows provided");
    }
    if (rows.length > 500) {
      return actionFailure("Maximum 500 rows per import");
    }

    // Server-side validation
    const validRows: z.infer<typeof importCustomerRowSchema>[] = [];
    const errors: string[] = [];
    for (let i = 0; i < rows.length; i++) {
      const parsed = importCustomerRowSchema.safeParse(rows[i]);
      if (parsed.success) {
        validRows.push(parsed.data);
      } else {
        errors.push(`Row ${i + 1}: ${parsed.error.issues.map((e) => e.message).join(", ")}`);
      }
    }

    // Fetch existing phones in this org to skip duplicates
    const existing = await db.customer.findMany({
      where: { organizationId: user.organizationId },
      select: { phone: true },
    });
    const existingPhones = new Set(existing.map((c) => c.phone));

    const newRows = validRows.filter((r) => !existingPhones.has(r.phone));
    const skipped = validRows.length - newRows.length;

    if (newRows.length > 0) {
      await db.$transaction(async (tx) => {
        await tx.customer.createMany({
          data: newRows.map((r) => ({
            organizationId: user.organizationId,
            name: r.name,
            phone: r.phone,
            email: r.email,
            address: r.address,
            city: r.city,
            gstin: r.gstin || null,
            category: r.category,
            status: "ACTIVE" as never,
          })),
        });
        await tx.auditLog.create({
          data: buildAuditLog({
            actor: user,
            action: "CREATE",
            entity: "Customer",
            entityId: "bulk-import",
            after: { importedCount: newRows.length, skippedCount: skipped },
          }),
        });
      });
    }

    revalidatePath("/customers");
    revalidatePath("/");
    return actionSuccess({ imported: newRows.length, skipped, errors });
  } catch (error) {
    return actionFailure(getActionError(error, "Failed to import customers"));
  }
}

const addCustomerNoteSchema = z.object({
  customerId: z.string().min(1),
  type: z.enum(["call", "meeting", "email", "whatsapp", "note"]),
  note: z.string().min(1, "Note is required"),
});

export async function addCustomerNoteAction(input: unknown) {
  try {
    const user = await requireRole([UserRole.ADMIN, UserRole.MANAGER, UserRole.AGENT]);
    const values = addCustomerNoteSchema.parse(input);

    const customer = await db.customer.findFirst({
      where: { id: values.customerId, organizationId: user.organizationId },
    });

    if (!customer) {
      return actionFailure("Customer not found");
    }

    const record = await db.customerNote.create({
      data: {
        organizationId: user.organizationId,
        customerId: values.customerId,
        userId: user.id,
        type: values.type,
        note: values.note,
      },
      include: {
        user: { select: { name: true } },
      },
    });

    revalidatePath(`/customers/${values.customerId}`);
    return actionSuccess({
      id: record.id,
      type: record.type,
      note: record.note,
      userName: record.user.name,
      createdAt: record.createdAt.toISOString(),
    });
  } catch (error) {
    return actionFailure(getActionError(error, "Failed to add note"));
  }
}

export async function getCustomerNotesAction(customerId: string) {
  try {
    const user = await requireRole([UserRole.ADMIN, UserRole.MANAGER, UserRole.AGENT]);
    const notes = await db.customerNote.findMany({
      where: { customerId, organizationId: user.organizationId },
      include: { user: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    });

    return actionSuccess(
      notes.map((n) => ({
        id: n.id,
        type: n.type,
        note: n.note,
        userName: n.user.name,
        createdAt: n.createdAt.toISOString(),
      })),
    );
  } catch (error) {
    return actionFailure(getActionError(error, "Failed to load notes"));
  }
}

const updateMessagingPreferencesSchema = z.object({
  customerId: z.string().min(1),
  preferredChannel: z.enum(["EMAIL", "SMS", "WHATSAPP"]),
  whatsappOptOut: z.boolean(),
});

export async function updateCustomerMessagingPreferencesAction(input: unknown) {
  try {
    const user = await requireRole([UserRole.ADMIN, UserRole.MANAGER]);
    const values = updateMessagingPreferencesSchema.parse(input);

    await db.customer.update({
      where: { id: values.customerId, organizationId: user.organizationId },
      data: {
        preferredChannel: values.preferredChannel as PreferredChannel,
        whatsappOptOut: values.whatsappOptOut,
      },
    });

    revalidatePath(`/customers/${values.customerId}`);
    return actionSuccess(null);
  } catch (error) {
    return actionFailure(getActionError(error, "Failed to update messaging preferences"));
  }
}

export async function deleteCustomerAction(id: string) {
  try {
    const user = await requireRole([UserRole.ADMIN, UserRole.MANAGER]);

    const existing = await db.customer.findFirst({
      where: { id, organizationId: user.organizationId },
    });

    if (!existing) {
      return actionFailure("Customer not found");
    }

    const now = new Date();
    await db.$transaction([
      db.customer.updateMany({
        where: { id, organizationId: user.organizationId, deletedAt: null },
        data: { deletedAt: now },
      }),
      db.auditLog.create({
        data: buildAuditLog({
          actor: user,
          action: "DELETE",
          entity: "Customer",
          entityId: id,
          before: { name: existing.name, phone: existing.phone, email: existing.email },
        }),
      }),
    ]);

    revalidatePath("/customers");
    revalidatePath("/");
    return actionSuccess({ id });
  } catch (error) {
    return actionFailure(getActionError(error, "Failed to delete customer"));
  }
}

export async function restoreCustomerAction(id: string) {
  try {
    const user = await requireRole([UserRole.ADMIN, UserRole.MANAGER]);

    const existing = await db.customer.findFirst({
      where: { id, organizationId: user.organizationId, deletedAt: { not: null } },
    });

    if (!existing) {
      return actionFailure("Customer not found or not deleted");
    }

    await db.$transaction([
      db.customer.updateMany({
        where: { id, organizationId: user.organizationId },
        data: { deletedAt: null },
      }),
      db.auditLog.create({
        data: buildAuditLog({
          actor: user,
          action: "RESTORE",
          entity: "Customer",
          entityId: id,
          before: { deletedAt: existing.deletedAt },
        }),
      }),
    ]);

    revalidatePath("/customers");
    revalidatePath("/recycle-bin");
    revalidatePath("/");
    return actionSuccess({ id });
  } catch (error) {
    return actionFailure(getActionError(error, "Failed to restore customer"));
  }
}
