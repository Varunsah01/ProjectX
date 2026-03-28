"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { addMonthsPreservingDay } from "@/lib/billing";
import { db } from "@/lib/db";
import {
  notifyInvoiceReminder,
  notifyJobAssigned,
} from "@/lib/notifications";
import {
  actionFailure,
  actionSuccess,
  getActionError,
  getOrganizationContext,
} from "@/lib/query-utils";

const bulkIdsSchema = z
  .array(z.string().uuid("Invalid selection"))
  .min(1, "Select at least one record")
  .transform((ids) => [...new Set(ids)]);

const bulkCustomerStatusSchema = z.object({
  ids: bulkIdsSchema,
  status: z.enum(["active", "inactive", "suspended"]),
});

const bulkInvoiceIdsSchema = z.object({
  ids: bulkIdsSchema,
});

const bulkJobsAssignSchema = z.object({
  ids: bulkIdsSchema,
  technicianId: z.string().uuid("Technician is required"),
});

const bulkTicketsAssignSchema = z.object({
  ids: bulkIdsSchema,
  assignedToId: z.string().uuid("Technician is required"),
});

const revalidatePaths = (paths: string[]) =>
  Promise.all([...new Set(paths)].map((path) => revalidatePath(path)));

export async function bulkUpdateCustomerStatusAction(input: unknown) {
  try {
    const user = await getOrganizationContext();
    const values = bulkCustomerStatusSchema.parse(input);
    const result = await db.customer.updateMany({
      where: {
        organizationId: user.organizationId,
        id: {
          in: values.ids,
        },
      },
      data: {
        status: values.status.toUpperCase() as never,
      },
    });

    await revalidatePaths(["/customers", "/"]);
    return actionSuccess({ count: result.count });
  } catch (error) {
    return actionFailure(getActionError(error, "Failed to update customers"));
  }
}

export async function bulkSendInvoiceRemindersAction(input: unknown) {
  try {
    const user = await getOrganizationContext();
    const values = bulkInvoiceIdsSchema.parse(input);
    const invoices = await db.invoice.findMany({
      where: {
        organizationId: user.organizationId,
        id: {
          in: values.ids,
        },
        status: {
          in: ["ISSUED", "OVERDUE", "PARTIAL"],
        },
      },
      select: {
        id: true,
      },
    });

    await Promise.all(
      invoices.map((invoice) => notifyInvoiceReminder(invoice.id)),
    );

    await revalidatePaths(["/invoices", "/collections", "/"]);
    return actionSuccess({ count: invoices.length });
  } catch (error) {
    return actionFailure(
      getActionError(error, "Failed to send invoice reminders"),
    );
  }
}

export async function bulkMarkInvoicesPaidAction(input: unknown) {
  try {
    const user = await getOrganizationContext();
    const values = bulkInvoiceIdsSchema.parse(input);
    const invoices = await db.invoice.findMany({
      where: {
        organizationId: user.organizationId,
        id: {
          in: values.ids,
        },
        status: {
          not: "CANCELLED",
        },
      },
      select: {
        id: true,
        amount: true,
      },
    });

    await db.$transaction(
      invoices.map((invoice) =>
        db.invoice.update({
          where: {
            id: invoice.id,
          },
          data: {
            paidAmount: invoice.amount,
            status: "PAID",
          },
        }),
      ),
    );

    await revalidatePaths(["/invoices", "/collections", "/"]);
    return actionSuccess({ count: invoices.length });
  } catch (error) {
    return actionFailure(getActionError(error, "Failed to mark invoices paid"));
  }
}

export async function bulkAssignJobsAction(input: unknown) {
  try {
    const user = await getOrganizationContext();
    const values = bulkJobsAssignSchema.parse(input);
    const technician = await db.user.findFirst({
      where: {
        id: values.technicianId,
        organizationId: user.organizationId,
        role: "TECHNICIAN",
      },
      select: {
        id: true,
      },
    });

    if (!technician) {
      return actionFailure("Technician not found");
    }

    const jobs = await db.job.findMany({
      where: {
        organizationId: user.organizationId,
        id: {
          in: values.ids,
        },
        status: {
          notIn: ["COMPLETED", "CANCELLED"],
        },
      },
      select: {
        id: true,
        status: true,
      },
    });

    await db.$transaction(
      jobs.map((job) =>
        db.job.update({
          where: {
            id: job.id,
          },
          data: {
            technicianId: values.technicianId,
            status: job.status === "PENDING" ? "ASSIGNED" : job.status,
          },
        }),
      ),
    );

    await Promise.all(jobs.map((job) => notifyJobAssigned(job.id)));

    await revalidatePaths(["/jobs", "/technicians", "/"]);
    return actionSuccess({ count: jobs.length });
  } catch (error) {
    return actionFailure(getActionError(error, "Failed to assign jobs"));
  }
}

export async function bulkCancelJobsAction(input: unknown) {
  try {
    const user = await getOrganizationContext();
    const values = bulkInvoiceIdsSchema.parse(input);
    const result = await db.job.updateMany({
      where: {
        organizationId: user.organizationId,
        id: {
          in: values.ids,
        },
        status: {
          notIn: ["COMPLETED", "CANCELLED"],
        },
      },
      data: {
        status: "CANCELLED",
      },
    });

    await revalidatePaths(["/jobs", "/technicians", "/"]);
    return actionSuccess({ count: result.count });
  } catch (error) {
    return actionFailure(getActionError(error, "Failed to cancel jobs"));
  }
}

export async function bulkAssignTicketsAction(input: unknown) {
  try {
    const user = await getOrganizationContext();
    const values = bulkTicketsAssignSchema.parse(input);
    const technician = await db.user.findFirst({
      where: {
        id: values.assignedToId,
        organizationId: user.organizationId,
        role: "TECHNICIAN",
      },
      select: {
        id: true,
      },
    });

    if (!technician) {
      return actionFailure("Technician not found");
    }

    const tickets = await db.ticket.findMany({
      where: {
        organizationId: user.organizationId,
        id: {
          in: values.ids,
        },
        status: {
          notIn: ["CLOSED", "RESOLVED"],
        },
      },
      select: {
        id: true,
        status: true,
      },
    });

    await db.$transaction(
      tickets.map((ticket) =>
        db.ticket.update({
          where: {
            id: ticket.id,
          },
          data: {
            assignedToId: values.assignedToId,
            status: ticket.status === "OPEN" ? "ASSIGNED" : ticket.status,
            timeline: {
              create: {
                organizationId: user.organizationId,
                byUserId: user.id,
                action: "Technician assigned",
                note: "Assigned from bulk action",
              },
            },
          },
        }),
      ),
    );

    await revalidatePaths(["/complaints", "/technicians", "/"]);
    return actionSuccess({ count: tickets.length });
  } catch (error) {
    return actionFailure(getActionError(error, "Failed to assign complaints"));
  }
}

export async function bulkCloseTicketsAction(input: unknown) {
  try {
    const user = await getOrganizationContext();
    const values = bulkInvoiceIdsSchema.parse(input);
    const tickets = await db.ticket.findMany({
      where: {
        organizationId: user.organizationId,
        id: {
          in: values.ids,
        },
        status: {
          notIn: ["CLOSED"],
        },
      },
      select: {
        id: true,
        resolvedAt: true,
      },
    });

    await db.$transaction(
      tickets.map((ticket) =>
        db.ticket.update({
          where: {
            id: ticket.id,
          },
          data: {
            status: "CLOSED",
            resolvedAt: ticket.resolvedAt ?? new Date(),
            timeline: {
              create: {
                organizationId: user.organizationId,
                byUserId: user.id,
                action: "Ticket closed",
                note: "Closed from bulk action",
              },
            },
          },
        }),
      ),
    );

    await revalidatePaths(["/complaints", "/"]);
    return actionSuccess({ count: tickets.length });
  } catch (error) {
    return actionFailure(getActionError(error, "Failed to close complaints"));
  }
}

export async function bulkRenewContractsAction(input: unknown) {
  try {
    const user = await getOrganizationContext();
    const values = bulkInvoiceIdsSchema.parse(input);
    const contracts = await db.contract.findMany({
      where: {
        organizationId: user.organizationId,
        id: {
          in: values.ids,
        },
      },
      include: {
        plan: {
          select: {
            durationMonths: true,
          },
        },
      },
    });

    const renewableContracts = contracts.filter((contract) => Boolean(contract.plan));

    await db.$transaction(
      renewableContracts.map((contract) => {
        const renewalStartDate = new Date(contract.endDate);
        renewalStartDate.setDate(renewalStartDate.getDate() + 1);
        renewalStartDate.setHours(0, 0, 0, 0);

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (renewalStartDate < today) {
          renewalStartDate.setTime(today.getTime());
        }

        const renewalEndDate = addMonthsPreservingDay(
          renewalStartDate,
          contract.plan!.durationMonths,
        );
        renewalEndDate.setDate(renewalEndDate.getDate() - 1);

        return db.contract.update({
          where: {
            id: contract.id,
          },
          data: {
            endDate: renewalEndDate,
            nextBillingDate: renewalStartDate,
            lastBilledDate: null,
            status: "ACTIVE",
            visitsUsed: 0,
          },
        });
      }),
    );

    await revalidatePaths(["/contracts", "/"]);
    return actionSuccess({ count: renewableContracts.length });
  } catch (error) {
    return actionFailure(getActionError(error, "Failed to renew contracts"));
  }
}
