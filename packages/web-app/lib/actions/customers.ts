"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole, UserRole } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { getCustomerDetailForOrganization, listCustomersForOrganization } from "@/lib/queries/customers";
import { actionFailure, actionSuccess, getActionError } from "@/lib/query-utils";
import { createCustomerSchema, updateCustomerSchema } from "@/lib/validations/customer";

const importCustomerRowSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  phone: z.string().trim().min(1, "Phone is required"),
  email: z.string().trim().email("Invalid email").or(z.literal("")).default(""),
  address: z.string().trim().default(""),
  city: z.string().trim().default(""),
  gst: z.string().trim().optional().or(z.literal("")),
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
    const customer = await db.customer.create({
      data: {
        organizationId: user.organizationId,
        name: values.name,
        phone: values.phone,
        email: values.email,
        address: values.address,
        city: values.city,
        gst: values.gst || null,
        category: values.category,
        status: values.status.toUpperCase() as never,
      },
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

    await db.customer.update({
      where: { id: values.id },
      data: {
        ...(values.name !== undefined ? { name: values.name } : {}),
        ...(values.phone !== undefined ? { phone: values.phone } : {}),
        ...(values.email !== undefined ? { email: values.email } : {}),
        ...(values.address !== undefined ? { address: values.address } : {}),
        ...(values.city !== undefined ? { city: values.city } : {}),
        ...(values.gst !== undefined ? { gst: values.gst || null } : {}),
        ...(values.category !== undefined ? { category: values.category } : {}),
        ...(values.status !== undefined ? { status: values.status.toUpperCase() as never } : {}),
      },
    });

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
      await db.customer.createMany({
        data: newRows.map((r) => ({
          organizationId: user.organizationId,
          name: r.name,
          phone: r.phone,
          email: r.email,
          address: r.address,
          city: r.city,
          gst: r.gst || null,
          category: r.category,
          status: "ACTIVE" as never,
        })),
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

export async function deleteCustomerAction(id: string) {
  try {
    const user = await requireRole([UserRole.ADMIN, UserRole.MANAGER]);
    const deleted = await db.customer.deleteMany({
      where: {
        id,
        organizationId: user.organizationId,
      },
    });

    if (!deleted.count) {
      return actionFailure("Customer not found");
    }

    revalidatePath("/customers");
    revalidatePath("/");
    return actionSuccess({ id });
  } catch (error) {
    return actionFailure(getActionError(error, "Failed to delete customer"));
  }
}
