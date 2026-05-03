import { db } from "@/lib/db";
import {
  contractDetailsInclude,
  invoiceDetailsInclude,
  jobDetailsInclude,
  mapContract,
  mapInvoice,
  mapJob,
  mapTicket,
  ticketDetailsInclude,
} from "@/lib/data-mappers";
import {
  addDays,
  getMonthLabel,
  getMonthLabelWithYear,
  getOrganizationContext,
  startOfDay,
} from "@/lib/query-utils";
import type { ActionItem, DashboardData, DashboardMetrics, RevenuePeriod } from "@/lib/types";

function getPeriodMonths(period: RevenuePeriod, referenceDate: Date): number {
  if (period === "3m") return 3;
  if (period === "6m") return 6;
  if (period === "12m") return 12;
  return Math.max(1, referenceDate.getMonth() + 1);
}

function buildLastMonths(referenceDate: Date, count: number) {
  return Array.from({ length: count }).map((_, index) => {
    const date = new Date(referenceDate.getFullYear(), referenceDate.getMonth() - (count - 1 - index), 1);
    return {
      key: `${date.getFullYear()}-${date.getMonth()}`,
      label: getMonthLabel(date),
      labelFull: getMonthLabelWithYear(date),
      billed: 0,
      collected: 0,
    };
  });
}

export async function getDashboardDataForOrganization(
  organizationId: string,
  period: RevenuePeriod = "6m",
): Promise<DashboardData> {
  const referenceDate = new Date();
  const today = startOfDay(referenceDate);
  const monthStart = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1);
  const thirtyDaysAgo = addDays(referenceDate, -30);
  const sevenDaysFromNow = addDays(referenceDate, 7);
  const periodMonths = getPeriodMonths(period, referenceDate);
  const periodStart = new Date(referenceDate.getFullYear(), referenceDate.getMonth() - (periodMonths - 1), 1);

  const [
    totalCustomers,
    activeCustomers,
    totalAssets,
    dueSums,
    overdueAgg,
    longOverdueCount,
    draftInvoicesCount,
    openTicketsCount,
    criticalTicketsCount,
    criticalUnassignedCount,
    resolvedTickets,
    renewalGroups,
    expiringContractCount,
    expiringThisWeekCount,
    pendingJobsCount,
    todayJobsCount,
    overdueInvoices,
    recentTickets,
    expiringContracts,
    todayJobs,
    revenueInvoices,
    technicians,
  ] = await Promise.all([
    // ── Customer counts ──
    db.customer.count({ where: { organizationId } }),
    db.customer.count({ where: { organizationId, status: "ACTIVE" } }),

    // ── Asset count ──
    db.asset.count({ where: { organizationId } }),

    // ── Invoice aggregates ──
    db.invoice.aggregate({
      where: { organizationId, status: { in: ["ISSUED", "OVERDUE", "PARTIAL"] } },
      _sum: { amount: true, paidAmount: true },
    }),
    db.invoice.aggregate({
      where: { organizationId, status: "OVERDUE" },
      _sum: { amount: true, paidAmount: true },
      _count: true,
    }),
    db.invoice.count({
      where: { organizationId, status: "OVERDUE", dueDate: { lt: thirtyDaysAgo } },
    }),
    db.invoice.count({
      where: { organizationId, status: "DRAFT" },
    }),

    // ── Ticket counts ──
    db.ticket.count({
      where: { organizationId, status: { notIn: ["RESOLVED", "CLOSED"] } },
    }),
    db.ticket.count({
      where: { organizationId, priority: "CRITICAL", status: { notIn: ["RESOLVED", "CLOSED"] } },
    }),
    db.ticket.count({
      where: { organizationId, priority: "CRITICAL", assignedToId: null, status: { notIn: ["RESOLVED", "CLOSED"] } },
    }),
    db.ticket.findMany({
      where: { organizationId, resolvedAt: { not: null } },
      select: { createdAt: true, resolvedAt: true },
      orderBy: { resolvedAt: "desc" },
      take: 1000,
    }),

    // ── Contract metrics ──
    db.contract.groupBy({
      by: ["status"],
      where: { organizationId, status: { in: ["ACTIVE", "EXPIRING_SOON", "EXPIRED", "RENEWED"] } },
      _count: true,
    }),
    db.contract.count({
      where: { organizationId, status: { in: ["EXPIRING_SOON", "EXPIRED"] } },
    }),
    db.contract.count({
      where: {
        organizationId,
        status: { notIn: ["EXPIRED", "CANCELLED", "RENEWED"] },
        endDate: { gte: referenceDate, lte: sevenDaysFromNow },
      },
    }),

    // ── Job counts ──
    db.job.count({ where: { organizationId, status: "PENDING" } }),
    db.job.count({ where: { organizationId, scheduledDate: today } }),

    // ── Display queries (need full includes for mappers) ──
    db.invoice.findMany({
      where: { organizationId, status: "OVERDUE" },
      include: invoiceDetailsInclude,
      orderBy: { dueDate: "asc" },
      take: 5,
    }),
    db.ticket.findMany({
      where: { organizationId, status: { notIn: ["RESOLVED", "CLOSED"] } },
      include: ticketDetailsInclude,
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    db.contract.findMany({
      where: { organizationId, status: { in: ["EXPIRING_SOON", "EXPIRED"] } },
      include: contractDetailsInclude,
      orderBy: { endDate: "asc" },
      take: 5,
    }),
    db.job.findMany({
      where: { organizationId, scheduledDate: today },
      include: jobDetailsInclude,
      take: 4,
    }),

    // ── Revenue chart (narrow select) ──
    db.invoice.findMany({
      where: { organizationId, issuedDate: { gte: periodStart } },
      select: { amount: true, paidAmount: true, issuedDate: true },
    }),

    // ── Technicians ──
    db.user.findMany({
      where: { organizationId, role: "TECHNICIAN" },
      select: { id: true, status: true },
      take: 500,
    }),
  ]);

  // ── Compute metrics ──
  const totalDue = Math.max(0, (dueSums._sum.amount ?? 0) - (dueSums._sum.paidAmount ?? 0));
  const overdueAmount = Math.max(0, (overdueAgg._sum.amount ?? 0) - (overdueAgg._sum.paidAmount ?? 0));
  const overdueCount = overdueAgg._count;

  const monthlyInvoices = revenueInvoices.filter((inv) => inv.issuedDate >= monthStart);
  const monthlyBilled = monthlyInvoices.reduce((sum, inv) => sum + inv.amount, 0);
  const monthlyCollected = monthlyInvoices.reduce((sum, inv) => sum + inv.paidAmount, 0);
  const collectionRate = monthlyBilled > 0 ? Math.round((monthlyCollected / monthlyBilled) * 100) : 0;

  const avgResolutionHours = resolvedTickets.length
    ? Math.round(
        resolvedTickets.reduce((sum, t) => {
          return sum + (t.resolvedAt!.getTime() - t.createdAt.getTime()) / (1000 * 60 * 60);
        }, 0) / resolvedTickets.length,
      )
    : 0;

  const renewalMap = new Map(renewalGroups.map((g) => [g.status, g._count]));
  const renewalBase =
    (renewalMap.get("ACTIVE") ?? 0) +
    (renewalMap.get("EXPIRING_SOON") ?? 0) +
    (renewalMap.get("EXPIRED") ?? 0) +
    (renewalMap.get("RENEWED") ?? 0);
  const renewedContracts = renewalMap.get("RENEWED") ?? 0;
  const renewalRate = renewalBase > 0 ? Math.round((renewedContracts / renewalBase) * 100) : 0;

  const techniciansActive = technicians.filter((t) => ["on_job", "en_route"].includes(t.status)).length;
  const technicianUtilization = technicians.length
    ? Math.round((techniciansActive / technicians.length) * 100)
    : 0;

  const metrics: DashboardMetrics = {
    totalDue,
    overdueAmount,
    overdueCount,
    openTickets: openTicketsCount,
    criticalTickets: criticalTicketsCount,
    expiringContracts: expiringContractCount,
    todayJobs: todayJobsCount,
    activeCustomers,
    totalCustomers,
    totalAssets,
    monthlyCollected,
    monthlyBilled,
    collectionRate,
    avgResolutionHours,
    renewalRate,
    technicianUtilization,
  };

  // ── Action items ──
  const allActionCandidates: (ActionItem | false)[] = [
    longOverdueCount > 0 && {
      key: "long_overdue",
      level: "critical" as const,
      label: `${longOverdueCount} invoice${longOverdueCount !== 1 ? "s" : ""} overdue`,
      href: "/collections",
      actionLabel: "View Collections",
      count: longOverdueCount,
    },
    criticalUnassignedCount > 0 && {
      key: "critical_unassigned",
      level: "critical" as const,
      label: `${criticalUnassignedCount} critical complaint${criticalUnassignedCount !== 1 ? "s" : ""} unassigned`,
      href: "/complaints?status=open&type=critical",
      actionLabel: "Assign Now",
      count: criticalUnassignedCount,
    },
    expiringThisWeekCount > 0 && {
      key: "expiring_soon",
      level: "warning" as const,
      label: `${expiringThisWeekCount} contract${expiringThisWeekCount !== 1 ? "s" : ""} expiring this week`,
      href: "/contracts?status=expiring_soon",
      actionLabel: "View Contracts",
      count: expiringThisWeekCount,
    },
    pendingJobsCount > 0 && {
      key: "pending_jobs",
      level: "warning" as const,
      label: `${pendingJobsCount} job${pendingJobsCount !== 1 ? "s" : ""} unassigned`,
      href: "/jobs?status=pending",
      actionLabel: "Assign Jobs",
      count: pendingJobsCount,
    },
    draftInvoicesCount > 0 && {
      key: "draft_invoices",
      level: "warning" as const,
      label: `${draftInvoicesCount} draft invoice${draftInvoicesCount !== 1 ? "s" : ""} not yet issued`,
      href: "/invoices?status=draft",
      actionLabel: "Review",
      count: draftInvoicesCount,
    },
  ];

  const actionItems = allActionCandidates
    .filter((item): item is ActionItem => Boolean(item))
    .slice(0, 5);

  // ── Revenue chart ──
  const revenueChartData = buildLastMonths(referenceDate, periodMonths).map((bucket) => {
    revenueInvoices.forEach((inv) => {
      const key = `${inv.issuedDate.getFullYear()}-${inv.issuedDate.getMonth()}`;
      if (key === bucket.key) {
        bucket.billed += inv.amount;
        bucket.collected += inv.paidAmount;
      }
    });

    return {
      month: bucket.label,
      monthFull: bucket.labelFull,
      billed: bucket.billed,
      collected: bucket.collected,
    };
  });

  return {
    metrics,
    actionItems,
    overdueInvoices: overdueInvoices.map(mapInvoice),
    recentTickets: recentTickets.map(mapTicket),
    expiringContracts: expiringContracts.map(mapContract),
    todayJobs: todayJobs.map(mapJob),
    activeTechniciansCount: techniciansActive,
    revenueChartData,
  };
}

export async function getDashboardData(period: RevenuePeriod = "6m") {
  const user = await getOrganizationContext();
  return getDashboardDataForOrganization(user.organizationId, period);
}
