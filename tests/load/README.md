# Load Tests

k6 scripts for capacity baseline and regression testing. Never run against production.

## Prerequisites

```bash
# macOS
brew install k6

# Linux
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg \
  --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" \
  | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update && sudo apt-get install k6

# verify
k6 version
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `BASE_URL` | Yes | Target base URL (no trailing slash). Never use production. |
| `CRON_SECRET` | For `cron-spike.js` | Value of `CRON_SECRET` env var in the target app |
| `WEB_TEST_EMAIL` | For `auth.js`, `dashboard.js` | Email of a seeded ADMIN/MANAGER test account |
| `WEB_TEST_PASSWORD` | For `auth.js`, `dashboard.js` | Password for the web test account |
| `MOBILE_TEST_CREDS` | For `mobile-job-cycle.js` | Comma-separated `phone:password` pairs (see below) |

### MOBILE_TEST_CREDS format

```
MOBILE_TEST_CREDS=919900000001:password1,919900000002:password2,...
```

Provide at least 1 pair; VUs cycle through in round-robin if fewer pairs than VUs.
For a realistic 200-VU test, seed at least 50–200 distinct technician accounts.

## Seeding Test Data

The load tests require a seeded environment. Set up test data before running:

```bash
# From packages/web-app/
# Adjust seed.ts or use your own migration to create:
#   - 1 org with an ADMIN user (web tests)
#   - N technician accounts with known phone:password (mobile tests)
#   - Active jobs assigned to the test technicians (for mobile-job-cycle)
npx prisma db seed
```

> The mobile-job-cycle script handles gracefully the case where no jobs are
> assigned (it skips the status-update cycle and logs a `job_cycle_skipped_no_jobs`
> counter), but without real jobs the test won't exercise the critical path.

## Running Scripts

```bash
# Export env vars
export BASE_URL=https://staging.example.com
export CRON_SECRET=your-secret
export WEB_TEST_EMAIL=loadtest@example.com
export WEB_TEST_PASSWORD=yourpassword
export MOBILE_TEST_CREDS=919900000001:pass1,919900000002:pass2

# Run a single script
k6 run tests/load/k6/auth.js

# Smoke run (2 VUs, 10 seconds — quick sanity check)
k6 run tests/load/k6/auth.js --vus 2 --duration 10s

# Run all scripts sequentially
for f in tests/load/k6/*.js; do
  echo "=== Running $f ==="
  k6 run "$f"
done

# Save JSON output for the baseline doc
k6 run --out json=results-auth.json tests/load/k6/auth.js
```

## Scripts

| Script | VUs | Duration | What it measures |
|--------|-----|----------|-----------------|
| `auth.js` | 0→100 | ~11 min | NextAuth login throughput, Upstash rate-limit overhead |
| `dashboard.js` | 0→100 | ~11 min | SSR latency (25+ DB queries per request), Neon CPU |
| `mobile-job-cycle.js` | 0→200 | ~11 min | Full technician workflow, Neon connection pool saturation |
| `cron-spike.js` | 10 | ~30 s | PostgreSQL advisory lock correctness |

## Interpreting Results

k6 prints a summary at the end of each run:

```
✓ checks.........................: 99.98%
  http_req_duration..............: avg=342ms  min=88ms   med=298ms  max=4.2s  p(90)=612ms p(95)=892ms
  http_req_failed................: 0.00%
```

- **p(95) > threshold** → threshold failure (red `✗`) — investigate before scaling
- **`cron_locked`** counter in `cron-spike.js` should be ≥ 9
- **`job_cycle_skipped_no_jobs`** > 0 → not enough test jobs seeded
- **`upload_503_expected`** > 0 → storage (S3/R2) not configured on staging (expected)

Record p50/p95/p99 from each run in `docs/perf/baseline-2026-05.md`.

## CI / Automated Runs

See `.github/workflows/load-test.yml`. The workflow is `workflow_dispatch` only
(manual trigger) and requires `base_url` as an explicit input. It creates an
ephemeral Neon branch, runs migrations, runs the selected scenario, uploads the
JSON result as an artifact, then deletes the branch.
