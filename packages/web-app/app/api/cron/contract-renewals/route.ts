import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { withCronLock } from "@/lib/cron/lock";
import { sendContractRenewalReminders } from "@/lib/cron/contract-renewals";
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

async function handleContractRenewals(request: Request) {
  const limitResult = await rateLimit(
    `cron:contract-renewals:${getRequestOrigin(request)}`,
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
  const runDate = new Date().toISOString();
  logger.info(
    { event: "cron.start", name: "contract-renewals", runDate },
    "cron starting",
  );

  try {
    const lockResult = await withCronLock("contract-renewals", sendContractRenewalReminders);

    if ("skipped" in lockResult) {
      logger.info(
        { event: "cron.skip", name: "contract-renewals", runDate, reason: lockResult.skipped },
        "cron skipped",
      );
      return NextResponse.json({ success: true, skipped: lockResult.skipped });
    }

    const result = lockResult.result;

    revalidatePath("/contracts");

    for (const contractId of result.contractIds) {
      revalidatePath(`/contracts/${contractId}`);
    }

    logger.info(
      {
        event: "cron.finish",
        name: "contract-renewals",
        runDate,
        durationMs: Date.now() - start,
        status: 200,
        stats: { count: result.count, contractCount: result.contractIds.length },
      },
      "cron finished",
    );

    return NextResponse.json({
      success: true,
      count: result.count,
      contractCount: result.contractIds.length,
    });
  } catch (error) {
    Sentry.captureException(error, { tags: { job: "contract-renewals" } });

    logger.error(
      {
        event: "cron.error",
        name: "contract-renewals",
        runDate,
        durationMs: Date.now() - start,
        err: error,
      },
      "cron failed",
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to send contract renewal reminders",
      },
      { status: 500 },
    );
  }
}

export async function GET(request: Request) {
  return handleContractRenewals(request);
}

export async function POST(request: Request) {
  return handleContractRenewals(request);
}
