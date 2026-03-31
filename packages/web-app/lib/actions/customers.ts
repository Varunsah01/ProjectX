"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole, UserRole } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { getCustomerDetailForOrganization, listCustomersForOrganization } from "@/lib/queries/customers";
import { actionFailure, actionSuccess, getActionError } from "@/lib/query-utils";
import { createCustomerSchema, updateCustomerSchema } from "@/lib/validations/customer";

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
