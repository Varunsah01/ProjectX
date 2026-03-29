import type { Job } from "../types/domain";
import {
  getMockJobTimeSlot,
  listMockJobTimeSlots,
} from "../features/jobs/job-time-slots.mock";

function withMockLatency<T>(value: T, delayMs = 120) {
  return new Promise<T>((resolve) => {
    setTimeout(() => resolve(value), delayMs);
  });
}

export function getJobServiceWindow(job: Pick<Job, "id" | "scheduledDate">) {
  return getMockJobTimeSlot(`${job.id}:${job.scheduledDate}`);
}

export function listJobServiceWindowOptions() {
  return listMockJobTimeSlots();
}

export async function fetchJobServiceWindow(job: Pick<Job, "id" | "scheduledDate">) {
  return withMockLatency(getJobServiceWindow(job));
}

export async function fetchJobServiceWindowOptions() {
  return withMockLatency(listJobServiceWindowOptions());
}
