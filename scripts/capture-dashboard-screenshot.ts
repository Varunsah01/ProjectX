/**
 * Captures a screenshot of the real dashboard page for the landing hero.
 *
 * Prerequisites:
 *   1. Database seeded: cd packages/web-app && npx prisma db seed
 *   2. Web-app running: cd packages/web-app && npm run dev
 *
 * Usage:
 *   npx tsx scripts/capture-dashboard-screenshot.ts
 */

import { chromium } from "@playwright/test";
import path from "node:path";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3001";
const OUTPUT = path.resolve(
  __dirname,
  "../packages/landing/public/hero-dashboard-light.png",
);

async function main() {
  console.log(`Connecting to ${BASE_URL}...`);

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  // 1. Login
  await page.goto(`${BASE_URL}/login`);
  await page.waitForLoadState("domcontentloaded");

  const emailInput = page.locator('input[type="email"], input[name="email"], #email');
  const passwordInput = page.locator('input[type="password"], input[name="password"], #password');

  await emailInput.fill("admin@test.com");
  await passwordInput.fill("password123");

  const submitButton = page.locator('button[type="submit"]');
  await submitButton.click();

  // 2. Wait for redirect to dashboard
  await page.waitForURL("**/", { timeout: 15_000 });
  console.log("Logged in, waiting for dashboard to load...");

  // 3. Wait for content to render
  await page.waitForLoadState("networkidle");
  // Extra wait for any client-side data fetching
  await page.waitForTimeout(2000);

  // 4. Hide the sidebar to capture just the main content area (cleaner hero)
  // Alternatively, capture the full viewport for authenticity
  await page.screenshot({
    path: OUTPUT,
    type: "png",
    clip: {
      // Capture from after the sidebar (68px collapsed or 240px expanded)
      // For a clean screenshot, capture just the main dashboard area
      x: 0,
      y: 0,
      width: 1440,
      height: 900,
    },
  });

  await browser.close();
  console.log(`Screenshot saved to: ${OUTPUT}`);
  console.log(`Dimensions: 2880×1800 (2x retina)`);
}

main().catch((err) => {
  console.error("Screenshot capture failed:", err);
  process.exit(1);
});
