import { redirect } from "next/navigation";
import Link from "next/link";
import { FileText, Shield, Wrench, MessageSquare, ArrowRight } from "lucide-react";
import { getPortalSession } from "@/lib/portal-auth";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/Card";

export default async function PortalHome() {
  const session = await getPortalSession();
  if (!session) redirect("/login");

  const { customerId, organizationId } = session.user;

  const [invoiceCounts, contractCount, openJobsCount, openTicketsCount] =
    await Promise.all([
      db.invoice.aggregate({
        where: {
          customerId,
          organizationId,
          status: { in: ["ISSUED", "OVERDUE", "PARTIAL"] },
        },
        _count: true,
        _sum: { amount: true, paidAmount: true },
      }),
      db.contract.count({
        where: { customerId, organizationId, status: "ACTIVE" },
      }),
      db.job.count({
        where: {
          customerId,
          organizationId,
          status: { in: ["PENDING", "ASSIGNED", "EN_ROUTE", "IN_PROGRESS"] },
        },
      }),
      db.ticket.count({
        where: {
          customerId,
          organizationId,
          status: { notIn: ["RESOLVED", "CLOSED"] },
        },
      }),
    ]);

  const outstandingAmount = Math.max(
    0,
    (invoiceCounts._sum.amount ?? 0) - (invoiceCounts._sum.paidAmount ?? 0),
  );

  const formatInr = (amount: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);

  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-900">
        Welcome, {session.user.customerName}
      </h1>
      <p className="mt-0.5 text-sm text-slate-600 mb-6">
        Here&apos;s an overview of your account.
      </p>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4 mb-8">
        <SummaryCard
          icon={FileText}
          label="Outstanding"
          value={formatInr(outstandingAmount)}
          sub={`${invoiceCounts._count} invoice${invoiceCounts._count === 1 ? "" : "s"}`}
          href="/invoices"
          color="text-blue-600 bg-blue-50"
        />
        <SummaryCard
          icon={Shield}
          label="Active Contracts"
          value={String(contractCount)}
          href="/contracts"
          color="text-green-600 bg-green-50"
        />
        <SummaryCard
          icon={Wrench}
          label="Active Jobs"
          value={String(openJobsCount)}
          href="/jobs"
          color="text-amber-600 bg-amber-50"
        />
        <SummaryCard
          icon={MessageSquare}
          label="Open Tickets"
          value={String(openTicketsCount)}
          href="/tickets"
          color="text-purple-600 bg-purple-50"
        />
      </div>

      {/* Quick actions */}
      <h2 className="text-sm font-medium text-slate-700 mb-3">Quick actions</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <QuickAction
          href="/invoices"
          label="View invoices"
          description="See and pay your outstanding invoices"
        />
        <QuickAction
          href="/tickets/new"
          label="Raise a ticket"
          description="Submit a service request or complaint"
        />
      </div>
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  sub,
  href,
  color,
}: {
  icon: any;
  label: string;
  value: string;
  sub?: string;
  href: string;
  color: string;
}) {
  return (
    <Link href={href}>
      <Card className="hover:border-slate-300 hover:shadow-sm transition-all h-full">
        <div className={`mb-2 inline-flex rounded-lg p-2 ${color}`}>
          <Icon className="h-4 w-4" />
        </div>
        <p className="text-lg font-semibold text-slate-900">{value}</p>
        <p className="text-xs text-slate-600">{label}</p>
        {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
      </Card>
    </Link>
  );
}

function QuickAction({
  href,
  label,
  description,
}: {
  href: string;
  label: string;
  description: string;
}) {
  return (
    <Link href={href}>
      <Card className="flex items-center justify-between hover:border-slate-300 hover:shadow-sm transition-all">
        <div>
          <p className="text-sm font-medium text-slate-900">{label}</p>
          <p className="text-xs text-slate-500">{description}</p>
        </div>
        <ArrowRight className="h-4 w-4 text-slate-400 flex-shrink-0" />
      </Card>
    </Link>
  );
}
