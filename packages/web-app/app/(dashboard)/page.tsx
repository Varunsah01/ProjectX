"use client";

import { useState } from "react";
import Link from "next/link";
import {
  IndianRupee,
  AlertCircle,
  Shield,
  Briefcase,
  Users,
  TrendingUp,
  Clock,
  ArrowRight,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { MetricCard } from "@/components/ui/MetricCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  getDashboardMetrics,
  invoices,
  tickets,
  contracts,
  jobs,
  technicians,
} from "@/lib/mock-data";

export default function DashboardPage() {
  const metrics = getDashboardMetrics();
  const [hoveredBar, setHoveredBar] = useState<number | null>(null);

  const overdueInvoices = invoices
    .filter((i) => i.status === "overdue")
    .slice(0, 5);
  const recentTickets = tickets
    .filter((t) => !["resolved", "closed"].includes(t.status))
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    .slice(0, 5);
  const expiringContracts = contracts
    .filter((c) => c.status === "expiring_soon" || c.status === "expired")
    .slice(0, 5);
  const todayJobs = jobs.slice(0, 4);

  const chartData = [
    { month: "Oct", billed: 380000, collected: 310000 },
    { month: "Nov", billed: 420000, collected: 350000 },
    { month: "Dec", billed: 390000, collected: 290000 },
    { month: "Jan", billed: 450000, collected: 380000 },
    { month: "Feb", billed: 440000, collected: 360000 },
    { month: "Mar", billed: 460000, collected: 160000 },
  ];
  const maxValue = 500000;

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="Welcome back, Varun. Here's what needs your attention today."
      />

      {/* Metric Cards */}
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
          subtitle={`${technicians.filter((t) => t.status === "on_job").length} technicians active`}
          icon={Briefcase}
          iconColor="text-blue-600"
          iconBg="bg-blue-50"
        />
      </div>

      {/* Secondary Metrics */}
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

      {/* Revenue Chart */}
      <div className="mb-8 rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="font-semibold text-slate-900">Revenue Overview</h3>
            <p className="text-sm text-slate-500">
              Monthly billed vs collected (in lakhs)
            </p>
          </div>
          <div className="flex items-center gap-5 text-sm">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-sm bg-brand-500" />
              <span className="text-slate-600">Billed</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-sm bg-emerald-500" />
              <span className="text-slate-600">Collected</span>
            </div>
          </div>
        </div>

        {/* Y-axis labels + chart */}
        <div className="flex">
          {/* Y-axis */}
          <div className="flex flex-col justify-between pr-3 text-right h-48">
            {[5, 4, 3, 2, 1, 0].map((v) => (
              <span key={v} className="text-[10px] text-slate-400 leading-none">
                {v}L
              </span>
            ))}
          </div>

          {/* Chart area */}
          <div className="flex-1 relative">
            {/* Grid lines */}
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="border-b border-slate-100" />
              ))}
            </div>

            <div className="flex items-end gap-3 h-48 relative z-10">
              {chartData.map((d, i) => (
                <div
                  key={d.month}
                  className="flex-1 flex flex-col items-center gap-1.5"
                  onMouseEnter={() => setHoveredBar(i)}
                  onMouseLeave={() => setHoveredBar(null)}
                >
                  {/* Tooltip */}
                  {hoveredBar === i && (
                    <div className="absolute -top-2 transform -translate-y-full bg-slate-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg z-20 whitespace-nowrap">
                      <p className="font-medium">{d.month}</p>
                      <p>Billed: {formatCurrency(d.billed)}</p>
                      <p>Collected: {formatCurrency(d.collected)}</p>
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
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Grids */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Overdue Invoices */}
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
                    {inv.invoiceNumber} &middot; Due {formatDate(inv.dueDate)}
                  </p>
                </div>
                <span className="text-sm font-semibold text-red-600 ml-3 tabular-nums">
                  {formatCurrency(inv.amount - inv.paidAmount)}
                </span>
              </Link>
            ))
          )}
        </DashboardCard>

        {/* Open Complaints */}
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
                    {ticket.customerName} &middot; {ticket.ticketNumber}
                  </p>
                </div>
                <div className="flex items-center gap-2 ml-3 shrink-0">
                  <StatusBadge status={ticket.priority} />
                </div>
              </Link>
            ))
          )}
        </DashboardCard>

        {/* Expiring Contracts */}
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
                    {contract.assetName} &middot; Expires{" "}
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

        {/* Today's Jobs */}
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
                    {job.technicianName} &middot;{" "}
                    <span className="capitalize">{job.type}</span> &middot;{" "}
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
