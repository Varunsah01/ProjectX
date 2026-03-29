import type {
  ComplaintPriority,
  ComplaintStatus,
  Job,
  JobProofSource,
  JobProofType,
  JobStatus,
  JobType,
  User,
} from "./domain";

export type { ComplaintPriority, ComplaintStatus, JobStatus, User } from "./domain";

export type LoginIdentifierType = "phone" | "employee_id";
export type LoginAuthMethod = "password" | "otp";

export interface LoginRequest {
  identifierType: LoginIdentifierType;
  identifier: string;
  authMethod: LoginAuthMethod;
  secret: string;
}

export interface JobSummaryDto {
  id: string;
  jobNumber: string;
  ticketId?: string;
  customerId: string;
  customerName: string;
  customerAddress: string;
  assetId?: string;
  assetName?: string;
  technicianId: string;
  technicianName: string;
  type: JobType;
  status: JobStatus;
  scheduledDate: string;
  completedAt?: string;
  notes?: string;
  serviceReport?: string;
}

export interface JobDetailDto {
  id: string;
  jobNumber: string;
  type: JobType;
  status: JobStatus;
  scheduledDate: string;
  completedAt?: string;
  notes?: string;
  serviceReport?: string;
  customer: {
    id: string;
    name: string;
    address: string;
    city: string;
    phone: string;
    email: string;
  };
  asset?: {
    id: string;
    name: string;
    model: string;
    serialNumber: string;
    category: string;
    status: string;
    location?: string;
    notes?: string;
  };
  complaint?: {
    id: string;
    ticketNumber: string;
    subject: string;
    description: string;
    category: string;
    priority: ComplaintPriority;
    status: ComplaintStatus;
  };
}

export interface JobProofDto {
  id: string;
  jobId: string;
  type: JobProofType;
  label: string;
  createdAt: string;
  uri?: string;
  source?: JobProofSource;
  fileName?: string;
  mimeType?: string;
  width?: number;
  height?: number;
  sizeBytes?: number;
}

export interface ComplaintSummary {
  id: string;
  ticketNumber: string;
  customerId: string;
  customerName: string;
  assetId?: string;
  assetName?: string;
  subject: string;
  description: string;
  category: string;
  priority: ComplaintPriority;
  status: ComplaintStatus;
  assignedTo?: string;
  assignedTechnicianId?: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  slaDeadline: string;
  timeline: Array<{
    id?: string;
    date: string;
    action: string;
    by: string;
    note?: string;
  }>;
}

export interface ComplaintDetail {
  id: string;
  ticketNumber: string;
  subject: string;
  description: string;
  category: string;
  priority: ComplaintPriority;
  status: ComplaintStatus;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  slaDeadline: string;
  customer: {
    id: string;
    name: string;
    address: string;
    city: string;
    phone: string;
    email: string;
  };
  asset?: {
    id: string;
    name: string;
    model: string;
    serialNumber: string;
    category: string;
    status: string;
    location?: string;
    notes?: string;
  };
  timeline: Array<{
    id?: string;
    date: string;
    action: string;
    by: string;
    note?: string;
  }>;
  linkedJobs: Array<Pick<Job, "id" | "jobNumber" | "status" | "scheduledDate">>;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface MeResponse {
  user: User;
}

export interface ListResponse<T> {
  data: T[];
}

export interface DetailResponse<T> {
  data: T;
}

export interface MutationResponse {
  ok: true;
}
