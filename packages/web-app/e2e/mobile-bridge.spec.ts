/**
 * E2E: Mobile job completion bridge
 *
 * 1. Create org with a technician + assigned job.
 * 2. Mobile technician logs in via POST /api/mobile/v1/auth/login → get token + csrfToken.
 * 3. Step job through: ASSIGNED → EN_ROUTE → IN_PROGRESS → COMPLETED using the mobile status API.
 * 4. Admin logs into the web dashboard and sees the job status as COMPLETED.
 */

import { test, expect } from "@playwright/test";
import { db, closeDb } from "./helpers/db";
import {
  createTestOrg,
  addTechnician,
  addJob,
  TEST_PASSWORD,
  type TestOrgWithJob,
} from "./helpers/org-factory";

test.describe.configure({ mode: "serial" });

let org: TestOrgWithJob;
let mobileToken: string;
let csrfToken: string;

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3001";

test.beforeAll(async () => {
  const base = await createTestOrg("mobile");
  const withTech = await addTechnician(base);
  org = await addJob(withTech);
});

test.afterAll(async () => {
  await org.teardown();
  await closeDb();
});

// -------------------------------------------------------------------------

test("mobile login returns token and csrfToken", async ({ request }) => {
  const res = await request.post("/api/mobile/v1/auth/login", {
    data: {
      identifierType: "phone",
      identifier: org.technicianPhone,
      authMethod: "password",
      secret: TEST_PASSWORD,
    },
  });

  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body.token).toBeTruthy();
  expect(body.csrfToken).toBeTruthy();
  expect(body.user.id).toBe(org.technicianId);

  mobileToken = body.token;
  csrfToken = body.csrfToken;
});

test("mobile login with wrong password returns 401", async ({ request }) => {
  const res = await request.post("/api/mobile/v1/auth/login", {
    data: {
      identifierType: "phone",
      identifier: org.technicianPhone,
      authMethod: "password",
      secret: "WrongPass999!",
    },
  });
  expect(res.status()).toBe(401);
});

async function updateJobStatus(
  request: import("@playwright/test").APIRequestContext,
  status: string,
) {
  return request.post(`/api/mobile/v1/jobs/${org.jobId}/status`, {
    data: { status },
    headers: {
      Authorization: `Bearer ${mobileToken}`,
      "x-csrf-token": csrfToken,
      "Content-Type": "application/json",
    },
  });
}

test("job status transitions: ASSIGNED → EN_ROUTE", async ({ request }) => {
  const res = await updateJobStatus(request, "en_route");
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body.data.status).toBe("En Route");

  const job = await db.job.findUnique({ where: { id: org.jobId } });
  expect(job?.status).toBe("EN_ROUTE");
});

test("job status transitions: EN_ROUTE → IN_PROGRESS", async ({ request }) => {
  const res = await updateJobStatus(request, "in_progress");
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body.data.status).toBe("In Progress");

  const job = await db.job.findUnique({ where: { id: org.jobId } });
  expect(job?.status).toBe("IN_PROGRESS");
});

test("job status transitions: IN_PROGRESS → COMPLETED", async ({ request }) => {
  const res = await updateJobStatus(request, "completed");
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body.data.status).toBe("Completed");

  const job = await db.job.findUnique({ where: { id: org.jobId } });
  expect(job?.status).toBe("COMPLETED");
  expect(job?.completedAt).not.toBeNull();
});

test("invalid status transition returns 400", async ({ request }) => {
  // Job is already COMPLETED, can't move it again
  const res = await updateJobStatus(request, "en_route");
  expect(res.status()).toBe(400);
});

test("missing CSRF token returns 403", async ({ request }) => {
  const res = await request.post(`/api/mobile/v1/jobs/${org.jobId}/status`, {
    data: { status: "completed" },
    headers: {
      Authorization: `Bearer ${mobileToken}`,
      // deliberately omit x-csrf-token
      "Content-Type": "application/json",
    },
  });
  expect(res.status()).toBe(403);
});

test("admin dashboard shows job as Completed", async ({ page }) => {
  await test.step("login", async () => {
    await page.goto("/login");
    await page.getByLabel(/email/i).fill(org.adminEmail);
    await page.getByLabel(/^password/i).fill(TEST_PASSWORD);
    await page.getByRole("button", { name: /sign in|log in/i }).click();
    await expect(page).toHaveURL(/\/(dashboard)?$/, { timeout: 15_000 });
  });

  await test.step("navigate to jobs list", async () => {
    await page.goto("/jobs");
  });

  await test.step("job row shows Completed", async () => {
    await expect(
      page.getByText(org.jobNumber, { exact: false }),
    ).toBeVisible({ timeout: 10_000 });
    // The status badge/cell near the job number should say Completed
    const row = page.getByText(org.jobNumber, { exact: false }).locator("..").locator("..");
    await expect(row.getByText(/completed/i)).toBeVisible({ timeout: 5_000 });
  });
});
