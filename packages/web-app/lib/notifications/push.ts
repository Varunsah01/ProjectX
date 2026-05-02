import { db } from "@/lib/db";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const BATCH_SIZE = 100;

interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
}

interface ExpoPushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  sound: "default";
  priority: "high";
}

interface ExpoPushTicket {
  status: "ok" | "error";
  id?: string;
  message?: string;
  details?: { error?: string };
}

/**
 * Send a push notification to all active devices for a given user.
 * Fire-and-forget: never throws, logs errors internally.
 */
export async function sendPushToUser(
  userId: string,
  payload: PushPayload,
): Promise<void> {
  try {
    const tokens = await db.deviceToken.findMany({
      where: { userId, revokedAt: null },
      select: { token: true },
    });

    if (tokens.length === 0) {
      return;
    }

    const messages: ExpoPushMessage[] = tokens.map((t) => ({
      to: t.token,
      title: payload.title,
      body: payload.body,
      data: payload.data,
      sound: "default" as const,
      priority: "high" as const,
    }));

    // Batch into chunks of BATCH_SIZE
    for (let i = 0; i < messages.length; i += BATCH_SIZE) {
      const batch = messages.slice(i, i + BATCH_SIZE);

      const response = await fetch(EXPO_PUSH_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(batch),
      });

      if (!response.ok) {
        console.error(
          `Expo push API returned ${response.status}:`,
          await response.text(),
        );
        continue;
      }

      const result = (await response.json()) as { data: ExpoPushTicket[] };

      // Handle DeviceNotRegistered errors by revoking stale tokens
      for (let j = 0; j < result.data.length; j++) {
        const ticket = result.data[j];
        if (
          ticket.status === "error" &&
          ticket.details?.error === "DeviceNotRegistered"
        ) {
          const staleToken = batch[j].to;
          await db.deviceToken
            .update({
              where: { token: staleToken },
              data: { revokedAt: new Date() },
            })
            .catch((err) =>
              console.error("Failed to revoke stale token:", err),
            );
        }
      }
    }
  } catch (error) {
    console.error("sendPushToUser failed:", error);
  }
}
