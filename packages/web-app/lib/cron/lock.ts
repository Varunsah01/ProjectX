import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

/** IST = UTC+5:30. Returns true when current IST wall-clock is 08:00–20:59. */
export function isInIstSendWindow(now = new Date()): boolean {
  const IST_OFFSET_MIN = 5 * 60 + 30;
  const utcMin = now.getUTCHours() * 60 + now.getUTCMinutes();
  const istHour = Math.floor(((utcMin + IST_OFFSET_MIN) % 1440) / 60);
  // Allowed window: 08:00–21:59 IST
  return istHour >= 8 && istHour < 22;
}

/** UTC midnight that corresponds to today's IST calendar date. */
export function getISTDate(now = new Date()): Date {
  const IST_MS = (5 * 60 + 30) * 60_000;
  const ist = new Date(now.getTime() + IST_MS);
  return new Date(Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate()));
}

export type CronLockResult<T> =
  | { skipped: "already-ran" | "outside-send-window" }
  | { result: T };

/**
 * Per-day advisory lock for cron jobs.
 *
 * - Returns `{ skipped: 'already-ran' }` if a DONE CronRun exists for today.
 * - Returns `{ skipped: 'outside-send-window' }` if IST time is outside 08:00–20:59.
 * - On success marks the run DONE and returns `{ result }`.
 * - On failure marks the run FAILED and re-throws so the caller can log + 500.
 */
export async function withCronLock<T>(
  name: string,
  fn: () => Promise<T>,
): Promise<CronLockResult<T>> {
  const runDate = getISTDate();

  const existing = await db.cronRun.findUnique({
    where: { name_runDate: { name, runDate } },
  });
  if (existing?.status === "DONE") {
    return { skipped: "already-ran" };
  }

  if (!isInIstSendWindow()) {
    return { skipped: "outside-send-window" };
  }

  let run: { id: string };
  try {
    run = await db.cronRun.create({ data: { name, runDate, status: "RUNNING" } });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return { skipped: "already-ran" };
    }
    throw err;
  }

  try {
    const result = await fn();
    await db.cronRun.update({ where: { id: run.id }, data: { status: "DONE" } });
    return { result };
  } catch (err) {
    await db.cronRun.update({ where: { id: run.id }, data: { status: "FAILED" } });
    throw err;
  }
}
