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
import type { ReportsOverview } from "@/lib/types";

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
}: {
  value: number;
  max: number;
  color?: string;
}) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
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

function OverviewTab({ data }: { data: ReportsOverview }) {
  const [hoveredBar, setHoveredBar] = useState<number | null>(null);
  const maxRevenueValue = Math.max(
    ...data.revenueChartData.map((item) => Math.max(item.billed, item.collected)),
    1,
  );
  const maxContractStatus = Math.max(...Object.values(data.contractStatusCounts), 1);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Revenue"
          value={formatCurrency(data.totalRevenue)}
          subtitle="All invoices"
          icon={IndianRupee}
        />
        <MetricCard
          title="Collection Rate"
          value={`${data.collectionRate}%`}
          subtitle={`${formatCurrency(data.totalCollected)} collected`}
          icon={TrendingUp}
          iconColor="text-emerald-600"
          iconBg="bg-emerald-50"
        />
        <MetricCard
          title="Active Contracts"
          value={data.activeContractsCount}
          subtitle="Current contract base"
          icon={Shield}
          iconColor="text-purple-600"
          iconBg="bg-purple-50"
        />
        <MetricCard
          title="Avg Resolution Time"
          value={`${data.avgResolutionHours}h`}
          subtitle="Resolved complaints"
          icon={Clock}
          iconColor="text-blue-600"
          iconBg="bg-blue-50"
        />
      </div>

      <SectionCard
        title="Revenue Trend"
        subtitle="Monthly billed vs collected"
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
          <div className="flex flex-col justify-between pr-3 text-right h-52">
            {[5, 4, 3, 2, 1, 0].map((v) => (
              <span key={v} className="text-[10px] text-slate-400 leading-none">
                {v}L
              </span>
            ))}
          </div>

          <div className="flex-1 relative">
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="border-b border-slate-100" />
              ))}
            </div>

            <div className="flex items-end gap-1.5 sm:gap-2 h-52 relative z-10">
              {data.revenueChartData.map((d, i) => (
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
                  <span className="text-[10px] sm:text-xs text-slate-500">
                    {d.month.split(" ")[0]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </SectionCard>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SectionCard title="Top Customers by Revenue" subtitle="Based on invoice payments">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="pb-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Customer</th>
                  <th className="pb-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Paid</th>
                  <th className="pb-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Outstanding</th>
                  <th className="pb-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Assets</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {data.topCustomers.map((cust) => (
                  <tr key={cust.name} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 font-medium text-slate-900">{cust.name}</td>
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

        <SectionCard title="Contract Status Distribution" subtitle="Current contract mix">
          <div className="space-y-4">
            {[
              { key: "active", label: "Active", color: "bg-emerald-500", textColor: "text-emerald-700", bgColor: "bg-emerald-50" },
              { key: "expiring_soon", label: "Expiring Soon", color: "bg-amber-500", textColor: "text-amber-700", bgColor: "bg-amber-50" },
              { key: "expired", label: "Expired", color: "bg-red-500", textColor: "text-red-700", bgColor: "bg-red-50" },
              { key: "renewed", label: "Renewed", color: "bg-blue-500", textColor: "text-blue-700", bgColor: "bg-blue-50" },
            ].map((item) => (
              <div key={item.key}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${item.bgColor} ${item.textColor}`}>
                    {item.label}
                  </span>
                  <span className="text-sm font-semibold text-slate-900 tabular-nums">
                    {data.contractStatusCounts[item.key] ?? 0}
                  </span>
                </div>
                <ProgressBar
                  value={data.contractStatusCounts[item.key] ?? 0}
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

function CollectionsTab({ data }: { data: ReportsOverview }) {
  const [hoveredBar, setHoveredBar] = useState<number | null>(null);
  const maxAgingAmount = Math.max(...Object.values(data.agingBuckets).map((b) => b.amount), 1);
  const maxCollectionValue = Math.max(...data.collectionChartData.map((item) => item.collected), 1);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <MetricCard title="Total Outstanding" value={formatCurrency(data.totalOutstanding)} subtitle="Current open balance" icon={IndianRupee} iconColor="text-amber-600" iconBg="bg-amber-50" />
        <MetricCard title="Overdue Amount" value={formatCurrency(data.overdueAmount)} subtitle="Past due invoices" icon={AlertCircle} iconColor="text-red-600" iconBg="bg-red-50" />
        <MetricCard title="Avg Days Overdue" value={`${data.avgDaysOverdue} days`} subtitle="For overdue invoices" icon={Timer} iconColor="text-orange-600" iconBg="bg-orange-50" />
      </div>

      <SectionCard title="Aging Breakdown" subtitle="Outstanding amounts by overdue period">
        <div className="space-y-5">
          {[
            { key: "not_due", label: "Not Due", color: "bg-emerald-500", textColor: "text-emerald-700" },
            { key: "0_30", label: "0-30 Days", color: "bg-amber-400", textColor: "text-amber-700" },
            { key: "30_60", label: "30-60 Days", color: "bg-orange-500", textColor: "text-orange-700" },
            { key: "60_90", label: "60-90 Days", color: "bg-red-400", textColor: "text-red-700" },
            { key: "90_plus", label: "90+ Days", color: "bg-red-600", textColor: "text-red-800" },
          ].map((bucket) => {
            const item = data.agingBuckets[bucket.key];
            return (
              <div key={bucket.key}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className={`text-sm font-medium ${bucket.textColor}`}>{bucket.label}</span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 tabular-nums">
                      {item.count} invoice{item.count !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <span className="text-sm font-semibold text-slate-900 tabular-nums">
                    {formatCurrency(item.amount)}
                  </span>
                </div>
                <ProgressBar value={item.amount} max={maxAgingAmount} color={bucket.color} />
              </div>
            );
          })}
        </div>
      </SectionCard>

      <SectionCard title="Monthly Collection Trend" subtitle="Recent collections">
        <div className="flex">
          <div className="flex flex-col justify-between pr-3 text-right h-44">
            {[4, 3, 2, 1, 0].map((v) => (
              <span key={v} className="text-[10px] text-slate-400 leading-none">
                {v}L
              </span>
            ))}
          </div>
          <div className="flex-1 relative">
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="border-b border-slate-100" />
              ))}
            </div>
            <div className="flex items-end gap-3 h-44 relative z-10">
              {data.collectionChartData.map((d, i) => (
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
                  <span className="text-xs text-slate-500">{d.month}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}

function ServiceTab({ data }: { data: ReportsOverview }) {
  const maxJobType = Math.max(...Object.values(data.jobsByType), 1);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <MetricCard title="Total Jobs" value={data.totalJobs} subtitle={`${data.completedJobs} completed`} icon={Wrench} />
        <MetricCard title="Completed Rate" value={`${data.completedRate}%`} subtitle="Jobs closed successfully" icon={CheckCircle2} iconColor="text-emerald-600" iconBg="bg-emerald-50" />
        <MetricCard title="Avg Jobs per Day" value={(data.totalJobs / 7).toFixed(1)} subtitle="Based on current dataset" icon={BarChart3} iconColor="text-blue-600" iconBg="bg-blue-50" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SectionCard title="Jobs by Type" subtitle="Distribution across service types">
          <div className="space-y-4">
            {[
              { key: "complaint", label: "Complaint", color: "bg-red-500", icon: AlertCircle },
              { key: "scheduled", label: "Scheduled", color: "bg-brand-500", icon: CalendarClock },
              { key: "installation", label: "Installation", color: "bg-emerald-500", icon: ArrowUpRight },
              { key: "inspection", label: "Inspection", color: "bg-amber-500", icon: FileText },
            ].map((item) => (
              <div key={item.key}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <item.icon className="h-4 w-4 text-slate-400" />
                    <span className="text-sm font-medium text-slate-700">{item.label}</span>
                  </div>
                  <span className="text-sm font-semibold text-slate-900 tabular-nums">
                    {data.jobsByType[item.key] ?? 0}
                  </span>
                </div>
                <ProgressBar value={data.jobsByType[item.key] ?? 0} max={maxJobType} color={item.color} />
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Complaint Resolution" subtitle="Current ticket status breakdown">
          <div className="grid grid-cols-3 gap-4 mb-6">
            <MiniStat label="Open" value={data.openComplaints} icon={CircleDot} color="bg-blue-100 text-blue-600" />
            <MiniStat label="In Progress" value={data.inProgressComplaints} icon={RefreshCw} color="bg-amber-100 text-amber-600" />
            <MiniStat label="Resolved" value={data.resolvedComplaints} icon={CheckCircle2} color="bg-emerald-100 text-emerald-600" />
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Technician Performance" subtitle="Ranked by rating">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="pb-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Technician</th>
                <th className="pb-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider hidden sm:table-cell">Specialization</th>
                <th className="pb-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">Completed</th>
                <th className="pb-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">Active</th>
                <th className="pb-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Rating</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {data.techPerformance.map((tech) => (
                <tr key={tech.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-brand-100 flex items-center justify-center text-xs font-semibold text-brand-700">
                        {tech.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </div>
                      <span className="font-medium text-slate-900">{tech.name}</span>
                    </div>
                  </td>
                  <td className="py-3 text-slate-500 hidden sm:table-cell">{tech.specialization}</td>
                  <td className="py-3 text-center tabular-nums">
                    <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">{tech.completedJobs}</span>
                  </td>
                  <td className="py-3 text-center tabular-nums">
                    <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">{tech.activeJobs}</span>
                  </td>
                  <td className="py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
                      <span className="font-semibold text-slate-900 tabular-nums">{tech.rating}</span>
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

function ContractsTab({ data }: { data: ReportsOverview }) {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard title="Total Active" value={data.activeContractsCount} subtitle="Current contracts" icon={Shield} iconColor="text-emerald-600" iconBg="bg-emerald-50" />
        <MetricCard title="Expiring in 30 Days" value={data.expiringIn30} subtitle="Need renewal attention" icon={CalendarClock} iconColor="text-amber-600" iconBg="bg-amber-50" />
        <MetricCard title="Expired" value={data.expiredContracts} subtitle="Awaiting renewal" icon={AlertCircle} iconColor="text-red-600" iconBg="bg-red-50" />
        <MetricCard title="Renewal Rate" value={`${data.renewalRate}%`} subtitle="Renewed contracts" icon={RefreshCw} />
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <SectionCard title="Total AMC Value">
          <p className="text-2xl font-bold text-slate-900 tabular-nums">
            {formatCurrency(data.totalAmcValue)}
          </p>
        </SectionCard>
        <SectionCard title="Total Warranty Value">
          <p className="text-2xl font-bold text-slate-900 tabular-nums">
            {formatCurrency(data.totalWarrantyValue)}
          </p>
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SectionCard title="Renewal Pipeline" subtitle="Contracts expiring or expired">
          {data.renewalPipeline.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-sm text-slate-400">
              No contracts pending renewal
            </div>
          ) : (
            <div className="divide-y divide-slate-100 -mx-6">
              {data.renewalPipeline.map((contract) => (
                <div
                  key={contract.id}
                  className="flex items-center justify-between px-6 py-3.5 hover:bg-slate-50 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-900 truncate">{contract.customerName}</p>
                    <p className="text-xs text-slate-500">
                      {contract.assetName} · Expires {formatDate(contract.endDate)}
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

        <SectionCard title="Visit Utilization" subtitle="Contracts with >80% visits used">
          {data.highUtilizationContracts.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-sm text-slate-400">
              No contracts at high utilization
            </div>
          ) : (
            <div className="space-y-4">
              {data.highUtilizationContracts.map((contract) => {
                const pct = Math.round((contract.visitsUsed / contract.visitsCovered) * 100);
                return (
                  <div key={contract.id}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-slate-900 truncate">{contract.customerName}</p>
                        <p className="text-xs text-slate-500">{contract.assetName}</p>
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

export default function ReportsPageClient({ data }: { data: ReportsOverview }) {
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
            content: <OverviewTab data={data} />,
          },
          {
            id: "collections",
            label: "Collections",
            content: <CollectionsTab data={data} />,
          },
          {
            id: "service",
            label: "Service",
            content: <ServiceTab data={data} />,
          },
          {
            id: "contracts",
            label: "Contracts",
            content: <ContractsTab data={data} />,
          },
        ]}
        defaultTab="overview"
      />
    </div>
  );
}
