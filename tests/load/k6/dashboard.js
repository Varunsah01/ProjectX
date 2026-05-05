/**
 * dashboard.js — Authenticated SSR throughput
 *
 * Logs in once in setup(), then all VUs share the session cookie to hammer
 * the dashboard, customers list, and invoices list pages. Each page triggers
 * Next.js SSR + 25+ parallel Prisma queries (dashboard) or paginated DB reads.
 *
 * Ramp: 0 → 100 VUs over 5 min, hold 5 min, ramp down 1 min.
 *
 * Usage:
 *   k6 run tests/load/k6/dashboard.js \
 *     -e BASE_URL=https://staging.example.com \
 *     -e WEB_TEST_EMAIL=loadtest@example.com \
 *     -e WEB_TEST_PASSWORD=yourpassword
 */

import http from "k6/http";
import { check, sleep } from "k6";

const BASE_URL = __ENV.BASE_URL || "http://localhost:3001";
const EMAIL = __ENV.WEB_TEST_EMAIL || "loadtest@example.com";
const PASSWORD = __ENV.WEB_TEST_PASSWORD || "changeme";

export const options = {
  stages: [
    { duration: "5m", target: 100 },
    { duration: "5m", target: 100 },
    { duration: "1m", target: 0 },
  ],
  thresholds: {
    // Dashboard SSR is heavier — allow up to 5 s at p95
    http_req_duration: ["p(95)<5000"],
    http_req_failed: ["rate<0.01"],
    // Per-route SLOs via tagged metrics
    "http_req_duration{name:dashboard}": ["p(95)<5000"],
    "http_req_duration{name:customers}": ["p(95)<3000"],
    "http_req_duration{name:invoices}": ["p(95)<3000"],
  },
};

/** Login once and return serialised cookies for injection into VUs. */
export function setup() {
  const jar = http.cookieJar();

  // 1. CSRF token
  const csrfRes = http.get(`${BASE_URL}/api/auth/csrf`, { jar });
  if (csrfRes.status !== 200) {
    throw new Error(`setup: CSRF request failed (${csrfRes.status})`);
  }
  const { csrfToken } = JSON.parse(csrfRes.body);

  // 2. Credentials login
  const loginBody =
    `email=${encodeURIComponent(EMAIL)}` +
    `&password=${encodeURIComponent(PASSWORD)}` +
    `&csrfToken=${encodeURIComponent(csrfToken)}` +
    `&redirect=false`;

  const loginRes = http.post(
    `${BASE_URL}/api/auth/callback/credentials`,
    loginBody,
    {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      redirects: 0,
      jar,
    },
  );

  if (loginRes.status >= 500) {
    throw new Error(`setup: login failed with HTTP ${loginRes.status}`);
  }

  // Serialise cookies so each VU can inject them into its own jar
  const cookies = jar.cookiesForURL(BASE_URL);
  return { cookies };
}

export default function (data) {
  // Inject session cookies into this VU's jar
  const jar = http.cookieJar();
  for (const [name, values] of Object.entries(data.cookies)) {
    jar.set(BASE_URL, name, values[0]);
  }

  const params = { jar };

  // 1. Dashboard (heaviest — 25+ DB queries via server components)
  const dashRes = http.get(`${BASE_URL}/`, {
    ...params,
    tags: { name: "dashboard" },
  });
  check(dashRes, {
    "dashboard: status 200": (r) => r.status === 200,
    "dashboard: not redirected to login": (r) => r.status !== 302,
  });
  sleep(1);

  // 2. Customers list (paginated, full-text search index)
  const custRes = http.get(`${BASE_URL}/customers`, {
    ...params,
    tags: { name: "customers" },
  });
  check(custRes, {
    "customers: status 200": (r) => r.status === 200,
  });
  sleep(0.5);

  // 3. Invoices list (paginated, join with customer)
  const invRes = http.get(`${BASE_URL}/invoices`, {
    ...params,
    tags: { name: "invoices" },
  });
  check(invRes, {
    "invoices: status 200": (r) => r.status === 200,
  });
  sleep(1);
}
