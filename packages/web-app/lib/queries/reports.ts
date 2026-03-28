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
  getMonthLabel,
  getMonthLabelWithYear,
  getOrganizationContext,
  toDateString,
} from "@/lib/query-utils";
import type { ReportsOverview } from "@/lib/types";

function getReferenceDate(dates: Date[]) {
  return dates.reduce<Date | null>((latest, current) => {
    if (!latest || current > latest) {
      return current;
    }

    return latest;
  }, null) ?? new Date();
}

export async function getReportsDataForOrganization(organizationId: string): Promise<ReportsOverview> {
  const [invoices, tickets, contracts, jobs, technicians, customers] = await Promise.all([
    db.invoice.findMany({
      where: { organizationId },
      include: invoiceDetailsInclude,
      orderBy: { issuedDate: "asc" },
    }),
    db.ticket.findMany({
      where: { organizationId },
      include: ticketDetailsInclude,
      orderBy: { createdAt: "asc" },
    }),
    db.contract.findMany({
      where: { organizationId },
      include: contractDetailsInclude,
      orderBy: { endDate: "asc" },
    }),
    db.job.findMany({
      where: { organizationId },
      include: jobDetailsInclude,
      orderBy: { scheduledDate: "asc" },
    }),
    db.user.findMany({
      where: {
        organizationId,
        role: "TECHNICIAN",
      },
      select: technicianSelect,
      orderBy: {
        name: "asc",
      },
    }),
    db.customer.findMany({
      where: { organizationId },
      include: {
        assets: {
          select: { id: true },
        },
      },
    }),
  ]);

  const referenceDate = getReferenceDate([
    ...invoices.map((invoice) => invoice.issuedDate),
    ...invoices.map((invoice) => invoice.dueDate),
    ...tickets.map((ticket) => ticket.createdAt),
    ...contracts.map((contract) => contract.endDate),
    ...jobs.map((job) => job.scheduledDate),
  ]);

  const totalRevenue = invoices.reduce((sum, invoice) => sum + invoice.amount, 0);
  const totalCollected = invoices.reduce((sum, invoice) => sum + invoice.paidAmount, 0);
  const collectionRate = totalRevenue > 0 ? Math.round((totalCollected / totalRevenue) * 100) : 0;
  const activeContractsCount = contracts.filter((contract) => contract.status === "ACTIVE").length;

  const resolvedTickets = tickets.filter((ticket) => ticket.resolvedAt);
  const avgResolutionHours = resolvedTickets.length
    ? Math.round(
        resolvedTickets.reduce((sum, ticket) => {
          return sum + (ticket.resolvedAt!.getTime() - ticket.createdAt.getTime()) / (1000 * 60 * 60);
        }, 0) / resolvedTickets.length,
      )
    : 0;

  const customerRevenueMap = new Map<string, { name: string; totalPaid: number; outstanding: number; assetsCount: number }>();
  invoices.forEach((invoice) => {
    const customer = customers.find((item) => item.id === invoice.customerId);
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

  const contractStatusCounts = {
    active: contracts.filter((contract) => contract.status === "ACTIVE").length,
    expiring_soon: contracts.filter((contract) => contract.status === "EXPIRING_SOON").length,
    expired: contracts.filter((contract) => contract.status === "EXPIRED").length,
    renewed: contracts.filter((contract) => contract.status === "RENEWED").length,
  };

  const totalOutstanding = invoices.reduce((sum, invoice) => sum + Math.max(0, invoice.amount - invoice.paidAmount), 0);
  const overdueInvoices = invoices.filter((invoice) => invoice.status === "OVERDUE");
  const overdueAmount = overdueInvoices.reduce((sum, invoice) => sum + Math.max(0, invoice.amount - invoice.paidAmount), 0);
  const avgDaysOverdue = overdueInvoices.length
    ? Math.round(
        overdueInvoices.reduce((sum, invoice) => sum + Math.max(0, getDaysDifference(invoice.dueDate, referenceDate)), 0) /
          overdueInvoices.length,
      )
    : 0;

  const agingBuckets = invoices
    .filter((invoice) => !["PAID", "CANCELLED", "DRAFT"].includes(invoice.status))
    .reduce<Record<string, { count: number; amount: number }>>(
      (acc, invoice) => {
        const daysOver = getDaysDifference(invoice.dueDate, referenceDate);
        const amount = Math.max(0, invoice.amount - invoice.paidAmount);
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

  const totalJobs = jobs.length;
  const completedJobs = jobs.filter((job) => job.status === "COMPLETED").length;
  const completedRate = totalJobs > 0 ? Math.round((completedJobs / totalJobs) * 100) : 0;
  const jobsByType = {
    complaint: jobs.filter((job) => job.type === "COMPLAINT").length,
    scheduled: jobs.filter((job) => job.type === "SCHEDULED").length,
    installation: jobs.filter((job) => job.type === "INSTALLATION").length,
    inspection: jobs.filter((job) => job.type === "INSPECTION").length,
  };

  const openComplaints = tickets.filter((ticket) => ["OPEN", "REOPENED"].includes(ticket.status)).length;
  const inProgressComplaints = tickets.filter((ticket) =>
    ["ASSIGNED", "IN_PROGRESS", "ON_HOLD"].includes(ticket.status),
  ).length;
  const resolvedComplaints = tickets.filter((ticket) => ["RESOLVED", "CLOSED"].includes(ticket.status)).length;

  const techPerformance = technicians
    .map((technician) => ({
      id: technician.id,
      name: technician.name,
      completedJobs: jobs.filter((job) => job.technicianId === technician.id && job.status === "COMPLETED").length,
      activeJobs: jobs.filter(
        (job) =>
          job.technicianId === technician.id &&
          !["COMPLETED", "CANCELLED"].includes(job.status),
      ).length,
      rating: technician.rating,
      specialization: technician.specialization ?? "",
    }))
    .sort((a, b) => b.rating - a.rating);

  const expiringIn30 = contracts.filter((contract) => contract.status === "EXPIRING_SOON").length;
  const expiredContracts = contracts.filter((contract) => contract.status === "EXPIRED").length;
  const renewedContracts = contracts.filter((contract) => contract.status === "RENEWED").length;
  const renewalPool = expiredContracts + renewedContracts + expiringIn30;
  const renewalRate = renewalPool > 0 ? Math.round((renewedContracts / renewalPool) * 100) : 0;

  const totalAmcValue = contracts
    .filter((contract) => contract.type === "AMC")
    .reduce((sum, contract) => sum + contract.value, 0);
  const totalWarrantyValue = contracts
    .filter((contract) => contract.type === "WARRANTY")
    .reduce((sum, contract) => sum + contract.value, 0);

  const renewalPipeline = contracts
    .filter((contract) => ["EXPIRING_SOON", "EXPIRED"].includes(contract.status))
    .map(mapContract);

  const highUtilizationContracts = contracts
    .filter(
      (contract) =>
        contract.status === "ACTIVE" &&
        contract.visitsCovered > 0 &&
        contract.visitsUsed / contract.visitsCovered > 0.8,
    )
    .map(mapContract);

  const revenueMonths = Array.from({ length: 12 }).map((_, index) => {
    const date = new Date(referenceDate.getFullYear(), referenceDate.getMonth() - (11 - index), 1);
    return {
      key: `${date.getFullYear()}-${date.getMonth()}`,
      month: getMonthLabelWithYear(date),
      billed: 0,
      collected: 0,
    };
  });

  invoices.forEach((invoice) => {
    const key = `${invoice.issuedDate.getFullYear()}-${invoice.issuedDate.getMonth()}`;
    const bucket = revenueMonths.find((month) => month.key === key);
    if (bucket) {
      bucket.billed += invoice.amount;
      bucket.collected += invoice.paidAmount;
    }
  });

  const collectionMonths = revenueMonths.slice(-6).map((month) => ({
    month: month.month.split(" ")[0],
    collected: month.collected,
  }));

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
    collectionChartData: collectionMonths,
  };
}

export async function getReportsData() {
  const user = await getOrganizationContext();
  return getReportsDataForOrganization(user.organizationId);
}
