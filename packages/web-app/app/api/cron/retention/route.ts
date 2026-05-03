import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { withCronLock } from "@/lib/cron/lock";
import { runRetention } from "@/lib/cron/retention";
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

async function handleRetention(request: Request) {
  const limitResult = await rateLimit(
    `cron:retention:${getRequestOrigin(request)}`,
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
    { event: "cron.start", name: "retention", runDate },
    "cron starting",
  );

  try {
    const lockResult = await withCronLock("retention", runRetention);

    if ("skipped" in lockResult) {
      logger.info(
        { event: "cron.skip", name: "retention", runDate, reason: lockResult.skipped },
        "cron skipped",
      );
      return NextResponse.json({ success: true, skipped: lockResult.skipped });
    }

    const result = lockResult.result;

    revalidatePath("/customers");
    revalidatePath("/assets");
    revalidatePath("/contracts");
    revalidatePath("/invoices");
    revalidatePath("/complaints");
    revalidatePath("/jobs");
    revalidatePath("/recycle-bin");

    logger.info(
      {
        event: "cron.finish",
        name: "retention",
        runDate,
        durationMs: Date.now() - start,
        status: 200,
        result,
      },
      "cron finished",
    );

    return NextResponse.json({ success: true, result });
  } catch (error) {
    Sentry.captureException(error, { tags: { job: "retention" } });

    logger.error(
      {
        event: "cron.error",
        name: "retention",
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
            : "Failed to run retention",
      },
      { status: 500 },
    );
  }
}

export async function GET(request: Request) {
  return handleRetention(request);
}

export async function POST(request: Request) {
  return handleRetention(request);
}
