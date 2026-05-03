import { NextResponse } from "next/server";
import { PrismaClient, Prisma } from "@prisma/client";
import * as Sentry from "@sentry/nextjs";
import { getISTDate } from "@/lib/cron/lock";
import { db } from "@/lib/db";
import { createNeonBranch, deleteNeonBranch } from "@/lib/neon/api";
import { notifyBackupFailure, notifyBackupCritical } from "@/lib/ops/alerts";
import { logger } from "@/lib/log";
import { rateLimit } from "@/lib/security/rate-limit";

export const runtime = "nodejs";

function getRequestOrigin(request: Request) {
  const origin = request.headers.get("origin")?.trim();
  if (origin) return origin;
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (forwarded) return forwarded;
  return "anonymous";
}

function authorizeCronRequest(request: Request) {
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "CRON_SECRET is not configured" },
        { status: 500 },
      ),
    };
  }

  const authorization = request.headers.get("authorization");
  const headerSecret = request.headers.get("x-cron-secret");

  if (authorization === `Bearer ${cronSecret}` || headerSecret === cronSecret) {
    return { ok: true as const };
  }

  return {
    ok: false,
    response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
  };
}

async function handleBackupVerify(request: Request) {
  const limitResult = await rateLimit(
    `cron:backup-verify:${getRequestOrigin(request)}`,
    { limit: 5, windowMs: 60 * 60 * 1000 },
  );

  if (!limitResult.allowed) {
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((limitResult.resetAt - Date.now()) / 1000),
    );
    const response = NextResponse.json(
      { error: "Too many requests. Please try again shortly." },
      { status: 429 },
    );
    response.headers.set("Retry-After", String(retryAfterSeconds));
    response.headers.set("X-RateLimit-Limit", String(limitResult.limit));
    response.headers.set("X-RateLimit-Remaining", String(limitResult.remaining));
    response.headers.set(
      "X-RateLimit-Reset",
      String(Math.ceil(limitResult.resetAt / 1000)),
    );
    return response;
  }

  const authorization = authorizeCronRequest(request);
  if (!authorization.ok) {
    return authorization.response;
  }

  const start = Date.now();
  const runDate = getISTDate();
  const runTimestamp = new Date().toISOString();

  logger.info(
    { event: "cron.start", name: "backup-verify", runDate: runTimestamp },
    "cron starting",
  );

  // ── P9 idempotency (inline — no IST send-window gate for infra jobs) ────────
  let cronRun: { id: string };
  try {
    const existing = await db.cronRun.findUnique({
      where: { name_runDate: { name: "backup-verify", runDate } },
    });
    if (existing?.status === "DONE") {
      logger.info(
        { event: "cron.skip", name: "backup-verify", reason: "already-ran" },
        "cron skipped",
      );
      return NextResponse.json({ success: true, skipped: "already-ran" });
    }
    cronRun = await db.cronRun.create({
      data: { name: "backup-verify", runDate, status: "RUNNING" },
    });
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      return NextResponse.json({ success: true, skipped: "already-ran" });
    }
    throw err;
  }
  // ────────────────────────────────────────────────────────────────────────────

  let branch: { branchId: string; branchName: string; connectionUri: string } | null = null;
  let counts: Record<string, number> = {};
  let verificationStatus: "OK" | "FAIL" = "FAIL";
  let verificationError: string | null = null;

  try {
    // 1. Create a Neon branch at "now − 1 hour" (well within PITR window)
    const pointInTime = new Date(Date.now() - 60 * 60 * 1000);
    branch = await createNeonBranch(pointInTime);

    logger.info(
      {
        event: "backup-verify.branch-created",
        branchId: branch.branchId,
        branchName: branch.branchName,
      },
      "branch created",
    );

    // 2. Connect a temporary Prisma client to the branch
    const branchClient = new PrismaClient({
      datasources: { db: { url: branch.connectionUri } },
    });

    try {
      // 3. Run smoke queries — assert non-zero row counts
      counts = {
        organizations: await branchClient.organization.count(),
        users: await branchClient.user.count(),
        customers: await branchClient.customer.count(),
        invoices: await branchClient.invoice.count(),
      };

      for (const [table, count] of Object.entries(counts)) {
        if (count === 0) {
          throw new Error(
            `Smoke check failed: \`${table}\` returned 0 rows — possible data loss`,
          );
        }
      }

      // 4. Sample tenant-scoped query
      const sampleOrg = await branchClient.organization.findFirst({
        select: { id: true },
      });
      if (!sampleOrg) {
        throw new Error("No organization found in branch");
      }
      const customerCount = await branchClient.customer.count({
        where: { organizationId: sampleOrg.id },
      });
      if (customerCount === 0) {
        throw new Error(
          "Sample tenant-scoped query returned 0 customers — unexpected",
        );
      }

      verificationStatus = "OK";
    } finally {
      await branchClient.$disconnect();
    }

    // 5. Record success + clean up branch
    await db.backupVerification.create({
      data: {
        branchName: branch.branchName,
        branchId: branch.branchId,
        durationMs: Date.now() - start,
        status: "OK",
        counts,
      },
    });

    await deleteNeonBranch(branch.branchId);
    await db.cronRun.update({
      where: { id: cronRun.id },
      data: { status: "DONE" },
    });

    const durationMs = Date.now() - start;
    logger.info(
      {
        event: "cron.finish",
        name: "backup-verify",
        runDate: runTimestamp,
        durationMs,
        counts,
      },
      "cron finished",
    );

    return NextResponse.json({ success: true, counts, durationMs });
  } catch (error) {
    const durationMs = Date.now() - start;
    verificationError =
      error instanceof Error ? error.message : "Unknown error";

    // Record failure — keep branch for forensics (no deleteNeonBranch call)
    await db.backupVerification
      .create({
        data: {
          branchName: branch?.branchName ?? "unknown",
          branchId: branch?.branchId ?? "unknown",
          durationMs,
          status: "FAIL",
          error: verificationError,
          counts,
        },
      })
      .catch(() => {}); // best-effort; DB might be the source of the problem

    await db.cronRun
      .update({ where: { id: cronRun.id }, data: { status: "FAILED" } })
      .catch(() => {});

    Sentry.captureException(error, { tags: { job: "backup-verify" } });

    notifyBackupFailure({
      branchId: branch?.branchId ?? null,
      error: verificationError,
      durationMs,
    });

    // Circuit breaker: if last 3 verifications all failed → escalate
    try {
      const lastThree = await db.backupVerification.findMany({
        orderBy: { runAt: "desc" },
        take: 3,
        select: { status: true },
      });
      if (
        lastThree.length === 3 &&
        lastThree.every((v) => v.status === "FAIL")
      ) {
        notifyBackupCritical(3);
      }
    } catch {
      // circuit-breaker query failing is not fatal
    }

    logger.error(
      {
        event: "cron.error",
        name: "backup-verify",
        runDate: runTimestamp,
        durationMs,
        branchId: branch?.branchId,
        err: error,
      },
      "cron failed",
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Backup verification failed",
      },
      { status: 500 },
    );
  }
}

export async function GET(request: Request) {
  return handleBackupVerify(request);
}

export async function POST(request: Request) {
  return handleBackupVerify(request);
}
