import type { FieldOperatorJobStatus, Job, JobProof } from "../../types/domain";

export interface JobStatusFormValues {
  nextStatus: FieldOperatorJobStatus | null;
  comment: string;
  scheduledDate: string;
}

export interface JobStatusFormErrors {
  nextStatus?: string;
  comment?: string;
  scheduledDate?: string;
}

export const operatorStatusMeta: Record<
  FieldOperatorJobStatus,
  {
    label: string;
    helper: string;
    actionLabel: string;
  }
> = {
  assigned: {
    label: "Assigned",
    helper: "This visit is ready for you to pick up.",
    actionLabel: "Assigned",
  },
  on_the_way: {
    label: "On the Way",
    helper: "Use this after you start travelling to the customer.",
    actionLabel: "Mark On the Way",
  },
  arrived: {
    label: "Arrived",
    helper: "Use this when you reach the customer location.",
    actionLabel: "Mark Arrived",
  },
  work_started: {
    label: "Work Started",
    helper: "Use this when inspection or service work has started.",
    actionLabel: "Start Work",
  },
  completed: {
    label: "Completed",
    helper: "Use this after you finish the visit and add a note or photo.",
    actionLabel: "Mark Completed",
  },
  rescheduled: {
    label: "Rescheduled",
    helper: "Move the visit to a new date and add the reason.",
    actionLabel: "Reschedule Job",
  },
  failed: {
    label: "Failed",
    helper: "Use this when the visit could not be completed.",
    actionLabel: "Mark Failed",
  },
};

const nextStatusMap: Record<FieldOperatorJobStatus, FieldOperatorJobStatus[]> = {
  assigned: ["on_the_way", "arrived", "work_started", "rescheduled", "failed"],
  on_the_way: ["arrived", "work_started", "rescheduled", "failed"],
  arrived: ["work_started", "completed", "rescheduled", "failed"],
  work_started: ["completed", "rescheduled", "failed"],
  completed: [],
  rescheduled: [],
  failed: [],
};

export function getCurrentOperatorStatus(job: Pick<Job, "status" | "operatorStatus">) {
  if (job.operatorStatus) {
    return job.operatorStatus;
  }

  if (job.status === "completed") {
    return "completed";
  }

  if (job.status === "cancelled") {
    return "failed";
  }

  if (job.status === "in_progress") {
    return "work_started";
  }

  if (job.status === "en_route") {
    return "on_the_way";
  }

  return "assigned";
}

export function getAvailableNextStatuses(currentStatus: FieldOperatorJobStatus) {
  return nextStatusMap[currentStatus];
}

export function validateJobStatusForm(
  values: JobStatusFormValues,
  options: {
    currentStatus: FieldOperatorJobStatus;
    proofs: JobProof[];
  },
): JobStatusFormErrors {
  const errors: JobStatusFormErrors = {};
  const trimmedComment = values.comment.trim();
  const trimmedScheduledDate = values.scheduledDate.trim();

  if (!values.nextStatus) {
    errors.nextStatus = "Choose the next status.";
    return errors;
  }

  if (!getAvailableNextStatuses(options.currentStatus).includes(values.nextStatus)) {
    errors.nextStatus = "That status is not available from the current step.";
  }

  if (
    (values.nextStatus === "failed" || values.nextStatus === "rescheduled") &&
    !trimmedComment
  ) {
    errors.comment = "Add a reason for this change.";
  }

  if (values.nextStatus === "completed" && !trimmedComment && options.proofs.length === 0) {
    errors.comment = "Add a completion note or proof before you finish this job.";
  }

  if (values.nextStatus === "rescheduled") {
    if (!trimmedScheduledDate) {
      errors.scheduledDate = "Enter the new visit date.";
    } else if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmedScheduledDate)) {
      errors.scheduledDate = "Use YYYY-MM-DD format.";
    }
  }

  return errors;
}
