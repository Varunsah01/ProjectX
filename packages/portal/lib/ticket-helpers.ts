import { db } from "@/lib/db";

export async function getNextTicketNumber(organizationId: string) {
  const year = new Date().getFullYear();
  const count = await db.ticket.count({ where: { organizationId } });
  return `TKT-${year}-${String(count + 1).padStart(3, "0")}`;
}

export function getSlaDeadline(
  priority: "low" | "medium" | "high" | "critical",
) {
  const now = new Date();
  const hours =
    priority === "critical"
      ? 24
      : priority === "high"
        ? 48
        : priority === "medium"
          ? 72
          : 120;
  now.setHours(now.getHours() + hours);
  return now;
}
