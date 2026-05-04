import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { generateRecurringInvoices } from "@/lib/cron/recurring-invoices";
import { logger } from "@/lib/log";
import { rateLimit } from "@/lib/security/rate-limit";

export const runtime = "nodejs";

function getRequestOrigin(request: Request) {
  const origin = request.headers.get("origin")?.trim();
  if (origin) {
    return origin;
  }

  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (forwarded) {
    return forwarded;
  }

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

  if (
    authorization === `Bearer ${cronSecret}` ||
    headerSecret === cronSecret
  ) {
    return { ok: true as const };
  }

  return {
    ok: false,
    response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
  };
}

async function handleGenerateInvoices(request: Request) {
  const limitResult = await rateLimit(
    `cron:generate-invoices:${getRequestOrigin(request)}`,
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

  try {
    const lockResult = await generateRecurringInvoices();

    if ("skipped" in lockResult) {
      logger.info(
        {
          event: "cron.skipped",
          name: "generate-invoices",
          reason: lockResult.skipped,
          durationMs: Date.now() - start,
        },
        "cron skipped",
      );
      return NextResponse.json({ skipped: lockResult.skipped });
    }

    const result = lockResult.result;

    revalidatePath("/");
    revalidatePath("/contracts");
    revalidatePath("/invoices");
    revalidatePath("/collections");

    for (const contractId of result.contractIds) {
      revalidatePath(`/contracts/${contractId}`);
    }

    for (const invoiceId of result.invoiceIds) {
      revalidatePath(`/invoices/${invoiceId}`);
    }

    return NextResponse.json({
      success: true,
      count: result.count,
      contractCount: result.contractIds.length,
    });
  } catch (error) {
    logger.error(
      {
        event: "cron.error",
        name: "generate-invoices",
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
            : "Failed to generate recurring invoices",
      },
      { status: 500 },
    );
  }
}

export async function GET(request: Request) {
  return handleGenerateInvoices(request);
}

export async function POST(request: Request) {
  return handleGenerateInvoices(request);
}

