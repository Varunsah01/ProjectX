// Portal-safe types — subsets of web-app types with internal fields omitted.

export type InvoiceStatus =
  | "issued"
  | "paid"
  | "overdue"
  | "partial"
  | "cancelled"
  | "partially_refunded"
  | "refunded";

export type ContractStatus =
  | "active"
  | "expired"
  | "expiring_soon"
  | "renewed"
  | "cancelled";

export type JobStatus =
  | "pending"
  | "assigned"
  | "en_route"
  | "in_progress"
  | "completed"
  | "cancelled";

export type TicketStatus =
  | "open"
  | "assigned"
  | "in_progress"
  | "on_hold"
  | "resolved"
  | "closed"
  | "reopened";

export type TicketPriority = "low" | "medium" | "high" | "critical";

export interface PortalInvoiceItem {
  id?: string;
  description: string;
  qty: number;
  rate: number;
  amount: number;
  hsnSac?: string;
  gstRatePercent?: number;
  taxableAmount?: number;
  cgstAmount?: number;
  sgstAmount?: number;
  igstAmount?: number;
}

export interface PortalPayment {
  id: string;
  razorpayPaymentId?: string;
  razorpayOrderId: string;
  amount: number;
  status: string;
  method: string;
  createdAt: string;
}

export interface PortalInvoice {
  id: string;
  invoiceNumber: string;
  amount: number;
  paidAmount: number;
  subtotalAmount?: number;
  cgstAmount?: number;
  sgstAmount?: number;
  igstAmount?: number;
  totalTaxAmount?: number;
  placeOfSupply?: string;
  isInterState?: boolean;
  dueDate: string;
  issuedDate: string;
  status: InvoiceStatus;
  type: string;
  contractId?: string;
  items: PortalInvoiceItem[];
  payments: PortalPayment[];
  createdAt?: string;
}

export interface PortalContract {
  id: string;
  contractNumber: string;
  assetName: string;
  type: string;
  billingCycle: string;
  plan: string;
  startDate: string;
  endDate: string;
  status: ContractStatus;
  value: number;
  visitsCovered: number;
  visitsUsed: number;
  nextServiceDate: string;
  nextBillingDate: string;
}

export interface PortalJob {
  id: string;
  jobNumber: string;
  type: string;
  status: JobStatus;
  scheduledDate: string;
  completedAt?: string;
  technicianName: string;
  assetName?: string;
}

export interface PortalTicketTimelineEntry {
  id?: string;
  date: string;
  action: string;
  by: string; // "You" or "Support Team"
  note?: string;
}

export interface PortalTicket {
  id: string;
  ticketNumber: string;
  subject: string;
  description: string;
  category: string;
  priority: TicketPriority;
  status: TicketStatus;
  createdAt: string;
  resolvedAt?: string;
  slaDeadline: string;
  assetName?: string;
  timeline: PortalTicketTimelineEntry[];
}

export interface PortalListParams {
  search?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}

export interface PaginatedData<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
