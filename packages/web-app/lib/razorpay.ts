import crypto from "node:crypto";
import { InvoiceStatus, RefundStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import Razorpay from "razorpay";
import { db } from "@/lib/db";

let razorpayClient: Razorpay | null = null;

function getRequiredEnv(name: "RAZORPAY_KEY_ID" | "RAZORPAY_KEY_SECRET" | "RAZORPAY_WEBHOOK_SECRET") {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export function getRazorpayInstance() {
  if (!razorpayClient) {
    razorpayClient = new Razorpay({
      key_id: getRequiredEnv("RAZORPAY_KEY_ID"),
      key_secret: getRequiredEnv("RAZORPAY_KEY_SECRET"),
    });
  }

  return razorpayClient;
}

export async function createPaymentOrder({
  amount,
  receipt,
  notes,
}: {
  amount: number;
  receipt: string;
  notes?: Record<string, string>;
}) {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Payment amount must be greater than zero");
  }

  return getRazorpayInstance().orders.create({
    amount: Math.round(amount * 100),
    currency: "INR",
    receipt: receipt.slice(0, 40),
    notes,
  });
}

export function verifyPaymentSignature({
  orderId,
  paymentId,
  signature,
}: {
  orderId: string;
  paymentId: string;
  signature: string;
}) {
  const expected = crypto
    .createHmac("sha256", getRequiredEnv("RAZORPAY_KEY_SECRET"))
    .update(`${orderId}|${paymentId}`)
    .digest("hex");

  return safeCompare(expected, signature);
}

export function verifyWebhookSignature({
  payload,
  signature,
}: {
  payload: string;
  signature: string | null;
}) {
  if (!signature) {
    return false;
  }

  const expected = crypto
    .createHmac("sha256", getRequiredEnv("RAZORPAY_WEBHOOK_SECRET"))
    .update(payload)
    .digest("hex");

  return safeCompare(expected, signature);
}

function safeCompare(expected: string, received: string) {
  const expectedBuffer = Buffer.from(expected);
  const receivedBuffer = Buffer.from(received);

  return (
    expectedBuffer.length === receivedBuffer.length &&
    crypto.timingSafeEqual(expectedBuffer, receivedBuffer)
  );
}

export function getInvoiceStatusForPaidAmount(
  invoiceAmount: number,
  paidAmount: number,
  currentStatus: InvoiceStatus,
): InvoiceStatus {
  if (paidAmount >= invoiceAmount) {
    return "PAID";
  }

  if (paidAmount > 0) {
    return "PARTIAL";
  }

  if (currentStatus === "CANCELLED" || currentStatus === "DRAFT") {
    return currentStatus;
  }

  return "ISSUED";
}

export function getInvoiceStatusForRefund(
  invoiceAmount: number,
  paidAmount: number,
  refundedAmount: number,
  currentStatus: InvoiceStatus,
): InvoiceStatus {
  if (refundedAmount <= 0) {
    return getInvoiceStatusForPaidAmount(invoiceAmount, paidAmount, currentStatus);
  }

  const netPaid = Math.max(0, paidAmount - refundedAmount);

  if (refundedAmount >= paidAmount && paidAmount > 0) {
    return "REFUNDED";
  }

  if (netPaid < invoiceAmount) {
    return "PARTIALLY_REFUNDED";
  }

  return currentStatus;
}

export async function createPendingPayment({
  invoiceId,
  razorpayOrderId,
  amount,
}: {
  invoiceId: string;
  razorpayOrderId: string;
  amount: number;
}) {
  return db.payment.create({
    data: {
      invoiceId,
      razorpayOrderId,
      amount,
      status: "created",
      method: "razorpay",
    },
  });
}

export async function finalizeCapturedPayment({
  razorpayOrderId,
  razorpayPaymentId,
  method,
}: {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  method?: string | null;
}) {
  return db.$transaction(async (tx) => {
    const existingByPaymentId = await tx.payment.findFirst({
      where: {
        razorpayPaymentId,
      },
      include: {
        invoice: true,
      },
    });

    if (existingByPaymentId?.status === "captured") {
      if (existingByPaymentId.razorpayOrderId !== razorpayOrderId) {
        throw new Error("Payment id is already linked to another order");
      }

      return {
        invoiceId: existingByPaymentId.invoiceId,
        alreadyProcessed: true,
      };
    }

    const payment = await tx.payment.findUnique({
      where: {
        razorpayOrderId,
      },
      include: {
        invoice: true,
      },
    });

    if (!payment) {
      throw new Error("Payment order not found");
    }

    if (
      payment.razorpayPaymentId === razorpayPaymentId &&
      payment.status === "captured"
    ) {
      return {
        invoiceId: payment.invoiceId,
        alreadyProcessed: true,
      };
    }

    const nextPaidAmount = Math.min(
      payment.invoice.amount,
      payment.invoice.paidAmount + payment.amount,
    );
    const nextStatus = getInvoiceStatusForPaidAmount(
      payment.invoice.amount,
      nextPaidAmount,
      payment.invoice.status,
    );

    await tx.payment.update({
      where: {
        id: payment.id,
      },
      data: {
        razorpayPaymentId,
        status: "captured",
        method: method ?? payment.method,
      },
    });

    await tx.invoice.update({
      where: {
        id: payment.invoiceId,
      },
      data: {
        paidAmount: nextPaidAmount,
        status: nextStatus,
      },
    });

    return {
      invoiceId: payment.invoiceId,
      alreadyProcessed: false,
    };
  });
}

export async function markPaymentFailed({
  razorpayOrderId,
  razorpayPaymentId,
  method,
}: {
  razorpayOrderId: string;
  razorpayPaymentId?: string | null;
  method?: string | null;
}) {
  const payment = await db.payment.findUnique({
    where: {
      razorpayOrderId,
    },
  });

  if (!payment) {
    return null;
  }

  if (payment.status === "captured") {
    return payment;
  }

  return db.payment.update({
    where: {
      id: payment.id,
    },
    data: {
      razorpayPaymentId: razorpayPaymentId ?? payment.razorpayPaymentId,
      status: "failed",
      method: method ?? payment.method,
    },
  });
}

export function revalidatePaymentPaths(invoiceId: string) {
  revalidatePath("/");
  revalidatePath("/collections");
  revalidatePath("/invoices");
  revalidatePath(`/invoices/${invoiceId}`);
}

export async function createRazorpayRefund({
  razorpayPaymentId,
  amountPaisa,
  notes,
}: {
  razorpayPaymentId: string;
  amountPaisa: number;
  notes: Record<string, string>;
}) {
  return getRazorpayInstance().payments.refund(razorpayPaymentId, {
    amount: amountPaisa,
    speed: "normal",
    notes,
  });
}

interface RefundWebhookEntity {
  id: string;
  payment_id?: string;
  amount?: number;
  status?: string;
  notes?: Record<string, string | number> | null;
}

function mapRefundStatus(status: string | undefined): RefundStatus | null {
  switch (status) {
    case "processed":
      return "PROCESSED";
    case "failed":
      return "FAILED";
    case "pending":
    case "created":
    case "initiated":
      return "PENDING";
    default:
      return null;
  }
}

async function recomputeInvoiceForPayment(
  tx: Parameters<Parameters<typeof db.$transaction>[0]>[0],
  paymentDbId: string,
) {
  const payment = await tx.payment.findUnique({
    where: { id: paymentDbId },
    include: { invoice: true },
  });

  if (!payment) {
    return;
  }

  const aggregate = await tx.payment.aggregate({
    where: { invoiceId: payment.invoiceId, status: "captured" },
    _sum: { refundedAmountPaisa: true },
  });

  const totalRefunded = aggregate._sum.refundedAmountPaisa ?? 0;
  const nextStatus = getInvoiceStatusForRefund(
    payment.invoice.amount,
    payment.invoice.paidAmount,
    totalRefunded,
    payment.invoice.status,
  );

  if (nextStatus !== payment.invoice.status) {
    await tx.invoice.update({
      where: { id: payment.invoiceId },
      data: { status: nextStatus },
    });
  }

  return { invoiceId: payment.invoiceId };
}

export async function applyRefundWebhookEvent({
  refundEntity,
  eventType,
}: {
  refundEntity: RefundWebhookEntity;
  eventType: "refund.created" | "refund.processed" | "refund.failed";
}) {
  const refundId = refundEntity.id;
  const razorpayPaymentId = refundEntity.payment_id;

  if (!refundId || !razorpayPaymentId) {
    return null;
  }

  const internalRefundId =
    typeof refundEntity.notes?.internalRefundId === "string"
      ? (refundEntity.notes.internalRefundId as string)
      : null;

  const status =
    eventType === "refund.processed"
      ? ("PROCESSED" as RefundStatus)
      : eventType === "refund.failed"
        ? ("FAILED" as RefundStatus)
        : (mapRefundStatus(refundEntity.status) ?? "PENDING");

  return db.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({
      where: { razorpayPaymentId },
    });

    if (!payment) {
      return null;
    }

    let refund = internalRefundId
      ? await tx.refund.findUnique({ where: { id: internalRefundId } })
      : null;

    if (!refund) {
      refund = await tx.refund.findUnique({ where: { razorpayRefundId: refundId } });
    }

    const refundAmount =
      typeof refundEntity.amount === "number" ? refundEntity.amount : refund?.amountPaisa ?? 0;

    if (!refund) {
      return null;
    }

    const wasProcessed = refund.status === "PROCESSED";
    const willBeProcessed = status === "PROCESSED";

    await tx.refund.update({
      where: { id: refund.id },
      data: {
        razorpayRefundId: refundId,
        status,
        amountPaisa: refundAmount,
        processedAt:
          status === "PROCESSED" ? new Date() : status === "FAILED" ? null : refund.processedAt,
      },
    });

    if (!wasProcessed && willBeProcessed) {
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          refundedAmountPaisa: { increment: refundAmount },
        },
      });
    } else if (wasProcessed && status === "FAILED") {
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          refundedAmountPaisa: { decrement: refund.amountPaisa },
        },
      });
    }

    const recompute = await recomputeInvoiceForPayment(tx, payment.id);

    return {
      invoiceId: recompute?.invoiceId ?? payment.invoiceId,
      refundId: refund.id,
      status,
    };
  });
}
