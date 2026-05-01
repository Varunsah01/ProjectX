import pino from "pino";
import { getRequestId } from "./request-context";

export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  base: undefined,
  timestamp: pino.stdTimeFunctions.isoTime,
  ...(process.env.NODE_ENV !== "production"
    ? {
        transport: {
          target: "pino-pretty",
          options: { colorize: true },
        },
      }
    : {}),
  mixin() {
    const requestId = getRequestId();
    return requestId ? { requestId } : {};
  },
});

export {
  requestContext,
  getRequestId,
  withRequest,
  type RequestContext,
} from "./request-context";
