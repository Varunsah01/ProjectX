/**
 * auth.js — Web credentials login throughput
 *
 * Tests the NextAuth two-step login flow under load.
 * Ramp: 0 → 100 VUs over 5 min, hold 5 min, ramp down 1 min.
 *
 * Usage:
 *   k6 run tests/load/k6/auth.js \
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
    { duration: "5m", target: 100 }, // ramp up
    { duration: "5m", target: 100 }, // hold
    { duration: "1m", target: 0 },   // ramp down
  ],
  thresholds: {
    http_req_duration: ["p(95)<2000"],
    http_req_failed: ["rate<0.01"],
  },
};

export default function () {
  // Step 1 — obtain NextAuth CSRF token
  const csrfRes = http.get(`${BASE_URL}/api/auth/csrf`, {
    tags: { name: "auth_csrf" },
  });

  check(csrfRes, {
    "csrf: status 200": (r) => r.status === 200,
    "csrf: token present": (r) => {
      try {
        return Boolean(JSON.parse(r.body).csrfToken);
      } catch {
        return false;
      }
    },
  });

  if (csrfRes.status !== 200) {
    sleep(1);
    return;
  }

  const { csrfToken } = JSON.parse(csrfRes.body);

  // Step 2 — submit credentials (form-encoded, NextAuth default)
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
      redirects: 0, // NextAuth may 302; treat any 200/302 as success
      tags: { name: "auth_login" },
    },
  );

  check(loginRes, {
    "login: status 200 or 302": (r) => r.status === 200 || r.status === 302,
    "login: not server error": (r) => r.status < 500,
  });

  sleep(1);
}
