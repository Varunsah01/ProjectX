import type { AuthenticatedRequest } from "./api";
import { shouldQueueOfflineMutation } from "./api";
import type {
  ComplaintDetail as ComplaintDetailDto,
  ComplaintStatus,
  ComplaintSummary as ComplaintSummaryDto,
  DetailResponse,
  ListResponse,
  MutationResponse,
} from "../types/api";
import type {
  ComplaintDetail,
  ComplaintSummary,
  ComplaintTimelineEntry,
} from "../types/domain";

function mapComplaintTimelineEntry(
  entry: ComplaintSummaryDto["timeline"][number],
): ComplaintTimelineEntry {
  return {
    id: entry.id,
    date: entry.date,
    action: entry.action,
    by: entry.by,
    note: entry.note,
  };
}

function mapComplaintSummary(dto: ComplaintSummaryDto): ComplaintSummary {
  return {
    id: dto.id,
    ticketNumber: dto.ticketNumber,
    customerId: dto.customerId,
    customerName: dto.customerName,
    assetId: dto.assetId,
    assetName: dto.assetName,
    subject: dto.subject,
    description: dto.description,
    category: dto.category,
    priority: dto.priority,
    status: dto.status,
    assignedTo: dto.assignedTo,
    assignedTechnicianId: dto.assignedTechnicianId,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
    resolvedAt: dto.resolvedAt,
    slaDeadline: dto.slaDeadline,
    timeline: Array.isArray(dto.timeline) ? dto.timeline.map(mapComplaintTimelineEntry) : [],
  };
}

function mapComplaintDetail(dto: ComplaintDetailDto): ComplaintDetail {
  return {
    id: dto.id,
    ticketNumber: dto.ticketNumber,
    subject: dto.subject,
    description: dto.description,
    category: dto.category,
    priority: dto.priority,
    status: dto.status,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
    resolvedAt: dto.resolvedAt,
    slaDeadline: dto.slaDeadline,
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
    timeline: Array.isArray(dto.timeline) ? dto.timeline.map(mapComplaintTimelineEntry) : [],
    linkedJobs: Array.isArray(dto.linkedJobs)
      ? dto.linkedJobs.map((job) => ({
          id: job.id,
          jobNumber: job.jobNumber,
          status: job.status,
          scheduledDate: job.scheduledDate,
        }))
      : [],
  };
}

export async function fetchComplaints(request: AuthenticatedRequest) {
  const response = await request<ListResponse<ComplaintSummaryDto>>("/complaints", {
    retry: 1,
    timeoutMs: 15000,
  });
  return response.data.map(mapComplaintSummary);
}

export async function fetchComplaintDetail(
  request: AuthenticatedRequest,
  complaintId: string,
) {
  const response = await request<DetailResponse<ComplaintDetailDto>>(
    `/complaints/${complaintId}`,
    {
      retry: 1,
      timeoutMs: 15000,
    },
  );

  return mapComplaintDetail(response.data);
}

export async function sendComplaintStatusUpdate(
  request: AuthenticatedRequest,
  input: {
    complaintId: string;
    status: Extract<ComplaintStatus, "in_progress" | "on_hold" | "resolved">;
    note?: string;
  },
) {
  const response = await request<DetailResponse<ComplaintDetailDto> | MutationResponse>(
    `/complaints/${input.complaintId}/status`,
    {
      method: "POST",
      body: {
        status: input.status,
        note: input.note?.trim() || undefined,
      },
      retry: 1,
      timeoutMs: 15000,
    },
  );

  if ("data" in response && response.data) {
    return mapComplaintDetail(response.data);
  }

  return null;
}

export async function updateComplaintStatus(
  request: AuthenticatedRequest,
  input: {
    complaintId: string;
    status: Extract<ComplaintStatus, "in_progress" | "on_hold" | "resolved">;
    note?: string;
  },
) {
  try {
    return await sendComplaintStatusUpdate(request, input);
  } catch (error) {
    if (!shouldQueueOfflineMutation(error)) {
      throw error;
    }

    throw new Error(
      "Complaint updates need a working connection and were not saved on this device. Reconnect and try again.",
    );
  }
}
