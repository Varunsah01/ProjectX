import { NextResponse } from "next/server";
import type { ZodType } from "zod";

export async function parseJsonBody<TSchema extends ZodType>(
  request: Request,
  schema: TSchema,
) {
  return schema.parse(await request.json());
}

export function parseRouteParams<TSchema extends ZodType>(
  params: unknown,
  schema: TSchema,
) {
  return schema.parse(params);
}

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}
