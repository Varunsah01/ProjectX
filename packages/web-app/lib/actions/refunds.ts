"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { requireRole, UserRole } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { actionFailure, actionSuccess, getActionError } from "@/lib/query-utils";
import { createRazorpayRefund } from "@/lib/razorpay";

const initiateRefundSchema = z.object({
  paymentId: z.string().uuid("Invalid payment id"),
  amountPaisa: z.number().int().positive("Refund amount must be greater than zero"),
  reason: z.string().trim().min(1, "Reason is required").max(500, "Reason is too long"),
});

export type InitiateRefundInput = z.infer<typeof initiateRefundSchema>;

export async function initiateRefund(input: unknown) {
  try {
    const user = await requireRole([UserRole.ADMIN, UserRole.MANAGER]);
    const values = initiateRefundSchema.parse(input);

    const payment = await db.payment.findFirst({
      where: {
        id: values.paymentId,
        invoice: { organizationId: user.organizationId },
      },
      include: {
        invoice: { select: { id: true, organizationId: true } },
      },
    });

    if (!payment) {
      return actionFailure("Payment not found");
    }

    if (payment.status !== "captured") {
      return actionFailure("Refunds can only be initiated on captured payments");
    }

    if (!payment.razorpayPaymentId) {
      return actionFailure("Payment is not linked to a Razorpay transaction");
    }

    const refundable = payment.amount - payment.refundedAmountPaisa;

    if (values.amountPaisa > refundable) {
      return actionFailure(
        `Refund amount exceeds the refundable balance (${refundable} paisa available)`,
      );
    }

    const refund = await db.refund.create({
      data: {
        paymentId: payment.id,
        amountPaisa: values.amountPaisa,
        reason: values.reason,
        status: "PENDING",
        notes: {} as Prisma.InputJsonValue,
        initiatedById: user.id,
      },
    });

    try {
      const razorpayRefund = await createRazorpayRefund({
        razorpayPaymentId: payment.razorpayPaymentId,
        amountPaisa: values.amountPaisa,
        notes: {
          internalRefundId: refund.id,
          reason: values.reason,
        },
      });

      await db.refund.update({
        where: { id: refund.id },
        data: {
          razorpayRefundId: razorpayRefund.id,
          notes: {
            internalRefundId: refund.id,
            reason: values.reason,
          } as Prisma.InputJsonValue,
        },
      });
    } catch (error) {
      await db.refund.update({
        where: { id: refund.id },
        data: { status: "FAILED" },
      });
      throw error;
    }

    revalidatePath("/invoices");
    revalidatePath(`/invoices/${payment.invoiceId}`);

    return actionSuccess({ refundId: refund.id });
  } catch (error) {
    return actionFailure(getActionError(error, "Failed to initiate refund"));
  }
}
