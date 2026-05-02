import type { UserRole } from "@prisma/client";

export type Permission =
  | "dashboard:view"
  | "reports:view"
  | "settings:view"
  | "settings:business"
  | "settings:team"
  | "settings:audit"
  | "plans:manage"
  | "customers:read"
  | "customers:create"
  | "customers:update"
  | "customers:delete"
  | "assets:read"
  | "assets:create"
  | "assets:update"
  | "assets:delete"
  | "contracts:read"
  | "contracts:create"
  | "contracts:update"
  | "contracts:delete"
  | "contracts:renew"
  | "invoices:read"
  | "invoices:create"
  | "invoices:update"
  | "invoices:delete"
  | "invoices:remind"
  | "invoices:mark-paid"
  | "tickets:read"
  | "tickets:create"
  | "tickets:update"
  | "tickets:delete"
  | "tickets:assign"
  | "tickets:resolve"
  | "tickets:close"
  | "jobs:read"
  | "jobs:create"
  | "jobs:update"
  | "jobs:delete"
  | "jobs:assign"
  | "jobs:complete"
  | "jobs:update-status-own"
  | "technicians:read"
  | "technicians:create"
  | "technicians:update"
  | "technicians:delete"
  | "payments:create"
  | "payments:verify"
  | "pdf:invoice"
  | "pdf:job-report";

const managerDeniedPermissions = new Set<Permission>([
  "settings:business",
  "settings:team",
  "settings:audit",
  "technicians:create",
  "technicians:update",
  "technicians:delete",
]);

const agentAllowedPermissions = new Set<Permission>([
  "dashboard:view",
  "reports:view",
  "customers:read",
  "customers:create",
  "customers:update",
  "assets:read",
  "contracts:read",
  "contracts:create",
  "contracts:update",
  "contracts:renew",
  "invoices:read",
  "invoices:create",
  "invoices:update",
  "invoices:remind",
  "invoices:mark-paid",
  "tickets:read",
  "tickets:create",
  "tickets:update",
  "tickets:assign",
  "tickets:resolve",
  "tickets:close",
  "jobs:read",
  "technicians:read",
  "payments:create",
  "payments:verify",
  "pdf:invoice",
]);

const technicianAllowedPermissions = new Set<Permission>([
  "jobs:read",
  "tickets:read",
  "jobs:update-status-own",
  "pdf:job-report",
]);

const pagePrefixesByRole: Record<UserRole, string[]> = {
  ADMIN: ["/"],
  MANAGER: ["/"],
  AGENT: [
    "/",
    "/customers",
    "/assets",
    "/contracts",
    "/invoices",
    "/collections",
    "/complaints",
    "/jobs",
    "/technicians",
    "/reports",
    "/import",
  ],
  TECHNICIAN: ["/jobs", "/complaints"],
};

export function hasPermission(role: UserRole, permission: Permission) {
  if (role === "ADMIN") {
    return true;
  }

  if (role === "MANAGER") {
    return !managerDeniedPermissions.has(permission);
  }

  if (role === "AGENT") {
    return agentAllowedPermissions.has(permission);
  }

  return technicianAllowedPermissions.has(permission);
}

export function assertPermission(role: UserRole, permission: Permission) {
  if (!hasPermission(role, permission)) {
    throw new Error("Forbidden");
  }
}

export function canAccessPath(role: UserRole, pathname: string) {
  if (pathname.startsWith("/api/")) {
    return true;
  }

  return pagePrefixesByRole[role].some((prefix) =>
    prefix === "/" ? true : pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function ensureTechnicianOwnsRecord(
  role: UserRole,
  userId: string,
  ownerId: string | null | undefined,
) {
  if (role !== "TECHNICIAN") {
    return;
  }

  if (!ownerId || ownerId !== userId) {
    throw new Error("Forbidden");
  }
}
