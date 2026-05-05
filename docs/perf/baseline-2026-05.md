# Performance Baseline — May 2026

Record p50/p95/p99 numbers here after each full load-test run. Compare before/after for any change that touches a hot path (auth, dashboard queries, mobile API, cron lock).

---

## Environment

| Attribute | Value |
|-----------|-------|
| Run date | TBD |
| k6 version | TBD |
| k6 mode | Local (not k6 Cloud) |
| Target | Staging (Neon branch) |
| Neon plan | TBD (Free / Pro) |
| Upstash plan | TBD (Free / Pay-as-you-go) |
| Vercel plan | TBD (Hobby / Pro) |
| Region | TBD (e.g. ap-south-1 Mumbai) |
| Seed data | TBD (# orgs / customers / invoices / technicians / jobs) |

---

## Scenario: `auth` (0 → 100 VUs, 5 min ramp + 5 min hold)

Tests the NextAuth two-step login flow (`GET /api/auth/csrf` → `POST /api/auth/callback/credentials`).

| Metric | Value |
|--------|-------|
| p50 latency | TBD |
| p95 latency | TBD |
| p99 latency | TBD |
| Error rate | TBD |
| Requests/sec (peak) | TBD |
| Neon connection pool peak | TBD |
| Upstash ops/sec (rate-limit checks) | TBD |
| Vercel function avg duration | TBD |

**Threshold results:**
- `p(95) < 2 000 ms`: TBD
- `http_req_failed < 1 %`: TBD

---

## Scenario: `dashboard` (0 → 100 VUs, 5 min ramp + 5 min hold)

Tests authenticated SSR: `/` (dashboard, ~25 parallel DB ops), `/customers`, `/invoices`.

| Metric | Value |
|--------|-------|
| p50 latency — dashboard page | TBD |
| p95 latency — dashboard page | TBD |
| p99 latency — dashboard page | TBD |
| p50 latency — customers list | TBD |
| p95 latency — customers list | TBD |
| p50 latency — invoices list | TBD |
| p95 latency — invoices list | TBD |
| Error rate | TBD |
| Neon CPU peak % | TBD |
| Neon active connections peak | TBD |
| Vercel function avg duration | TBD |

**Threshold results:**
- `p(95) < 5 000 ms` (overall): TBD
- `p(95){dashboard} < 5 000 ms`: TBD
- `p(95){customers} < 3 000 ms`: TBD
- `p(95){invoices} < 3 000 ms`: TBD

---

## Scenario: `mobile-job-cycle` (0 → 200 VUs, 5 min ramp + 5 min hold)

Full technician workflow: login → fetch jobs → en_route → in_progress → completed → upload sign → PUT S3 → logout.

| Metric | Value |
|--------|-------|
| p50 latency — login | TBD |
| p95 latency — login | TBD |
| p50 latency — jobs list | TBD |
| p95 latency — jobs list | TBD |
| p50 latency — status update | TBD |
| p95 latency — status update | TBD |
| p50 latency — upload sign | TBD |
| p95 latency — upload sign | TBD |
| Error rate | TBD |
| `job_cycle_completed` count | TBD |
| `job_cycle_skipped_no_jobs` count | TBD |
| `upload_503_expected` count (storage unconfigured) | TBD |
| Neon connection pool peak | TBD |
| Neon CPU peak % | TBD |
| Upstash ops/sec | TBD |

**Threshold results:**
- `p(95) < 3 000 ms`: TBD
- `http_req_failed < 2 %`: TBD

---

## Scenario: `cron-spike` (10 concurrent VUs, 1 iteration each)

Verifies the `pg_try_advisory_lock` prevents concurrent invoice generation.

| Metric | Value |
|--------|-------|
| `cron_locked` count (expect ≥ 9) | TBD / 10 |
| `cron_not_locked` count (expect ≥ 1) | TBD / 10 |
| p50 latency | TBD |
| p95 latency | TBD |
| HTTP error rate (expect 0 %) | TBD |

**Threshold results:**
- `cron_locked >= 9`: TBD
- `cron_not_locked >= 1`: TBD
- `http_req_failed == 0`: TBD

---

## Scaling Signals

Use these thresholds to decide when to scale each service. Update after each baseline run.

| Trigger | Action |
|---------|--------|
| Dashboard p95 > 5 s | Add `db.$connect()` connection pooling (PgBouncer) or split heavy queries |
| Auth p95 > 2 s | Upstash rate-limit lookup > 50 ms — consider Redis cluster or lower TTL |
| Mobile p95 > 3 s | Neon connection pool exhausted — upgrade to pooled connections or add read replicas |
| `cron_locked < 9` | Advisory lock not functioning — investigate `pg_try_advisory_lock` rollback or timeout |
| Neon CPU > 80 % sustained | Upgrade Neon compute or add read replica for reporting queries |
| Vercel fn duration > 10 s | Function timeout approaching — break up SSR queries or move to streaming |

---

## How to Update This Baseline

1. Run the full test suite:
   ```bash
   for f in tests/load/k6/*.js; do
     k6 run --out json="results-$(basename $f .js).json" "$f"
   done
   ```
2. Extract p50/p95/p99 from each JSON file (or copy from k6 terminal summary).
3. Fill in the `TBD` cells above with the new numbers.
4. Capture Neon / Upstash / Vercel metrics from their dashboards at the time of the test.
5. Commit with message: `perf: update baseline YYYY-MM-DD`.
