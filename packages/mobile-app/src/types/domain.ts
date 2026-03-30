export type ComplaintStatus =
  | "open"
  | "assigned"
  | "in_progress"
  | "on_hold"
  | "resolved"
  | "closed"
  | "reopened";

export type ComplaintPriority = "low" | "medium" | "high" | "critical";

export type JobType = "complaint" | "scheduled" | "installation" | "inspection";

export type JobStatus =
  | "pending"
  | "assigned"
  | "en_route"
  | "in_progress"
  | "completed"
  | "cancelled";

export type FieldOperatorJobStatus =
  | "assigned"
  | "on_the_way"
  | "arrived"
  | "work_started"
  | "completed"
  | "rescheduled"
  | "failed";

export type JobProofType =
  | "before_photo"
  | "after_photo"
  | "installation_proof"
  | "closure_proof";

export type JobProofSource = "camera" | "gallery" | "remote";

export type JobClosureType = "complete" | "fail" | "reschedule";

export interface User {
  id: string;
  organizationId: string;
  role: "technician";
  name: string;
  email: string;
  phone: string;
  territory: string;
  status: string;
  specialization: string;
  activeJobs: number;
  completedToday: number;
  totalJobs: number;
  avgRating: number;
  completedThisWeek: number;
  completedThisMonth: number;
  joinDate: string;
  skills: string[];
}

export interface JobCustomer {
  id: string;
  name: string;
  address: string;
  city?: string;
  phone?: string;
  email?: string;
}

export interface JobAsset {
  id?: string;
  name: string;
  model?: string;
  serialNumber?: string;
  category?: string;
  status?: string;
  location?: string;
  notes?: string;
}

export interface JobComplaint {
  id: string;
  ticketNumber: string;
  subject: string;
  description?: string;
  category?: string;
  priority?: ComplaintPriority;
  status?: ComplaintStatus;
}

export interface JobAssignee {
  id: string;
  name: string;
}

export interface Job {
  id: string;
  jobNumber: string;
  ticketId?: string;
  type: JobType;
  status: JobStatus;
  operatorStatus?: FieldOperatorJobStatus;
  scheduledDate: string;
  completedAt?: string;
  notes?: string;
  serviceReport?: string;
  customer: JobCustomer;
  asset?: JobAsset;
  complaint?: JobComplaint;
  technician?: JobAssignee;
}

export interface JobUpdate {
  jobId: string;
  status?: JobStatus | FieldOperatorJobStatus;
  note?: string;
  scheduledDate?: string;
}

export interface JobProof {
  id: string;
  jobId: string;
  type: JobProofType;
  label: string;
  createdAt: string;
  uri?: string;
  source?: JobProofSource;
  syncState?: "synced" | "pending";
  fileName?: string;
  mimeType?: string;
  width?: number;
  height?: number;
  sizeBytes?: number;
}

export interface JobClosure {
  jobId: string;
  type: JobClosureType;
  note: string;
  proofs: JobProof[];
  scheduledDate?: string;
}

export interface ComplaintTimelineEntry {
  id?: string;
  date: string;
  action: string;
  by: string;
  note?: string;
}

export interface ComplaintCustomer {
  id: string;
  name: string;
  address: string;
  city: string;
  phone: string;
  email: string;
}

export interface ComplaintAsset {
  id: string;
  name: string;
  model: string;
  serialNumber: string;
  category: string;
  status: string;
  location?: string;
  notes?: string;
}

export interface ComplaintLinkedJob {
  id: string;
  jobNumber: string;
  status: JobStatus;
  scheduledDate: string;
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
  timeline: ComplaintTimelineEntry[];
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
  customer: ComplaintCustomer;
  asset?: ComplaintAsset;
  timeline: ComplaintTimelineEntry[];
  linkedJobs: ComplaintLinkedJob[];
}
