"use client";

import { toast } from "sonner";

export async function apiFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const res = await fetch(input, init);
  if (res.status === 429) {
    toast.warning("You're going too fast — please slow down and try again.");
  }
  return res;
}
