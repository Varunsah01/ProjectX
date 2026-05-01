import { logger } from "@/lib/log";
import type { OTPProvider } from "./provider";

export const consoleOTPProvider: OTPProvider = {
  async send(phone, code) {
    logger.info({ event: "otp.console.send", phone, code }, `[OTP] phone=${phone} code=${code}`);
  },
};
