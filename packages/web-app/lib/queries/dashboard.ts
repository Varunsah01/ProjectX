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
  getOrganizationContext,
  toDateString,
} from "@/lib/query-utils";
import type { DashboardData, DashboardMetrics } from "@/lib/types";

function getReferenceDate(dates: Date[]) {
  return dates.reduce<Date | null>((latest, current) => {
    if (!latest || current > latest) {
      return current;
    }

    return latest;
  }, null) ?? new Date();
}

function buildLastMonths(referenceDate: Date, count: number) {
  return Array.from({ length: count }).map((_, index) => {
    const date = new Date(referenceDate.getFullYear(), referenceDate.getMonth() - (count - 1 - index), 1);
    return {
      key: `${date.getFullYear()}-${date.getMonth()}`,
      label: getMonthLabel(date),
      billed: 0,
      collected: 0,
    };
  });
}

export async function getDashboardDataForOrganization(organizationId: string): Promise<DashboardData> {
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

  const revenueChartData = buildLastMonths(referenceDate, 6).map((bucket) => {
    invoices.forEach((invoice) => {
      const key = `${invoice.issuedDate.getFullYear()}-${invoice.issuedDate.getMonth()}`;
      if (key === bucket.key) {
        bucket.billed += invoice.amount;
        bucket.collected += invoice.paidAmount;
      }
    });

    return {
      month: bucket.label,
      billed: bucket.billed,
      collected: bucket.collected,
    };
  });

  return {
    metrics,
    overdueInvoices: overdueInvoices.slice(0, 5).map(mapInvoice),
    recentTickets: recentTickets.map(mapTicket),
    expiringContracts: expiringContracts.map(mapContract),
    todayJobs: todayJobs.slice(0, 4).map(mapJob),
    activeTechniciansCount: techniciansActive,
    revenueChartData,
  };
}

export async function getDashboardData() {
  const user = await getOrganizationContext();
  return getDashboardDataForOrganization(user.organizationId);
}
