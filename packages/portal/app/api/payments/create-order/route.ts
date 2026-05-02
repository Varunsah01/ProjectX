import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePortalAuth } from "@/lib/portal-auth";
import { db } from "@/lib/db";
import { createPaymentOrder, createPendingPayment } from "@/lib/razorpay";
import { rateLimit } from "@/lib/security/rate-limit";

export const runtime = "nodejs";

const createOrderSchema = z.object({
  invoiceId: z.string().uuid("Invalid invoice id"),
  amount: z.number().int().positive().optional(),
});

const payableStatuses = new Set(["ISSUED", "OVERDUE", "PARTIAL"]);

export async function POST(request: Request) {
  try {
    const session = await requirePortalAuth();
    const { customerId, organizationId } = session.user;

    const rl = await rateLimit(`portal:payment:${customerId}`, { limit: 5, windowMs: 60_000 });
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const body = createOrderSchema.parse(await request.json());
    const invoice = await db.invoice.findFirst({
      where: {
        id: body.invoiceId,
        customerId,
        organizationId,
        status: { not: "DRAFT" },
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
        organizationId,
        source: "customer-portal",
      },
    });

    await createPendingPayment({
      invoiceId: invoice.id,
      razorpayOrderId: order.id,
      amount,
    });

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
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid payment request" },
        { status: 400 },
      );
    }

    console.error("Failed to create payment order", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to create payment order" },
      { status: 500 },
    );
  }
}
