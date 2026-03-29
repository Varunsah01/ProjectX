import type { AuthenticatedRequest } from "./api";
import { shouldQueueOfflineMutation } from "./api";
import type { DetailResponse, JobDetailDto, JobSummaryDto, ListResponse } from "../types/api";
import type {
  FieldOperatorJobStatus,
  Job,
  JobClosure,
  JobProof,
  JobProofSource,
  JobProofType,
  JobStatus,
  JobUpdate,
} from "../types/domain";
import {
  queueJobClosureSubmit,
  queueJobNotesSave,
  queueJobStatusUpdate,
} from "./offline-sync";

const ARRIVED_STATUS_MARKER = "[operator_status:arrived]";

const operatorStatusMap: Record<
  Extract<FieldOperatorJobStatus, "on_the_way" | "arrived" | "work_started" | "completed">,
  "en_route" | "arrived" | "in_progress" | "completed"
> = {
  on_the_way: "en_route",
  arrived: "arrived",
  work_started: "in_progress",
  completed: "completed",
};

function stripOperatorStatusMarkers(value?: string) {
  if (!value) {
    return undefined;
  }

  const cleaned = value
    .split("\n")
    .filter((line) => line.trim() !== ARRIVED_STATUS_MARKER)
    .join("\n")
    .trim();

  return cleaned || undefined;
}

function getOperatorStatus(
  status: JobStatus,
  serviceReport?: string,
): FieldOperatorJobStatus {
  if (status === "completed") {
    return "completed";
  }

  if (status === "cancelled") {
    return "failed";
  }

  if (status === "in_progress") {
    return "work_started";
  }

  if (status === "en_route") {
    return serviceReport?.includes(ARRIVED_STATUS_MARKER) ? "arrived" : "on_the_way";
  }

  return "assigned";
}

function mapJobSummary(dto: JobSummaryDto): Job {
  const operatorStatus = getOperatorStatus(dto.status, dto.serviceReport);

  return {
    id: dto.id,
    jobNumber: dto.jobNumber,
    ticketId: dto.ticketId,
    type: dto.type,
    status: dto.status,
    operatorStatus,
    scheduledDate: dto.scheduledDate,
    completedAt: dto.completedAt,
    notes: dto.notes,
    serviceReport: stripOperatorStatusMarkers(dto.serviceReport),
    customer: {
      id: dto.customerId,
      name: dto.customerName,
      address: dto.customerAddress,
    },
    asset: dto.assetName
      ? {
          id: dto.assetId,
          name: dto.assetName,
        }
      : undefined,
    technician: {
      id: dto.technicianId,
      name: dto.technicianName,
    },
  };
}

export function mapJobSummaries(dtos: JobSummaryDto[]) {
  return dtos.map(mapJobSummary);
}

function mapJobDetail(dto: JobDetailDto): Job {
  const operatorStatus = getOperatorStatus(dto.status, dto.serviceReport);

  return {
    id: dto.id,
    jobNumber: dto.jobNumber,
    type: dto.type,
    status: dto.status,
    operatorStatus,
    scheduledDate: dto.scheduledDate,
    completedAt: dto.completedAt,
    notes: dto.notes,
    serviceReport: stripOperatorStatusMarkers(dto.serviceReport),
    customer: {
      id: dto.customer.id,
      name: dto.customer.name,
      address: dto.customer.address,
      city: dto.customer.city,
      phone: dto.customer.phone,
      email: dto.customer.email,
    },
    asset: dto.asset
      ? {
          id: dto.asset.id,
          name: dto.asset.name,
          model: dto.asset.model,
          serialNumber: dto.asset.serialNumber,
          category: dto.asset.category,
          status: dto.asset.status,
          location: dto.asset.location,
          notes: dto.asset.notes,
        }
      : undefined,
    complaint: dto.complaint
      ? {
          id: dto.complaint.id,
          ticketNumber: dto.complaint.ticketNumber,
          subject: dto.complaint.subject,
          description: dto.complaint.description,
          category: dto.complaint.category,
          priority: dto.complaint.priority,
          status: dto.complaint.status,
        }
      : undefined,
  };
}

export function mapJobDetails(dto: JobDetailDto) {
  return mapJobDetail(dto);
}

export async function fetchJobs(request: AuthenticatedRequest) {
  const response = await request<ListResponse<JobSummaryDto>>("/jobs", {
    retry: 1,
  });
  return mapJobSummaries(response.data);
}

export async function fetchJobDetail(
  request: AuthenticatedRequest,
  jobId: string,
) {
  const response = await request<DetailResponse<JobDetailDto>>(`/jobs/${jobId}`, {
    retry: 1,
  });
  return mapJobDetails(response.data);
}

export async function sendJobStatusUpdate(
  request: AuthenticatedRequest,
  update: Pick<JobUpdate, "jobId" | "status" | "note"> & {
    status: Extract<FieldOperatorJobStatus, "on_the_way" | "arrived" | "work_started" | "completed">;
  },
) {
  const response = await request<DetailResponse<JobSummaryDto>>(`/jobs/${update.jobId}/status`, {
    method: "POST",
    body: {
      status: operatorStatusMap[update.status],
      comment: update.note,
      serviceReport: update.note,
    },
    retry: 1,
  });

  return mapJobSummary(response.data);
}

export async function updateJobStatus(
  request: AuthenticatedRequest,
  update: Pick<JobUpdate, "jobId" | "status" | "note"> & {
    status: Extract<FieldOperatorJobStatus, "on_the_way" | "arrived" | "work_started" | "completed">;
  },
) {
  try {
    return await sendJobStatusUpdate(request, update);
  } catch (error) {
    if (!shouldQueueOfflineMutation(error)) {
      throw error;
    }

    await queueJobStatusUpdate(update);
    return null;
  }
}

export async function sendJobNotesSave(
  request: AuthenticatedRequest,
  update: Pick<JobUpdate, "jobId" | "note">,
) {
  const response = await request<DetailResponse<JobDetailDto>>(`/jobs/${update.jobId}/notes`, {
    method: "POST",
    body: {
      serviceReport: update.note,
    },
    retry: 1,
  });

  return mapJobDetail(response.data);
}

export async function saveJobNotes(
  request: AuthenticatedRequest,
  update: Pick<JobUpdate, "jobId" | "note">,
) {
  try {
    return await sendJobNotesSave(request, update);
  } catch (error) {
    if (!shouldQueueOfflineMutation(error)) {
      throw error;
    }

    await queueJobNotesSave(update);
    return null;
  }
}

export async function sendFailJob(
  request: AuthenticatedRequest,
  closure: Pick<JobClosure, "jobId" | "note">,
) {
  const response = await request<DetailResponse<JobSummaryDto>>(`/jobs/${closure.jobId}/fail`, {
    method: "POST",
    body: {
      reason: closure.note,
    },
    retry: 1,
  });

  return mapJobSummary(response.data);
}

export async function failJob(
  request: AuthenticatedRequest,
  closure: Pick<JobClosure, "jobId" | "note">,
) {
  try {
    return await sendFailJob(request, closure);
  } catch (error) {
    if (!shouldQueueOfflineMutation(error)) {
      throw error;
    }

    await queueJobClosureSubmit({
      jobId: closure.jobId,
      outcome: "fail",
      note: closure.note,
    });
    return null;
  }
}

export async function sendRescheduleJob(
  request: AuthenticatedRequest,
  closure: Pick<JobClosure, "jobId" | "note" | "scheduledDate"> & {
    scheduledDate: string;
  },
) {
  const response = await request<DetailResponse<JobSummaryDto>>(
    `/jobs/${closure.jobId}/reschedule`,
    {
      method: "POST",
      body: {
        scheduledDate: closure.scheduledDate,
        note: closure.note,
      },
      retry: 1,
    },
  );

  return mapJobSummary(response.data);
}

export async function rescheduleJob(
  request: AuthenticatedRequest,
  closure: Pick<JobClosure, "jobId" | "note" | "scheduledDate"> & {
    scheduledDate: string;
  },
) {
  try {
    return await sendRescheduleJob(request, closure);
  } catch (error) {
    if (!shouldQueueOfflineMutation(error)) {
      throw error;
    }

    await queueJobClosureSubmit({
      jobId: closure.jobId,
      outcome: "reschedule",
      note: closure.note,
      scheduledDate: closure.scheduledDate,
    });
    return null;
  }
}

export function createLocalJobProof(
  input: {
    jobId: string;
    label: string;
    type: JobProofType;
    uri?: string;
    source?: JobProofSource;
    fileName?: string;
    mimeType?: string;
    width?: number;
    height?: number;
    sizeBytes?: number;
    id?: string;
    createdAt?: string;
    syncState?: "synced" | "pending";
  },
): JobProof {
  return {
    id: input.id ?? `${input.jobId}-${input.type}-${Date.now()}`,
    jobId: input.jobId,
    type: input.type,
    label: input.label.trim(),
    createdAt: input.createdAt ?? new Date().toISOString(),
    uri: input.uri,
    source: input.source,
    syncState: input.syncState ?? (input.source === "remote" ? "synced" : undefined),
    fileName: input.fileName,
    mimeType: input.mimeType,
    width: input.width,
    height: input.height,
    sizeBytes: input.sizeBytes,
  };
}

export function buildJobClosureReport(closure: Pick<JobClosure, "note" | "proofs">) {
  const sections: string[] = [];
  const trimmedNote = closure.note.trim();

  if (trimmedNote) {
    sections.push(trimmedNote);
  }

  if (closure.proofs.length > 0) {
    sections.push(
      [
        "Proof references:",
        ...closure.proofs.map(
          (proof, index) => `${index + 1}. [${proof.type}] ${proof.label}`,
        ),
      ].join("\n"),
    );
  }

  return sections.join("\n\n").trim();
}
