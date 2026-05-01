import type {
  Account,
  Asset as PrismaAsset,
  AssetStatus as PrismaAssetStatusValue,
  AuditLog,
  BillingCycle as PrismaBillingCycleValue,
  Contract as PrismaContract,
  ContractStatus as PrismaContractStatusValue,
  ContractType as PrismaContractTypeValue,
  Customer as PrismaCustomer,
  CustomerStatus as PrismaCustomerStatusValue,
  Invoice as PrismaInvoice,
  InvoiceItem as PrismaInvoiceItem,
  InvoiceStatus as PrismaInvoiceStatusValue,
  InvoiceType as PrismaInvoiceTypeValue,
  Job as PrismaJob,
  JobStatus as PrismaJobStatusValue,
  JobType as PrismaJobTypeValue,
  Notification,
  Organization as PrismaOrganization,
  Plan as PrismaPlan,
  Session,
  Ticket as PrismaTicket,
  TicketPriority as PrismaTicketPriorityValue,
  TicketStatus as PrismaTicketStatusValue,
  TicketTimeline as PrismaTicketTimeline,
  User as PrismaUser,
  UserRole,
  VerificationToken,
} from "@prisma/client";
import {
  AssetStatus as PrismaAssetStatus,
  BillingCycle as PrismaBillingCycle,
  ContractStatus as PrismaContractStatus,
  ContractType as PrismaContractType,
  CustomerStatus as PrismaCustomerStatus,
  InvoiceStatus as PrismaInvoiceStatus,
  InvoiceType as PrismaInvoiceType,
  JobStatus as PrismaJobStatus,
  JobType as PrismaJobType,
  TicketPriority as PrismaTicketPriority,
  TicketStatus as PrismaTicketStatus,
} from "@prisma/client";

export type {
  Account,
  AuditLog,
  Notification,
  PrismaAsset,
  PrismaContract,
  PrismaCustomer,
  PrismaInvoice,
  PrismaInvoiceItem,
  PrismaJob,
  PrismaOrganization,
  PrismaPlan,
  PrismaTicket,
  PrismaTicketTimeline,
  PrismaUser,
  Session,
  VerificationToken,
};

export {
  PrismaAssetStatus,
  PrismaBillingCycle,
  PrismaContractStatus,
  PrismaContractType,
  PrismaCustomerStatus,
  PrismaInvoiceStatus,
  PrismaInvoiceType,
  PrismaJobStatus,
  PrismaJobType,
  PrismaTicketPriority,
  PrismaTicketStatus,
  UserRole,
};

export type CustomerStatus =
  | "active"
  | "inactive"
  | "suspended";

export type AssetStatus =
  | "active"
  | "inactive"
  | "under_repair";

export type ContractType = "amc" | "warranty";

export type BillingCycle =
  | "monthly"
  | "quarterly"
  | "half_yearly"
  | "yearly";

export type ContractStatus =
  | "active"
  | "expired"
  | "expiring_soon"
  | "renewed"
  | "cancelled";

export type InvoiceStatus =
  | "draft"
  | "issued"
  | "paid"
  | "overdue"
  | "partial"
  | "cancelled";

export type InvoiceType = "recurring" | "one_time" | "service";

export type TicketPriority = "low" | "medium" | "high" | "critical";

export type TicketStatus =
  | "open"
  | "assigned"
  | "in_progress"
  | "on_hold"
  | "resolved"
  | "closed"
  | "reopened";

export type JobType =
  | "complaint"
  | "scheduled"
  | "installation"
  | "inspection";

export type JobStatus =
  | "pending"
  | "assigned"
  | "en_route"
  | "in_progress"
  | "completed"
  | "cancelled";

export type TechnicianStatus =
  | "available"
  | "on_job"
  | "en_route"
  | "off_duty";

export type TeamMemberRole = "admin" | "manager" | "agent" | "technician";

export interface ActionSuccess<T> {
  success: true;
  data: T;
}

export interface ActionFailure {
  success: false;
  error: string;
}

export type ActionResult<T> = ActionSuccess<T> | ActionFailure;

export interface PaginatedData<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ListParams {
  search?: string;
  status?: string;
  type?: string;
  category?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  gstin?: string;
  billingState?: string;
  shippingState?: string;
  status: CustomerStatus;
  category: string;
  totalDue: number;
  totalPaid: number;
  assetsCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Asset {
  id: string;
  customerId: string;
  customerName: string;
  name: string;
  model: string;
  serialNumber: string;
  installationDate: string;
  warrantyEnd: string;
  amcStatus: string;
  status: AssetStatus;
  lastServiceDate: string;
  nextServiceDate: string;
  category: string;
  location?: string;
  notes?: string;
}

export interface InvoiceItem {
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

export interface Invoice {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  amount: number;
  paidAmount: number;
  placeOfSupply?: string;
  isInterState?: boolean;
  subtotalAmount?: number;
  cgstAmount?: number;
  sgstAmount?: number;
  igstAmount?: number;
  totalTaxAmount?: number;
  dueDate: string;
  issuedDate: string;
  status: InvoiceStatus;
  items: InvoiceItem[];
  type: InvoiceType;
  contractId?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface TicketTimelineEntry {
  id?: string;
  date: string;
  action: string;
  by: string;
  note?: string;
}

export interface Ticket {
  id: string;
  ticketNumber: string;
  customerId: string;
  customerName: string;
  assetId?: string;
  assetName?: string;
  subject: string;
  description: string;
  category: string;
  priority: TicketPriority;
  status: TicketStatus;
  assignedTo?: string;
  assignedTechnicianId?: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  slaDeadline: string;
  timeline: TicketTimelineEntry[];
}

export interface Job {
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

export interface LinkedJob {
  id: string;
  jobNumber: string;
  type: JobType;
  status: JobStatus;
  technicianName: string;
  scheduledDate: string;
}

export interface Technician {
  id: string;
  name: string;
  phone: string;
  email: string;
  territory: string;
  status: TechnicianStatus;
  activeJobs: number;
  completedToday: number;
  rating: number;
  specialization: string;
  totalJobs: number;
  avgRating: number;
  completedThisWeek: number;
  completedThisMonth: number;
  joinDate: string;
  skills: string[];
}

export interface Contract {
  id: string;
  contractNumber: string;
  customerId: string;
  customerName: string;
  assetId: string;
  assetName: string;
  type: ContractType;
  billingCycle: BillingCycle;
  plan: string;
  planId?: string;
  startDate: string;
  endDate: string;
  nextBillingDate: string;
  lastBilledDate?: string;
  status: ContractStatus;
  value: number;
  visitsCovered: number;
  visitsUsed: number;
  nextServiceDate: string;
  notes?: string;
}

export interface CustomerNote {
  id: string;
  type: string;
  note: string;
  userName: string;
  createdAt: string;
}

export interface Plan {
  id: string;
  name: string;
  type: ContractType;
  duration: number;
  price: number;
  visitsCovered: number;
  description: string;
  hsnSac: string;
  gstRatePercent: number;
  gstApplicable: boolean;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: TeamMemberRole;
  status: "active" | "inactive";
  lastActive: string;
}

export interface AuditLogEntry {
  id: string;
  action: string;
  entity: string;
  entityId: string;
  createdAt: string;
  userName: string;
  userEmail: string;
  changes: Record<string, unknown>;
}

export interface DashboardMetrics {
  totalDue: number;
  overdueAmount: number;
  overdueCount: number;
  openTickets: number;
  criticalTickets: number;
  expiringContracts: number;
  todayJobs: number;
  activeCustomers: number;
  totalCustomers: number;
  totalAssets: number;
  monthlyCollected: number;
  monthlyBilled: number;
  collectionRate: number;
  avgResolutionHours: number;
  renewalRate: number;
  technicianUtilization: number;
}

export interface ActionItem {
  key: string;
  level: "critical" | "warning";
  label: string;
  href: string;
  actionLabel: string;
  count: number;
}

export interface DashboardData {
  metrics: DashboardMetrics;
  actionItems: ActionItem[];
  overdueInvoices: Invoice[];
  recentTickets: Ticket[];
  expiringContracts: Contract[];
  todayJobs: Job[];
  activeTechniciansCount: number;
  revenueChartData: { month: string; monthFull: string; billed: number; collected: number }[];
}

export type RevenuePeriod = "3m" | "6m" | "12m" | "ytd";

export interface CollectionsBucket {
  label: string;
  key: string;
  amount: number;
  count: number;
  color: string;
}

export interface CollectionRow extends Invoice {
  balance: number;
  daysOverdue: number;
  bucket: string;
}

export interface CollectionsData {
  totalOutstanding: number;
  overdueAmount: number;
  criticalAmount: number;
  buckets: CollectionsBucket[];
  rows: CollectionRow[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ReportsOverview {
  totalRevenue: number;
  totalCollected: number;
  collectionRate: number;
  activeContractsCount: number;
  avgResolutionHours: number;
  topCustomers: {
    name: string;
    totalPaid: number;
    outstanding: number;
    assetsCount: number;
  }[];
  contractStatusCounts: Record<string, number>;
  totalOutstanding: number;
  overdueAmount: number;
  avgDaysOverdue: number;
  agingBuckets: Record<string, { count: number; amount: number }>;
  totalJobs: number;
  completedJobs: number;
  completedRate: number;
  jobsByType: Record<string, number>;
  openComplaints: number;
  inProgressComplaints: number;
  resolvedComplaints: number;
  techPerformance: Array<{
    id: string;
    name: string;
    completedJobs: number;
    activeJobs: number;
    rating: number;
    specialization: string;
  }>;
  expiringIn30: number;
  expiredContracts: number;
  renewedContracts: number;
  renewalRate: number;
  totalAmcValue: number;
  totalWarrantyValue: number;
  renewalPipeline: Contract[];
  highUtilizationContracts: Contract[];
  revenueChartData: { month: string; billed: number; collected: number }[];
  collectionChartData: { month: string; collected: number }[];
}

export interface BusinessProfile {
  businessName: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  gstin: string;
  placeOfBusinessState: string;
  legalName?: string;
  logo?: string;
}

export interface SettingsData {
  businessProfile: BusinessProfile | null;
  teamMembers: TeamMember[];
  plans: Plan[];
  auditLogs: AuditLogEntry[];
  notificationSettings: Record<string, unknown>;
}

export interface WebhookEventEntry {
  id: string;
  provider: string;
  eventId: string;
  eventType: string;
  receivedAt: string;
  processedAt: string | null;
  status: "received" | "processed" | "failed";
  error: string | null;
}

export type PrismaCustomerStatusType = PrismaCustomerStatusValue;
export type PrismaAssetStatusType = PrismaAssetStatusValue;
export type PrismaContractTypeType = PrismaContractTypeValue;
export type PrismaBillingCycleType = PrismaBillingCycleValue;
export type PrismaContractStatusType = PrismaContractStatusValue;
export type PrismaInvoiceStatusType = PrismaInvoiceStatusValue;
export type PrismaInvoiceTypeType = PrismaInvoiceTypeValue;
export type PrismaTicketPriorityType = PrismaTicketPriorityValue;
export type PrismaTicketStatusType = PrismaTicketStatusValue;
export type PrismaJobTypeType = PrismaJobTypeValue;
export type PrismaJobStatusType = PrismaJobStatusValue;
