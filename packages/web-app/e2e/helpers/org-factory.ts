/**
 * Test-org factory for Playwright e2e tests.
 *
 * Each spec that calls `createTestOrg()` gets an isolated Organisation with its
 * own Admin user, Customer, Asset, Plan, and optionally Contract / Invoice /
 * Payment / Refund / Technician / Job.  The returned `teardown()` function
 * deletes the whole org (cascade wipes all rows) so no data leaks between runs.
 *
 * Usage:
 *   const org = await createTestOrg("auth-spec");
 *   // ... tests ...
 *   await org.teardown();
 */

import { hash } from "bcrypt";
import { randomBytes } from "node:crypto";
import { db } from "./db";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function uid() {
  return randomBytes(8).toString("hex");
}

export const TEST_PASSWORD = "Test1234!";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TestOrg {
  orgId: string;
  orgSlug: string;
  adminId: string;
  adminEmail: string;
  customerId: string;
  assetId: string;
  planId: string;
  teardown: () => Promise<void>;
}

export interface TestOrgWithContract extends TestOrg {
  contractId: string;
}

export interface TestOrgWithInvoice extends TestOrgWithContract {
  invoiceId: string;
  invoiceNumber: string;
}

export interface TestOrgWithPayment extends TestOrgWithInvoice {
  paymentId: string;
  razorpayOrderId: string;
}

export interface TestOrgWithRefund extends TestOrgWithPayment {
  refundId: string;
}

export interface TestOrgWithTechnician extends TestOrg {
  technicianId: string;
  technicianEmail: string;
  technicianPhone: string;
}

export interface TestOrgWithJob extends TestOrgWithTechnician {
  jobId: string;
  jobNumber: string;
}

// ---------------------------------------------------------------------------
// Base org (admin + customer + asset + plan)
// ---------------------------------------------------------------------------

export async function createTestOrg(label: string): Promise<TestOrg> {
  const id = uid();
  const slug = `e2e-${label}-${id}`;
  const passwordHash = await hash(TEST_PASSWORD, 10);

  const org = await db.organization.create({
    data: {
      name: `E2E ${label} ${id}`,
      slug,
      phone: "9000000000",
      email: `${slug}@e2e.test`,
      address: "1 Test Street",
      city: "Testville",
    },
  });

  const admin = await db.user.create({
    data: {
      organizationId: org.id,
      name: "E2E Admin",
      email: `admin-${id}@e2e.test`,
      passwordHash,
      role: "ADMIN",
      status: "ACTIVE",
      emailVerified: new Date(),
    },
  });

  await db.orgMembership.create({
    data: { userId: admin.id, organizationId: org.id, role: "ADMIN" },
  });

  const customer = await db.customer.create({
    data: {
      organizationId: org.id,
      name: "E2E Customer",
      phone: "9111111111",
      email: `customer-${id}@e2e.test`,
      address: "2 Test Avenue",
      city: "Testville",
      status: "ACTIVE",
      category: "Residential",
    },
  });

  const asset = await db.asset.create({
    data: {
      organizationId: org.id,
      customerId: customer.id,
      name: "E2E AC Unit",
      model: "TestModel-X",
      serialNumber: `SN-${id}`,
      category: "AC",
      installationDate: new Date("2023-01-01"),
      warrantyEnd: new Date("2025-01-01"),
      status: "ACTIVE",
    },
  });

  const plan = await db.plan.create({
    data: {
      organizationId: org.id,
      name: `E2E Plan ${id}`,
      type: "AMC",
      durationMonths: 12,
      price: 10000,
      visitsCovered: 2,
      description: "E2E test plan",
      hsnSac: "998719",
      gstRatePercent: 18,
      gstApplicable: true,
    },
  });

  const teardown = async () => {
    await db.organization.deleteMany({ where: { id: org.id } });
  };

  return {
    orgId: org.id,
    orgSlug: slug,
    adminId: admin.id,
    adminEmail: admin.email,
    customerId: customer.id,
    assetId: asset.id,
    planId: plan.id,
    teardown,
  };
}

// ---------------------------------------------------------------------------
// Contract (nextBillingDate = yesterday so cron picks it up immediately)
// ---------------------------------------------------------------------------

export async function addContract(base: TestOrg): Promise<TestOrgWithContract> {
  const id = uid();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  const contract = await db.contract.create({
    data: {
      organizationId: base.orgId,
      contractNumber: `CNT-${id}`,
      customerId: base.customerId,
      assetId: base.assetId,
      planId: base.planId,
      type: "AMC",
      billingCycle: "YEARLY",
      startDate: new Date("2024-01-01"),
      endDate: new Date("2025-12-31"),
      nextBillingDate: yesterday,
      status: "ACTIVE",
      value: 10000,
      visitsCovered: 2,
    },
  });

  return { ...base, contractId: contract.id };
}

// ---------------------------------------------------------------------------
// Invoice
// ---------------------------------------------------------------------------

export async function addInvoice(base: TestOrgWithContract): Promise<TestOrgWithInvoice> {
  const id = uid();
  const invoiceNumber = `INV-E2E-${id}`;

  const invoice = await db.invoice.create({
    data: {
      organizationId: base.orgId,
      invoiceNumber,
      customerId: base.customerId,
      contractId: base.contractId,
      amount: 10000,
      paidAmount: 0,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      issuedDate: new Date(),
      status: "ISSUED",
      type: "RECURRING",
      items: {
        create: {
          organizationId: base.orgId,
          description: "Annual Maintenance Contract",
          qty: 1,
          rate: 10000,
          amount: 10000,
        },
      },
    },
  });

  return { ...base, invoiceId: invoice.id, invoiceNumber };
}

// ---------------------------------------------------------------------------
// Payment (CREATED / pending capture)
// ---------------------------------------------------------------------------

export async function addPayment(base: TestOrgWithInvoice): Promise<TestOrgWithPayment> {
  const id = uid();
  const razorpayOrderId = `order_e2e_${id}`;

  const payment = await db.payment.create({
    data: {
      invoiceId: base.invoiceId,
      razorpayOrderId,
      amount: 10000,
      status: "created",
    },
  });

  return { ...base, paymentId: payment.id, razorpayOrderId };
}

// ---------------------------------------------------------------------------
// Refund (PENDING, full)
// ---------------------------------------------------------------------------

export async function addRefund(base: TestOrgWithPayment): Promise<TestOrgWithRefund> {
  const id = uid();
  const razorpayRefundId = `rfnd_e2e_${id}`;

  // First mark payment as captured so the refund is valid
  await db.payment.update({
    where: { id: base.paymentId },
    data: { status: "captured", razorpayPaymentId: `pay_e2e_${id}` },
  });
  await db.invoice.update({
    where: { id: base.invoiceId },
    data: { paidAmount: 10000, status: "PAID" },
  });

  const refund = await db.refund.create({
    data: {
      paymentId: base.paymentId,
      razorpayRefundId,
      amountPaisa: 1_000_000,
      reason: "e2e test refund",
      status: "PENDING",
      initiatedById: base.adminId,
      notes: {},
    },
  });

  return { ...base, refundId: refund.id };
}

// ---------------------------------------------------------------------------
// Technician
// ---------------------------------------------------------------------------

export async function addTechnician(base: TestOrg): Promise<TestOrgWithTechnician> {
  const id = uid();
  const passwordHash = await hash(TEST_PASSWORD, 10);
  const phone = `80${id.slice(0, 8).replace(/\D/g, "").padEnd(8, "0")}`;

  const tech = await db.user.create({
    data: {
      organizationId: base.orgId,
      name: "E2E Technician",
      email: `tech-${id}@e2e.test`,
      passwordHash,
      role: "TECHNICIAN",
      status: "ACTIVE",
      phone,
    },
  });

  await db.orgMembership.create({
    data: { userId: tech.id, organizationId: base.orgId, role: "TECHNICIAN" },
  });

  return {
    ...base,
    technicianId: tech.id,
    technicianEmail: tech.email,
    technicianPhone: phone,
  };
}

// ---------------------------------------------------------------------------
// Job
// ---------------------------------------------------------------------------

export async function addJob(base: TestOrgWithTechnician): Promise<TestOrgWithJob> {
  const id = uid();
  const jobNumber = `JOB-E2E-${id}`;

  const job = await db.job.create({
    data: {
      organizationId: base.orgId,
      jobNumber,
      customerId: base.customerId,
      assetId: base.assetId,
      technicianId: base.technicianId,
      type: "SCHEDULED",
      status: "ASSIGNED",
      scheduledDate: new Date(),
    },
  });

  return { ...base, jobId: job.id, jobNumber };
}
