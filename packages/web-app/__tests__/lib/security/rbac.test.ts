import { describe, it, expect } from "vitest";
import {
  hasPermission,
  assertPermission,
  canAccessPath,
  ensureTechnicianOwnsRecord,
} from "@/lib/security/rbac";

describe("hasPermission", () => {
  it("ADMIN has all permissions", () => {
    expect(hasPermission("ADMIN", "settings:business")).toBe(true);
    expect(hasPermission("ADMIN", "settings:team")).toBe(true);
    expect(hasPermission("ADMIN", "customers:delete")).toBe(true);
    expect(hasPermission("ADMIN", "jobs:update-status-own")).toBe(true);
  });

  it("MANAGER has most permissions except admin-only", () => {
    expect(hasPermission("MANAGER", "customers:read")).toBe(true);
    expect(hasPermission("MANAGER", "invoices:create")).toBe(true);
    expect(hasPermission("MANAGER", "settings:business")).toBe(false);
    expect(hasPermission("MANAGER", "settings:team")).toBe(false);
    expect(hasPermission("MANAGER", "technicians:create")).toBe(false);
  });

  it("AGENT has a restricted set of permissions", () => {
    expect(hasPermission("AGENT", "customers:read")).toBe(true);
    expect(hasPermission("AGENT", "customers:create")).toBe(true);
    expect(hasPermission("AGENT", "customers:delete")).toBe(false);
    expect(hasPermission("AGENT", "settings:view")).toBe(false);
    expect(hasPermission("AGENT", "plans:manage")).toBe(false);
  });

  it("TECHNICIAN has minimal permissions", () => {
    expect(hasPermission("TECHNICIAN", "jobs:read")).toBe(true);
    expect(hasPermission("TECHNICIAN", "jobs:update-status-own")).toBe(true);
    expect(hasPermission("TECHNICIAN", "customers:read")).toBe(false);
    expect(hasPermission("TECHNICIAN", "settings:view")).toBe(false);
  });
});

describe("assertPermission", () => {
  it("does not throw for allowed permission", () => {
    expect(() => assertPermission("ADMIN", "settings:business")).not.toThrow();
  });

  it("throws for denied permission", () => {
    expect(() => assertPermission("TECHNICIAN", "settings:view")).toThrow(
      "Forbidden",
    );
  });
});

describe("canAccessPath", () => {
  it("always allows API routes", () => {
    expect(canAccessPath("TECHNICIAN", "/api/mobile/v1/jobs")).toBe(true);
    expect(canAccessPath("AGENT", "/api/auth/login")).toBe(true);
  });

  it("ADMIN and MANAGER can access all pages", () => {
    expect(canAccessPath("ADMIN", "/settings")).toBe(true);
    expect(canAccessPath("ADMIN", "/customers")).toBe(true);
    expect(canAccessPath("MANAGER", "/reports")).toBe(true);
  });

  it("TECHNICIAN can only access /jobs and /complaints", () => {
    expect(canAccessPath("TECHNICIAN", "/jobs")).toBe(true);
    expect(canAccessPath("TECHNICIAN", "/jobs/123")).toBe(true);
    expect(canAccessPath("TECHNICIAN", "/complaints")).toBe(true);
    expect(canAccessPath("TECHNICIAN", "/customers")).toBe(false);
    expect(canAccessPath("TECHNICIAN", "/settings")).toBe(false);
  });

  it("AGENT can access most pages but not settings/plans", () => {
    expect(canAccessPath("AGENT", "/customers")).toBe(true);
    expect(canAccessPath("AGENT", "/invoices")).toBe(true);
    expect(canAccessPath("AGENT", "/reports")).toBe(true);
  });
});

describe("ensureTechnicianOwnsRecord", () => {
  it("does nothing for non-technician roles", () => {
    expect(() =>
      ensureTechnicianOwnsRecord("ADMIN", "user-1", "user-2"),
    ).not.toThrow();
    expect(() =>
      ensureTechnicianOwnsRecord("MANAGER", "user-1", null),
    ).not.toThrow();
  });

  it("does not throw when technician owns the record", () => {
    expect(() =>
      ensureTechnicianOwnsRecord("TECHNICIAN", "user-1", "user-1"),
    ).not.toThrow();
  });

  it("throws when technician does not own the record", () => {
    expect(() =>
      ensureTechnicianOwnsRecord("TECHNICIAN", "user-1", "user-2"),
    ).toThrow("Forbidden");
  });

  it("throws when ownerId is null", () => {
    expect(() =>
      ensureTechnicianOwnsRecord("TECHNICIAN", "user-1", null),
    ).toThrow("Forbidden");
  });
});
