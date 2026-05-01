export interface OTPProvider {
  send(phone: string, code: string): Promise<void>;
}

export class OTPProviderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OTPProviderError";
  }
}
