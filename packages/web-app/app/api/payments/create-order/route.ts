import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { logger } from "@/lib/log";
import { createPaymentOrder, createPendingPayment } from "@/lib/razorpay";

export const runtime = "nodejs";

const ROUTE_NAME = "payments.create-order";

const createOrderSchema = z.object({
  invoiceId: z.string().uuid("Invalid invoice id"),
  amount: z.number().int().positive().optional(),
});

const payableStatuses = new Set(["ISSUED", "OVERDUE", "PARTIAL"]);

export async function POST(request: Request) {
  const start = Date.now();
  try {
    const user = await getCurrentUser();

    if (!user?.organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = createOrderSchema.parse(await request.json());
    const invoice = await db.invoice.findFirst({
      where: {
        id: body.invoiceId,
        organizationId: user.organizationId,
      },
      include: {
        customer: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    if (!payableStatuses.has(invoice.status)) {
      return NextResponse.json(
        { error: "This invoice is not eligible for online payment" },
        { status: 400 },
      );
    }

    const remainingAmount = Math.max(0, invoice.amount - invoice.paidAmount);

    if (remainingAmount <= 0) {
      return NextResponse.json(
        { error: "This invoice has already been fully paid" },
        { status: 400 },
      );
    }

    const amount = body.amount ?? remainingAmount;

    if (amount > remainingAmount) {
      return NextResponse.json(
        { error: "Payment amount cannot exceed the invoice balance" },
        { status: 400 },
      );
    }

    const order = await createPaymentOrder({
      amount,
      receipt: invoice.invoiceNumber,
      notes: {
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        organizationId: user.organizationId,
      },
    });

    await createPendingPayment({
      invoiceId: invoice.id,
      razorpayOrderId: order.id,
      amount,
    });

    logger.info(
      {
        event: `${ROUTE_NAME}.finish`,
        route: "/api/payments/create-order",
        method: "POST",
        status: 200,
        durationMs: Date.now() - start,
        invoiceId: invoice.id,
        razorpayOrderId: order.id,
      },
      "payment order created",
    );

    return NextResponse.json({
      success: true,
      data: {
        keyId: process.env.RAZORPAY_KEY_ID,
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        customerName: invoice.customer.name,
        customerEmail: invoice.customer.email,
        description: `Payment for ${invoice.invoiceNumber}`,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.info(
        {
          event: `${ROUTE_NAME}.finish`,
          route: "/api/payments/create-order",
          method: "POST",
          status: 400,
          durationMs: Date.now() - start,
          reason: "validation_failed",
        },
        "payment order rejected",
      );
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid payment request" },
        { status: 400 },
      );
    }

    logger.error(
      {
        event: `${ROUTE_NAME}.error`,
        route: "/api/payments/create-order",
        method: "POST",
        status: 500,
        durationMs: Date.now() - start,
        err: error,
      },
      "payment order failed",
    );

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to create payment order" },
      { status: 500 },
    );
  }
}
