import { consoleOTPProvider } from "./console-provider";
import { msg91OTPProvider } from "./msg91-provider";
import type { OTPProvider } from "./provider";

export type OTPProviderName = "console" | "msg91";

export function resolveOTPProviderName(): OTPProviderName {
  const explicit = process.env.OTP_PROVIDER?.trim().toLowerCase();
  if (explicit === "msg91" || explicit === "console") {
    return explicit;
  }
  return process.env.NODE_ENV === "production" ? "msg91" : "console";
}

export function getOTPProvider(): OTPProvider {
  const name = resolveOTPProviderName();
  return name === "msg91" ? msg91OTPProvider : consoleOTPProvider;
}

export type { OTPProvider } from "./provider";
export { OTPProviderError } from "./provider";
