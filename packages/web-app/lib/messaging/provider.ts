export interface SendSMSResult {
  messageId?: string;
}

export interface SendWhatsAppResult {
  messageId?: string;
}

export interface MessagingProvider {
  /** body must exactly match the DLT-registered template. dltTemplateId required for SMS compliance. */
  sendSMS(to: string, body: string, dltTemplateId: string): Promise<SendSMSResult>;
  /** templateId is the provider-registered approved template. params are positional. */
  sendWhatsApp(to: string, templateId: string, params: string[]): Promise<SendWhatsAppResult>;
}

export class MessagingProviderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MessagingProviderError";
  }
}
