# Database Restore Runbook

Use this runbook when the weekly backup verification fails (FAIL alert in Slack) or when you need to perform a disaster recovery restore from a Neon PITR branch.

---

## Step 1 — Identify the Branch

Find the most recent failed verification and note the `branch_id`:

```sql
SELECT id, branch_id, branch_name, run_at, error, counts
FROM backup_verifications
WHERE status = 'FAIL'
ORDER BY run_at DESC
LIMIT 1;
```

If the branch_id is "unknown", the Neon branch was never created — the failure was in configuration (check `NEON_API_KEY` / `NEON_PROJECT_ID`). Skip to Step 6.

---

## Step 2 — Inspect the Branch in Neon Console

1. Open **console.neon.tech** → your project → **Branches**
2. Find the branch by ID or name
3. Use the Neon SQL editor to run the same smoke queries manually:

```sql
SELECT
  (SELECT COUNT(*) FROM organizations)  AS organizations,
  (SELECT COUNT(*) FROM users)          AS users,
  (SELECT COUNT(*) FROM customers)      AS customers,
  (SELECT COUNT(*) FROM invoices)       AS invoices;
```

If the counts look wrong, compare against production. This determines whether the issue is data loss or a transient connectivity error.

---

## Step 3 — Promote Branch to Primary (Disaster Recovery)

> **Only do this if you've confirmed data loss in production and the branch contains good data.**

Install the Neon CLI if not already:

```bash
npm install -g neonctl
neonctl auth   # browser login
```

Promote the branch:

```bash
neonctl branches set-primary <branch_id> \
  --project-id $NEON_PROJECT_ID
```

This replaces the project's primary branch. The old primary branch still exists — do not delete it yet.

---

## Step 4 — Get the New Connection String

```bash
neonctl connection-string \
  --project-id $NEON_PROJECT_ID \
  --branch <branch_id>
```

Copy the output — it is your new `DATABASE_URL`.

---

## Step 5 — Update the App

**Vercel (production):**

1. Vercel dashboard → your project → **Settings → Environment Variables**
2. Update `DATABASE_URL` to the new connection string
3. Also update `DIRECT_URL` if it is set
4. Trigger a redeployment (or redeploy from the Deployments tab)

**Local / staging:**

```bash
# In packages/web-app/.env.local
DATABASE_URL="<new connection string>"
DIRECT_URL="<new connection string>"
```

---

## Step 6 — Verify Connectivity

```bash
# From packages/web-app
DIRECT_URL=$DATABASE_URL npx prisma db pull

# Then hit the health endpoint
curl https://your-app.vercel.app/api/health
```

Confirm the app logs show successful DB connections.

---

## Step 7 — Keep the Branch Alive

Do **NOT** delete the restored branch until:
- The incident is fully resolved
- A new backup verification run returns `OK`
- The team has signed off on the restored state

---

## Step 8 — Post-Incident

1. **Rotate credentials**: Reset the Neon role password in the console and update all `DATABASE_URL` / `DIRECT_URL` env vars.
2. **Root cause**: Investigate why the original data was lost or why the backup check failed.
3. **Re-verify**: Trigger a manual backup-verify run:
   ```bash
   curl -X POST https://your-app.vercel.app/api/cron/backup-verify \
     -H "x-cron-secret: $CRON_SECRET"
   ```
4. Confirm the new run records `status = OK` in `backup_verifications`.

---

## Circuit Breaker

If 3 consecutive weekly verifications all fail, an escalated Slack alert is sent to `OPS_SLACK_WEBHOOK`. At that point:
- Check `NEON_API_KEY` and `NEON_PROJECT_ID` are correctly set in Vercel env vars
- Verify the Neon project is active (console.neon.tech)
- Check whether any failed branches are accumulating in the Neon console (delete them if data is confirmed good)
- Escalate to the infrastructure owner if the issue is unresolved after 24 hours
