import crypto from "node:crypto";
import { InvoiceStatus } from "@prisma/client";
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
