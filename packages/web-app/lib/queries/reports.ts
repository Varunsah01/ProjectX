import { db } from "@/lib/db";
import {
  contractDetailsInclude,
  invoiceDetailsInclude,
  jobDetailsInclude,
  mapContract,
  ticketDetailsInclude,
  technicianSelect,
} from "@/lib/data-mappers";
import {
  getDaysDifference,
  getMonthLabelWithYear,
  getOrganizationContext,
} from "@/lib/query-utils";
import type { ReportsOverview } from "@/lib/types";

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Build one bucket per calendar month between from..to (inclusive). */
function buildMonthBuckets(from: Date, to: Date) {
  const buckets: Array<{
    key: string;
    month: string;
    billed: number;
    collected: number;
  }> = [];

  const current = new Date(from.getFullYear(), from.getMonth(), 1);
  const end = new Date(to.getFullYear(), to.getMonth(), 1);
  let safety = 0;

  while (current <= end && safety < 60) {
    buckets.push({
      key: `${current.getFullYear()}-${current.getMonth()}`,
      month: getMonthLabelWithYear(current),
      billed: 0,
      collected: 0,
    });
    current.setMonth(current.getMonth() + 1);
    safety++;
  }

  return buckets;
}

// ── Main query ────────────────────────────────────────────────────────────────

export async function getReportsDataForOrganization(
  organizationId: string,
  from: Date,
  to: Date,
): Promise<ReportsOverview> {
  const [invoices, tickets, contracts, jobs, technicians, customers] =
    await Promise.all([
      db.invoice.findMany({
        where: {
          organizationId,
          issuedDate: { gte: from, lte: to },
        },
        include: invoiceDetailsInclude,
        orderBy: { issuedDate: "asc" },
      }),
      db.ticket.findMany({
        where: {
          organizationId,
          createdAt: { gte: from, lte: to },
        },
        include: ticketDetailsInclude,
        orderBy: { createdAt: "asc" },
      }),
      // Contracts are snapshot / current-state metrics — not filtered by date
      db.contract.findMany({
        where: { organizationId },
        include: contractDetailsInclude,
        orderBy: { endDate: "asc" },
      }),
      db.job.findMany({
        where: {
          organizationId,
          scheduledDate: { gte: from, lte: to },
        },
        include: jobDetailsInclude,
        orderBy: { scheduledDate: "asc" },
      }),
      db.user.findMany({
        where: { organizationId, role: "TECHNICIAN" },
        select: technicianSelect,
        orderBy: { name: "asc" },
      }),
      db.customer.findMany({
        where: { organizationId },
        include: { assets: { select: { id: true } } },
      }),
    ]);

  // Use `to` as the reference point for overdue calculations
  const referenceDate = to;

  // ── Revenue / collection metrics ──────────────────────────────────────────
  const totalRevenue = invoices.reduce((sum, inv) => sum + inv.amount, 0);
  const totalCollected = invoices.reduce((sum, inv) => sum + inv.paidAmount, 0);
  const collectionRate =
    totalRevenue > 0 ? Math.round((totalCollected / totalRevenue) * 100) : 0;

  const customerRevenueMap = new Map<
    string,
    { name: string; totalPaid: number; outstanding: number; assetsCount: number }
  >();
  invoices.forEach((invoice) => {
    const customer = customers.find((c) => c.id === invoice.customerId);
    const entry = customerRevenueMap.get(invoice.customerId) ?? {
      name: invoice.customer.name,
      totalPaid: 0,
      outstanding: 0,
      assetsCount: customer?.assets.length ?? 0,
    };
    entry.totalPaid += invoice.paidAmount;
    entry.outstanding += Math.max(0, invoice.amount - invoice.paidAmount);
    customerRevenueMap.set(invoice.customerId, entry);
  });
  const topCustomers = Array.from(customerRevenueMap.values())
    .sort((a, b) => b.totalPaid - a.totalPaid)
    .slice(0, 5);

  // ── Contract metrics (snapshot — always current state) ────────────────────
  const activeContractsCount = contracts.filter((c) => c.status === "ACTIVE").length;
  const contractStatusCounts = {
    active: contracts.filter((c) => c.status === "ACTIVE").length,
    expiring_soon: contracts.filter((c) => c.status === "EXPIRING_SOON").length,
    expired: contracts.filter((c) => c.status === "EXPIRED").length,
    renewed: contracts.filter((c) => c.status === "RENEWED").length,
  };
  const expiringIn30 = contracts.filter((c) => c.status === "EXPIRING_SOON").length;
  const expiredContracts = contracts.filter((c) => c.status === "EXPIRED").length;
  const renewedContracts = contracts.filter((c) => c.status === "RENEWED").length;
  const renewalPool = expiredContracts + renewedContracts + expiringIn30;
  const renewalRate =
    renewalPool > 0 ? Math.round((renewedContracts / renewalPool) * 100) : 0;
  const totalAmcValue = contracts
    .filter((c) => c.type === "AMC")
    .reduce((sum, c) => sum + c.value, 0);
  const totalWarrantyValue = contracts
    .filter((c) => c.type === "WARRANTY")
    .reduce((sum, c) => sum + c.value, 0);
  const renewalPipeline = contracts
    .filter((c) => ["EXPIRING_SOON", "EXPIRED"].includes(c.status))
    .map(mapContract);
  const highUtilizationContracts = contracts
    .filter(
      (c) =>
        c.status === "ACTIVE" &&
        c.visitsCovered > 0 &&
        c.visitsUsed / c.visitsCovered > 0.8,
    )
    .map(mapContract);

  // ── Collections / aging ───────────────────────────────────────────────────
  const totalOutstanding = invoices.reduce(
    (sum, inv) => sum + Math.max(0, inv.amount - inv.paidAmount),
    0,
  );
  const overdueInvoices = invoices.filter((inv) => inv.status === "OVERDUE");
  const overdueAmount = overdueInvoices.reduce(
    (sum, inv) => sum + Math.max(0, inv.amount - inv.paidAmount),
    0,
  );
  const avgDaysOverdue = overdueInvoices.length
    ? Math.round(
        overdueInvoices.reduce(
          (sum, inv) =>
            sum + Math.max(0, getDaysDifference(inv.dueDate, referenceDate)),
          0,
        ) / overdueInvoices.length,
      )
    : 0;

  const agingBuckets = invoices
    .filter((inv) => !["PAID", "CANCELLED", "DRAFT"].includes(inv.status))
    .reduce<Record<string, { count: number; amount: number }>>(
      (acc, inv) => {
        const daysOver = getDaysDifference(inv.dueDate, referenceDate);
        const amount = Math.max(0, inv.amount - inv.paidAmount);
        if (daysOver <= 0) {
          acc.not_due.count += 1;
          acc.not_due.amount += amount;
        } else if (daysOver <= 30) {
          acc["0_30"].count += 1;
          acc["0_30"].amount += amount;
        } else if (daysOver <= 60) {
          acc["30_60"].count += 1;
          acc["30_60"].amount += amount;
        } else if (daysOver <= 90) {
          acc["60_90"].count += 1;
          acc["60_90"].amount += amount;
        } else {
          acc["90_plus"].count += 1;
          acc["90_plus"].amount += amount;
        }
        return acc;
      },
      {
        not_due: { count: 0, amount: 0 },
        "0_30": { count: 0, amount: 0 },
        "30_60": { count: 0, amount: 0 },
        "60_90": { count: 0, amount: 0 },
        "90_plus": { count: 0, amount: 0 },
      },
    );

  // ── Service / jobs / tickets ───────────────────────────────────────────────
  const totalJobs = jobs.length;
  const completedJobs = jobs.filter((j) => j.status === "COMPLETED").length;
  const completedRate =
    totalJobs > 0 ? Math.round((completedJobs / totalJobs) * 100) : 0;
  const jobsByType = {
    complaint: jobs.filter((j) => j.type === "COMPLAINT").length,
    scheduled: jobs.filter((j) => j.type === "SCHEDULED").length,
    installation: jobs.filter((j) => j.type === "INSTALLATION").length,
    inspection: jobs.filter((j) => j.type === "INSPECTION").length,
  };

  const openComplaints = tickets.filter((t) =>
    ["OPEN", "REOPENED"].includes(t.status),
  ).length;
  const inProgressComplaints = tickets.filter((t) =>
    ["ASSIGNED", "IN_PROGRESS", "ON_HOLD"].includes(t.status),
  ).length;
  const resolvedComplaints = tickets.filter((t) =>
    ["RESOLVED", "CLOSED"].includes(t.status),
  ).length;

  const resolvedTickets = tickets.filter((t) => t.resolvedAt);
  const avgResolutionHours = resolvedTickets.length
    ? Math.round(
        resolvedTickets.reduce(
          (sum, t) =>
            sum + (t.resolvedAt!.getTime() - t.createdAt.getTime()) / 3_600_000,
          0,
        ) / resolvedTickets.length,
      )
    : 0;

  const techPerformance = technicians
    .map((tech) => ({
      id: tech.id,
      name: tech.name,
      completedJobs: jobs.filter(
        (j) => j.technicianId === tech.id && j.status === "COMPLETED",
      ).length,
      activeJobs: jobs.filter(
        (j) =>
          j.technicianId === tech.id &&
          !["COMPLETED", "CANCELLED"].includes(j.status),
      ).length,
      rating: tech.rating,
      specialization: tech.specialization ?? "",
    }))
    .sort((a, b) => b.rating - a.rating);

  // ── Revenue chart — dynamic month buckets matching the date range ──────────
  const revenueMonths = buildMonthBuckets(from, to);
  invoices.forEach((inv) => {
    const key = `${inv.issuedDate.getFullYear()}-${inv.issuedDate.getMonth()}`;
    const bucket = revenueMonths.find((m) => m.key === key);
    if (bucket) {
      bucket.billed += inv.amount;
      bucket.collected += inv.paidAmount;
    }
  });

  return {
    totalRevenue,
    totalCollected,
    collectionRate,
    activeContractsCount,
    avgResolutionHours,
    topCustomers,
    contractStatusCounts,
    totalOutstanding,
    overdueAmount,
    avgDaysOverdue,
    agingBuckets,
    totalJobs,
    completedJobs,
    completedRate,
    jobsByType,
    openComplaints,
    inProgressComplaints,
    resolvedComplaints,
    techPerformance,
    expiringIn30,
    expiredContracts,
    renewedContracts,
    renewalRate,
    totalAmcValue,
    totalWarrantyValue,
    renewalPipeline,
    highUtilizationContracts,
    revenueChartData: revenueMonths.map(({ month, billed, collected }) => ({
      month,
      billed,
      collected,
    })),
    collectionChartData: revenueMonths.map(({ month, collected }) => ({
      month,
      collected,
    })),
  };
}

export async function getReportsData(from: Date, to: Date) {
  const user = await getOrganizationContext();
  return getReportsDataForOrganization(user.organizationId, from, to);
}
