import { logger } from "@/lib/log";
import type { MessagingProvider } from "./provider";

export const consoleMessagingProvider: MessagingProvider = {
  async sendSMS(to, body, dltTemplateId) {
    logger.info({ event: "msg.console.sms", to, dltTemplateId, body }, "[MSG] SMS");
    return {};
  },
  async sendWhatsApp(to, templateId, params) {
    logger.info({ event: "msg.console.wa", to, templateId, params }, "[MSG] WhatsApp");
    return {};
  },
};
