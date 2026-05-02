import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as typeof globalThis & {
  portalPrisma?: PrismaClient;
};

export const db = globalForPrisma.portalPrisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.portalPrisma = db;
}
