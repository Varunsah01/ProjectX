import { MessageStatus, PreferredChannel } from "@prisma/client";
import { db } from "@/lib/db";
import { logger } from "@/lib/log";
import { isInIstSendWindow } from "@/lib/cron/lock";
import { getMessagingProvider, resolveMessagingProviderName } from "./index";

export type MessageKind =
  | "invoice_issued"
  | "payment_received"
  | "technician_en_route"
  | "job_completed"
  | "contract_renewal_due";

type CustomerTarget = {
  id: string;
  organizationId: string;
  phone: string;
  preferredChannel: PreferredChannel;
  whatsappOptOut: boolean;
};

type Payload = Record<string, string>;

type KindConfig = {
  smsBody: (p: Payload) => string;
  smsDltEnvKey: string;
  waTemplateEnvKeySuffix: string;
  waParams: (p: Payload) => string[];
};

const KIND_CONFIG: Record<MessageKind, KindConfig> = {
  invoice_issued: {
    smsBody: (p) =>
      `Invoice ${p.invoiceNumber} of Rs.${p.amount} is due on ${p.dueDate}. Pay here: ${p.invoiceUrl}`,
    smsDltEnvKey: "MSG91_SMS_DLT_INVOICE_ISSUED",
    waTemplateEnvKeySuffix: "INVOICE_ISSUED",
    waParams: (p) => [p.invoiceNumber, p.amount, p.dueDate, p.invoiceUrl],
  },
  payment_received: {
    smsBody: (p) =>
      `Payment of Rs.${p.amount} received for invoice ${p.invoiceNumber}. Thank you!`,
    smsDltEnvKey: "MSG91_SMS_DLT_PAYMENT_RECEIVED",
    waTemplateEnvKeySuffix: "PAYMENT_RECEIVED",
    waParams: (p) => [p.invoiceNumber, p.amount],
  },
  technician_en_route: {
    smsBody: (p) =>
      `Your technician ${p.technicianName} is on the way for job ${p.jobNumber}.`,
    smsDltEnvKey: "MSG91_SMS_DLT_TECHNICIAN_EN_ROUTE",
    waTemplateEnvKeySuffix: "TECHNICIAN_EN_ROUTE",
    waParams: (p) => [p.technicianName, p.jobNumber],
  },
  job_completed: {
    smsBody: (p) => `Job ${p.jobNumber} completed. Service report: ${p.summary}`,
    smsDltEnvKey: "MSG91_SMS_DLT_JOB_COMPLETED",
    waTemplateEnvKeySuffix: "JOB_COMPLETED",
    waParams: (p) => [p.jobNumber, p.summary],
  },
  contract_renewal_due: {
    smsBody: (p) =>
      `Contract ${p.contractNumber} expires in ${p.daysRemaining} days on ${p.expiryDate}. Renew: ${p.contractUrl}`,
    smsDltEnvKey: "MSG91_SMS_DLT_CONTRACT_RENEWAL_DUE",
    waTemplateEnvKeySuffix: "CONTRACT_RENEWAL_DUE",
    waParams: (p) => [p.contractNumber, p.daysRemaining, p.expiryDate, p.contractUrl],
  },
};

export async function notifyCustomer(
  customer: CustomerTarget,
  kind: MessageKind,
  payload: Payload,
): Promise<void> {
  if (!isInIstSendWindow()) return;
  if (customer.preferredChannel === PreferredChannel.EMAIL) return;
  if (customer.whatsappOptOut && customer.preferredChannel === PreferredChannel.WHATSAPP) return;

  const config = KIND_CONFIG[kind];
  const providerName = resolveMessagingProviderName();
  const provider = getMessagingProvider();

  const channel: "SMS" | "WHATSAPP" =
    customer.preferredChannel === PreferredChannel.WHATSAPP ? "WHATSAPP" : "SMS";

  // Create the log row before sending so a record always exists,
  // even if the DB write after a successful send were to fail.
  let logId: string | undefined;
  try {
    const log = await db.messageLog.create({
      data: {
        organizationId: customer.organizationId,
        customerId: customer.id,
        channel,
        kind,
        status: MessageStatus.QUEUED,
      },
      select: { id: true },
    });
    logId = log.id;
  } catch (dbErr) {
    logger.error({ event: "msg.log.error", kind, err: dbErr }, "Failed to create MessageLog");
  }

  let providerMessageId: string | undefined;
  try {
    if (customer.preferredChannel === PreferredChannel.WHATSAPP) {
      const templateId = process.env[
        `${providerName.toUpperCase()}_WA_TEMPLATE_${config.waTemplateEnvKeySuffix}`
      ]?.trim();
      if (!templateId) {
        logger.warn(
          { event: "msg.wa.no_template", kind, provider: providerName },
          "WhatsApp template ID not configured",
        );
        return;
      }
      const result = await provider.sendWhatsApp(
        customer.phone,
        templateId,
        config.waParams(payload),
      );
      providerMessageId = result.messageId;
    } else {
      const dltTemplateId = process.env[config.smsDltEnvKey]?.trim();
      if (!dltTemplateId) {
        logger.warn(
          { event: "msg.sms.no_dlt", kind },
          "DLT template ID not configured — SMS send rejected",
        );
        return;
      }
      const result = await provider.sendSMS(
        customer.phone,
        config.smsBody(payload),
        dltTemplateId,
      );
      providerMessageId = result.messageId;
    }

    if (logId) {
      await db.messageLog
        .update({ where: { id: logId }, data: { status: MessageStatus.SENT, providerMessageId, sentAt: new Date() } })
        .catch((dbErr) => {
          logger.error({ event: "msg.log.error", kind, err: dbErr }, "Failed to update MessageLog to SENT");
        });
    }
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    logger.error(
      { event: "msg.send.error", kind, channel, customerId: customer.id, err },
      "Customer message failed",
    );
    if (logId) {
      await db.messageLog
        .update({ where: { id: logId }, data: { status: MessageStatus.FAILED, error } })
        .catch((dbErr) => {
          logger.error({ event: "msg.log.error", kind, err: dbErr }, "Failed to update MessageLog to FAILED");
        });
    }
  }
}
