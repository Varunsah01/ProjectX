import { NextResponse } from "next/server";
import {
  finalizeCapturedPayment,
  markPaymentFailed,
  revalidatePaymentPaths,
  verifyWebhookSignature,
} from "@/lib/razorpay";

export const runtime = "nodejs";

interface RazorpayWebhookEvent {
  event?: string;
  payload?: {
    payment?: {
      entity?: {
        id?: string;
        order_id?: string;
        method?: string;
      };
    };
  };
}

export async function POST(request: Request) {
  try {
    const payload = await request.text();
    const signature = request.headers.get("x-razorpay-signature");

    if (!verifyWebhookSignature({ payload, signature })) {
      return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 });
    }

    const event = JSON.parse(payload) as RazorpayWebhookEvent;
    const paymentEntity = event.payload?.payment?.entity;

    if (!paymentEntity?.order_id) {
      return NextResponse.json({ received: true });
    }

    if (event.event === "payment.captured" && paymentEntity.id) {
      const result = await finalizeCapturedPayment({
        razorpayOrderId: paymentEntity.order_id,
        razorpayPaymentId: paymentEntity.id,
        method: paymentEntity.method ?? "razorpay",
      });

      revalidatePaymentPaths(result.invoiceId);
    }

    if (event.event === "payment.failed") {
      await markPaymentFailed({
        razorpayOrderId: paymentEntity.order_id,
        razorpayPaymentId: paymentEntity.id,
        method: paymentEntity.method ?? "razorpay",
      });
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Razorpay webhook failed", error);

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to process webhook" },
      { status: 500 },
    );
  }
}
