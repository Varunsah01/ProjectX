import { db } from "@/lib/db";

export function parseDateInput(value: string) {
  return new Date(`${value}T00:00:00`);
}

export function cleanOptional(value?: string | null) {
  if (!value?.trim()) {
    return null;
  }

  return value.trim();
}

export function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function getNextNumber(
  prefix: string,
  organizationId: string,
  model: "contract" | "invoice" | "ticket" | "job",
) {
  const year = new Date().getFullYear();
  let count = 0;

  switch (model) {
    case "contract":
      count = await db.contract.count({ where: { organizationId } });
      break;
    case "invoice":
      count = await db.invoice.count({
        where: {
          organizationId,
          invoiceNumber: {
            startsWith: `${prefix}-${year}-`,
          },
        },
      });
      return `${prefix}-${year}-${String(count + 1).padStart(5, "0")}`;
    case "ticket":
      count = await db.ticket.count({ where: { organizationId } });
      break;
    case "job":
      count = await db.job.count({ where: { organizationId } });
      break;
  }

  return `${prefix}-${year}-${String(count + 1).padStart(3, "0")}`;
}

export function getSlaDeadline(priority: "low" | "medium" | "high" | "critical") {
  const now = new Date();
  const hours =
    priority === "critical" ? 24 : priority === "high" ? 48 : priority === "medium" ? 72 : 120;
  now.setHours(now.getHours() + hours);
  return now;
}
