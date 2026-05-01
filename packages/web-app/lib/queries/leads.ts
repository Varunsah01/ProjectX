import type { LeadStatus } from "@prisma/client";
import { db } from "@/lib/db";

export type LeadRow = {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  message: string | null;
  source: string;
  status: LeadStatus;
  createdAt: Date;
  updatedAt: Date;
};

export async function listLeads(filters: {
  status?: LeadStatus;
  search?: string;
}): Promise<LeadRow[]> {
  const search = filters.search?.trim();

  return db.lead.findMany({
    where: {
      ...(filters.status ? { status: filters.status } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
              { company: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 200,
  });
}
