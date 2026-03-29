import type { Job, JobStatus } from "../../types/domain";
import { getJobServiceWindow } from "../../services/job-service-windows";
import { titleCase } from "../../utils/format";

export type JobBoardTab = "today" | "upcoming" | "overdue";

type JobSummaryCounts = {
  assigned: number;
  inProgress: number;
  completed: number;
  overdue: number;
};

function parseJobDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
}

function startOfDay(date = new Date()) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function isClosedJob(status: JobStatus) {
  return status === "completed" || status === "cancelled";
}

export function isOverdueJob(job: Job, today = new Date()) {
  return !isClosedJob(job.status) && parseJobDate(job.scheduledDate) < startOfDay(today);
}

export function getJobSummaryCounts(jobs: Job[], today = new Date()): JobSummaryCounts {
  return {
    assigned: jobs.filter((job) => job.status === "pending" || job.status === "assigned").length,
    inProgress: jobs.filter((job) => job.status === "en_route" || job.status === "in_progress")
      .length,
    completed: jobs.filter((job) => job.status === "completed").length,
    overdue: jobs.filter((job) => isOverdueJob(job, today)).length,
  };
}

export function getJobsForTab(jobs: Job[], tab: JobBoardTab, today = new Date()) {
  const todayStart = startOfDay(today);

  return jobs
    .filter((job) => {
      const scheduledDate = parseJobDate(job.scheduledDate);

      if (tab === "today") {
        return scheduledDate.getTime() === todayStart.getTime();
      }

      if (tab === "upcoming") {
        return scheduledDate > todayStart;
      }

      return isOverdueJob(job, today);
    })
    .sort((left, right) => parseJobDate(left.scheduledDate).getTime() - parseJobDate(right.scheduledDate).getTime());
}

export function getJobServiceLabel(job: Job) {
  return titleCase(job.type);
}

export function getJobTimeSlot(job: Job) {
  return getJobServiceWindow(job);
}

export function getJobAddressSnippet(job: Job) {
  const normalizedAddress = job.customer.address.replace(/\s+/g, " ").trim();

  if (normalizedAddress.length <= 56) {
    return normalizedAddress;
  }

  return `${normalizedAddress.slice(0, 53)}...`;
}

export function getPrimaryJobActionLabel(job: Job) {
  switch (job.status) {
    case "pending":
    case "assigned":
      return "Start Job";
    case "en_route":
      return "Resume Route";
    case "in_progress":
      return "Continue Job";
    case "completed":
      return "View Summary";
    case "cancelled":
      return "Review";
    default:
      return "Open Job";
  }
}

export function getEmptyStateCopy(tab: JobBoardTab) {
  if (tab === "today") {
    return {
      title: "No jobs for today",
      message: "Pull to refresh or switch to Upcoming or Overdue to review the rest of your queue.",
    };
  }

  if (tab === "upcoming") {
    return {
      title: "No upcoming jobs",
      message: "New future assignments will appear here as they are scheduled.",
    };
  }

  return {
    title: "No overdue jobs",
    message: "Nothing is currently behind schedule in your assigned queue.",
  };
}
