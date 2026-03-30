import * as SecureStore from "expo-secure-store";
import type {
  FieldOperatorJobStatus,
  Job,
  JobClosureType,
  JobProof,
  JobProofSource,
  JobProofType,
  JobStatus,
} from "../types/domain";

const OFFLINE_QUEUE_KEY = "project-x.mobile.pending-actions.v1";

type PendingActionBase = {
  id: string;
  createdAt: string;
  jobId: string;
  dedupeKey: string;
};

export type PendingJobStatusUpdateAction = PendingActionBase & {
  type: "job_status_update";
  payload: {
    status: Extract<
      FieldOperatorJobStatus,
      "on_the_way" | "arrived" | "work_started" | "completed"
    >;
    note?: string;
  };
};

export type PendingJobNotesSaveAction = PendingActionBase & {
  type: "job_notes_save";
  payload: {
    note?: string;
  };
};

export type PendingJobClosureSubmitAction = PendingActionBase & {
  type: "job_closure_submit";
  payload: {
    outcome: Exclude<JobClosureType, "complete"> | "complete";
    note: string;
    scheduledDate?: string;
  };
};

export type PendingJobProofUploadAction = PendingActionBase & {
  type: "job_proof_upload";
  payload: {
    proofId: string;
    type: JobProofType;
    label: string;
    createdAt: string;
    uri: string;
    source: Extract<JobProofSource, "camera" | "gallery">;
    fileName?: string;
    mimeType?: string;
    width?: number;
    height?: number;
  };
};

export type PendingAction =
  | PendingJobStatusUpdateAction
  | PendingJobNotesSaveAction
  | PendingJobClosureSubmitAction
  | PendingJobProofUploadAction;

type PendingQueueListener = (actions: PendingAction[]) => void;

let pendingActionsCache: PendingAction[] | null = null;
const pendingActionListeners = new Set<PendingQueueListener>();

function clonePendingActions(actions: PendingAction[]) {
  return JSON.parse(JSON.stringify(actions)) as PendingAction[];
}

function comparePendingActionOrder(left: PendingAction, right: PendingAction) {
  return left.createdAt.localeCompare(right.createdAt) || left.id.localeCompare(right.id);
}

function createPendingActionId() {
  return `pending-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

async function persistPendingActions(actions: PendingAction[]) {
  pendingActionsCache = clonePendingActions(actions);
  await SecureStore.setItemAsync(OFFLINE_QUEUE_KEY, JSON.stringify(actions));
  const snapshot = clonePendingActions(actions);
  pendingActionListeners.forEach((listener) => listener(snapshot));
}

export async function loadPendingActions() {
  if (pendingActionsCache) {
    return clonePendingActions(pendingActionsCache);
  }

  const rawValue = await SecureStore.getItemAsync(OFFLINE_QUEUE_KEY);

  if (!rawValue) {
    pendingActionsCache = [];
    return [];
  }

  try {
    const parsed = JSON.parse(rawValue);
    pendingActionsCache = Array.isArray(parsed) ? parsed.sort(comparePendingActionOrder) : [];
  } catch {
    pendingActionsCache = [];
  }

  return clonePendingActions(pendingActionsCache);
}

export function subscribePendingActions(listener: PendingQueueListener) {
  pendingActionListeners.add(listener);

  void loadPendingActions().then((actions) => {
    listener(actions);
  });

  return () => {
    pendingActionListeners.delete(listener);
  };
}

async function upsertPendingAction(nextAction: PendingAction) {
  const currentActions = await loadPendingActions();
  const nextActions = currentActions
    .filter((action) => action.dedupeKey !== nextAction.dedupeKey)
    .concat(nextAction)
    .sort(comparePendingActionOrder);

  await persistPendingActions(nextActions);
  return nextAction;
}

export async function removePendingAction(actionId: string) {
  const currentActions = await loadPendingActions();
  const nextActions = currentActions.filter((action) => action.id !== actionId);
  await persistPendingActions(nextActions);
}

export async function clearPendingActions() {
  await persistPendingActions([]);
}

export async function removePendingProofUpload(jobId: string, proofId: string) {
  const currentActions = await loadPendingActions();
  const nextActions = currentActions.filter((action) => {
    return !(
      action.type === "job_proof_upload" &&
      action.jobId === jobId &&
      action.payload.proofId === proofId
    );
  });

  await persistPendingActions(nextActions);
}

export async function queueJobStatusUpdate(input: {
  jobId: string;
  status: Extract<
    FieldOperatorJobStatus,
    "on_the_way" | "arrived" | "work_started" | "completed"
  >;
  note?: string;
}) {
  return upsertPendingAction({
    id: createPendingActionId(),
    type: "job_status_update",
    createdAt: new Date().toISOString(),
    jobId: input.jobId,
    dedupeKey: `status:${input.jobId}:${input.status}:${input.note?.trim() ?? ""}`,
    payload: {
      status: input.status,
      note: input.note?.trim() || undefined,
    },
  });
}

export async function queueJobNotesSave(input: {
  jobId: string;
  note?: string;
}) {
  return upsertPendingAction({
    id: createPendingActionId(),
    type: "job_notes_save",
    createdAt: new Date().toISOString(),
    jobId: input.jobId,
    dedupeKey: `notes:${input.jobId}`,
    payload: {
      note: input.note?.trim() || undefined,
    },
  });
}

export async function queueJobClosureSubmit(input: {
  jobId: string;
  outcome: Exclude<JobClosureType, "complete"> | "complete";
  note: string;
  scheduledDate?: string;
}) {
  return upsertPendingAction({
    id: createPendingActionId(),
    type: "job_closure_submit",
    createdAt: new Date().toISOString(),
    jobId: input.jobId,
    dedupeKey: `closure:${input.jobId}`,
    payload: {
      outcome: input.outcome,
      note: input.note.trim(),
      scheduledDate: input.scheduledDate?.trim() || undefined,
    },
  });
}

export async function queueJobProofUpload(input: {
  jobId: string;
  proofId: string;
  type: JobProofType;
  label: string;
  createdAt: string;
  uri: string;
  source: Extract<JobProofSource, "camera" | "gallery">;
  fileName?: string;
  mimeType?: string;
  width?: number;
  height?: number;
}) {
  return upsertPendingAction({
    id: createPendingActionId(),
    type: "job_proof_upload",
    createdAt: input.createdAt,
    jobId: input.jobId,
    dedupeKey: `proof:${input.jobId}:${input.proofId}`,
    payload: {
      proofId: input.proofId,
      type: input.type,
      label: input.label.trim(),
      createdAt: input.createdAt,
      uri: input.uri,
      source: input.source,
      fileName: input.fileName,
      mimeType: input.mimeType,
      width: input.width,
      height: input.height,
    },
  });
}

function normalizeOperatorStatusForJob(status: JobStatus) {
  switch (status) {
    case "completed":
      return "completed";
    case "cancelled":
      return "failed";
    case "in_progress":
      return "work_started";
    case "en_route":
      return "on_the_way";
    default:
      return "assigned";
  }
}

function appendReportSection(currentValue?: string, nextValue?: string) {
  const sections = [currentValue?.trim(), nextValue?.trim()].filter(Boolean);
  return sections.join("\n\n").trim() || undefined;
}

export function applyPendingActionsToJob(job: Job, actions: PendingAction[]) {
  const queuedActions = actions
    .filter((action) => action.jobId === job.id)
    .sort(comparePendingActionOrder);

  return queuedActions.reduce<Job>((currentJob, action) => {
      if (action.type === "job_notes_save") {
        return {
          ...currentJob,
          serviceReport: action.payload.note,
        };
      }

      if (action.type === "job_status_update") {
        if (action.payload.status === "completed") {
          return {
            ...currentJob,
            status: "completed",
            operatorStatus: "completed",
            completedAt: currentJob.completedAt ?? action.createdAt,
            serviceReport: action.payload.note ?? currentJob.serviceReport,
          };
        }

        const nextStatus: JobStatus =
          action.payload.status === "work_started" ? "in_progress" : "en_route";

        return {
          ...currentJob,
          status: nextStatus,
          operatorStatus: action.payload.status,
          serviceReport: appendReportSection(currentJob.serviceReport, action.payload.note),
        };
      }

      if (action.type === "job_closure_submit") {
        if (action.payload.outcome === "fail") {
          return {
            ...currentJob,
            status: "cancelled",
            operatorStatus: "failed",
            completedAt: undefined,
            serviceReport: action.payload.note,
          };
        }

        if (action.payload.outcome === "reschedule") {
          return {
            ...currentJob,
            status: "assigned",
            operatorStatus: "rescheduled",
            scheduledDate: action.payload.scheduledDate ?? currentJob.scheduledDate,
            completedAt: undefined,
            serviceReport: action.payload.note,
          };
        }

        return {
          ...currentJob,
          status: "completed",
          operatorStatus: "completed",
          completedAt: currentJob.completedAt ?? action.createdAt,
          serviceReport: action.payload.note,
        };
      }

      return {
        ...currentJob,
        operatorStatus: currentJob.operatorStatus ?? normalizeOperatorStatusForJob(currentJob.status),
      };
    }, job);
}

export function applyPendingActionsToJobs(jobs: Job[], actions: PendingAction[]) {
  return jobs.map((job) => applyPendingActionsToJob(job, actions));
}

export function countPendingActionsForJob(jobId: string, actions: PendingAction[]) {
  return actions.filter((action) => action.jobId === jobId).length;
}

export function getPendingProofsForJob(jobId: string, actions: PendingAction[]): JobProof[] {
  return actions
    .filter(
      (action): action is PendingJobProofUploadAction =>
        action.type === "job_proof_upload" && action.jobId === jobId,
    )
    .sort(comparePendingActionOrder)
    .map((action) => ({
      id: action.payload.proofId,
      jobId: action.jobId,
      type: action.payload.type,
      label: action.payload.label,
      createdAt: action.payload.createdAt,
      uri: action.payload.uri,
      source: action.payload.source,
      syncState: "pending",
      fileName: action.payload.fileName,
      mimeType: action.payload.mimeType,
      width: action.payload.width,
      height: action.payload.height,
    }));
}
