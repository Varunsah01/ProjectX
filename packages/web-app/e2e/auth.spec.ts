/**
 * E2E: Auth flow
 *
 * signup → receive email-verification token (read from DB) → verify email
 * → login → see dashboard → logout
 *
 * Uses a fresh org so it can run concurrently with other specs in CI.
 */

import { test, expect } from "@playwright/test";
import { randomBytes } from "node:crypto";
import { hash } from "bcryptjs";
import { db, closeDb } from "./helpers/db";

test.describe.configure({ mode: "serial" });

const uid = () => randomBytes(6).toString("hex");

// Credentials created during the signup step
let email: string;
let password: string;
let orgId: string | null = null;

test.afterAll(async () => {
  // Clean up org created via the signup form (cascade deletes everything)
  if (orgId) {
    await db.organization.deleteMany({ where: { id: orgId } }).catch(() => {});
  }
  await closeDb();
});

test("signup creates new organisation and requires email verification", async ({ page }) => {
  const id = uid();
  email = `e2e-auth-${id}@e2e.test`;
  password = "Auth1234!";
  const orgName = `E2E Auth Org ${id}`;

  await test.step("fill signup form", async () => {
    await page.goto("/register");
    await page.getByLabel(/organisation name/i).fill(orgName);
    await page.getByLabel(/your name/i).fill("E2E User");
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/^password/i).fill(password);
    await page.getByRole("button", { name: /sign up|create account|register/i }).click();
  });

  await test.step("redirected to verify-email gate", async () => {
    await expect(page).toHaveURL(/verify-email|check-your-email/, { timeout: 15_000 });
  });

  await test.step("record org id for teardown", async () => {
    const user = await db.user.findUnique({ where: { email } });
    expect(user).not.toBeNull();
    orgId = user!.organizationId;
  });
});

test("email verification token flow completes successfully", async ({ page }) => {
  // Read the raw token from DB (selector → look up EmailVerificationToken)
  const user = await db.user.findUnique({ where: { email } });
  expect(user).not.toBeNull();

  const tokenRecord = await db.emailVerificationToken.findFirst({
    where: { userId: user!.id, usedAt: null },
    orderBy: { createdAt: "desc" },
  });
  expect(tokenRecord).not.toBeNull();

  await test.step("navigate to verify-email with selector (simulate link click)", async () => {
    // The selector is stored plaintext; the full raw token isn't in DB.
    // We need to reconstruct the raw token.  Since we can't recover the verifier
    // (it's only bcrypt-hashed), we instead use the app's verify endpoint by
    // directly inserting a known raw token into the DB.

    // Insert a fresh verifiable token
    const raw = randomBytes(32).toString("hex"); // 64 hex chars
    const selector = raw.slice(0, 32);
    const verifier = raw.slice(32);
    const tokenHash = await hash(verifier, 8);
    const expiresAt = new Date(Date.now() + 3_600_000);

    await db.emailVerificationToken.updateMany({
      where: { userId: user!.id },
      data: { usedAt: new Date() }, // expire old tokens
    });

    await db.emailVerificationToken.create({
      data: {
        userId: user!.id,
        selector,
        tokenHash,
        expiresAt,
      },
    });

    await page.goto(`/api/auth/verify-email?token=${raw}`);
  });

  await test.step("redirected to success page", async () => {
    await expect(page).toHaveURL(/verify-email\?success=true|login/, { timeout: 15_000 });
  });
});

test("login with verified account reaches dashboard", async ({ page }) => {
  await test.step("fill login form", async () => {
    await page.goto("/login");
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/^password/i).fill(password);
    await page.getByRole("button", { name: /sign in|log in/i }).click();
  });

  await test.step("dashboard is shown", async () => {
    await expect(page).toHaveURL(/\/(dashboard)?$/, { timeout: 15_000 });
    // Some identifiable element on the main dashboard
    await expect(page.getByRole("navigation")).toBeVisible();
  });
});

test("logout redirects to login page", async ({ page }) => {
  // Re-sign-in first (each Playwright test gets a fresh context)
  await page.goto("/login");
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/^password/i).fill(password);
  await page.getByRole("button", { name: /sign in|log in/i }).click();
  await expect(page).toHaveURL(/\/(dashboard)?$/, { timeout: 15_000 });

  await test.step("click logout", async () => {
    // Open user menu then click logout
    await page.getByRole("button", { name: /user menu|account|E2E User/i }).first().click();
    await page.getByRole("menuitem", { name: /log out|sign out/i }).click();
  });

  await test.step("redirected to login", async () => {
    await expect(page).toHaveURL(/login/, { timeout: 10_000 });
  });
});

test("login with wrong password shows error", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/^password/i).fill("WrongPass999!");
  await page.getByRole("button", { name: /sign in|log in/i }).click();

  await expect(page.getByText(/invalid|incorrect|wrong|failed/i)).toBeVisible({ timeout: 8_000 });
  await expect(page).toHaveURL(/login/);
});
