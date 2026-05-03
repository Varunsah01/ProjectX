import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { isInIstSendWindow } from "@/lib/cron/lock";
import { sendWeeklyExports } from "@/lib/cron/weekly-export";
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
      ok: false as const,
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
    ok: false as const,
    response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
  };
}

async function handleWeeklyExport(request: Request) {
  const limitResult = await rateLimit(
    `cron:weekly-export:${getRequestOrigin(request)}`,
    { limit: 5, windowMs: 60 * 60 * 1000 },
  );

  if (!limitResult.allowed) {
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((limitResult.resetAt - Date.now()) / 1000),
    );
    const response = NextResponse.json(
      { error: "Too many requests" },
      { status: 429 },
    );
    response.headers.set("Retry-After", String(retryAfterSeconds));
    return response;
  }

  const authorization = authorizeCronRequest(request);
  if (!authorization.ok) {
    return authorization.response;
  }

  if (!isInIstSendWindow()) {
    return NextResponse.json({ success: true, skipped: "outside-send-window" });
  }

  const start = Date.now();
  logger.info(
    { event: "cron.start", name: "weekly-export" },
    "weekly export cron starting",
  );

  try {
    const result = await sendWeeklyExports();

    logger.info(
      {
        event: "cron.finish",
        name: "weekly-export",
        durationMs: Date.now() - start,
        ...result,
      },
      "weekly export cron finished",
    );

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    Sentry.captureException(error, { tags: { job: "weekly-export" } });

    logger.error(
      {
        event: "cron.error",
        name: "weekly-export",
        durationMs: Date.now() - start,
        err: error,
      },
      "weekly export cron failed",
    );

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Weekly export failed" },
      { status: 500 },
    );
  }
}

export async function GET(request: Request) {
  return handleWeeklyExport(request);
}

export async function POST(request: Request) {
  return handleWeeklyExport(request);
}
