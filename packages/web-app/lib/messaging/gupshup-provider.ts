import { logger } from "@/lib/log";
import { MessagingProviderError, type MessagingProvider } from "./provider";

const GUPSHUP_WA_ENDPOINT = "https://api.gupshup.io/wa/api/v1/template/msg";

function readGupshupConfig() {
  const apiKey = process.env.GUPSHUP_API_KEY?.trim();
  const appName = process.env.GUPSHUP_APP_NAME?.trim();

  const missing: string[] = [];
  if (!apiKey) missing.push("GUPSHUP_API_KEY");
  if (!appName) missing.push("GUPSHUP_APP_NAME");

  if (missing.length > 0) {
    throw new MessagingProviderError(`Gupshup provider is missing env vars: ${missing.join(", ")}`);
  }

  return { apiKey: apiKey as string, appName: appName as string };
}

export const gupshupMessagingProvider: MessagingProvider = {
  async sendSMS() {
    throw new MessagingProviderError("SMS not implemented for Gupshup provider");
  },

  async sendWhatsApp(to, templateId, params) {
    const { apiKey, appName } = readGupshupConfig();

    const formBody = new URLSearchParams({
      channel: "whatsapp",
      source: appName,
      destination: to,
      template: JSON.stringify({ id: templateId, params }),
      "src.name": appName,
    });

    const response = await fetch(GUPSHUP_WA_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        apikey: apiKey,
      },
      body: formBody.toString(),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      logger.error({ event: "msg.gupshup.wa.error", status: response.status, to }, "Gupshup WhatsApp send failed");
      throw new MessagingProviderError(`Gupshup WhatsApp failed (${response.status}): ${text.slice(0, 200)}`);
    }

    const json = await response.json().catch(() => ({}));
    logger.info({ event: "msg.gupshup.wa.send", to }, "Gupshup WhatsApp sent");
    return { messageId: json?.messageId as string | undefined };
  },
};
