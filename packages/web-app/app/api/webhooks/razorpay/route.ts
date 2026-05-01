import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import * as Sentry from "@sentry/nextjs";
import { verifyWebhookSignature } from "@/lib/razorpay";
import { db } from "@/lib/db";
import { logger } from "@/lib/log";
import { rateLimit } from "@/lib/security/rate-limit";
import {
  processWebhookEvent,
  type RazorpayWebhookEvent,
} from "@/lib/webhook-processor";

export const runtime = "nodejs";

function getRequestIp(request: Request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip")?.trim() ??
    "anonymous"
  );
}

function buildRateLimitResponse(resetAt: number, limit: number, remaining: number) {
  const retryAfterSeconds = Math.max(1, Math.ceil((resetAt - Date.now()) / 1000));
  const response = NextResponse.json(
    { error: "Too many requests. Please try again shortly." },
    { status: 429 },
  );
  response.headers.set("Retry-After", String(retryAfterSeconds));
  response.headers.set("X-RateLimit-Limit", String(limit));
  response.headers.set("X-RateLimit-Remaining", String(remaining));
  response.headers.set("X-RateLimit-Reset", String(Math.ceil(resetAt / 1000)));
  return response;
}

export async function POST(request: Request) {
  const start = Date.now();
  logger.info(
    { event: "webhook.start", name: "razorpay" },
    "webhook received",
  );

  try {
    const ip = getRequestIp(request);
    const limitResult = await rateLimit(`webhooks:razorpay:${ip}`, {
      limit: 10,
      windowMs: 60_000,
    });

    if (!limitResult.allowed) {
      logger.info(
        {
          event: "webhook.finish",
          name: "razorpay",
          status: 429,
          durationMs: Date.now() - start,
        },
        "webhook rate-limited",
      );
      return buildRateLimitResponse(
        limitResult.resetAt,
        limitResult.limit,
        limitResult.remaining,
      );
    }

    const payload = await request.text();
    const signature = request.headers.get("x-razorpay-signature");

    if (!verifyWebhookSignature({ payload, signature })) {
      Sentry.captureException(new Error("Razorpay webhook signature mismatch"), {
        tags: { route: "webhooks/razorpay", reason: "invalid_signature" },
      });
      logger.info(
        {
          event: "webhook.finish",
          name: "razorpay",
          status: 400,
          durationMs: Date.now() - start,
          reason: "invalid_signature",
        },
        "webhook signature invalid",
      );
      return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 });
    }

    const event = JSON.parse(payload) as RazorpayWebhookEvent;
    const razorpayEventId = event.id;
    const eventType = event.event ?? "unknown";

    logger.info(
      { event: "webhook.parsed", name: "razorpay", eventId: razorpayEventId, eventType },
      "webhook event parsed",
    );
    logger.debug(
      { event: "webhook.payload", name: "razorpay", payload: event },
      "webhook payload",
    );

    // --- Event-level deduplication ---
    let webhookEventRecordId: string | null = null;

    if (razorpayEventId) {
      try {
        const record = await db.webhookEvent.create({
          data: {
            provider: "RAZORPAY",
            eventId: razorpayEventId,
            eventType,
            payload: event as unknown as Prisma.InputJsonValue,
            status: "RECEIVED",
          },
          select: { id: true },
        });
        webhookEventRecordId = record.id;
      } catch (err) {
        if (
          err instanceof Prisma.PrismaClientKnownRequestError &&
          err.code === "P2002"
        ) {
          logger.info(
            { event: "webhook.deduped", name: "razorpay", eventId: razorpayEventId },
            "duplicate webhook event ignored",
          );
          return NextResponse.json({ deduped: true, eventId: razorpayEventId });
        }
        throw err;
      }
    }

    // --- Process the event ---
    try {
      await processWebhookEvent(event);

      if (webhookEventRecordId) {
        await db.webhookEvent.update({
          where: { id: webhookEventRecordId },
          data: { status: "PROCESSED", processedAt: new Date() },
        });
      }

      logger.info(
        {
          event: "webhook.finish",
          name: "razorpay",
          eventId: razorpayEventId,
          eventType,
          status: 200,
          durationMs: Date.now() - start,
        },
        "webhook handled",
      );
      return NextResponse.json({ received: true });
    } catch (processingError) {
      const errorMessage =
        processingError instanceof Error ? processingError.message : "Unknown error";

      if (webhookEventRecordId) {
        await db.webhookEvent.update({
          where: { id: webhookEventRecordId },
          data: { status: "FAILED", error: errorMessage },
        });
      }

      logger.error(
        {
          event: "webhook.error",
          name: "razorpay",
          eventId: razorpayEventId,
          eventType,
          durationMs: Date.now() - start,
          err: processingError,
        },
        "webhook processing failed",
      );

      Sentry.captureException(processingError, {
        tags: { route: "webhooks/razorpay", eventId: razorpayEventId ?? "unknown" },
      });

      return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
  } catch (error) {
    logger.error(
      {
        event: "webhook.error",
        name: "razorpay",
        durationMs: Date.now() - start,
        err: error,
      },
      "webhook failed",
    );

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to process webhook" },
      { status: 500 },
    );
  }
}
