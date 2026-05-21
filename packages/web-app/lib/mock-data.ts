// ── Types ──────────────────────────────────────────────

export type CustomerStatus = "active" | "inactive" | "suspended";
export type InvoiceStatus = "draft" | "issued" | "paid" | "overdue" | "partial" | "cancelled";
export type TicketStatus = "open" | "assigned" | "in_progress" | "on_hold" | "resolved" | "closed" | "reopened";
export type TicketPriority = "low" | "medium" | "high" | "critical";
export type JobStatus = "pending" | "assigned" | "en_route" | "in_progress" | "completed" | "cancelled";
export type TechnicianStatus = "available" | "on_job" | "en_route" | "off_duty";
export type ContractStatus = "active" | "expired" | "expiring_soon" | "renewed" | "cancelled";
export type ContractType = "amc" | "warranty";

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  gst?: string;
  status: CustomerStatus;
  category: string;
  totalDue: number;
  totalPaid: number;
  assetsCount: number;
  createdAt: string;
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
  status: "active" | "inactive" | "under_repair";
  lastServiceDate: string;
  nextServiceDate: string;
  category: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  amount: number;
  paidAmount: number;
  dueDate: string;
  issuedDate: string;
  status: InvoiceStatus;
  items: { description: string; qty: number; rate: number; amount: number }[];
  type: "recurring" | "one_time" | "service";
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
  timeline: { date: string; action: string; by: string; note?: string }[];
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
  type: "complaint" | "scheduled" | "installation" | "inspection";
  status: JobStatus;
  scheduledDate: string;
  completedAt?: string;
  notes?: string;
  serviceReport?: string;
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
  plan: string;
  startDate: string;
  endDate: string;
  status: ContractStatus;
  value: number;
  visitsCovered: number;
  visitsUsed: number;
  nextServiceDate: string;
}

export interface Plan {
  id: string;
  name: string;
  type: ContractType;
  duration: number; // months
  price: number;
  visitsCovered: number;
  description: string;
  isActive: boolean;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: "admin" | "manager" | "agent" | "technician";
  status: "active" | "inactive";
  lastActive: string;
}

// ── Mock Data ──────────────────────────────────────────

export const customers: Customer[] = [
  { id: "C001", name: "Sharma Electronics", phone: "+91 98765 43210", email: "info@sharmaelectronics.in", address: "45 MG Road, Sector 12", city: "Jaipur", gst: "08AABCS1234A1Z1", status: "active", category: "Commercial", totalDue: 42500, totalPaid: 185000, assetsCount: 8, createdAt: "2024-03-15" },
  { id: "C002", name: "Priya Mehta", phone: "+91 87654 32109", email: "priya.mehta@gmail.com", address: "12/B Sunrise Apartments, Kothrud", city: "Pune", status: "active", category: "Residential", totalDue: 3500, totalPaid: 24000, assetsCount: 2, createdAt: "2024-06-20" },
  { id: "C003", name: "GreenLeaf Office Park", phone: "+91 76543 21098", email: "facility@greenleaf.co.in", address: "IT Park, Phase 2, Whitefield", city: "Bangalore", gst: "29AABCG5678B1Z2", status: "active", category: "Commercial", totalDue: 128000, totalPaid: 456000, assetsCount: 24, createdAt: "2023-11-10" },
  { id: "C004", name: "Rajesh Kumar", phone: "+91 65432 10987", email: "rajesh.k@yahoo.com", address: "78 Gandhi Nagar", city: "Delhi", status: "active", category: "Residential", totalDue: 0, totalPaid: 18000, assetsCount: 3, createdAt: "2024-01-05" },
  { id: "C005", name: "Hotel Sunrise", phone: "+91 54321 09876", email: "manager@hotelsunrise.com", address: "Beach Road, Juhu", city: "Mumbai", gst: "27AABCH9012C1Z3", status: "active", category: "Commercial", totalDue: 85000, totalPaid: 320000, assetsCount: 15, createdAt: "2023-08-22" },
  { id: "C006", name: "Anita Desai", phone: "+91 43210 98765", email: "anita.desai@gmail.com", address: "23 Lake View Colony", city: "Hyderabad", status: "inactive", category: "Residential", totalDue: 7000, totalPaid: 14000, assetsCount: 1, createdAt: "2024-04-18" },
  { id: "C007", name: "TechHub Coworking", phone: "+91 32109 87654", email: "ops@techhub.in", address: "5th Floor, Tower B, Cyber City", city: "Gurugram", gst: "06AABCT3456D1Z4", status: "active", category: "Commercial", totalDue: 22000, totalPaid: 165000, assetsCount: 12, createdAt: "2023-12-01" },
  { id: "C008", name: "Mohammed Farhan", phone: "+91 21098 76543", email: "farhan.m@outlook.com", address: "56 Jubilee Hills", city: "Hyderabad", status: "active", category: "Residential", totalDue: 4500, totalPaid: 36000, assetsCount: 4, createdAt: "2024-02-14" },
  { id: "C009", name: "City Mall", phone: "+91 10987 65432", email: "maintenance@citymall.in", address: "Ring Road, Nehru Place", city: "Delhi", gst: "07AABCC7890E1Z5", status: "active", category: "Commercial", totalDue: 195000, totalPaid: 580000, assetsCount: 35, createdAt: "2023-06-15" },
  { id: "C010", name: "Suresh Patel", phone: "+91 99887 76655", email: "suresh.patel@gmail.com", address: "14 Ashoka Society, Navrangpura", city: "Ahmedabad", status: "suspended", category: "Residential", totalDue: 12000, totalPaid: 9000, assetsCount: 2, createdAt: "2024-05-30" },
  { id: "C011", name: "Krishna Hospital", phone: "+91 88776 65544", email: "admin@krishnahospital.org", address: "NH 48, Medical College Road", city: "Jaipur", gst: "08AABCK1234F1Z6", status: "active", category: "Commercial", totalDue: 65000, totalPaid: 290000, assetsCount: 18, createdAt: "2023-09-01" },
  { id: "C012", name: "Deepika Reddy", phone: "+91 77665 54433", email: "deepika.r@gmail.com", address: "302 Banjara Heights", city: "Hyderabad", status: "active", category: "Residential", totalDue: 2500, totalPaid: 21000, assetsCount: 2, createdAt: "2024-07-10" },
];

export const assets: Asset[] = [
  { id: "A001", customerId: "C001", customerName: "Sharma Electronics", name: "Split AC 1.5T", model: "Daikin FTKF50", serialNumber: "DK-2024-001", installationDate: "2024-04-01", warrantyEnd: "2025-03-31", amcStatus: "Active AMC", status: "active", lastServiceDate: "2025-01-15", nextServiceDate: "2025-04-15", category: "AC" },
  { id: "A002", customerId: "C001", customerName: "Sharma Electronics", name: "Split AC 2T", model: "Daikin FTKF71", serialNumber: "DK-2024-002", installationDate: "2024-04-01", warrantyEnd: "2025-03-31", amcStatus: "Active AMC", status: "active", lastServiceDate: "2025-01-15", nextServiceDate: "2025-04-15", category: "AC" },
  { id: "A003", customerId: "C002", customerName: "Priya Mehta", name: "RO Water Purifier", model: "Kent Grand Plus", serialNumber: "KT-2024-103", installationDate: "2024-06-25", warrantyEnd: "2025-06-24", amcStatus: "Warranty", status: "active", lastServiceDate: "2025-02-10", nextServiceDate: "2025-05-10", category: "Water Purifier" },
  { id: "A004", customerId: "C003", customerName: "GreenLeaf Office Park", name: "CCTV System 16CH", model: "HikVision DS-7616", serialNumber: "HV-2023-456", installationDate: "2023-12-01", warrantyEnd: "2024-11-30", amcStatus: "Active AMC", status: "active", lastServiceDate: "2025-02-20", nextServiceDate: "2025-05-20", category: "CCTV" },
  { id: "A005", customerId: "C003", customerName: "GreenLeaf Office Park", name: "Passenger Elevator", model: "OTIS GeN2", serialNumber: "OT-2023-789", installationDate: "2023-11-15", warrantyEnd: "2025-11-14", amcStatus: "Active AMC", status: "active", lastServiceDate: "2025-03-01", nextServiceDate: "2025-04-01", category: "Elevator" },
  { id: "A006", customerId: "C004", customerName: "Rajesh Kumar", name: "Window AC 1.5T", model: "Voltas 185V ADA", serialNumber: "VL-2024-221", installationDate: "2024-01-10", warrantyEnd: "2025-01-09", amcStatus: "Expired", status: "active", lastServiceDate: "2024-11-10", nextServiceDate: "2025-04-10", category: "AC" },
  { id: "A007", customerId: "C005", customerName: "Hotel Sunrise", name: "Central AC Unit", model: "Blue Star VRF", serialNumber: "BS-2023-550", installationDate: "2023-09-01", warrantyEnd: "2024-08-31", amcStatus: "Active AMC", status: "active", lastServiceDate: "2025-02-15", nextServiceDate: "2025-05-15", category: "AC" },
  { id: "A008", customerId: "C005", customerName: "Hotel Sunrise", name: "Fire Alarm System", model: "Honeywell Morley", serialNumber: "HW-2023-880", installationDate: "2023-09-01", warrantyEnd: "2024-08-31", amcStatus: "Active AMC", status: "active", lastServiceDate: "2025-01-20", nextServiceDate: "2025-04-20", category: "Fire Safety" },
  { id: "A009", customerId: "C007", customerName: "TechHub Coworking", name: "Split AC 2T", model: "Carrier 24K", serialNumber: "CR-2024-334", installationDate: "2024-01-15", warrantyEnd: "2025-01-14", amcStatus: "Active AMC", status: "active", lastServiceDate: "2025-03-05", nextServiceDate: "2025-06-05", category: "AC" },
  { id: "A010", customerId: "C008", customerName: "Mohammed Farhan", name: "CCTV System 8CH", model: "CP Plus 8CH DVR", serialNumber: "CP-2024-667", installationDate: "2024-02-20", warrantyEnd: "2025-02-19", amcStatus: "Warranty", status: "active", lastServiceDate: "2024-12-20", nextServiceDate: "2025-06-20", category: "CCTV" },
  { id: "A011", customerId: "C009", customerName: "City Mall", name: "Escalator Unit 1", model: "Schindler 9300", serialNumber: "SC-2023-101", installationDate: "2023-07-01", warrantyEnd: "2024-06-30", amcStatus: "Active AMC", status: "active", lastServiceDate: "2025-03-10", nextServiceDate: "2025-04-10", category: "Elevator" },
  { id: "A012", customerId: "C011", customerName: "Krishna Hospital", name: "Central AC Plant", model: "Daikin VRV IV", serialNumber: "DK-2023-900", installationDate: "2023-09-15", warrantyEnd: "2024-09-14", amcStatus: "Active AMC", status: "active", lastServiceDate: "2025-02-28", nextServiceDate: "2025-05-28", category: "AC" },
];

export const invoices: Invoice[] = [
  { id: "INV001", invoiceNumber: "INV-2025-001", customerId: "C001", customerName: "Sharma Electronics", amount: 12500, paidAmount: 0, dueDate: "2025-03-15", issuedDate: "2025-02-15", status: "overdue", items: [{ description: "AC AMC - Quarterly (Q1)", qty: 2, rate: 5000, amount: 10000 }, { description: "Filter Replacement", qty: 1, rate: 2500, amount: 2500 }], type: "recurring" },
  { id: "INV002", invoiceNumber: "INV-2025-002", customerId: "C002", customerName: "Priya Mehta", amount: 3500, paidAmount: 0, dueDate: "2025-04-10", issuedDate: "2025-03-10", status: "issued", items: [{ description: "RO Annual Service", qty: 1, rate: 3500, amount: 3500 }], type: "recurring" },
  { id: "INV003", invoiceNumber: "INV-2025-003", customerId: "C003", customerName: "GreenLeaf Office Park", amount: 45000, paidAmount: 45000, dueDate: "2025-02-28", issuedDate: "2025-02-01", status: "paid", items: [{ description: "CCTV AMC - Quarterly", qty: 1, rate: 15000, amount: 15000 }, { description: "Elevator AMC - Monthly", qty: 1, rate: 30000, amount: 30000 }], type: "recurring" },
  { id: "INV004", invoiceNumber: "INV-2025-004", customerId: "C005", customerName: "Hotel Sunrise", amount: 85000, paidAmount: 40000, dueDate: "2025-03-20", issuedDate: "2025-02-20", status: "partial", items: [{ description: "Central AC AMC - Monthly", qty: 1, rate: 65000, amount: 65000 }, { description: "Fire System Inspection", qty: 1, rate: 20000, amount: 20000 }], type: "recurring" },
  { id: "INV005", invoiceNumber: "INV-2025-005", customerId: "C007", customerName: "TechHub Coworking", amount: 22000, paidAmount: 0, dueDate: "2025-04-05", issuedDate: "2025-03-05", status: "issued", items: [{ description: "AC AMC - Quarterly (Q1)", qty: 4, rate: 5500, amount: 22000 }], type: "recurring" },
  { id: "INV006", invoiceNumber: "INV-2025-006", customerId: "C009", customerName: "City Mall", amount: 195000, paidAmount: 0, dueDate: "2025-03-10", issuedDate: "2025-02-10", status: "overdue", items: [{ description: "Escalator AMC - Monthly", qty: 3, rate: 35000, amount: 105000 }, { description: "CCTV System Maintenance", qty: 1, rate: 50000, amount: 50000 }, { description: "Fire Safety Inspection", qty: 1, rate: 40000, amount: 40000 }], type: "recurring" },
  { id: "INV007", invoiceNumber: "INV-2025-007", customerId: "C004", customerName: "Rajesh Kumar", amount: 4500, paidAmount: 4500, dueDate: "2025-02-05", issuedDate: "2025-01-05", status: "paid", items: [{ description: "AC Service Visit", qty: 1, rate: 2500, amount: 2500 }, { description: "Gas Refill", qty: 1, rate: 2000, amount: 2000 }], type: "service" },
  { id: "INV008", invoiceNumber: "INV-2025-008", customerId: "C008", customerName: "Mohammed Farhan", amount: 4500, paidAmount: 0, dueDate: "2025-04-14", issuedDate: "2025-03-14", status: "issued", items: [{ description: "CCTV AMC - Half Yearly", qty: 1, rate: 4500, amount: 4500 }], type: "recurring" },
  { id: "INV009", invoiceNumber: "INV-2025-009", customerId: "C010", customerName: "Suresh Patel", amount: 12000, paidAmount: 0, dueDate: "2025-01-30", issuedDate: "2024-12-30", status: "overdue", items: [{ description: "RO AMC Renewal", qty: 1, rate: 6000, amount: 6000 }, { description: "AC AMC Renewal", qty: 1, rate: 6000, amount: 6000 }], type: "recurring" },
  { id: "INV010", invoiceNumber: "INV-2025-010", customerId: "C011", customerName: "Krishna Hospital", amount: 65000, paidAmount: 65000, dueDate: "2025-03-01", issuedDate: "2025-02-01", status: "paid", items: [{ description: "Central AC AMC - Monthly", qty: 1, rate: 65000, amount: 65000 }], type: "recurring" },
  { id: "INV011", invoiceNumber: "INV-2025-011", customerId: "C006", customerName: "Anita Desai", amount: 7000, paidAmount: 0, dueDate: "2025-02-18", issuedDate: "2025-01-18", status: "overdue", items: [{ description: "AC AMC Annual", qty: 1, rate: 7000, amount: 7000 }], type: "recurring" },
  { id: "INV012", invoiceNumber: "INV-2025-012", customerId: "C012", customerName: "Deepika Reddy", amount: 2500, paidAmount: 2500, dueDate: "2025-03-25", issuedDate: "2025-03-01", status: "paid", items: [{ description: "RO Service", qty: 1, rate: 2500, amount: 2500 }], type: "service" },
];

export const tickets: Ticket[] = [
  { id: "T001", ticketNumber: "TKT-2025-001", customerId: "C001", customerName: "Sharma Electronics", assetId: "A001", assetName: "Split AC 1.5T", subject: "AC not cooling properly", description: "Customer reports that the AC in the showroom is not cooling even at 16°C setting. Compressor seems to be running but airflow is warm.", category: "Cooling Issue", priority: "high", status: "assigned", assignedTo: "Amit Sharma", assignedTechnicianId: "TECH001", createdAt: "2025-03-25T10:30:00", updatedAt: "2025-03-25T11:00:00", slaDeadline: "2025-03-26T10:30:00", timeline: [{ date: "2025-03-25T10:30:00", action: "Ticket Created", by: "System", note: "Customer called helpline" }, { date: "2025-03-25T11:00:00", action: "Assigned to Technician", by: "Ops Manager", note: "Assigned to Amit Sharma" }] },
  { id: "T002", ticketNumber: "TKT-2025-002", customerId: "C003", customerName: "GreenLeaf Office Park", assetId: "A004", assetName: "CCTV System 16CH", subject: "3 cameras showing offline", description: "Cameras 5, 8, and 12 are showing offline since yesterday. All other cameras are working fine.", category: "Equipment Offline", priority: "medium", status: "in_progress", assignedTo: "Ravi Kumar", assignedTechnicianId: "TECH002", createdAt: "2025-03-24T14:00:00", updatedAt: "2025-03-25T09:30:00", slaDeadline: "2025-03-26T14:00:00", timeline: [{ date: "2025-03-24T14:00:00", action: "Ticket Created", by: "Customer Portal" }, { date: "2025-03-24T14:30:00", action: "Assigned to Technician", by: "Ops Manager", note: "Assigned to Ravi Kumar" }, { date: "2025-03-25T09:30:00", action: "Status: In Progress", by: "Ravi Kumar", note: "On site. Found loose cable connections. Replacing cables for cameras 5 and 8." }] },
  { id: "T003", ticketNumber: "TKT-2025-003", customerId: "C005", customerName: "Hotel Sunrise", assetId: "A007", assetName: "Central AC Unit", subject: "Strange noise from compressor", description: "Loud rattling noise coming from the outdoor unit. Started 2 days ago and getting worse.", category: "Noise Issue", priority: "high", status: "open", createdAt: "2025-03-26T08:15:00", updatedAt: "2025-03-26T08:15:00", slaDeadline: "2025-03-27T08:15:00", timeline: [{ date: "2025-03-26T08:15:00", action: "Ticket Created", by: "Hotel Manager" }] },
  { id: "T004", ticketNumber: "TKT-2025-004", customerId: "C002", customerName: "Priya Mehta", assetId: "A003", assetName: "RO Water Purifier", subject: "Water tastes different after filter change", description: "After the recent filter change, the water has a slightly metallic taste. Please check.", category: "Water Quality", priority: "medium", status: "resolved", assignedTo: "Suresh Menon", assignedTechnicianId: "TECH003", createdAt: "2025-03-20T16:00:00", updatedAt: "2025-03-22T14:00:00", resolvedAt: "2025-03-22T14:00:00", slaDeadline: "2025-03-22T16:00:00", timeline: [{ date: "2025-03-20T16:00:00", action: "Ticket Created", by: "Customer" }, { date: "2025-03-21T10:00:00", action: "Assigned to Technician", by: "System" }, { date: "2025-03-22T11:00:00", action: "Status: In Progress", by: "Suresh Menon", note: "Visited. Found improper filter seating. Reseated filter and flushed system." }, { date: "2025-03-22T14:00:00", action: "Resolved", by: "Suresh Menon", note: "Customer confirmed water quality is normal now." }] },
  { id: "T005", ticketNumber: "TKT-2025-005", customerId: "C009", customerName: "City Mall", assetId: "A011", assetName: "Escalator Unit 1", subject: "Escalator making grinding sound", description: "Escalator in Wing A making a grinding noise. Slowing down intermittently. Safety concern for shoppers.", category: "Mechanical Issue", priority: "critical", status: "in_progress", assignedTo: "Deepak Rawat", assignedTechnicianId: "TECH004", createdAt: "2025-03-26T07:00:00", updatedAt: "2025-03-26T09:00:00", slaDeadline: "2025-03-26T11:00:00", timeline: [{ date: "2025-03-26T07:00:00", action: "Ticket Created", by: "Mall Operations" }, { date: "2025-03-26T07:15:00", action: "Priority escalated to Critical", by: "System" }, { date: "2025-03-26T07:30:00", action: "Assigned to Technician", by: "Ops Manager", note: "Urgent - Deepak dispatched immediately" }, { date: "2025-03-26T09:00:00", action: "Status: In Progress", by: "Deepak Rawat", note: "On site. Escalator stopped for safety. Inspecting drive chain and bearings." }] },
  { id: "T006", ticketNumber: "TKT-2025-006", customerId: "C007", customerName: "TechHub Coworking", assetId: "A009", assetName: "Split AC 2T", subject: "AC remote not working", description: "Remote control for the AC in Meeting Room 3 has stopped working. Already tried changing batteries.", category: "Remote/Control Issue", priority: "low", status: "open", createdAt: "2025-03-26T11:00:00", updatedAt: "2025-03-26T11:00:00", slaDeadline: "2025-03-28T11:00:00", timeline: [{ date: "2025-03-26T11:00:00", action: "Ticket Created", by: "Customer Portal" }] },
  { id: "T007", ticketNumber: "TKT-2025-007", customerId: "C011", customerName: "Krishna Hospital", assetId: "A012", assetName: "Central AC Plant", subject: "Temperature fluctuation in ICU", description: "AC temperature in ICU wing fluctuating between 18-26°C. Critical for patient safety.", category: "Temperature Issue", priority: "critical", status: "assigned", assignedTo: "Amit Sharma", assignedTechnicianId: "TECH001", createdAt: "2025-03-26T06:00:00", updatedAt: "2025-03-26T06:30:00", slaDeadline: "2025-03-26T10:00:00", timeline: [{ date: "2025-03-26T06:00:00", action: "Ticket Created", by: "Hospital Admin" }, { date: "2025-03-26T06:30:00", action: "Assigned to Technician", by: "System", note: "Auto-escalated - Critical priority" }] },
  { id: "T008", ticketNumber: "TKT-2025-008", customerId: "C008", customerName: "Mohammed Farhan", assetId: "A010", assetName: "CCTV System 8CH", subject: "Night vision not working on 2 cameras", description: "Cameras 3 and 6 not switching to night vision mode. IR LEDs seem to not be activating.", category: "Night Vision", priority: "medium", status: "on_hold", assignedTo: "Ravi Kumar", assignedTechnicianId: "TECH002", createdAt: "2025-03-23T09:00:00", updatedAt: "2025-03-24T16:00:00", slaDeadline: "2025-03-25T09:00:00", timeline: [{ date: "2025-03-23T09:00:00", action: "Ticket Created", by: "Customer" }, { date: "2025-03-23T14:00:00", action: "Assigned to Technician", by: "Ops Manager" }, { date: "2025-03-24T10:00:00", action: "Status: In Progress", by: "Ravi Kumar", note: "Visited. IR LEDs faulty on both cameras. Need replacement parts." }, { date: "2025-03-24T16:00:00", action: "Status: On Hold", by: "Ravi Kumar", note: "Waiting for replacement IR board. ETA 2 days." }] },
];

export const jobs: Job[] = [
  { id: "J001", jobNumber: "JOB-2025-001", ticketId: "T001", customerId: "C001", customerName: "Sharma Electronics", customerAddress: "45 MG Road, Sector 12, Jaipur", assetId: "A001", assetName: "Split AC 1.5T", technicianId: "TECH001", technicianName: "Amit Sharma", type: "complaint", status: "assigned", scheduledDate: "2025-03-26", notes: "AC not cooling. Check gas levels and compressor." },
  { id: "J002", jobNumber: "JOB-2025-002", ticketId: "T002", customerId: "C003", customerName: "GreenLeaf Office Park", customerAddress: "IT Park, Phase 2, Whitefield, Bangalore", assetId: "A004", assetName: "CCTV System 16CH", technicianId: "TECH002", technicianName: "Ravi Kumar", type: "complaint", status: "in_progress", scheduledDate: "2025-03-25", notes: "3 cameras offline. Cable replacement needed." },
  { id: "J003", jobNumber: "JOB-2025-003", customerId: "C005", customerName: "Hotel Sunrise", customerAddress: "Beach Road, Juhu, Mumbai", assetId: "A008", assetName: "Fire Alarm System", technicianId: "TECH003", technicianName: "Suresh Menon", type: "scheduled", status: "completed", scheduledDate: "2025-03-25", completedAt: "2025-03-25T16:30:00", notes: "Quarterly fire safety inspection", serviceReport: "All smoke detectors tested. 2 batteries replaced. System functional." },
  { id: "J004", jobNumber: "JOB-2025-004", ticketId: "T005", customerId: "C009", customerName: "City Mall", customerAddress: "Ring Road, Nehru Place, Delhi", assetId: "A011", assetName: "Escalator Unit 1", technicianId: "TECH004", technicianName: "Deepak Rawat", type: "complaint", status: "in_progress", scheduledDate: "2025-03-26", notes: "Urgent - Escalator grinding noise. Safety issue." },
  { id: "J005", jobNumber: "JOB-2025-005", customerId: "C003", customerName: "GreenLeaf Office Park", customerAddress: "IT Park, Phase 2, Whitefield, Bangalore", assetId: "A005", assetName: "Passenger Elevator", technicianId: "TECH004", technicianName: "Deepak Rawat", type: "scheduled", status: "pending", scheduledDate: "2025-03-27", notes: "Monthly elevator maintenance inspection" },
  { id: "J006", jobNumber: "JOB-2025-006", ticketId: "T007", customerId: "C011", customerName: "Krishna Hospital", customerAddress: "NH 48, Medical College Road, Jaipur", assetId: "A012", assetName: "Central AC Plant", technicianId: "TECH001", technicianName: "Amit Sharma", type: "complaint", status: "assigned", scheduledDate: "2025-03-26", notes: "Critical - ICU temperature fluctuation. Priority dispatch." },
  { id: "J007", jobNumber: "JOB-2025-007", customerId: "C004", customerName: "Rajesh Kumar", customerAddress: "78 Gandhi Nagar, Delhi", assetId: "A006", assetName: "Window AC 1.5T", technicianId: "TECH005", technicianName: "Vikram Singh", type: "scheduled", status: "completed", scheduledDate: "2025-03-25", completedAt: "2025-03-25T14:00:00", notes: "Pre-summer AC servicing", serviceReport: "Full service done. Gas topped up. Filters cleaned. Advised customer to renew AMC." },
  { id: "J008", jobNumber: "JOB-2025-008", customerId: "C012", customerName: "Deepika Reddy", customerAddress: "302 Banjara Heights, Hyderabad", technicianId: "TECH003", technicianName: "Suresh Menon", type: "installation", status: "pending", scheduledDate: "2025-03-28", notes: "New RO purifier installation" },
];

export const technicians: Technician[] = [
  { id: "TECH001", name: "Amit Sharma", phone: "+91 98111 22233", email: "amit.sharma@projectx.in", territory: "Jaipur", status: "on_job", activeJobs: 2, completedToday: 1, rating: 4.8, specialization: "AC & HVAC", totalJobs: 342, avgRating: 4.8, completedThisWeek: 8, completedThisMonth: 34, joinDate: "2022-06-15", skills: ["AC Installation", "HVAC Maintenance", "VRF Systems", "Gas Charging", "Compressor Repair"] },
  { id: "TECH002", name: "Ravi Kumar", phone: "+91 98222 33344", email: "ravi.kumar@projectx.in", territory: "Bangalore", status: "on_job", activeJobs: 1, completedToday: 0, rating: 4.5, specialization: "CCTV & Security", totalJobs: 278, avgRating: 4.5, completedThisWeek: 5, completedThisMonth: 22, joinDate: "2023-01-10", skills: ["CCTV Installation", "DVR/NVR Setup", "Network Cabling", "Access Control", "IP Camera Configuration"] },
  { id: "TECH003", name: "Suresh Menon", phone: "+91 98333 44455", email: "suresh.menon@projectx.in", territory: "Pune / Mumbai", status: "available", activeJobs: 0, completedToday: 2, rating: 4.9, specialization: "Water Purifier & Fire Safety", totalJobs: 415, avgRating: 4.9, completedThisWeek: 11, completedThisMonth: 38, joinDate: "2021-11-01", skills: ["RO Installation", "Filter Replacement", "Fire Alarm Systems", "Fire Extinguisher Servicing", "Water Quality Testing"] },
  { id: "TECH004", name: "Deepak Rawat", phone: "+91 98444 55566", email: "deepak.rawat@projectx.in", territory: "Delhi / NCR", status: "on_job", activeJobs: 1, completedToday: 0, rating: 4.7, specialization: "Elevator & Escalator", totalJobs: 198, avgRating: 4.7, completedThisWeek: 4, completedThisMonth: 18, joinDate: "2023-05-20", skills: ["Elevator Maintenance", "Escalator Repair", "Motor Overhaul", "Safety Inspection", "Control Panel Diagnostics"] },
  { id: "TECH005", name: "Vikram Singh", phone: "+91 98555 66677", email: "vikram.singh@projectx.in", territory: "Delhi / NCR", status: "available", activeJobs: 0, completedToday: 3, rating: 4.6, specialization: "AC & Appliance", totalJobs: 305, avgRating: 4.6, completedThisWeek: 12, completedThisMonth: 41, joinDate: "2022-03-08", skills: ["AC Servicing", "Washing Machine Repair", "Refrigerator Maintenance", "Gas Refilling", "PCB Repair"] },
  { id: "TECH006", name: "Karthik Nair", phone: "+91 98666 77788", email: "karthik.nair@projectx.in", territory: "Hyderabad", status: "en_route", activeJobs: 1, completedToday: 1, rating: 4.4, specialization: "CCTV & Networking", totalJobs: 156, avgRating: 4.4, completedThisWeek: 6, completedThisMonth: 24, joinDate: "2023-09-12", skills: ["CCTV Installation", "Network Configuration", "Structured Cabling", "WiFi Setup", "Intercom Systems"] },
  { id: "TECH007", name: "Manoj Tiwari", phone: "+91 98777 88899", email: "manoj.tiwari@projectx.in", territory: "Ahmedabad", status: "off_duty", activeJobs: 0, completedToday: 0, rating: 4.3, specialization: "AC & Refrigeration", totalJobs: 224, avgRating: 4.3, completedThisWeek: 7, completedThisMonth: 28, joinDate: "2022-10-25", skills: ["AC Installation", "Refrigeration Systems", "Cold Storage Maintenance", "Duct Cleaning", "Thermostat Calibration"] },
];

export const contracts: Contract[] = [
  { id: "CON001", contractNumber: "AMC-2024-001", customerId: "C001", customerName: "Sharma Electronics", assetId: "A001", assetName: "Split AC 1.5T", type: "amc", plan: "AC Standard AMC", startDate: "2024-04-01", endDate: "2025-03-31", status: "expiring_soon", value: 12000, visitsCovered: 4, visitsUsed: 3, nextServiceDate: "2025-04-15" },
  { id: "CON002", contractNumber: "AMC-2024-002", customerId: "C001", customerName: "Sharma Electronics", assetId: "A002", assetName: "Split AC 2T", type: "amc", plan: "AC Standard AMC", startDate: "2024-04-01", endDate: "2025-03-31", status: "expiring_soon", value: 15000, visitsCovered: 4, visitsUsed: 3, nextServiceDate: "2025-04-15" },
  { id: "CON003", contractNumber: "WRN-2024-001", customerId: "C002", customerName: "Priya Mehta", assetId: "A003", assetName: "RO Water Purifier", type: "warranty", plan: "Standard Warranty", startDate: "2024-06-25", endDate: "2025-06-24", status: "active", value: 0, visitsCovered: 2, visitsUsed: 1, nextServiceDate: "2025-05-10" },
  { id: "CON004", contractNumber: "AMC-2024-003", customerId: "C003", customerName: "GreenLeaf Office Park", assetId: "A004", assetName: "CCTV System 16CH", type: "amc", plan: "CCTV Comprehensive AMC", startDate: "2024-12-01", endDate: "2025-11-30", status: "active", value: 60000, visitsCovered: 4, visitsUsed: 1, nextServiceDate: "2025-05-20" },
  { id: "CON005", contractNumber: "AMC-2024-004", customerId: "C003", customerName: "GreenLeaf Office Park", assetId: "A005", assetName: "Passenger Elevator", type: "amc", plan: "Elevator Premium AMC", startDate: "2024-11-15", endDate: "2025-11-14", status: "active", value: 180000, visitsCovered: 12, visitsUsed: 4, nextServiceDate: "2025-04-01" },
  { id: "CON006", contractNumber: "AMC-2023-010", customerId: "C004", customerName: "Rajesh Kumar", assetId: "A006", assetName: "Window AC 1.5T", type: "amc", plan: "AC Basic AMC", startDate: "2024-01-10", endDate: "2025-01-09", status: "expired", value: 6000, visitsCovered: 2, visitsUsed: 2, nextServiceDate: "2025-04-10" },
  { id: "CON007", contractNumber: "AMC-2024-005", customerId: "C005", customerName: "Hotel Sunrise", assetId: "A007", assetName: "Central AC Unit", type: "amc", plan: "Central AC Premium AMC", startDate: "2024-09-01", endDate: "2025-08-31", status: "active", value: 360000, visitsCovered: 12, visitsUsed: 6, nextServiceDate: "2025-05-15" },
  { id: "CON008", contractNumber: "AMC-2024-006", customerId: "C005", customerName: "Hotel Sunrise", assetId: "A008", assetName: "Fire Alarm System", type: "amc", plan: "Fire Safety AMC", startDate: "2024-09-01", endDate: "2025-08-31", status: "active", value: 48000, visitsCovered: 4, visitsUsed: 2, nextServiceDate: "2025-04-20" },
  { id: "CON009", contractNumber: "AMC-2024-007", customerId: "C009", customerName: "City Mall", assetId: "A011", assetName: "Escalator Unit 1", type: "amc", plan: "Escalator Premium AMC", startDate: "2024-07-01", endDate: "2025-06-30", status: "active", value: 240000, visitsCovered: 12, visitsUsed: 8, nextServiceDate: "2025-04-10" },
  { id: "CON010", contractNumber: "AMC-2024-008", customerId: "C011", customerName: "Krishna Hospital", assetId: "A012", assetName: "Central AC Plant", type: "amc", plan: "Central AC Premium AMC", startDate: "2024-09-15", endDate: "2025-09-14", status: "active", value: 420000, visitsCovered: 12, visitsUsed: 5, nextServiceDate: "2025-05-28" },
];

export const plans: Plan[] = [
  { id: "P001", name: "AC Basic AMC", type: "amc", duration: 12, price: 6000, visitsCovered: 2, description: "2 service visits per year with basic maintenance", isActive: true },
  { id: "P002", name: "AC Standard AMC", type: "amc", duration: 12, price: 12000, visitsCovered: 4, description: "Quarterly service with gas top-up included", isActive: true },
  { id: "P003", name: "AC Premium AMC", type: "amc", duration: 12, price: 18000, visitsCovered: 6, description: "Bi-monthly service with parts coverage up to Rs 5,000", isActive: true },
  { id: "P004", name: "Central AC Premium AMC", type: "amc", duration: 12, price: 360000, visitsCovered: 12, description: "Monthly maintenance for central/VRF systems with full parts coverage", isActive: true },
  { id: "P005", name: "CCTV Comprehensive AMC", type: "amc", duration: 12, price: 60000, visitsCovered: 4, description: "Quarterly inspection with camera replacement coverage", isActive: true },
  { id: "P006", name: "Elevator Premium AMC", type: "amc", duration: 12, price: 180000, visitsCovered: 12, description: "Monthly inspection with comprehensive parts and labor coverage", isActive: true },
  { id: "P007", name: "Escalator Premium AMC", type: "amc", duration: 12, price: 240000, visitsCovered: 12, description: "Monthly inspection for escalators with full mechanical coverage", isActive: true },
  { id: "P008", name: "Fire Safety AMC", type: "amc", duration: 12, price: 48000, visitsCovered: 4, description: "Quarterly fire system inspection with compliance certification", isActive: true },
  { id: "P009", name: "RO Annual Service", type: "amc", duration: 12, price: 3500, visitsCovered: 3, description: "3 service visits with filter replacement", isActive: true },
];

export const teamMembers: TeamMember[] = [
  { id: "TM001", name: "Varun Sah", email: "varun@projectx.in", role: "admin", status: "active", lastActive: "2025-03-26T10:00:00" },
  { id: "TM002", name: "Neha Gupta", email: "neha@projectx.in", role: "manager", status: "active", lastActive: "2025-03-26T09:45:00" },
  { id: "TM003", name: "Arjun Reddy", email: "arjun@projectx.in", role: "agent", status: "active", lastActive: "2025-03-26T08:30:00" },
  { id: "TM004", name: "Pooja Verma", email: "pooja@projectx.in", role: "agent", status: "active", lastActive: "2025-03-25T18:00:00" },
  { id: "TM005", name: "Rohit Saxena", email: "rohit@projectx.in", role: "agent", status: "inactive", lastActive: "2025-03-10T14:00:00" },
];

// ── Date shifting ──────────────────────────────────────
// Shift time-sensitive mock dates to be relative to "now" so dashboards/reports
// render meaningful data after seeding, regardless of the current calendar year.

const TODAY = new Date();

function dateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function dateTimeStr(d: Date): string {
  return `${dateStr(d)}T${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
}

function daysFromNow(days: number): Date {
  const d = new Date(TODAY);
  d.setDate(d.getDate() + days);
  return d;
}

function monthsFromNow(months: number): Date {
  const d = new Date(TODAY);
  d.setMonth(d.getMonth() + months);
  return d;
}

// Invoices: spread issuedDate across the last 6 months; dueDate = issuedDate + 30d.
// Interleave paid and unpaid invoices so each month has at least one of each
// (otherwise an unlucky ordering leaves "This Month" with zero collections).
{
  const paid = invoices.filter((i) => i.paidAmount > 0);
  const unpaid = invoices.filter((i) => i.paidAmount === 0);
  const interleaved: Invoice[] = [];
  for (let k = 0; k < Math.max(paid.length, unpaid.length); k++) {
    if (paid[k]) interleaved.push(paid[k]);
    if (unpaid[k]) interleaved.push(unpaid[k]);
  }
  interleaved.forEach((inv, i) => {
    const issued = daysFromNow(-(15 + i * 14)); // ~15..169 days ago across 12 invoices
    inv.issuedDate = dateStr(issued);
    const due = new Date(issued);
    due.setDate(due.getDate() + 30);
    inv.dueDate = dateStr(due);
  });
}

// Contracts: align startDate/endDate to status so "expired" is actually past, etc.
contracts.forEach((c) => {
  if (c.status === "expired" || c.status === "cancelled") {
    c.startDate = dateStr(monthsFromNow(-14));
    c.endDate = dateStr(monthsFromNow(-2));
    c.nextServiceDate = dateStr(daysFromNow(-30));
  } else if (c.status === "expiring_soon") {
    c.startDate = dateStr(monthsFromNow(-11));
    c.endDate = dateStr(monthsFromNow(1));
    c.nextServiceDate = dateStr(daysFromNow(15));
  } else {
    c.startDate = dateStr(monthsFromNow(-1));
    c.endDate = dateStr(monthsFromNow(11));
    c.nextServiceDate = dateStr(monthsFromNow(1));
  }
});

// Jobs: spread scheduledDate across [-90, +90] days; completed → past, pending → future.
jobs.forEach((j, i) => {
  const even = -90 + Math.round((i + 0.5) * (180 / jobs.length));
  let offset = even;
  if (j.status === "completed") offset = -Math.abs(even || 30);
  else if (j.status === "pending") offset = Math.abs(even || 30);
  const scheduled = daysFromNow(offset);
  j.scheduledDate = dateStr(scheduled);
  if (j.completedAt) {
    const completed = new Date(scheduled);
    completed.setHours(completed.getHours() + 8);
    j.completedAt = dateTimeStr(completed);
  }
});

// ── Dashboard Aggregates ───────────────────────────────

export function getDashboardMetrics() {
  const totalDue = customers.reduce((sum, c) => sum + c.totalDue, 0);
  const overdueInvoices = invoices.filter((i) => i.status === "overdue");
  const overdueAmount = overdueInvoices.reduce((sum, i) => sum + (i.amount - i.paidAmount), 0);
  const openTickets = tickets.filter((t) => !["resolved", "closed"].includes(t.status));
  const criticalTickets = openTickets.filter((t) => t.priority === "critical");
  const expiringContracts = contracts.filter((c) => c.status === "expiring_soon" || c.status === "expired");
  const todayJobs = jobs.filter((j) => j.scheduledDate === "2025-03-26");
  const activeCustomers = customers.filter((c) => c.status === "active");

  return {
    totalDue,
    overdueAmount,
    overdueCount: overdueInvoices.length,
    openTickets: openTickets.length,
    criticalTickets: criticalTickets.length,
    expiringContracts: expiringContracts.length,
    todayJobs: todayJobs.length,
    activeCustomers: activeCustomers.length,
    totalCustomers: customers.length,
    totalAssets: assets.length,
    monthlyCollected: 159500,
    monthlyBilled: 460500,
    collectionRate: 35,
    avgResolutionHours: 18,
    renewalRate: 72,
    technicianUtilization: 71,
  };
}

export function getReportMetrics() {
  const totalRevenue = invoices.reduce((sum, i) => sum + i.amount, 0);
  const totalCollected = invoices.reduce((sum, i) => sum + i.paidAmount, 0);
  const collectionRate = totalRevenue > 0 ? Math.round((totalCollected / totalRevenue) * 100) : 0;

  const totalCustomers = customers.length;

  const activeContracts = contracts.filter((c) => c.status === "active" || c.status === "expiring_soon").length;
  const expiredContracts = contracts.filter((c) => c.status === "expired" || c.status === "cancelled").length;

  // Average resolution time in hours from resolved tickets
  const resolvedTickets = tickets.filter((t) => t.resolvedAt);
  const avgResolutionTime = resolvedTickets.length > 0
    ? Math.round(
        resolvedTickets.reduce((sum, t) => {
          const created = new Date(t.createdAt).getTime();
          const resolved = new Date(t.resolvedAt!).getTime();
          return sum + (resolved - created) / (1000 * 60 * 60);
        }, 0) / resolvedTickets.length
      )
    : 0;

  const totalJobs = jobs.length;
  const completedJobs = jobs.filter((j) => j.status === "completed").length;

  const openComplaints = tickets.filter((t) => !["resolved", "closed"].includes(t.status)).length;
  const resolvedComplaints = tickets.filter((t) => t.status === "resolved" || t.status === "closed").length;

  const overdueInvoices = invoices.filter((i) => i.status === "overdue").length;
  const totalInvoiced = totalRevenue;

  // Renewal rate: ratio of active/expiring_soon contracts to total contracts
  const renewableContracts = contracts.length;
  const renewedOrActive = contracts.filter((c) => c.status === "active" || c.status === "renewed" || c.status === "expiring_soon").length;
  const renewalRate = renewableContracts > 0 ? Math.round((renewedOrActive / renewableContracts) * 100) : 0;

  return {
    totalRevenue,
    totalCollected,
    collectionRate,
    totalCustomers,
    activeContracts,
    expiredContracts,
    avgResolutionTime,
    totalJobs,
    completedJobs,
    openComplaints,
    resolvedComplaints,
    overdueInvoices,
    totalInvoiced,
    renewalRate,
  };
}
