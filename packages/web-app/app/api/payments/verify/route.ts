import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { getInvoiceDetailForOrganization } from "@/lib/queries/invoices";
import {
  finalizeCapturedPayment,
  revalidatePaymentPaths,
  verifyPaymentSignature,
} from "@/lib/razorpay";

export const runtime = "nodejs";

const verifyPaymentSchema = z.object({
  invoiceId: z.string().uuid("Invalid invoice id"),
  razorpayOrderId: z.string().trim().min(1, "Missing Razorpay order id"),
  razorpayPaymentId: z.string().trim().min(1, "Missing Razorpay payment id"),
  razorpaySignature: z.string().trim().min(1, "Missing Razorpay signature"),
});

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user?.organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = verifyPaymentSchema.parse(await request.json());
    const invoice = await db.invoice.findFirst({
      where: {
        id: body.invoiceId,
        organizationId: user.organizationId,
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

    const detail = await getInvoiceDetailForOrganization(
      user.organizationId,
      result.invoiceId,
    );

    return NextResponse.json({
      success: true,
      data: detail,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid payment verification request" },
        { status: 400 },
      );
    }

    console.error("Verify Razorpay payment failed", error);

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to verify payment" },
      { status: 500 },
    );
  }
}
