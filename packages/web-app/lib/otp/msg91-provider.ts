import { logger } from "@/lib/log";
import { OTPProviderError, type OTPProvider } from "./provider";

const MSG91_ENDPOINT = "https://control.msg91.com/api/v5/otp";

function readMsg91Config() {
  const authKey = process.env.MSG91_AUTH_KEY?.trim();
  const templateId = process.env.MSG91_TEMPLATE_ID?.trim();
  const senderId = process.env.MSG91_SENDER_ID?.trim();

  const missing: string[] = [];
  if (!authKey) missing.push("MSG91_AUTH_KEY");
  if (!templateId) missing.push("MSG91_TEMPLATE_ID");
  if (!senderId) missing.push("MSG91_SENDER_ID");

  if (missing.length > 0) {
    throw new OTPProviderError(
      `MSG91 OTP provider is missing env vars: ${missing.join(", ")}.`,
    );
  }

  return {
    authKey: authKey as string,
    templateId: templateId as string,
    senderId: senderId as string,
  };
}

function normalizePhoneForMsg91(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) {
    return `91${digits}`;
  }
  return digits;
}

export const msg91OTPProvider: OTPProvider = {
  async send(phone, code) {
    const { authKey, templateId, senderId } = readMsg91Config();
    const params = new URLSearchParams({
      template_id: templateId,
      mobile: normalizePhoneForMsg91(phone),
      authkey: authKey,
      sender: senderId,
      otp: code,
    });

    const response = await fetch(`${MSG91_ENDPOINT}?${params.toString()}`, {
      method: "POST",
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      logger.error(
        { event: "otp.msg91.error", status: response.status, phone },
        "MSG91 send failed",
      );
      throw new OTPProviderError(
        `MSG91 send failed (${response.status}): ${body.slice(0, 200)}`,
      );
    }

    logger.info({ event: "otp.msg91.send", phone }, "MSG91 OTP sent");
  },
};
