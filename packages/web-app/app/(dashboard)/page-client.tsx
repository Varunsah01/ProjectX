"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  IndianRupee,
  AlertCircle,
  CheckCircle2,
  Shield,
  Briefcase,
  Users,
  TrendingUp,
  Clock,
  ArrowRight,
  FilePlus,
  UserPlus,
  CalendarPlus,
  MessageSquarePlus,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { MetricCard } from "@/components/ui/MetricCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { DashboardData, RevenuePeriod } from "@/lib/types";

const PERIOD_OPTIONS: { value: RevenuePeriod; label: string }[] = [
  { value: "3m", label: "3M" },
  { value: "6m", label: "6M" },
  { value: "12m", label: "12M" },
  { value: "ytd", label: "YTD" },
];

function formatYAxisLabel(value: number): string {
  if (value === 0) return "0";
  if (value >= 100000) return `${(value / 100000).toFixed(value % 100000 === 0 ? 0 : 1)}L`;
  if (value >= 1000) return `${(value / 1000).toFixed(value % 1000 === 0 ? 0 : 1)}K`;
  return String(Math.round(value));
}

export default function DashboardPageClient({
  data,
  period,
}: {
  data: DashboardData;
  period: RevenuePeriod;
}) {
  const router = useRouter();
  const { metrics, actionItems, overdueInvoices, recentTickets, expiringContracts, todayJobs, activeTechniciansCount, revenueChartData } = data;
  const [hoveredBar, setHoveredBar] = useState<number | null>(null);
  const rawMax = Math.max(...revenueChartData.map((item) => Math.max(item.billed, item.collected)), 1);
  // Round up to a nice value so y-axis ticks are clean
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawMax)));
  const maxValue = Math.ceil(rawMax / magnitude) * magnitude;

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="Welcome back. Here's what needs your attention today."
      />

      {/* Quick actions */}
      <div className="mb-6 flex flex-wrap gap-2">
        {[
          { label: "New invoice", icon: FilePlus, href: "/invoices/new" },
          { label: "Add customer", icon: UserPlus, href: "/customers/new" },
          { label: "Schedule job", icon: CalendarPlus, href: "/jobs/new" },
          { label: "Log complaint", icon: MessageSquarePlus, href: "/complaints/new" },
        ].map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="inline-flex items-center gap-2 rounded-lg border border-brand-200 bg-brand-50 px-3.5 py-2 text-sm font-medium text-brand-700 transition-colors hover:bg-brand-100 hover:border-brand-300"
          >
            <action.icon className="h-4 w-4" aria-hidden="true" />
            {action.label}
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <MetricCard
          title="Total Due"
          value={formatCurrency(metrics.totalDue)}
          subtitle={`${metrics.overdueCount} invoices overdue`}
          icon={IndianRupee}
          iconColor="text-red-600"
          iconBg="bg-red-50"
        />
        <MetricCard
          title="Open Complaints"
          value={metrics.openTickets}
          subtitle={`${metrics.criticalTickets} critical`}
          icon={AlertCircle}
          iconColor="text-amber-600"
          iconBg="bg-amber-50"
        />
        <MetricCard
          title="Expiring Contracts"
          value={metrics.expiringContracts}
          subtitle="Due for renewal"
          icon={Shield}
          iconColor="text-purple-600"
          iconBg="bg-purple-50"
        />
        <MetricCard
          title="Jobs Today"
          value={metrics.todayJobs}
          subtitle={`${activeTechniciansCount} technicians active`}
          icon={Briefcase}
          iconColor="text-blue-600"
          iconBg="bg-blue-50"
        />
      </div>

      {/* Action Required — highest-value UX, above secondary stats */}
      <div className="mb-8 rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4">
          <AlertCircle className="h-4 w-4 text-slate-500" />
          <h3 className="font-semibold text-slate-900">Action Required</h3>
        </div>
        {actionItems.length === 0 ? (
          <div className="px-5 py-6">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
              <p className="text-sm font-medium text-emerald-700">Everything is on track</p>
            </div>
            <Link
              href="/jobs"
              className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-brand-600 transition-colors"
            >
              View all jobs today <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {actionItems.map((item) => (
              <div key={item.key} className="flex items-center justify-between gap-4 px-5 py-3.5">
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className={`h-2 w-2 shrink-0 rounded-full ${
                      item.level === "critical" ? "bg-red-500" : "bg-amber-400"
                    }`}
                  />
                  <p className="text-sm text-slate-700 truncate">{item.label}</p>
                </div>
                <Link
                  href={item.href}
                  className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                    item.level === "critical"
                      ? "bg-red-50 text-red-700 hover:bg-red-100"
                      : "bg-amber-50 text-amber-700 hover:bg-amber-100"
                  }`}
                >
                  {item.actionLabel}
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 mb-8">
        {[
          { icon: Users, label: "Active Customers", value: metrics.activeCustomers },
          { icon: TrendingUp, label: "Collection Rate", value: `${metrics.collectionRate}%` },
          { icon: Clock, label: "Avg Resolution", value: `${metrics.avgResolutionHours}h` },
          { icon: Shield, label: "Renewal Rate", value: `${metrics.renewalRate}%` },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-xl border border-slate-200 bg-white p-4 transition-all hover:shadow-sm"
          >
            <div className="flex items-center gap-2">
              <item.icon className="h-4 w-4 text-slate-400" />
              <span className="text-xs font-medium text-slate-500">
                {item.label}
              </span>
            </div>
            <p className="mt-1.5 text-xl font-bold text-slate-900 tabular-nums">
              {item.value}
            </p>
          </div>
        ))}
      </div>

      <div className="mb-8 rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex items-start justify-between mb-6 gap-4">
          <div>
            <h3 className="font-semibold text-slate-900">Revenue Overview</h3>
            <p className="text-sm text-slate-500">
              Monthly billed vs collected
            </p>
          </div>
          <div className="flex items-center gap-4 shrink-0">
            {/* Legend */}
            <div className="hidden sm:flex items-center gap-5 text-sm">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-sm bg-brand-500" />
                <span className="text-slate-600">Billed</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-sm bg-emerald-500" />
                <span className="text-slate-600">Collected</span>
              </div>
            </div>
            {/* Period pills */}
            <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1">
              {PERIOD_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => router.push(`/?period=${opt.value}`)}
                  className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                    period === opt.value
                      ? "bg-brand-50 text-brand-700 ring-1 ring-brand-200"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex">
          {/* Y-axis labels — 5 ticks from maxValue down to 0 */}
          <div className="flex flex-col justify-between pr-3 text-right h-48">
            {[5, 4, 3, 2, 1, 0].map((step) => (
              <span key={step} className="text-[10px] text-slate-400 leading-none">
                {formatYAxisLabel((step / 5) * maxValue)}
              </span>
            ))}
          </div>

          <div className="flex-1 relative">
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="border-b border-slate-100" />
              ))}
            </div>

            <div className="flex items-end gap-3 h-48 relative z-10">
              {revenueChartData.map((d, i) => {
                const pct = d.billed > 0 ? Math.round((d.collected / d.billed) * 100) : 0;
                return (
                  <div
                    key={d.monthFull}
                    className="relative flex-1 flex flex-col items-center gap-1.5"
                    onMouseEnter={() => setHoveredBar(i)}
                    onMouseLeave={() => setHoveredBar(null)}
                  >
                    {/* Vertical hairline */}
                    {hoveredBar === i && (
                      <div className="pointer-events-none absolute left-1/2 top-0 h-40 w-px -translate-x-1/2 bg-slate-300 z-[1]" />
                    )}
                    {/* Tooltip */}
                    {hoveredBar === i && (
                      <div className="absolute -top-2 left-1/2 -translate-x-1/2 -translate-y-full bg-slate-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg z-20 whitespace-nowrap">
                        <p className="font-semibold">{d.monthFull}</p>
                        <p>Billed: {formatCurrency(d.billed)}</p>
                        <p>Collected: {formatCurrency(d.collected)} <span className="text-emerald-300">({pct}% of billed)</span></p>
                        <div className="absolute left-1/2 -translate-x-1/2 top-full w-2 h-2 bg-slate-900 rotate-45 -mt-1" />
                      </div>
                    )}
                    <div className="flex items-end gap-1 w-full h-40">
                      <div
                        className={`flex-1 rounded-t-md transition-all duration-200 ${hoveredBar === i ? "bg-brand-400" : "bg-brand-200"}`}
                        style={{ height: `${(d.billed / maxValue) * 100}%` }}
                      />
                      <div
                        className={`flex-1 rounded-t-md transition-all duration-200 ${hoveredBar === i ? "bg-emerald-400" : "bg-emerald-300"}`}
                        style={{ height: `${(d.collected / maxValue) * 100}%` }}
                      />
                    </div>
                    <span className={`text-xs transition-colors ${hoveredBar === i ? "text-slate-900 font-medium" : "text-slate-500"}`}>
                      {d.month}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <DashboardCard title="Overdue Invoices" href="/invoices">
          {overdueInvoices.length === 0 ? (
            <EmptyCardState message="No overdue invoices" />
          ) : (
            overdueInvoices.map((inv) => (
              <Link
                key={inv.id}
                href={`/invoices/${inv.id}`}
                className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-900 truncate">
                    {inv.customerName}
                  </p>
                  <p className="text-xs text-slate-500">
                    {inv.invoiceNumber} · Due {formatDate(inv.dueDate)}
                  </p>
                </div>
                <span className="text-sm font-semibold text-red-600 ml-3 tabular-nums">
                  {formatCurrency(inv.amount - inv.paidAmount)}
                </span>
              </Link>
            ))
          )}
        </DashboardCard>

        <DashboardCard title="Recent Complaints" href="/complaints">
          {recentTickets.length === 0 ? (
            <EmptyCardState message="No open complaints" />
          ) : (
            recentTickets.map((ticket) => (
              <Link
                key={ticket.id}
                href={`/complaints/${ticket.id}`}
                className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-900 truncate">
                    {ticket.subject}
                  </p>
                  <p className="text-xs text-slate-500">
                    {ticket.customerName} · {ticket.ticketNumber}
                  </p>
                </div>
                <div className="flex items-center gap-2 ml-3 shrink-0">
                  <StatusBadge status={ticket.priority} />
                </div>
              </Link>
            ))
          )}
        </DashboardCard>

        <DashboardCard title="Expiring Contracts" href="/contracts">
          {expiringContracts.length === 0 ? (
            <EmptyCardState message="No expiring contracts" />
          ) : (
            expiringContracts.map((contract) => (
              <Link
                key={contract.id}
                href={`/contracts/${contract.id}`}
                className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-900 truncate">
                    {contract.customerName}
                  </p>
                  <p className="text-xs text-slate-500">
                    {contract.assetName} · Expires{" "}
                    {formatDate(contract.endDate)}
                  </p>
                </div>
                <div className="flex items-center gap-2 ml-3 shrink-0">
                  <StatusBadge status={contract.status} />
                  <span className="text-sm text-slate-600 tabular-nums hidden sm:inline">
                    {formatCurrency(contract.value)}
                  </span>
                </div>
              </Link>
            ))
          )}
        </DashboardCard>

        <DashboardCard title="Upcoming Jobs" href="/jobs">
          {todayJobs.length === 0 ? (
            <EmptyCardState message="No upcoming jobs" />
          ) : (
            todayJobs.map((job) => (
              <Link
                key={job.id}
                href={`/jobs/${job.id}`}
                className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-900 truncate">
                    {job.customerName}
                  </p>
                  <p className="text-xs text-slate-500">
                    {job.technicianName} ·{" "}
                    <span className="capitalize">{job.type}</span> ·{" "}
                    {formatDate(job.scheduledDate)}
                  </p>
                </div>
                <StatusBadge status={job.status} className="ml-3 shrink-0" />
              </Link>
            ))
          )}
        </DashboardCard>
      </div>
    </div>
  );
}

function DashboardCard({
  title,
  href,
  children,
}: {
  title: string;
  href: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <h3 className="font-semibold text-slate-900">{title}</h3>
        <Link
          href={href}
          className="text-sm text-brand-600 hover:text-brand-700 flex items-center gap-1 transition-colors"
        >
          View all <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      <div className="divide-y divide-slate-100">{children}</div>
    </div>
  );
}

function EmptyCardState({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center py-8 text-sm text-slate-400">
      {message}
    </div>
  );
}
