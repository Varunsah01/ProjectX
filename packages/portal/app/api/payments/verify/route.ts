import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePortalAuth } from "@/lib/portal-auth";
import { db } from "@/lib/db";
import {
  finalizeCapturedPayment,
  revalidatePaymentPaths,
  verifyPaymentSignature,
} from "@/lib/razorpay";
import { rateLimit } from "@/lib/security/rate-limit";

export const runtime = "nodejs";

const verifyPaymentSchema = z.object({
  invoiceId: z.string().uuid("Invalid invoice id"),
  razorpayOrderId: z.string().trim().min(1, "Missing Razorpay order id"),
  razorpayPaymentId: z.string().trim().min(1, "Missing Razorpay payment id"),
  razorpaySignature: z.string().trim().min(1, "Missing Razorpay signature"),
});

export async function POST(request: Request) {
  try {
    const session = await requirePortalAuth();
    const { customerId, organizationId } = session.user;

    const rl = await rateLimit(`portal:verify:${customerId}`, { limit: 10, windowMs: 60_000 });
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const body = verifyPaymentSchema.parse(await request.json());

    const invoice = await db.invoice.findFirst({
      where: {
        id: body.invoiceId,
        customerId,
        organizationId,
      },
      select: {
        id: true,
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    const payment = await db.payment.findUnique({
      where: {
        razorpayOrderId: body.razorpayOrderId,
      },
      select: {
        invoiceId: true,
      },
    });

    if (!payment || payment.invoiceId !== invoice.id) {
      return NextResponse.json({ error: "Payment order not found" }, { status: 404 });
    }

    const isValidSignature = verifyPaymentSignature({
      orderId: body.razorpayOrderId,
      paymentId: body.razorpayPaymentId,
      signature: body.razorpaySignature,
    });

    if (!isValidSignature) {
      return NextResponse.json({ error: "Invalid payment signature" }, { status: 400 });
    }

    const result = await finalizeCapturedPayment({
      razorpayOrderId: body.razorpayOrderId,
      razorpayPaymentId: body.razorpayPaymentId,
      method: "razorpay",
    });

    revalidatePaymentPaths(result.invoiceId);

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid payment verification request" },
        { status: 400 },
      );
    }

    console.error("Failed to verify payment", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to verify payment" },
      { status: 500 },
    );
  }
}
