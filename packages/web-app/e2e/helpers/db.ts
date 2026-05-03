/**
 * Prisma client singleton for e2e test helpers.
 *
 * Uses DATABASE_URL from the process environment (same variable the app uses).
 * Import `db` — never instantiate PrismaClient directly in test files.
 */
import { PrismaClient } from "@prisma/client";

let _client: PrismaClient | null = null;

export function getDb(): PrismaClient {
  if (!_client) {
    _client = new PrismaClient({ log: [] });
  }
  return _client;
}

export async function closeDb(): Promise<void> {
  if (_client) {
    await _client.$disconnect();
    _client = null;
  }
}

/** Convenience re-export so test files can just `import { db } from "./helpers/db"`. */
export const db = new Proxy({} as PrismaClient, {
  get(_t, prop) {
    return (getDb() as unknown as Record<string | symbol, unknown>)[prop];
  },
});
