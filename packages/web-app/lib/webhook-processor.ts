import {
  applyRefundWebhookEvent,
  finalizeCapturedPayment,
  markPaymentFailed,
  revalidatePaymentPaths,
} from "@/lib/razorpay";
import { notifyRefundProcessed } from "@/lib/notifications";

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
    refund?: {
      entity?: {
        id?: string;
        payment_id?: string;
        amount?: number;
        status?: string;
        notes?: Record<string, string | number> | null;
      };
    };
  };
}

const REFUND_EVENTS = new Set([
  "refund.created",
  "refund.processed",
  "refund.failed",
]);

export async function processWebhookEvent(
  event: RazorpayWebhookEvent,
): Promise<void> {
  const paymentEntity = event.payload?.payment?.entity;
  const refundEntity = event.payload?.refund?.entity;
  const eventType = event.event ?? "";

  if (paymentEntity?.order_id && eventType === "payment.captured" && paymentEntity.id) {
    const result = await finalizeCapturedPayment({
      razorpayOrderId: paymentEntity.order_id,
      razorpayPaymentId: paymentEntity.id,
      method: paymentEntity.method ?? "razorpay",
    });

    revalidatePaymentPaths(result.invoiceId);
    return;
  }

  if (paymentEntity?.order_id && eventType === "payment.failed") {
    await markPaymentFailed({
      razorpayOrderId: paymentEntity.order_id,
      razorpayPaymentId: paymentEntity.id,
      method: paymentEntity.method ?? "razorpay",
    });
    return;
  }

  if (
    refundEntity?.id &&
    refundEntity.payment_id &&
    REFUND_EVENTS.has(eventType)
  ) {
    const result = await applyRefundWebhookEvent({
      refundEntity: {
        id: refundEntity.id,
        payment_id: refundEntity.payment_id,
        amount: refundEntity.amount,
        status: refundEntity.status,
        notes: refundEntity.notes ?? null,
      },
      eventType: eventType as "refund.created" | "refund.processed" | "refund.failed",
    });

    if (result?.invoiceId) {
      revalidatePaymentPaths(result.invoiceId);
    }

    if (result?.status === "PROCESSED" && result.refundId) {
      await notifyRefundProcessed(result.refundId);
    }
  }
}
