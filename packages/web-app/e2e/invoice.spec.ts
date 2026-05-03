/**
 * E2E: Invoice generation
 *
 * 1. Create an org with an ACTIVE contract whose nextBillingDate is yesterday.
 * 2. Hit the cron endpoint (Bearer CRON_SECRET).
 * 3. Assert a new ISSUED invoice row exists in the DB for that org.
 * 4. Login as admin and assert the invoice appears in the invoices list page.
 */

import { test, expect } from "@playwright/test";
import { db, closeDb } from "./helpers/db";
import {
  createTestOrg,
  addContract,
  TEST_PASSWORD,
  type TestOrgWithContract,
} from "./helpers/org-factory";

test.describe.configure({ mode: "serial" });

let org: TestOrgWithContract;

test.beforeAll(async () => {
  const base = await createTestOrg("invoice");
  org = await addContract(base);
});

test.afterAll(async () => {
  await org.teardown();
  await closeDb();
});

test("cron endpoint requires valid CRON_SECRET", async ({ request }) => {
  const res = await request.post("/api/cron/generate-invoices", {
    headers: { Authorization: "Bearer wrong-secret" },
  });
  expect(res.status()).toBe(401);
});

test("cron endpoint generates invoice for due contract", async ({ request }) => {
  const cronSecret = process.env.CRON_SECRET ?? "e2e-cron-secret";

  await test.step("call cron endpoint", async () => {
    const res = await request.post("/api/cron/generate-invoices", {
      headers: { Authorization: `Bearer ${cronSecret}` },
    });
    // Accept 200 or 207 (partial success)
    expect([200, 207]).toContain(res.status());
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  await test.step("invoice row exists in DB", async () => {
    const invoice = await db.invoice.findFirst({
      where: {
        organizationId: org.orgId,
        contractId: org.contractId,
        status: { in: ["ISSUED", "DRAFT"] },
      },
    });
    expect(invoice).not.toBeNull();
    expect(invoice!.amount).toBeGreaterThan(0);
  });
});

test("admin can see the generated invoice in the UI", async ({ page }) => {
  await test.step("login", async () => {
    await page.goto("/login");
    await page.getByLabel(/email/i).fill(org.adminEmail);
    await page.getByLabel(/^password/i).fill(TEST_PASSWORD);
    await page.getByRole("button", { name: /sign in|log in/i }).click();
    await expect(page).toHaveURL(/\/(dashboard)?$/, { timeout: 15_000 });
  });

  await test.step("navigate to invoices", async () => {
    await page.goto("/invoices");
  });

  await test.step("invoice is listed", async () => {
    // The invoice for our customer should appear in the list
    const invoice = await db.invoice.findFirst({
      where: { organizationId: org.orgId, contractId: org.contractId },
    });
    expect(invoice).not.toBeNull();

    await expect(
      page.getByText(invoice!.invoiceNumber, { exact: false }),
    ).toBeVisible({ timeout: 10_000 });
  });
});
