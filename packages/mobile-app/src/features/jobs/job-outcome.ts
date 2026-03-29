import type { JobClosureType } from "../../types/domain";

export interface JobOutcomeFormValues {
  closureNotes: string;
  failureReason: string;
  rescheduleReason: string;
  preferredDate: string;
  preferredSlot: string;
  customerConfirmed: boolean;
}

export interface JobOutcomeFormErrors {
  closureNotes?: string;
  failureReason?: string;
  rescheduleReason?: string;
  preferredDate?: string;
  preferredSlot?: string;
  customerConfirmed?: string;
}

export function createJobOutcomeFormValues(
  scheduledDate: string,
  seed?: Partial<JobOutcomeFormValues>,
): JobOutcomeFormValues {
  return {
    closureNotes: seed?.closureNotes ?? "",
    failureReason: seed?.failureReason ?? "",
    rescheduleReason: seed?.rescheduleReason ?? "",
    preferredDate: seed?.preferredDate ?? scheduledDate,
    preferredSlot: seed?.preferredSlot ?? "",
    customerConfirmed: seed?.customerConfirmed ?? false,
  };
}

function isValidIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, (month || 1) - 1, day || 1);

  return (
    date.getFullYear() === year &&
    date.getMonth() === (month || 1) - 1 &&
    date.getDate() === day
  );
}

export function validateJobOutcomeForm(
  outcome: JobClosureType,
  values: JobOutcomeFormValues,
): JobOutcomeFormErrors {
  const errors: JobOutcomeFormErrors = {};

  if (outcome === "complete") {
    if (!values.closureNotes.trim()) {
      errors.closureNotes = "Closure notes are required.";
    }

    if (!values.customerConfirmed) {
      errors.customerConfirmed = "Confirm customer handoff before completing the job.";
    }

    return errors;
  }

  if (outcome === "fail") {
    if (!values.failureReason.trim()) {
      errors.failureReason = "Failure reason is required.";
    }

    return errors;
  }

  if (!values.rescheduleReason.trim()) {
    errors.rescheduleReason = "Reason is required for rescheduling.";
  }

  const trimmedDate = values.preferredDate.trim();

  if (!trimmedDate) {
    errors.preferredDate = "Preferred new date is required.";
  } else if (!isValidIsoDate(trimmedDate)) {
    errors.preferredDate = "Use a valid YYYY-MM-DD date.";
  }

  if (!values.preferredSlot.trim()) {
    errors.preferredSlot = "Preferred slot is required.";
  }

  return errors;
}

export function buildCompletedClosureNotes(values: JobOutcomeFormValues) {
  return [
    "Closure Notes:",
    values.closureNotes.trim(),
    "",
    "Customer Confirmation:",
    values.customerConfirmed ? "Confirmed on site" : "Not confirmed",
  ].join("\n");
}

export function buildFailureClosureNotes(values: JobOutcomeFormValues) {
  return [
    "Failure Reason:",
    values.failureReason.trim(),
  ].join("\n");
}

export function buildRescheduleClosureNotes(values: JobOutcomeFormValues) {
  return [
    "Reschedule Reason:",
    values.rescheduleReason.trim(),
    "",
    "Preferred New Date:",
    values.preferredDate.trim(),
    "",
    "Preferred Slot:",
    values.preferredSlot.trim(),
  ].join("\n");
}
