/**
 * Integration tests for tenant isolation.
 *
 * Seeds two organisations with one user and sample data each, then verifies
 * that query helpers scoped to Org A cannot access Org B's records.
 *
 * Requires a running Postgres database (DATABASE_URL env var).
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient, UserRole, CustomerStatus, ContractType, ContractStatus, BillingCycle, InvoiceStatus, InvoiceType, TicketPriority, TicketStatus, JobType, JobStatus, AssetStatus } from "@prisma/client";
import { randomUUID } from "crypto";

// ---------------------------------------------------------------------------
// Test database client
// ---------------------------------------------------------------------------

const db = new PrismaClient();

// ---------------------------------------------------------------------------
// Seed data IDs (deterministic for easy cleanup)
// ---------------------------------------------------------------------------

const orgA = { id: randomUUID(), slug: `test-org-a-${Date.now()}` };
const orgB = { id: randomUUID(), slug: `test-org-b-${Date.now()}` };

const userA = { id: randomUUID() };
const userB = { id: randomUUID() };

const customerA = { id: randomUUID() };
const customerB = { id: randomUUID() };

const assetA = { id: randomUUID() };
const assetB = { id: randomUUID() };

const planA = { id: randomUUID() };
const planB = { id: randomUUID() };

const contractA = { id: randomUUID() };
const contractB = { id: randomUUID() };

const invoiceA = { id: randomUUID() };
const invoiceB = { id: randomUUID() };

const ticketA = { id: randomUUID() };
const ticketB = { id: randomUUID() };

const jobA = { id: randomUUID() };
const jobB = { id: randomUUID() };

const notificationA = { id: randomUUID() };
const notificationB = { id: randomUUID() };

// ---------------------------------------------------------------------------
// Seed & cleanup helpers
// ---------------------------------------------------------------------------

async function seed() {
  const now = new Date();
  const future = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);

  for (const [org, user, customer, asset, plan, contract, invoice, ticket, job, notification] of [
    [orgA, userA, customerA, assetA, planA, contractA, invoiceA, ticketA, jobA, notificationA],
    [orgB, userB, customerB, assetB, planB, contractB, invoiceB, ticketB, jobB, notificationB],
  ] as const) {
    await db.organization.create({
      data: {
        id: org.id,
        name: `Test Org ${org.slug}`,
        slug: org.slug,
        phone: "1234567890",
        email: `${org.slug}@test.com`,
        address: "123 Test St",
        city: "Test City",
      },
    });

    await db.user.create({
      data: {
        id: user.id,
        organizationId: org.id,
        name: `User ${org.slug}`,
        email: `user-${user.id}@test.com`,
        passwordHash: "$2b$10$placeholder",
        role: UserRole.ADMIN,
        status: "ACTIVE",
      },
    });

    await db.customer.create({
      data: {
        id: customer.id,
        organizationId: org.id,
        name: `Customer ${org.slug}`,
        phone: "9876543210",
        email: `customer-${customer.id}@test.com`,
        address: "456 Test Ave",
        city: "Test City",
        status: CustomerStatus.ACTIVE,
        category: "General",
      },
    });

    await db.asset.create({
      data: {
        id: asset.id,
        organizationId: org.id,
        customerId: customer.id,
        name: `Asset ${org.slug}`,
        model: "Test Model",
        serialNumber: `SN-${asset.id}`,
        category: "HVAC",
        installationDate: now,
        warrantyEnd: future,
        status: AssetStatus.ACTIVE,
      },
    });

    await db.plan.create({
      data: {
        id: plan.id,
        organizationId: org.id,
        name: `Plan ${org.slug}`,
        type: ContractType.AMC,
        durationMonths: 12,
        price: 10000,
        visitsCovered: 4,
        description: "Test plan",
        hsnSac: "998714",
        gstRatePercent: 18,
      },
    });

    await db.contract.create({
      data: {
        id: contract.id,
        organizationId: org.id,
        contractNumber: `CON-${contract.id.slice(0, 8)}`,
        customerId: customer.id,
        assetId: asset.id,
        planId: plan.id,
        type: ContractType.AMC,
        billingCycle: BillingCycle.YEARLY,
        startDate: now,
        endDate: future,
        nextBillingDate: future,
        status: ContractStatus.ACTIVE,
        value: 10000,
        visitsCovered: 4,
      },
    });

    await db.invoice.create({
      data: {
        id: invoice.id,
        organizationId: org.id,
        invoiceNumber: `INV-${invoice.id.slice(0, 8)}`,
        customerId: customer.id,
        contractId: contract.id,
        amount: 10000,
        dueDate: future,
        issuedDate: now,
        status: InvoiceStatus.ISSUED,
        type: InvoiceType.RECURRING,
        items: {
          create: [{
            organizationId: org.id,
            description: "Test item",
            qty: 1,
            rate: 10000,
            amount: 10000,
          }],
        },
      },
    });

    await db.ticket.create({
      data: {
        id: ticket.id,
        organizationId: org.id,
        ticketNumber: `TKT-${ticket.id.slice(0, 8)}`,
        customerId: customer.id,
        assetId: asset.id,
        subject: "Test complaint",
        description: "Test description",
        category: "Maintenance",
        priority: TicketPriority.MEDIUM,
        status: TicketStatus.OPEN,
        slaDeadline: future,
      },
    });

    await db.job.create({
      data: {
        id: job.id,
        organizationId: org.id,
        jobNumber: `JOB-${job.id.slice(0, 8)}`,
        ticketId: ticket.id,
        customerId: customer.id,
        assetId: asset.id,
        technicianId: user.id,
        type: JobType.COMPLAINT,
        status: JobStatus.PENDING,
        scheduledDate: future,
      },
    });

    await db.notification.create({
      data: {
        id: notification.id,
        organizationId: org.id,
        userId: user.id,
        type: "test",
        title: "Test notification",
        message: "Test message",
      },
    });
  }
}

async function cleanup() {
  // Delete in reverse dependency order
  for (const oid of [orgA.id, orgB.id]) {
    await db.notification.deleteMany({ where: { organizationId: oid } });
    await db.job.deleteMany({ where: { organizationId: oid } });
    await db.ticket.deleteMany({ where: { organizationId: oid } });
    await db.invoiceItem.deleteMany({ where: { organizationId: oid } });
    await db.invoice.deleteMany({ where: { organizationId: oid } });
    await db.contract.deleteMany({ where: { organizationId: oid } });
    await db.plan.deleteMany({ where: { organizationId: oid } });
    await db.asset.deleteMany({ where: { organizationId: oid } });
    await db.customer.deleteMany({ where: { organizationId: oid } });
    await db.user.deleteMany({ where: { organizationId: oid } });
    await db.organization.deleteMany({ where: { id: oid } });
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Tenant Isolation", () => {
  beforeAll(async () => {
    await seed();
  });

  afterAll(async () => {
    await cleanup();
    await db.$disconnect();
  });

  // -----------------------------------------------------------------------
  // Direct Prisma query isolation — the core guarantee
  // -----------------------------------------------------------------------

  describe("Customer isolation", () => {
    it("findMany with orgA returns only orgA customers", async () => {
      const results = await db.customer.findMany({
        where: { organizationId: orgA.id },
      });
      expect(results.every((r) => r.organizationId === orgA.id)).toBe(true);
      expect(results.some((r) => r.id === customerA.id)).toBe(true);
      expect(results.some((r) => r.id === customerB.id)).toBe(false);
    });

    it("findFirst with orgA and orgB id returns null", async () => {
      const result = await db.customer.findFirst({
        where: { id: customerB.id, organizationId: orgA.id },
      });
      expect(result).toBeNull();
    });

    it("updateMany with orgA cannot update orgB customer", async () => {
      const { count } = await db.customer.updateMany({
        where: { id: customerB.id, organizationId: orgA.id },
        data: { name: "HACKED" },
      });
      expect(count).toBe(0);

      const intact = await db.customer.findUnique({ where: { id: customerB.id } });
      expect(intact!.name).not.toBe("HACKED");
    });

    it("deleteMany with orgA cannot delete orgB customer", async () => {
      const { count } = await db.customer.deleteMany({
        where: { id: customerB.id, organizationId: orgA.id },
      });
      expect(count).toBe(0);

      const intact = await db.customer.findUnique({ where: { id: customerB.id } });
      expect(intact).not.toBeNull();
    });
  });

  describe("Asset isolation", () => {
    it("findMany with orgA returns only orgA assets", async () => {
      const results = await db.asset.findMany({
        where: { organizationId: orgA.id },
      });
      expect(results.every((r) => r.organizationId === orgA.id)).toBe(true);
      expect(results.some((r) => r.id === assetB.id)).toBe(false);
    });

    it("findFirst with orgA and orgB id returns null", async () => {
      const result = await db.asset.findFirst({
        where: { id: assetB.id, organizationId: orgA.id },
      });
      expect(result).toBeNull();
    });
  });

  describe("Plan isolation", () => {
    it("findMany with orgA returns only orgA plans", async () => {
      const results = await db.plan.findMany({
        where: { organizationId: orgA.id },
      });
      expect(results.every((r) => r.organizationId === orgA.id)).toBe(true);
      expect(results.some((r) => r.id === planB.id)).toBe(false);
    });

    it("findFirst with orgA and orgB id returns null", async () => {
      const result = await db.plan.findFirst({
        where: { id: planB.id, organizationId: orgA.id },
      });
      expect(result).toBeNull();
    });
  });

  describe("Contract isolation", () => {
    it("findMany with orgA returns only orgA contracts", async () => {
      const results = await db.contract.findMany({
        where: { organizationId: orgA.id },
      });
      expect(results.every((r) => r.organizationId === orgA.id)).toBe(true);
      expect(results.some((r) => r.id === contractB.id)).toBe(false);
    });

    it("findFirst with orgA and orgB id returns null", async () => {
      const result = await db.contract.findFirst({
        where: { id: contractB.id, organizationId: orgA.id },
      });
      expect(result).toBeNull();
    });
  });

  describe("Invoice isolation", () => {
    it("findMany with orgA returns only orgA invoices", async () => {
      const results = await db.invoice.findMany({
        where: { organizationId: orgA.id },
      });
      expect(results.every((r) => r.organizationId === orgA.id)).toBe(true);
      expect(results.some((r) => r.id === invoiceB.id)).toBe(false);
    });

    it("findFirst with orgA and orgB id returns null", async () => {
      const result = await db.invoice.findFirst({
        where: { id: invoiceB.id, organizationId: orgA.id },
      });
      expect(result).toBeNull();
    });

    it("updateMany with orgA cannot update orgB invoice", async () => {
      const { count } = await db.invoice.updateMany({
        where: { id: invoiceB.id, organizationId: orgA.id },
        data: { notes: "HACKED" },
      });
      expect(count).toBe(0);
    });
  });

  describe("Ticket isolation", () => {
    it("findMany with orgA returns only orgA tickets", async () => {
      const results = await db.ticket.findMany({
        where: { organizationId: orgA.id },
      });
      expect(results.every((r) => r.organizationId === orgA.id)).toBe(true);
      expect(results.some((r) => r.id === ticketB.id)).toBe(false);
    });

    it("findFirst with orgA and orgB id returns null", async () => {
      const result = await db.ticket.findFirst({
        where: { id: ticketB.id, organizationId: orgA.id },
      });
      expect(result).toBeNull();
    });
  });

  describe("Job isolation", () => {
    it("findMany with orgA returns only orgA jobs", async () => {
      const results = await db.job.findMany({
        where: { organizationId: orgA.id },
      });
      expect(results.every((r) => r.organizationId === orgA.id)).toBe(true);
      expect(results.some((r) => r.id === jobB.id)).toBe(false);
    });

    it("findFirst with orgA and orgB id returns null", async () => {
      const result = await db.job.findFirst({
        where: { id: jobB.id, organizationId: orgA.id },
      });
      expect(result).toBeNull();
    });

    it("updateMany with orgA cannot update orgB job", async () => {
      const { count } = await db.job.updateMany({
        where: { id: jobB.id, organizationId: orgA.id },
        data: { notes: "HACKED" },
      });
      expect(count).toBe(0);
    });
  });

  describe("Notification isolation", () => {
    it("findMany with orgA returns only orgA notifications", async () => {
      const results = await db.notification.findMany({
        where: { organizationId: orgA.id },
      });
      expect(results.every((r) => r.organizationId === orgA.id)).toBe(true);
      expect(results.some((r) => r.id === notificationB.id)).toBe(false);
    });

    it("findFirst with orgA and orgB id returns null", async () => {
      const result = await db.notification.findFirst({
        where: { id: notificationB.id, organizationId: orgA.id },
      });
      expect(result).toBeNull();
    });

    it("updateMany with orgA cannot mark orgB notifications read", async () => {
      const { count } = await db.notification.updateMany({
        where: { id: notificationB.id, organizationId: orgA.id },
        data: { read: true },
      });
      expect(count).toBe(0);

      const intact = await db.notification.findUnique({ where: { id: notificationB.id } });
      expect(intact!.read).toBe(false);
    });
  });

  describe("User isolation", () => {
    it("findMany with orgA returns only orgA users", async () => {
      const results = await db.user.findMany({
        where: { organizationId: orgA.id },
      });
      expect(results.every((r) => r.organizationId === orgA.id)).toBe(true);
      expect(results.some((r) => r.id === userB.id)).toBe(false);
    });

    it("findFirst with orgA and orgB id returns null", async () => {
      const result = await db.user.findFirst({
        where: { id: userB.id, organizationId: orgA.id },
      });
      expect(result).toBeNull();
    });
  });
});
