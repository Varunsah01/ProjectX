export type UserRole = "ADMIN" | "MANAGER" | "AGENT" | "TECHNICIAN";

export type CustomerStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED";

export type AssetStatus = "ACTIVE" | "INACTIVE" | "UNDER_REPAIR";

export type ContractType = "AMC" | "WARRANTY";

export type BillingCycle = "MONTHLY" | "QUARTERLY" | "HALF_YEARLY" | "YEARLY";

export type ContractStatus =
  | "ACTIVE"
  | "EXPIRED"
  | "EXPIRING_SOON"
  | "RENEWED"
  | "CANCELLED";

export type InvoiceStatus =
  | "DRAFT"
  | "ISSUED"
  | "PAID"
  | "OVERDUE"
  | "PARTIAL"
  | "CANCELLED";

export type InvoiceType = "RECURRING" | "ONE_TIME" | "SERVICE";

export type TicketPriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type TicketStatus =
  | "OPEN"
  | "ASSIGNED"
  | "IN_PROGRESS"
  | "ON_HOLD"
  | "RESOLVED"
  | "CLOSED"
  | "REOPENED";

export type JobType =
  | "COMPLAINT"
  | "SCHEDULED"
  | "INSTALLATION"
  | "INSPECTION";

export type JobStatus =
  | "PENDING"
  | "ASSIGNED"
  | "EN_ROUTE"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED";
