"use server";

import * as Sentry from "@sentry/nextjs";
import { UserRole } from "@prisma/client";
import { requireRole } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { logger } from "@/lib/log";
import { actionFailure, actionSuccess, getActionError } from "@/lib/query-utils";
import { getWebhookEvents } from "@/lib/queries/webhooks";
import { processWebhookEvent } from "@/lib/webhook-processor";
import type { RazorpayWebhookEvent } from "@/lib/webhook-processor";

export async function getWebhookEventsAction(options: {
  status?: string;
  page?: number;
  pageSize?: number;
}) {
  try {
    await requireRole([UserRole.ADMIN]);
    const result = await getWebhookEvents(options);
    return actionSuccess(result);
  } catch (error) {
    return actionFailure(getActionError(error, "Failed to load webhook events"));
  }
}

export async function reprocessWebhookEventAction(id: string) {
  try {
    await requireRole([UserRole.ADMIN]);

    const webhookEvent = await db.webhookEvent.findUnique({
      where: { id },
    });

    if (!webhookEvent) {
      return actionFailure("Webhook event not found");
    }

    if (webhookEvent.status !== "FAILED") {
      return actionFailure("Only failed events can be reprocessed");
    }

    try {
      await processWebhookEvent(
        webhookEvent.payload as unknown as RazorpayWebhookEvent,
      );

      await db.webhookEvent.update({
        where: { id },
        data: { status: "PROCESSED", processedAt: new Date(), error: null },
      });

      logger.info(
        {
          event: "webhook.reprocessed",
          eventId: webhookEvent.eventId,
          eventType: webhookEvent.eventType,
        },
        "webhook event reprocessed successfully",
      );

      return actionSuccess({ id, status: "processed" });
    } catch (processingError) {
      const errorMessage =
        processingError instanceof Error
          ? processingError.message
          : "Unknown error";

      await db.webhookEvent.update({
        where: { id },
        data: { error: errorMessage },
      });

      Sentry.captureException(processingError, {
        tags: {
          action: "reprocess_webhook",
          eventId: webhookEvent.eventId,
        },
      });

      return actionFailure(`Reprocessing failed: ${errorMessage}`);
    }
  } catch (error) {
    return actionFailure(
      getActionError(error, "Failed to reprocess webhook event"),
    );
  }
}
