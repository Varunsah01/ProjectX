import crypto from "node:crypto";
import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock external deps
vi.mock("@/lib/db", () => ({ db: {} }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

// Set required env vars for signature functions
const TEST_KEY_SECRET = "test_razorpay_secret_key_123";
const TEST_WEBHOOK_SECRET = "whsec_test_webhook_secret_456";

beforeEach(() => {
  process.env.RAZORPAY_KEY_ID = "rzp_test_key_id";
  process.env.RAZORPAY_KEY_SECRET = TEST_KEY_SECRET;
  process.env.RAZORPAY_WEBHOOK_SECRET = TEST_WEBHOOK_SECRET;
});

describe("verifyPaymentSignature", () => {
  it("accepts a valid payment signature", async () => {
    const { verifyPaymentSignature } = await import("@/lib/razorpay");

    const orderId = "order_abc123";
    const paymentId = "pay_xyz789";
    const validSignature = crypto
      .createHmac("sha256", TEST_KEY_SECRET)
      .update(`${orderId}|${paymentId}`)
      .digest("hex");

    expect(
      verifyPaymentSignature({ orderId, paymentId, signature: validSignature }),
    ).toBe(true);
  });

  it("rejects a tampered payment signature", async () => {
    const { verifyPaymentSignature } = await import("@/lib/razorpay");

    expect(
      verifyPaymentSignature({
        orderId: "order_abc123",
        paymentId: "pay_xyz789",
        signature: "deadbeef0000000000000000000000000000000000000000000000000000face",
      }),
    ).toBe(false);
  });

  it("rejects when orderId is modified", async () => {
    const { verifyPaymentSignature } = await import("@/lib/razorpay");

    const orderId = "order_abc123";
    const paymentId = "pay_xyz789";
    const validSignature = crypto
      .createHmac("sha256", TEST_KEY_SECRET)
      .update(`${orderId}|${paymentId}`)
      .digest("hex");

    expect(
      verifyPaymentSignature({
        orderId: "order_TAMPERED",
        paymentId,
        signature: validSignature,
      }),
    ).toBe(false);
  });
});

describe("verifyWebhookSignature", () => {
  it("accepts a valid webhook signature", async () => {
    const { verifyWebhookSignature } = await import("@/lib/razorpay");

    const payload = JSON.stringify({ event: "payment.captured", payload: {} });
    const validSignature = crypto
      .createHmac("sha256", TEST_WEBHOOK_SECRET)
      .update(payload)
      .digest("hex");

    expect(
      verifyWebhookSignature({ payload, signature: validSignature }),
    ).toBe(true);
  });

  it("rejects an invalid webhook signature", async () => {
    const { verifyWebhookSignature } = await import("@/lib/razorpay");

    expect(
      verifyWebhookSignature({
        payload: '{"event":"payment.captured"}',
        signature: "invalid_signature_hex_string_that_is_64_chars_long_aaaaaaaaaaaaa",
      }),
    ).toBe(false);
  });

  it("rejects null signature", async () => {
    const { verifyWebhookSignature } = await import("@/lib/razorpay");

    expect(
      verifyWebhookSignature({
        payload: '{"event":"payment.captured"}',
        signature: null,
      }),
    ).toBe(false);
  });

  it("rejects when payload is tampered", async () => {
    const { verifyWebhookSignature } = await import("@/lib/razorpay");

    const originalPayload = '{"amount":1000}';
    const signature = crypto
      .createHmac("sha256", TEST_WEBHOOK_SECRET)
      .update(originalPayload)
      .digest("hex");

    expect(
      verifyWebhookSignature({
        payload: '{"amount":9999}',
        signature,
      }),
    ).toBe(false);
  });
});

describe("getInvoiceStatusForPaidAmount", () => {
  it("returns PAID when fully paid", async () => {
    const { getInvoiceStatusForPaidAmount } = await import("@/lib/razorpay");

    expect(getInvoiceStatusForPaidAmount(10000, 10000, "ISSUED")).toBe("PAID");
    expect(getInvoiceStatusForPaidAmount(10000, 15000, "ISSUED")).toBe("PAID");
  });

  it("returns PARTIAL when partially paid", async () => {
    const { getInvoiceStatusForPaidAmount } = await import("@/lib/razorpay");

    expect(getInvoiceStatusForPaidAmount(10000, 5000, "ISSUED")).toBe("PARTIAL");
    expect(getInvoiceStatusForPaidAmount(10000, 1, "ISSUED")).toBe("PARTIAL");
  });

  it("preserves CANCELLED/DRAFT status when unpaid", async () => {
    const { getInvoiceStatusForPaidAmount } = await import("@/lib/razorpay");

    expect(getInvoiceStatusForPaidAmount(10000, 0, "CANCELLED")).toBe("CANCELLED");
    expect(getInvoiceStatusForPaidAmount(10000, 0, "DRAFT")).toBe("DRAFT");
  });

  it("returns ISSUED for other statuses when unpaid", async () => {
    const { getInvoiceStatusForPaidAmount } = await import("@/lib/razorpay");

    expect(getInvoiceStatusForPaidAmount(10000, 0, "ISSUED")).toBe("ISSUED");
    expect(getInvoiceStatusForPaidAmount(10000, 0, "PAID")).toBe("ISSUED");
  });
});
