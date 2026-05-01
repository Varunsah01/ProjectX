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
  type: "complaint" | "scheduled" | "installation" | "inspection";
  status:
    | "pending"
    | "assigned"
    | "en_route"
    | "in_progress"
    | "completed"
    | "cancelled";
  scheduledDate: string;
  completedAt?: string;
  notes?: string;
  serviceReport?: string;
}

export interface JobDetailDto {
  id: string;
  jobNumber: string;
  type: "complaint" | "scheduled" | "installation" | "inspection";
  status:
    | "pending"
    | "assigned"
    | "en_route"
    | "in_progress"
    | "completed"
    | "cancelled";
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
    priority: "low" | "medium" | "high" | "critical";
    status:
      | "open"
      | "assigned"
      | "in_progress"
      | "on_hold"
      | "resolved"
      | "closed"
      | "reopened";
  };
}

export interface JobProofDto {
  id: string;
  jobId: string;
  type:
    | "before_photo"
    | "after_photo"
    | "installation_proof"
    | "closure_proof";
  label: string;
  createdAt: string;
  uri?: string;
  source?: "camera" | "gallery" | "remote";
  fileName?: string;
  mimeType?: string;
  width?: number;
  height?: number;
  sizeBytes?: number;
}
