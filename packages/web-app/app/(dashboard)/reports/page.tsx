"use client";

import { useState } from "react";
import {
  IndianRupee,
  TrendingUp,
  Shield,
  Clock,
  AlertCircle,
  CheckCircle2,
  Timer,
  Wrench,
  Users,
  BarChart3,
  CalendarClock,
  Star,
  FileText,
  RefreshCw,
  ArrowUpRight,
  CircleDot,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { MetricCard } from "@/components/ui/MetricCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Tabs } from "@/components/ui/Tabs";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  invoices,
  tickets,
  contracts,
  jobs,
  technicians,
  customers,
  getDashboardMetrics,
} from "@/lib/mock-data";

// ── Computed Data ──────────────────────────────────────

const metrics = getDashboardMetrics();

// Revenue
const totalRevenue = invoices.reduce((sum, inv) => sum + inv.amount, 0);
const totalCollected = invoices.reduce((sum, inv) => sum + inv.paidAmount, 0);
const collectionRate = totalRevenue > 0 ? Math.round((totalCollected / totalRevenue) * 100) : 0;
const activeContracts = contracts.filter((c) => c.status === "active");

// Average resolution time (hours) from resolved tickets
const resolvedTickets = tickets.filter((t) => t.resolvedAt);
const avgResolutionHours =
  resolvedTickets.length > 0
    ? Math.round(
        resolvedTickets.reduce((sum, t) => {
          const created = new Date(t.createdAt).getTime();
          const resolved = new Date(t.resolvedAt!).getTime();
          return sum + (resolved - created) / (1000 * 60 * 60);
        }, 0) / resolvedTickets.length
      )
    : 0;

// Top customers by revenue
const customerRevenueMap = new Map<
  string,
  { name: string; totalPaid: number; outstanding: number; assetsCount: number }
>();
invoices.forEach((inv) => {
  const existing = customerRevenueMap.get(inv.customerId);
  if (existing) {
    existing.totalPaid += inv.paidAmount;
    existing.outstanding += inv.amount - inv.paidAmount;
  } else {
    const cust = customers.find((c) => c.id === inv.customerId);
    customerRevenueMap.set(inv.customerId, {
      name: inv.customerName,
      totalPaid: inv.paidAmount,
      outstanding: inv.amount - inv.paidAmount,
      assetsCount: cust?.assetsCount ?? 0,
    });
  }
});
const topCustomers = Array.from(customerRevenueMap.values())
  .sort((a, b) => b.totalPaid - a.totalPaid)
  .slice(0, 5);

// Contract status distribution
const contractStatusCounts = {
  active: contracts.filter((c) => c.status === "active").length,
  expiring_soon: contracts.filter((c) => c.status === "expiring_soon").length,
  expired: contracts.filter((c) => c.status === "expired").length,
  renewed: contracts.filter((c) => c.status === "renewed").length,
};
const maxContractStatus = Math.max(...Object.values(contractStatusCounts));

// Collections
const totalOutstanding = invoices.reduce(
  (sum, inv) => sum + (inv.amount - inv.paidAmount),
  0
);
const overdueInvoices = invoices.filter((i) => i.status === "overdue");
const overdueAmount = overdueInvoices.reduce(
  (sum, i) => sum + (i.amount - i.paidAmount),
  0
);
const avgDaysOverdue =
  overdueInvoices.length > 0
    ? Math.round(
        overdueInvoices.reduce((sum, inv) => {
          const due = new Date(inv.dueDate).getTime();
          const now = new Date("2025-03-26").getTime();
          return sum + Math.max(0, (now - due) / (1000 * 60 * 60 * 24));
        }, 0) / overdueInvoices.length
      )
    : 0;

// Aging buckets
const now = new Date("2025-03-26").getTime();
const agingBuckets = invoices
  .filter((inv) => inv.status !== "paid" && inv.status !== "cancelled" && inv.status !== "draft")
  .reduce(
    (acc, inv) => {
      const due = new Date(inv.dueDate).getTime();
      const daysOver = Math.floor((now - due) / (1000 * 60 * 60 * 24));
      const outstanding = inv.amount - inv.paidAmount;
      if (daysOver <= 0) {
        acc.not_due.count++;
        acc.not_due.amount += outstanding;
      } else if (daysOver <= 30) {
        acc["0_30"].count++;
        acc["0_30"].amount += outstanding;
      } else if (daysOver <= 60) {
        acc["30_60"].count++;
        acc["30_60"].amount += outstanding;
      } else if (daysOver <= 90) {
        acc["60_90"].count++;
        acc["60_90"].amount += outstanding;
      } else {
        acc["90_plus"].count++;
        acc["90_plus"].amount += outstanding;
      }
      return acc;
    },
    {
      not_due: { count: 0, amount: 0 },
      "0_30": { count: 0, amount: 0 },
      "30_60": { count: 0, amount: 0 },
      "60_90": { count: 0, amount: 0 },
      "90_plus": { count: 0, amount: 0 },
    } as Record<string, { count: number; amount: number }>
  );
const maxAgingAmount = Math.max(
  ...Object.values(agingBuckets).map((b) => b.amount)
);

// Jobs metrics
const totalJobs = jobs.length;
const completedJobs = jobs.filter((j) => j.status === "completed").length;
const completedRate = totalJobs > 0 ? Math.round((completedJobs / totalJobs) * 100) : 0;

// Jobs by type
const jobsByType = {
  complaint: jobs.filter((j) => j.type === "complaint").length,
  scheduled: jobs.filter((j) => j.type === "scheduled").length,
  installation: jobs.filter((j) => j.type === "installation").length,
  inspection: jobs.filter((j) => j.type === "inspection").length,
};
const maxJobType = Math.max(...Object.values(jobsByType));

// Complaint resolution metrics
const openComplaints = tickets.filter(
  (t) => t.status === "open" || t.status === "reopened"
).length;
const inProgressComplaints = tickets.filter(
  (t) =>
    t.status === "in_progress" ||
    t.status === "assigned" ||
    t.status === "on_hold"
).length;
const resolvedComplaints = tickets.filter(
  (t) => t.status === "resolved" || t.status === "closed"
).length;

// Technician performance
const techPerformance = technicians
  .map((tech) => {
    const techJobs = jobs.filter((j) => j.technicianId === tech.id);
    const techCompleted = techJobs.filter((j) => j.status === "completed").length;
    const techActive = techJobs.filter(
      (j) => j.status !== "completed" && j.status !== "cancelled"
    ).length;
    return {
      id: tech.id,
      name: tech.name,
      completedJobs: techCompleted,
      activeJobs: techActive,
      rating: tech.rating,
      specialization: tech.specialization,
    };
  })
  .sort((a, b) => b.rating - a.rating);

// Contract metrics
const expiringIn30 = contracts.filter((c) => c.status === "expiring_soon").length;
const expiredContracts = contracts.filter((c) => c.status === "expired").length;
const renewedContracts = contracts.filter((c) => c.status === "renewed").length;
const totalForRenewal = expiredContracts + renewedContracts + expiringIn30;
const renewalRate =
  totalForRenewal > 0
    ? Math.round((renewedContracts / Math.max(totalForRenewal, 1)) * 100)
    : metrics.renewalRate;

// Contract value summary
const amcContracts = contracts.filter((c) => c.type === "amc");
const warrantyContracts = contracts.filter((c) => c.type === "warranty");
const totalAmcValue = amcContracts.reduce((sum, c) => sum + c.value, 0);
const totalWarrantyValue = warrantyContracts.reduce((sum, c) => sum + c.value, 0);

// Renewal pipeline - expiring contracts
const renewalPipeline = contracts
  .filter((c) => c.status === "expiring_soon" || c.status === "expired")
  .sort(
    (a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime()
  );

// Visit utilization - contracts where visitsUsed > 80% of visitsCovered
const highUtilizationContracts = contracts.filter(
  (c) =>
    c.visitsCovered > 0 &&
    c.visitsUsed / c.visitsCovered > 0.8 &&
    c.status === "active"
);

// ── Chart Data ──────────────────────────────────────

const revenueChartData = [
  { month: "Apr '24", billed: 320000, collected: 280000 },
  { month: "May '24", billed: 340000, collected: 300000 },
  { month: "Jun '24", billed: 360000, collected: 310000 },
  { month: "Jul '24", billed: 350000, collected: 320000 },
  { month: "Aug '24", billed: 380000, collected: 340000 },
  { month: "Sep '24", billed: 400000, collected: 350000 },
  { month: "Oct '24", billed: 380000, collected: 310000 },
  { month: "Nov '24", billed: 420000, collected: 350000 },
  { month: "Dec '24", billed: 390000, collected: 290000 },
  { month: "Jan '25", billed: 450000, collected: 380000 },
  { month: "Feb '25", billed: 440000, collected: 360000 },
  { month: "Mar '25", billed: 460000, collected: 160000 },
];
const maxRevenueValue = 500000;

const collectionChartData = [
  { month: "Oct", collected: 310000 },
  { month: "Nov", collected: 350000 },
  { month: "Dec", collected: 290000 },
  { month: "Jan", collected: 380000 },
  { month: "Feb", collected: 360000 },
  { month: "Mar", collected: 160000 },
];
const maxCollectionValue = 400000;

// ── Sub-components ──────────────────────────────────

function SectionCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 transition-all hover:shadow-md">
      <div className="mb-5">
        <h3 className="font-semibold text-slate-900">{title}</h3>
        {subtitle && (
          <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>
        )}
      </div>
      {children}
    </div>
  );
}

function ProgressBar({
  value,
  max,
  color = "bg-brand-500",
  className = "",
}: {
  value: number;
  max: number;
  color?: string;
  className?: string;
}) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className={`h-2.5 rounded-full bg-slate-100 overflow-hidden ${className}`}>
      <div
        className={`h-full rounded-full transition-all duration-500 ${color}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function MiniStat({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50/50 p-4">
      <div className={`rounded-lg p-2 ${color}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-xs font-medium text-slate-500">{label}</p>
        <p className="text-lg font-bold text-slate-900 tabular-nums">{value}</p>
      </div>
    </div>
  );
}

// ── Tab Contents ──────────────────────────────────────

function OverviewTab() {
  const [hoveredBar, setHoveredBar] = useState<number | null>(null);

  return (
    <div className="space-y-8">
      {/* Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Revenue"
          value={formatCurrency(totalRevenue)}
          subtitle={`${invoices.length} invoices total`}
          icon={IndianRupee}
          iconColor="text-brand-600"
          iconBg="bg-brand-50"
        />
        <MetricCard
          title="Collection Rate"
          value={`${collectionRate}%`}
          subtitle={`${formatCurrency(totalCollected)} collected`}
          icon={TrendingUp}
          iconColor="text-emerald-600"
          iconBg="bg-emerald-50"
        />
        <MetricCard
          title="Active Contracts"
          value={activeContracts.length}
          subtitle={`${contracts.length} total contracts`}
          icon={Shield}
          iconColor="text-purple-600"
          iconBg="bg-purple-50"
        />
        <MetricCard
          title="Avg Resolution Time"
          value={`${avgResolutionHours}h`}
          subtitle={`${resolvedTickets.length} tickets resolved`}
          icon={Clock}
          iconColor="text-blue-600"
          iconBg="bg-blue-50"
        />
      </div>

      {/* Revenue Trend Chart */}
      <SectionCard
        title="Revenue Trend"
        subtitle="Monthly billed vs collected (Apr 2024 - Mar 2025, in lakhs)"
      >
        <div className="flex items-center gap-5 text-sm mb-5">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-sm bg-brand-500" />
            <span className="text-slate-600">Billed</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-sm bg-emerald-500" />
            <span className="text-slate-600">Collected</span>
          </div>
        </div>

        <div className="flex">
          {/* Y-axis */}
          <div className="flex flex-col justify-between pr-3 text-right h-52">
            {[5, 4, 3, 2, 1, 0].map((v) => (
              <span key={v} className="text-[10px] text-slate-400 leading-none">
                {v}L
              </span>
            ))}
          </div>

          {/* Chart area */}
          <div className="flex-1 relative">
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="border-b border-slate-100" />
              ))}
            </div>

            <div className="flex items-end gap-1.5 sm:gap-2 h-52 relative z-10">
              {revenueChartData.map((d, i) => (
                <div
                  key={d.month}
                  className="flex-1 flex flex-col items-center gap-1.5"
                  onMouseEnter={() => setHoveredBar(i)}
                  onMouseLeave={() => setHoveredBar(null)}
                >
                  {hoveredBar === i && (
                    <div className="absolute -top-2 transform -translate-y-full bg-slate-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg z-20 whitespace-nowrap">
                      <p className="font-medium">{d.month}</p>
                      <p>Billed: {formatCurrency(d.billed)}</p>
                      <p>Collected: {formatCurrency(d.collected)}</p>
                      <div className="absolute left-1/2 -translate-x-1/2 top-full w-2 h-2 bg-slate-900 rotate-45 -mt-1" />
                    </div>
                  )}
                  <div className="flex items-end gap-0.5 w-full h-44">
                    <div
                      className={`flex-1 rounded-t-md transition-all duration-200 ${
                        hoveredBar === i ? "bg-brand-400" : "bg-brand-200"
                      }`}
                      style={{
                        height: `${(d.billed / maxRevenueValue) * 100}%`,
                      }}
                    />
                    <div
                      className={`flex-1 rounded-t-md transition-all duration-200 ${
                        hoveredBar === i ? "bg-emerald-400" : "bg-emerald-300"
                      }`}
                      style={{
                        height: `${(d.collected / maxRevenueValue) * 100}%`,
                      }}
                    />
                  </div>
                  <span
                    className={`text-[10px] sm:text-xs transition-colors ${
                      hoveredBar === i
                        ? "text-slate-900 font-medium"
                        : "text-slate-500"
                    }`}
                  >
                    {d.month.split(" ")[0]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </SectionCard>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Top Customers by Revenue */}
        <SectionCard
          title="Top Customers by Revenue"
          subtitle="Based on invoice payments"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="pb-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="pb-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Paid
                  </th>
                  <th className="pb-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Outstanding
                  </th>
                  <th className="pb-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Assets
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {topCustomers.map((cust, i) => (
                  <tr key={i} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 font-medium text-slate-900">
                      {cust.name}
                    </td>
                    <td className="py-3 text-right tabular-nums text-emerald-600 font-medium">
                      {formatCurrency(cust.totalPaid)}
                    </td>
                    <td className="py-3 text-right tabular-nums text-red-600">
                      {formatCurrency(cust.outstanding)}
                    </td>
                    <td className="py-3 text-right tabular-nums text-slate-600">
                      {cust.assetsCount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>

        {/* Contract Status Distribution */}
        <SectionCard
          title="Contract Status Distribution"
          subtitle={`${contracts.length} total contracts`}
        >
          <div className="space-y-4">
            {(
              [
                {
                  key: "active",
                  label: "Active",
                  color: "bg-emerald-500",
                  textColor: "text-emerald-700",
                  bgColor: "bg-emerald-50",
                },
                {
                  key: "expiring_soon",
                  label: "Expiring Soon",
                  color: "bg-amber-500",
                  textColor: "text-amber-700",
                  bgColor: "bg-amber-50",
                },
                {
                  key: "expired",
                  label: "Expired",
                  color: "bg-red-500",
                  textColor: "text-red-700",
                  bgColor: "bg-red-50",
                },
                {
                  key: "renewed",
                  label: "Renewed",
                  color: "bg-blue-500",
                  textColor: "text-blue-700",
                  bgColor: "bg-blue-50",
                },
              ] as const
            ).map((item) => (
              <div key={item.key}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${item.bgColor} ${item.textColor}`}
                    >
                      {item.label}
                    </span>
                  </div>
                  <span className="text-sm font-semibold text-slate-900 tabular-nums">
                    {contractStatusCounts[item.key]}
                  </span>
                </div>
                <ProgressBar
                  value={contractStatusCounts[item.key]}
                  max={maxContractStatus}
                  color={item.color}
                />
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

function CollectionsTab() {
  const [hoveredBar, setHoveredBar] = useState<number | null>(null);

  const agingLabels: {
    key: string;
    label: string;
    color: string;
    textColor: string;
  }[] = [
    { key: "not_due", label: "Not Due", color: "bg-emerald-500", textColor: "text-emerald-700" },
    { key: "0_30", label: "0-30 Days", color: "bg-amber-400", textColor: "text-amber-700" },
    { key: "30_60", label: "30-60 Days", color: "bg-orange-500", textColor: "text-orange-700" },
    { key: "60_90", label: "60-90 Days", color: "bg-red-400", textColor: "text-red-700" },
    { key: "90_plus", label: "90+ Days", color: "bg-red-600", textColor: "text-red-800" },
  ];

  return (
    <div className="space-y-8">
      {/* Collection Metrics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <MetricCard
          title="Total Outstanding"
          value={formatCurrency(totalOutstanding)}
          subtitle={`${invoices.filter((i) => i.status !== "paid" && i.status !== "cancelled" && i.status !== "draft").length} unpaid invoices`}
          icon={IndianRupee}
          iconColor="text-amber-600"
          iconBg="bg-amber-50"
        />
        <MetricCard
          title="Overdue Amount"
          value={formatCurrency(overdueAmount)}
          subtitle={`${overdueInvoices.length} overdue invoices`}
          icon={AlertCircle}
          iconColor="text-red-600"
          iconBg="bg-red-50"
        />
        <MetricCard
          title="Avg Days Overdue"
          value={`${avgDaysOverdue} days`}
          subtitle="For overdue invoices"
          icon={Timer}
          iconColor="text-orange-600"
          iconBg="bg-orange-50"
        />
      </div>

      {/* Aging Breakdown */}
      <SectionCard
        title="Aging Breakdown"
        subtitle="Outstanding amounts by overdue period"
      >
        <div className="space-y-5">
          {agingLabels.map((bucket) => {
            const data = agingBuckets[bucket.key];
            return (
              <div key={bucket.key}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className={`text-sm font-medium ${bucket.textColor}`}>
                      {bucket.label}
                    </span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 tabular-nums">
                      {data.count} invoice{data.count !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <span className="text-sm font-semibold text-slate-900 tabular-nums">
                    {formatCurrency(data.amount)}
                  </span>
                </div>
                <ProgressBar
                  value={data.amount}
                  max={maxAgingAmount}
                  color={bucket.color}
                />
              </div>
            );
          })}
        </div>

        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
          <span className="text-sm font-medium text-slate-500">
            Total Outstanding
          </span>
          <span className="text-base font-bold text-slate-900 tabular-nums">
            {formatCurrency(totalOutstanding)}
          </span>
        </div>
      </SectionCard>

      {/* Monthly Collection Trend */}
      <SectionCard
        title="Monthly Collection Trend"
        subtitle="Last 6 months (in lakhs)"
      >
        <div className="flex">
          {/* Y-axis */}
          <div className="flex flex-col justify-between pr-3 text-right h-44">
            {[4, 3, 2, 1, 0].map((v) => (
              <span key={v} className="text-[10px] text-slate-400 leading-none">
                {v}L
              </span>
            ))}
          </div>

          {/* Chart area */}
          <div className="flex-1 relative">
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="border-b border-slate-100" />
              ))}
            </div>

            <div className="flex items-end gap-3 h-44 relative z-10">
              {collectionChartData.map((d, i) => (
                <div
                  key={d.month}
                  className="flex-1 flex flex-col items-center gap-1.5"
                  onMouseEnter={() => setHoveredBar(i)}
                  onMouseLeave={() => setHoveredBar(null)}
                >
                  {hoveredBar === i && (
                    <div className="absolute -top-2 transform -translate-y-full bg-slate-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg z-20 whitespace-nowrap">
                      <p className="font-medium">{d.month}</p>
                      <p>Collected: {formatCurrency(d.collected)}</p>
                      <div className="absolute left-1/2 -translate-x-1/2 top-full w-2 h-2 bg-slate-900 rotate-45 -mt-1" />
                    </div>
                  )}
                  <div className="flex items-end w-full h-36">
                    <div
                      className={`w-full rounded-t-md transition-all duration-200 ${
                        hoveredBar === i ? "bg-brand-500" : "bg-brand-300"
                      }`}
                      style={{
                        height: `${(d.collected / maxCollectionValue) * 100}%`,
                      }}
                    />
                  </div>
                  <span
                    className={`text-xs transition-colors ${
                      hoveredBar === i
                        ? "text-slate-900 font-medium"
                        : "text-slate-500"
                    }`}
                  >
                    {d.month}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}

function ServiceTab() {
  return (
    <div className="space-y-8">
      {/* Job Metrics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <MetricCard
          title="Total Jobs"
          value={totalJobs}
          subtitle={`${completedJobs} completed`}
          icon={Wrench}
          iconColor="text-brand-600"
          iconBg="bg-brand-50"
        />
        <MetricCard
          title="Completed Rate"
          value={`${completedRate}%`}
          subtitle={`${jobs.filter((j) => j.status === "in_progress").length} in progress`}
          icon={CheckCircle2}
          iconColor="text-emerald-600"
          iconBg="bg-emerald-50"
        />
        <MetricCard
          title="Avg Jobs per Day"
          value={(totalJobs / 7).toFixed(1)}
          subtitle="Based on last 7 days"
          icon={BarChart3}
          iconColor="text-blue-600"
          iconBg="bg-blue-50"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Jobs by Type */}
        <SectionCard
          title="Jobs by Type"
          subtitle="Distribution across service types"
        >
          <div className="space-y-4">
            {(
              [
                {
                  key: "complaint" as const,
                  label: "Complaint",
                  color: "bg-red-500",
                  icon: AlertCircle,
                },
                {
                  key: "scheduled" as const,
                  label: "Scheduled",
                  color: "bg-brand-500",
                  icon: CalendarClock,
                },
                {
                  key: "installation" as const,
                  label: "Installation",
                  color: "bg-emerald-500",
                  icon: ArrowUpRight,
                },
                {
                  key: "inspection" as const,
                  label: "Inspection",
                  color: "bg-amber-500",
                  icon: FileText,
                },
              ] as const
            ).map((item) => (
              <div key={item.key}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <item.icon className="h-4 w-4 text-slate-400" />
                    <span className="text-sm font-medium text-slate-700">
                      {item.label}
                    </span>
                  </div>
                  <span className="text-sm font-semibold text-slate-900 tabular-nums">
                    {jobsByType[item.key]}
                  </span>
                </div>
                <ProgressBar
                  value={jobsByType[item.key]}
                  max={maxJobType}
                  color={item.color}
                />
              </div>
            ))}
          </div>
        </SectionCard>

        {/* Complaint Resolution Metrics */}
        <SectionCard
          title="Complaint Resolution"
          subtitle="Current ticket status breakdown"
        >
          <div className="grid grid-cols-3 gap-4 mb-6">
            <MiniStat
              label="Open"
              value={openComplaints}
              icon={CircleDot}
              color="bg-blue-100 text-blue-600"
            />
            <MiniStat
              label="In Progress"
              value={inProgressComplaints}
              icon={RefreshCw}
              color="bg-amber-100 text-amber-600"
            />
            <MiniStat
              label="Resolved"
              value={resolvedComplaints}
              icon={CheckCircle2}
              color="bg-emerald-100 text-emerald-600"
            />
          </div>

          <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-4">
            <p className="text-xs font-medium text-slate-500 mb-3">
              Resolution Pipeline
            </p>
            <div className="flex h-4 rounded-full overflow-hidden">
              {openComplaints > 0 && (
                <div
                  className="bg-blue-500 transition-all"
                  style={{
                    width: `${(openComplaints / tickets.length) * 100}%`,
                  }}
                />
              )}
              {inProgressComplaints > 0 && (
                <div
                  className="bg-amber-400 transition-all"
                  style={{
                    width: `${(inProgressComplaints / tickets.length) * 100}%`,
                  }}
                />
              )}
              {resolvedComplaints > 0 && (
                <div
                  className="bg-emerald-500 transition-all"
                  style={{
                    width: `${(resolvedComplaints / tickets.length) * 100}%`,
                  }}
                />
              )}
            </div>
            <div className="flex items-center justify-between mt-2 text-xs text-slate-500">
              <span>Open ({openComplaints})</span>
              <span>In Progress ({inProgressComplaints})</span>
              <span>Resolved ({resolvedComplaints})</span>
            </div>
          </div>
        </SectionCard>
      </div>

      {/* Technician Performance */}
      <SectionCard
        title="Technician Performance"
        subtitle="Ranked by rating"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="pb-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Technician
                </th>
                <th className="pb-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider hidden sm:table-cell">
                  Specialization
                </th>
                <th className="pb-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Completed
                </th>
                <th className="pb-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Active
                </th>
                <th className="pb-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Rating
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {techPerformance.map((tech) => (
                <tr
                  key={tech.id}
                  className="hover:bg-slate-50 transition-colors"
                >
                  <td className="py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-brand-100 flex items-center justify-center text-xs font-semibold text-brand-700">
                        {tech.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </div>
                      <span className="font-medium text-slate-900">
                        {tech.name}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 text-slate-500 hidden sm:table-cell">
                    {tech.specialization}
                  </td>
                  <td className="py-3 text-center tabular-nums">
                    <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                      {tech.completedJobs}
                    </span>
                  </td>
                  <td className="py-3 text-center tabular-nums">
                    <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                      {tech.activeJobs}
                    </span>
                  </td>
                  <td className="py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
                      <span className="font-semibold text-slate-900 tabular-nums">
                        {tech.rating}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}

function ContractsTab() {
  return (
    <div className="space-y-8">
      {/* Contract Metrics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Active"
          value={activeContracts.length}
          subtitle={`${contracts.length} total contracts`}
          icon={Shield}
          iconColor="text-emerald-600"
          iconBg="bg-emerald-50"
        />
        <MetricCard
          title="Expiring in 30 Days"
          value={expiringIn30}
          subtitle="Need renewal attention"
          icon={CalendarClock}
          iconColor="text-amber-600"
          iconBg="bg-amber-50"
        />
        <MetricCard
          title="Expired"
          value={expiredContracts}
          subtitle="Awaiting renewal"
          icon={AlertCircle}
          iconColor="text-red-600"
          iconBg="bg-red-50"
        />
        <MetricCard
          title="Renewal Rate"
          value={`${renewalRate}%`}
          subtitle="Historically"
          icon={RefreshCw}
          iconColor="text-brand-600"
          iconBg="bg-brand-50"
        />
      </div>

      {/* Contract Value Summary */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-6 transition-all hover:shadow-md">
          <div className="flex items-center gap-3 mb-4">
            <div className="rounded-xl bg-brand-50 p-2.5">
              <Shield className="h-5 w-5 text-brand-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">
                Total AMC Value
              </p>
              <p className="text-2xl font-bold text-slate-900 tabular-nums">
                {formatCurrency(totalAmcValue)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="tabular-nums">{amcContracts.length}</span>
            <span>AMC contracts</span>
            <span className="text-slate-300">|</span>
            <span className="tabular-nums">
              {amcContracts.filter((c) => c.status === "active").length}
            </span>
            <span>active</span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 transition-all hover:shadow-md">
          <div className="flex items-center gap-3 mb-4">
            <div className="rounded-xl bg-purple-50 p-2.5">
              <FileText className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">
                Total Warranty Value
              </p>
              <p className="text-2xl font-bold text-slate-900 tabular-nums">
                {formatCurrency(totalWarrantyValue)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="tabular-nums">{warrantyContracts.length}</span>
            <span>warranty contracts</span>
            <span className="text-slate-300">|</span>
            <span className="tabular-nums">
              {warrantyContracts.filter((c) => c.status === "active").length}
            </span>
            <span>active</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Renewal Pipeline */}
        <SectionCard
          title="Renewal Pipeline"
          subtitle="Contracts expiring or expired"
        >
          {renewalPipeline.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-sm text-slate-400">
              No contracts pending renewal
            </div>
          ) : (
            <div className="divide-y divide-slate-100 -mx-6">
              {renewalPipeline.map((contract) => (
                <div
                  key={contract.id}
                  className="flex items-center justify-between px-6 py-3.5 hover:bg-slate-50 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-900 truncate">
                      {contract.customerName}
                    </p>
                    <p className="text-xs text-slate-500">
                      {contract.assetName} &middot; Expires{" "}
                      {formatDate(contract.endDate)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 ml-3 shrink-0">
                    <StatusBadge status={contract.status} />
                    <span className="text-sm font-semibold text-slate-900 tabular-nums hidden sm:inline">
                      {formatCurrency(contract.value)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        {/* Visit Utilization */}
        <SectionCard
          title="Visit Utilization"
          subtitle="Contracts with >80% visits used"
        >
          {highUtilizationContracts.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-sm text-slate-400">
              No contracts at high utilization
            </div>
          ) : (
            <div className="space-y-4">
              {highUtilizationContracts.map((contract) => {
                const pct = Math.round(
                  (contract.visitsUsed / contract.visitsCovered) * 100
                );
                return (
                  <div key={contract.id}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-slate-900 truncate">
                          {contract.customerName}
                        </p>
                        <p className="text-xs text-slate-500">
                          {contract.assetName}
                        </p>
                      </div>
                      <div className="text-right ml-3 shrink-0">
                        <p className="text-sm font-semibold text-slate-900 tabular-nums">
                          {contract.visitsUsed}/{contract.visitsCovered}
                        </p>
                        <p className="text-xs text-slate-500 tabular-nums">
                          {pct}% used
                        </p>
                      </div>
                    </div>
                    <ProgressBar
                      value={contract.visitsUsed}
                      max={contract.visitsCovered}
                      color={
                        pct >= 100
                          ? "bg-red-500"
                          : pct >= 90
                          ? "bg-amber-500"
                          : "bg-brand-500"
                      }
                    />
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────

export default function ReportsPage() {
  return (
    <div>
      <PageHeader
        title="Reports & Analytics"
        subtitle="Track business performance and trends"
      />

      <Tabs
        tabs={[
          {
            id: "overview",
            label: "Overview",
            content: <OverviewTab />,
          },
          {
            id: "collections",
            label: "Collections",
            content: <CollectionsTab />,
          },
          {
            id: "service",
            label: "Service",
            content: <ServiceTab />,
          },
          {
            id: "contracts",
            label: "Contracts",
            content: <ContractsTab />,
          },
        ]}
        defaultTab="overview"
      />
    </div>
  );
}
