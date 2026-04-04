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
  getDaysDifference,
  getMonthLabel,
  getMonthLabelWithYear,
  getOrganizationContext,
  toDateString,
} from "@/lib/query-utils";
import type { ActionItem, DashboardData, DashboardMetrics, RevenuePeriod } from "@/lib/types";

function getReferenceDate(dates: Date[]) {
  return dates.reduce<Date | null>((latest, current) => {
    if (!latest || current > latest) {
      return current;
    }

    return latest;
  }, null) ?? new Date();
}

function getPeriodMonths(period: RevenuePeriod, referenceDate: Date): number {
  if (period === "3m") return 3;
  if (period === "6m") return 6;
  if (period === "12m") return 12;
  // ytd: January through the reference month (inclusive), minimum 1
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
  const [customers, assets, invoices, tickets, contracts, jobs, technicians] = await Promise.all([
    db.customer.findMany({
      where: { organizationId },
      include: {
        invoices: {
          select: {
            amount: true,
            paidAmount: true,
            status: true,
          },
        },
      },
    }),
    db.asset.count({
      where: { organizationId },
    }),
    db.invoice.findMany({
      where: { organizationId },
      include: invoiceDetailsInclude,
      orderBy: { dueDate: "asc" },
    }),
    db.ticket.findMany({
      where: { organizationId },
      include: ticketDetailsInclude,
      orderBy: { createdAt: "desc" },
    }),
    db.contract.findMany({
      where: { organizationId },
      include: contractDetailsInclude,
      orderBy: { endDate: "asc" },
    }),
    db.job.findMany({
      where: { organizationId },
      include: jobDetailsInclude,
      orderBy: { scheduledDate: "desc" },
    }),
    db.user.findMany({
      where: {
        organizationId,
        role: "TECHNICIAN",
      },
      select: {
        id: true,
        status: true,
      },
    }),
  ]);

  const referenceDate = getReferenceDate([
    ...invoices.map((invoice) => invoice.issuedDate),
    ...jobs.map((job) => job.scheduledDate),
    ...tickets.map((ticket) => ticket.createdAt),
    ...contracts.map((contract) => contract.endDate),
  ]);

  const todayJobs = jobs.filter((job) => toDateString(job.scheduledDate) === toDateString(referenceDate));
  const overdueInvoices = invoices.filter((invoice) => invoice.status === "OVERDUE");
  const recentTickets = tickets
    .filter((ticket) => !["RESOLVED", "CLOSED"].includes(ticket.status))
    .slice(0, 5);
  const expiringContracts = contracts
    .filter((contract) => ["EXPIRING_SOON", "EXPIRED"].includes(contract.status))
    .slice(0, 5);

  const totalDue = customers.reduce((sum, customer) => {
    return (
      sum +
      customer.invoices.reduce((invoiceSum, invoice) => {
        if (!["ISSUED", "OVERDUE", "PARTIAL"].includes(invoice.status)) {
          return invoiceSum;
        }

        return invoiceSum + Math.max(0, invoice.amount - invoice.paidAmount);
      }, 0)
    );
  }, 0);

  const overdueAmount = overdueInvoices.reduce(
    (sum, invoice) => sum + Math.max(0, invoice.amount - invoice.paidAmount),
    0,
  );
  const openTickets = tickets.filter((ticket) => !["RESOLVED", "CLOSED"].includes(ticket.status));
  const criticalTickets = openTickets.filter((ticket) => ticket.priority === "CRITICAL");
  const expiringContractCount = contracts.filter((contract) =>
    ["EXPIRING_SOON", "EXPIRED"].includes(contract.status),
  ).length;
  const activeCustomers = customers.filter((customer) => customer.status === "ACTIVE").length;

  const monthStart = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1);
  const monthlyInvoices = invoices.filter((invoice) => invoice.issuedDate >= monthStart);
  const monthlyBilled = monthlyInvoices.reduce((sum, invoice) => sum + invoice.amount, 0);
  const monthlyCollected = monthlyInvoices.reduce((sum, invoice) => sum + invoice.paidAmount, 0);
  const collectionRate = monthlyBilled > 0 ? Math.round((monthlyCollected / monthlyBilled) * 100) : 0;

  const resolvedTickets = tickets.filter((ticket) => ticket.resolvedAt);
  const avgResolutionHours = resolvedTickets.length
    ? Math.round(
        resolvedTickets.reduce((sum, ticket) => {
          return sum + (ticket.resolvedAt!.getTime() - ticket.createdAt.getTime()) / (1000 * 60 * 60);
        }, 0) / resolvedTickets.length,
      )
    : 0;

  const renewableContracts = contracts.filter((contract) =>
    ["ACTIVE", "EXPIRING_SOON", "EXPIRED", "RENEWED"].includes(contract.status),
  );
  const renewalBase = renewableContracts.length;
  const renewedContracts = renewableContracts.filter((contract) => contract.status === "RENEWED").length;
  const renewalRate = renewalBase > 0 ? Math.round((renewedContracts / renewalBase) * 100) : 0;

  const techniciansActive = technicians.filter((technician) =>
    ["on_job", "en_route"].includes(technician.status),
  ).length;
  const technicianUtilization = technicians.length
    ? Math.round((techniciansActive / technicians.length) * 100)
    : 0;

  const metrics: DashboardMetrics = {
    totalDue,
    overdueAmount,
    overdueCount: overdueInvoices.length,
    openTickets: openTickets.length,
    criticalTickets: criticalTickets.length,
    expiringContracts: expiringContractCount,
    todayJobs: todayJobs.length,
    activeCustomers,
    totalCustomers: customers.length,
    totalAssets: assets,
    monthlyCollected,
    monthlyBilled,
    collectionRate,
    avgResolutionHours,
    renewalRate,
    technicianUtilization,
  };

  const thirtyDaysAgo = addDays(referenceDate, -30);
  const sevenDaysFromNow = addDays(referenceDate, 7);

  const longOverdueCount = invoices.filter(
    (inv) => inv.status === "OVERDUE" && inv.dueDate < thirtyDaysAgo,
  ).length;

  const criticalUnassignedCount = tickets.filter(
    (t) =>
      t.priority === "CRITICAL" &&
      !t.assignedToId &&
      !["RESOLVED", "CLOSED"].includes(t.status),
  ).length;

  const expiringThisWeekCount = contracts.filter(
    (c) =>
      !["EXPIRED", "CANCELLED", "RENEWED"].includes(c.status) &&
      c.endDate >= referenceDate &&
      c.endDate <= sevenDaysFromNow,
  ).length;

  const pendingJobsCount = jobs.filter((j) => j.status === "PENDING").length;

  const draftInvoicesCount = invoices.filter((inv) => inv.status === "DRAFT").length;

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

  const periodMonths = getPeriodMonths(period, referenceDate);
  const revenueChartData = buildLastMonths(referenceDate, periodMonths).map((bucket) => {
    invoices.forEach((invoice) => {
      const key = `${invoice.issuedDate.getFullYear()}-${invoice.issuedDate.getMonth()}`;
      if (key === bucket.key) {
        bucket.billed += invoice.amount;
        bucket.collected += invoice.paidAmount;
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
    overdueInvoices: overdueInvoices.slice(0, 5).map(mapInvoice),
    recentTickets: recentTickets.map(mapTicket),
    expiringContracts: expiringContracts.map(mapContract),
    todayJobs: todayJobs.slice(0, 4).map(mapJob),
    activeTechniciansCount: techniciansActive,
    revenueChartData,
  };
}

export async function getDashboardData(period: RevenuePeriod = "6m") {
  const user = await getOrganizationContext();
  return getDashboardDataForOrganization(user.organizationId, period);
}
