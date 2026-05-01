import type { JobStatus } from "./domain";

export type {
  JobSummaryDto,
  JobDetailDto,
  JobProofDto,
  ComplaintSummary,
  ComplaintDetail,
  ComplaintTimelineEntry,
  LoginRequest,
  LoginResponse,
  MeResponse,
  LoginIdentifierType,
  LoginAuthMethod,
  ListResponse,
  DetailResponse,
  MutationResponse,
} from "@project-x/shared";

export type { ComplaintPriority, ComplaintStatus, JobStatus, User } from "./domain";

export interface CreateJobFromComplaintResponse {
  id: string;
  jobNumber: string;
  scheduledDate: string;
  status: JobStatus;
}
