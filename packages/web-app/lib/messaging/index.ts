import { consoleMessagingProvider } from "./console-provider";
import { gupshupMessagingProvider } from "./gupshup-provider";
import { msg91MessagingProvider } from "./msg91-provider";
import type { MessagingProvider } from "./provider";

export type MessagingProviderName = "console" | "msg91" | "gupshup";

export function resolveMessagingProviderName(): MessagingProviderName {
  const explicit = process.env.MESSAGING_PROVIDER?.trim().toLowerCase();
  if (explicit === "msg91" || explicit === "gupshup" || explicit === "console") {
    return explicit;
  }
  return process.env.NODE_ENV === "production" ? "msg91" : "console";
}

export function getMessagingProvider(): MessagingProvider {
  switch (resolveMessagingProviderName()) {
    case "msg91":
      return msg91MessagingProvider;
    case "gupshup":
      return gupshupMessagingProvider;
    default:
      return consoleMessagingProvider;
  }
}

export type { MessagingProvider } from "./provider";
export { MessagingProviderError } from "./provider";
