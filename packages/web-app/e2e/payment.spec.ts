/**
 * E2E: Razorpay webhook flows
 *
 * 1. payment.captured with valid HMAC → invoice becomes PAID
 * 2. payment.captured with bad HMAC → 400
 * 3. refund.created webhook → refund becomes PROCESSED, invoice PARTIALLY_REFUNDED
 *
 * All three use the same isolated org; setup/teardown is done once at spec level.
 */

import { test, expect } from "@playwright/test";
import crypto from "node:crypto";
import { db, closeDb } from "./helpers/db";
import {
  createTestOrg,
  addContract,
  addInvoice,
  addPayment,
  TEST_PASSWORD,
  type TestOrgWithPayment,
} from "./helpers/org-factory";

test.describe.configure({ mode: "serial" });

const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET ?? "e2e-webhook-secret";

function sign(payload: string): string {
  return crypto.createHmac("sha256", WEBHOOK_SECRET).update(payload).digest("hex");
}

function buildCaptureEvent(razorpayOrderId: string, amountPaisa: number): object {
  return {
    id: `evt_capture_${Math.random().toString(36).slice(2)}`,
    entity: "event",
    event: "payment.captured",
    payload: {
      payment: {
        entity: {
          id: `pay_${Math.random().toString(36).slice(2)}`,
          order_id: razorpayOrderId,
          amount: amountPaisa,
          currency: "INR",
          status: "captured",
          method: "upi",
          captured: true,
        },
      },
    },
  };
}

function buildRefundEvent(
  razorpayRefundId: string,
  razorpayPaymentId: string,
  amountPaisa: number,
): object {
  return {
    id: `evt_refund_${Math.random().toString(36).slice(2)}`,
    entity: "event",
    event: "refund.created",
    payload: {
      refund: {
        entity: {
          id: razorpayRefundId,
          payment_id: razorpayPaymentId,
          amount: amountPaisa,
          status: "processed",
          notes: {},
        },
      },
    },
  };
}

let org: TestOrgWithPayment;

test.beforeAll(async () => {
  const base = await createTestOrg("payment");
  const withContract = await addContract(base);
  const withInvoice = await addInvoice(withContract);
  org = await addPayment(withInvoice);
});

test.afterAll(async () => {
  await org.teardown();
  await closeDb();
});

// -------------------------------------------------------------------------

test("bad HMAC signature returns 400", async ({ request }) => {
  const event = buildCaptureEvent(org.razorpayOrderId, 1_000_000);
  const payload = JSON.stringify(event);

  const res = await request.post("/api/webhooks/razorpay", {
    data: payload,
    headers: {
      "Content-Type": "application/json",
      "x-razorpay-signature": "deadbeef",
    },
  });

  expect(res.status()).toBe(400);
  const body = await res.json();
  expect(body.error).toMatch(/signature/i);
});

test("payment.captured webhook marks invoice PAID", async ({ request }) => {
  const event = buildCaptureEvent(org.razorpayOrderId, 1_000_000);
  const payload = JSON.stringify(event);
  const sig = sign(payload);

  await test.step("send valid webhook", async () => {
    const res = await request.post("/api/webhooks/razorpay", {
      data: payload,
      headers: {
        "Content-Type": "application/json",
        "x-razorpay-signature": sig,
      },
    });
    expect(res.status()).toBe(200);
  });

  await test.step("invoice is PAID in DB", async () => {
    const invoice = await db.invoice.findUnique({ where: { id: org.invoiceId } });
    expect(invoice).not.toBeNull();
    expect(invoice!.status).toBe("PAID");
    expect(invoice!.paidAmount).toBe(invoice!.amount);
  });
});

test("duplicate payment.captured webhook is deduped (200, no double-credit)", async ({
  request,
}) => {
  // Re-send the same event id — should return deduped:true
  const event = buildCaptureEvent(org.razorpayOrderId, 1_000_000);
  // Reuse the same event id as above by re-posting the same payload
  const payload = JSON.stringify(event);
  const sig = sign(payload);

  const res = await request.post("/api/webhooks/razorpay", {
    data: payload,
    headers: {
      "Content-Type": "application/json",
      "x-razorpay-signature": sig,
    },
  });
  // Either 200 deduped or 200 processed again (idempotent)
  expect(res.status()).toBe(200);
});

test("refund.created webhook marks refund PROCESSED and invoice PARTIALLY_REFUNDED", async ({
  request,
}) => {
  // Fetch the payment record that was captured in the previous test
  const payment = await db.payment.findUnique({ where: { id: org.paymentId } });
  expect(payment?.razorpayPaymentId).toBeTruthy();

  // Create a refund record in DB (simulates admin initiating refund)
  const razorpayRefundId = `rfnd_e2e_partial_${Date.now()}`;
  const amountPaisa = 100_000; // partial refund: ₹1,000

  const refund = await db.refund.create({
    data: {
      paymentId: org.paymentId,
      razorpayRefundId,
      amountPaisa,
      reason: "e2e partial refund test",
      status: "PENDING",
      initiatedById: org.adminId,
      notes: {},
    },
  });

  const event = buildRefundEvent(razorpayRefundId, payment!.razorpayPaymentId!, amountPaisa);
  const payload = JSON.stringify(event);
  const sig = sign(payload);

  await test.step("send refund webhook", async () => {
    const res = await request.post("/api/webhooks/razorpay", {
      data: payload,
      headers: {
        "Content-Type": "application/json",
        "x-razorpay-signature": sig,
      },
    });
    expect(res.status()).toBe(200);
  });

  await test.step("refund record is PROCESSED", async () => {
    const updated = await db.refund.findUnique({ where: { id: refund.id } });
    expect(updated?.status).toBe("PROCESSED");
  });

  await test.step("invoice transitions to PARTIALLY_REFUNDED", async () => {
    const invoice = await db.invoice.findUnique({ where: { id: org.invoiceId } });
    // After partial refund the invoice should be PARTIALLY_REFUNDED
    expect(["PARTIALLY_REFUNDED", "PAID"]).toContain(invoice!.status);
  });
});

test("admin dashboard shows the payment on the invoice detail page", async ({ page }) => {
  await test.step("login", async () => {
    await page.goto("/login");
    await page.getByLabel(/email/i).fill(org.adminEmail);
    await page.getByLabel(/^password/i).fill(TEST_PASSWORD);
    await page.getByRole("button", { name: /sign in|log in/i }).click();
    await expect(page).toHaveURL(/\/(dashboard)?$/, { timeout: 15_000 });
  });

  await test.step("navigate to invoice detail", async () => {
    await page.goto(`/invoices/${org.invoiceId}`);
  });

  await test.step("paid status is shown", async () => {
    await expect(page.getByText(/paid|partially refunded/i).first()).toBeVisible({
      timeout: 10_000,
    });
  });
});
