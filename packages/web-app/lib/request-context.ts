import { AsyncLocalStorage } from "node:async_hooks";

export type RequestContext = {
  requestId: string;
  userId?: string;
  orgId?: string;
};

export const requestContext = new AsyncLocalStorage<RequestContext>();

export function getRequestId(): string | undefined {
  return requestContext.getStore()?.requestId;
}

export function withRequest<T>(
  ctx: RequestContext,
  fn: () => T | Promise<T>,
): T | Promise<T> {
  return requestContext.run(ctx, fn);
}
