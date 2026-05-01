export interface ComplaintTimelineEntry {
  id?: string;
  date: string;
  action: string;
  by: string;
  note?: string;
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
  priority: "low" | "medium" | "high" | "critical";
  status:
    | "open"
    | "assigned"
    | "in_progress"
    | "on_hold"
    | "resolved"
    | "closed"
    | "reopened";
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
  priority: "low" | "medium" | "high" | "critical";
  status:
    | "open"
    | "assigned"
    | "in_progress"
    | "on_hold"
    | "resolved"
    | "closed"
    | "reopened";
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
  timeline: ComplaintTimelineEntry[];
  linkedJobs: Array<{
    id: string;
    jobNumber: string;
    status:
      | "pending"
      | "assigned"
      | "en_route"
      | "in_progress"
      | "completed"
      | "cancelled";
    scheduledDate: string;
  }>;
}
