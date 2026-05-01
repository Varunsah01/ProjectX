import {
  finalizeCapturedPayment,
  markPaymentFailed,
  revalidatePaymentPaths,
} from "@/lib/razorpay";

export interface RazorpayWebhookEvent {
  id?: string;
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

export async function processWebhookEvent(
  event: RazorpayWebhookEvent,
): Promise<void> {
  const paymentEntity = event.payload?.payment?.entity;

  if (!paymentEntity?.order_id) {
    return;
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
}
