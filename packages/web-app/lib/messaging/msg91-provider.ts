import { logger } from "@/lib/log";
import { MessagingProviderError, type MessagingProvider } from "./provider";

const MSG91_SMS_ENDPOINT = "https://control.msg91.com/api/sendhttp.php";
const MSG91_WA_ENDPOINT = "https://api.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/bulk/";

function normalizePhoneForMsg91(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) {
    return `91${digits}`;
  }
  return digits;
}

function readMsg91Config() {
  const authKey = process.env.MSG91_AUTH_KEY?.trim();
  if (!authKey) {
    throw new MessagingProviderError("MSG91_AUTH_KEY is not configured");
  }
  return { authKey };
}

export const msg91MessagingProvider: MessagingProvider = {
  async sendSMS(to, body, dltTemplateId) {
    if (!dltTemplateId) {
      throw new MessagingProviderError("dltTemplateId is required for DLT compliance");
    }

    const { authKey } = readMsg91Config();
    const senderId = process.env.MSG91_SMS_SENDER_ID?.trim();
    if (!senderId) {
      throw new MessagingProviderError("MSG91_SMS_SENDER_ID is not configured");
    }

    const params = new URLSearchParams({
      authkey: authKey,
      mobiles: normalizePhoneForMsg91(to),
      message: body,
      sender: senderId,
      route: "4",
      DLT_TE_ID: dltTemplateId,
    });

    const response = await fetch(`${MSG91_SMS_ENDPOINT}?${params.toString()}`, {
      method: "GET",
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      logger.error({ event: "msg.msg91.sms.error", status: response.status, to }, "MSG91 SMS send failed");
      throw new MessagingProviderError(`MSG91 SMS failed (${response.status}): ${text.slice(0, 200)}`);
    }

    logger.info({ event: "msg.msg91.sms.send", to }, "MSG91 SMS sent");
    return {};
  },

  async sendWhatsApp(to, templateId, params) {
    const { authKey } = readMsg91Config();
    const integratedNumber = process.env.MSG91_WA_INTEGRATED_NUMBER?.trim();
    if (!integratedNumber) {
      throw new MessagingProviderError("MSG91_WA_INTEGRATED_NUMBER is not configured");
    }

    const normalizedPhone = normalizePhoneForMsg91(to);
    const body = {
      integrated_number: integratedNumber,
      content_type: "template",
      payload: {
        to: normalizedPhone,
        type: "template",
        template: {
          name: templateId,
          language: { code: "en" },
          components: [
            {
              type: "body",
              parameters: params.map((p) => ({ type: "text", text: p })),
            },
          ],
        },
      },
    };

    const response = await fetch(MSG91_WA_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        authkey: authKey,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      logger.error({ event: "msg.msg91.wa.error", status: response.status, to }, "MSG91 WhatsApp send failed");
      throw new MessagingProviderError(`MSG91 WhatsApp failed (${response.status}): ${text.slice(0, 200)}`);
    }

    const json = await response.json().catch(() => ({}));
    logger.info({ event: "msg.msg91.wa.send", to }, "MSG91 WhatsApp sent");
    return { messageId: json?.request_id as string | undefined };
  },
};
