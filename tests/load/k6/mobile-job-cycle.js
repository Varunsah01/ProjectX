/**
 * mobile-job-cycle.js — Full technician workflow under 200 concurrent users
 *
 * Simulates a technician's complete shift:
 *   login → fetch jobs → en_route → in_progress → completed
 *   → upload sign (presigned S3 URL) → PUT to S3 → logout
 *
 * Ramp: 0 → 200 VUs over 5 min, hold 5 min, ramp down 1 min.
 *
 * Credentials cycling: MOBILE_TEST_CREDS is a comma-separated list of
 * "phone:password" pairs. VUs cycle through the list if there are fewer
 * accounts than VUs (i.e., accounts are shared in round-robin fashion).
 *
 * Usage:
 *   k6 run tests/load/k6/mobile-job-cycle.js \
 *     -e BASE_URL=https://staging.example.com \
 *     -e MOBILE_TEST_CREDS=919900000001:pass1,919900000002:pass2
 *
 * Note: If storage is not configured on staging, upload-sign returns 503.
 *       The script treats 503 as an expected result (not a test failure).
 */

import http from "k6/http";
import { check, sleep } from "k6";
import { SharedArray } from "k6/data";
import { Counter } from "k6/metrics";

const BASE_URL = __ENV.BASE_URL || "http://localhost:3001";
const MOBILE_API = `${BASE_URL}/api/mobile/v1`;

// Parse credentials from env — SharedArray ensures it's loaded once
const creds = new SharedArray("mobileCreds", function () {
  const raw = __ENV.MOBILE_TEST_CREDS || "919900000001:changeme";
  return raw.split(",").map((pair) => {
    const [phone, password] = pair.trim().split(":");
    return { phone, password };
  });
});

// Custom metrics
const uploadStorageUnconfigured = new Counter("upload_503_expected");
const jobCycleCompleted = new Counter("job_cycle_completed");
const jobCycleSkippedNoJobs = new Counter("job_cycle_skipped_no_jobs");

export const options = {
  stages: [
    { duration: "5m", target: 200 },
    { duration: "5m", target: 200 },
    { duration: "1m", target: 0 },
  ],
  thresholds: {
    http_req_duration: ["p(95)<3000"],
    // 2% error budget covers expected storage-not-configured 503s
    http_req_failed: ["rate<0.02"],
    "http_req_duration{name:mobile_login}": ["p(95)<2000"],
    "http_req_duration{name:mobile_jobs}": ["p(95)<2000"],
    "http_req_duration{name:mobile_status}": ["p(95)<2000"],
    "http_req_duration{name:mobile_upload_sign}": ["p(95)<2000"],
  },
};

function jsonBody(obj) {
  return JSON.stringify(obj);
}

export default function () {
  // Each VU picks a credential round-robin
  const cred = creds[(__VU - 1) % creds.length];

  // ── 1. Login ──────────────────────────────────────────────────────────────
  const loginRes = http.post(
    `${MOBILE_API}/auth/login`,
    jsonBody({
      identifierType: "phone",
      identifier: cred.phone,
      authMethod: "password",
      secret: cred.password,
    }),
    {
      headers: { "Content-Type": "application/json" },
      tags: { name: "mobile_login" },
    },
  );

  const loginOk = check(loginRes, {
    "login: status 200": (r) => r.status === 200,
    "login: has token": (r) => {
      try {
        return Boolean(JSON.parse(r.body).token);
      } catch {
        return false;
      }
    },
  });

  if (!loginOk || loginRes.status !== 200) {
    sleep(1);
    return;
  }

  let loginData;
  try {
    loginData = JSON.parse(loginRes.body);
  } catch {
    sleep(1);
    return;
  }

  const { token, csrfToken } = loginData;
  const authHeaders = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
    "x-csrf-token": csrfToken,
  };

  // ── 2. Fetch jobs ─────────────────────────────────────────────────────────
  const jobsRes = http.get(`${MOBILE_API}/jobs`, {
    headers: { Authorization: `Bearer ${token}` },
    tags: { name: "mobile_jobs" },
  });

  check(jobsRes, {
    "jobs: status 200": (r) => r.status === 200,
  });

  let job = null;
  if (jobsRes.status === 200) {
    try {
      const { data } = JSON.parse(jobsRes.body);
      // Pick the first job in a workable state
      job = (data || []).find(
        (j) => j.status === "PENDING" || j.status === "ASSIGNED",
      );
    } catch {
      // non-fatal
    }
  }

  // ── 3. Job status cycle (if a job is available) ───────────────────────────
  if (job) {
    const statusReq = (status, extra = {}) =>
      http.post(
        `${MOBILE_API}/jobs/${job.id}/status`,
        jsonBody({ status, ...extra }),
        { headers: authHeaders, tags: { name: "mobile_status" } },
      );

    const enRoute = statusReq("en_route");
    check(enRoute, {
      "en_route: status 200": (r) => r.status === 200,
    });
    sleep(0.5);

    const inProgress = statusReq("in_progress");
    check(inProgress, {
      "in_progress: status 200": (r) => r.status === 200,
    });
    sleep(0.5);

    const completed = statusReq("completed", {
      serviceReport: "Load test cycle — auto-generated",
    });
    check(completed, {
      "completed: status 200": (r) => r.status === 200,
    });

    // ── 4. Upload sign (get presigned S3 URL) ──────────────────────────────
    const signRes = http.post(
      `${MOBILE_API}/uploads/sign`,
      jsonBody({
        kind: "job-proof",
        resourceId: job.id,
        contentType: "image/jpeg",
        ext: "jpg",
      }),
      { headers: authHeaders, tags: { name: "mobile_upload_sign" } },
    );

    if (signRes.status === 503) {
      // Storage not configured on staging — expected, not a failure
      uploadStorageUnconfigured.add(1);
    } else if (signRes.status === 200) {
      let signData;
      try {
        signData = JSON.parse(signRes.body);
      } catch {
        signData = null;
      }

      check(signRes, {
        "upload sign: has uploadUrl": () => Boolean(signData?.uploadUrl),
      });

      // ── 5. Fake S3 PUT (1-byte payload to presigned URL) ──────────────────
      if (signData?.uploadUrl) {
        const s3Res = http.put(signData.uploadUrl, "\x00", {
          headers: { "Content-Type": "image/jpeg" },
          tags: { name: "s3_put" },
        });
        check(s3Res, {
          "s3 PUT: success (2xx)": (r) => r.status >= 200 && r.status < 300,
        });
      }
    } else {
      check(signRes, {
        "upload sign: unexpected status": () => false,
      });
    }

    jobCycleCompleted.add(1);
  } else {
    // No available jobs for this VU — log but don't fail
    jobCycleSkippedNoJobs.add(1);
  }

  // ── 6. Logout ─────────────────────────────────────────────────────────────
  http.post(
    `${MOBILE_API}/auth/logout`,
    null,
    { headers: authHeaders, tags: { name: "mobile_logout" } },
  );

  sleep(1);
}
