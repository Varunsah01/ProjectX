import type { WebhookEventStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { mapWebhookEvent } from "@/lib/data-mappers";

export async function getWebhookEvents(options: {
  status?: string;
  page?: number;
  pageSize?: number;
}) {
  const page = Math.max(1, options.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, options.pageSize ?? 50));
  const skip = (page - 1) * pageSize;

  const where = options.status
    ? { status: options.status.toUpperCase() as WebhookEventStatus }
    : {};

  const [rows, total] = await Promise.all([
    db.webhookEvent.findMany({
      where,
      orderBy: { receivedAt: "desc" },
      skip,
      take: pageSize,
    }),
    db.webhookEvent.count({ where }),
  ]);

  return {
    data: rows.map(mapWebhookEvent),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}
