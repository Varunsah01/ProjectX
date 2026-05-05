/**
 * cron-spike.js — PostgreSQL advisory lock correctness under concurrency
 *
 * Fires exactly 10 simultaneous requests to /api/cron/generate-invoices and
 * asserts that the pg_try_advisory_lock prevents more than one execution:
 *   - ≥ 9 responses contain { skipped: "locked" }
 *   - ≥ 1 response contains { success: true } or { skipped: "already-ran" }
 *
 * Rate-limit bypass: The route limits 5 req/hour per origin IP. Each VU
 * sends a distinct X-Forwarded-For header (10.0.0.{VU}) so all 10 requests
 * pass the rate limiter and hit the advisory lock layer. This is standard
 * load-testing practice against an internal service.
 *
 * Usage:
 *   k6 run tests/load/k6/cron-spike.js \
 *     -e BASE_URL=https://staging.example.com \
 *     -e CRON_SECRET=your-cron-secret
 */

import http from "k6/http";
import { check } from "k6";
import { Counter } from "k6/metrics";

const BASE_URL = __ENV.BASE_URL || "http://localhost:3001";
const CRON_SECRET = __ENV.CRON_SECRET || "";

// Custom counters — used in thresholds to assert lock correctness
const lockedCount = new Counter("cron_locked");
const notLockedCount = new Counter("cron_not_locked"); // success OR already-ran

export const options = {
  // All 10 VUs start at t=0, each runs exactly 1 iteration
  vus: 10,
  iterations: 10,
  duration: "30s",

  thresholds: {
    // No HTTP errors (5xx / network failures)
    http_req_failed: ["rate==0"],
    // Advisory lock must hold: ≥9 of 10 see "locked"
    cron_locked: ["count>=9"],
    // At least 1 gets through (runs or was already done for today)
    cron_not_locked: ["count>=1"],
  },
};

export default function () {
  // Each VU spoofs a unique IP to bypass the per-IP rate limiter
  const fakeIp = `10.0.0.${__VU}`;

  const res = http.get(`${BASE_URL}/api/cron/generate-invoices`, {
    headers: {
      "x-cron-secret": CRON_SECRET,
      "X-Forwarded-For": fakeIp,
    },
    tags: { name: "cron_invoke" },
  });

  // Parse response — handle null body (connection errors) and invalid JSON
  let body = {};
  try {
    const parsed = JSON.parse(res.body);
    if (parsed && typeof parsed === "object") {
      body = parsed;
    }
  } catch {
    // body stays {}
  }

  const isLocked = body.skipped === "locked";
  const isNotLocked =
    body.success === true ||
    body.skipped === "already-ran" ||
    body.skipped === "outside-send-window";

  check(res, {
    "status is 200": (r) => r.status === 200,
    "not rate-limited (not 429)": (r) => r.status !== 429,
    "locked or not-locked (one of two expected states)": () =>
      isLocked || isNotLocked,
  });

  if (isLocked) {
    lockedCount.add(1);
  } else {
    notLockedCount.add(1);
  }
}
