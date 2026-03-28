"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Phone,
  Mail,
  MapPin,
  Building,
  ArrowLeft,
  Edit,
  Package,
  Receipt,
  AlertCircle,
  Shield,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Tabs } from "@/components/ui/Tabs";
import { DataTable } from "@/components/ui/DataTable";
import { formatCurrency, formatDate, getInitials } from "@/lib/utils";
import {
  customers,
  assets,
  invoices,
  tickets,
  contracts,
  type Asset,
  type Invoice,
  type Ticket,
  type Contract,
} from "@/lib/mock-data";

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const customer = customers.find((c) => c.id === id);

  if (!customer) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-lg text-slate-500">Customer not found</p>
        <button
          onClick={() => router.push("/customers")}
          className="mt-4 text-sm text-brand-600 hover:underline"
        >
          Back to customers
        </button>
      </div>
    );
  }

  const customerAssets = assets.filter((a) => a.customerId === id);
  const customerInvoices = invoices.filter((i) => i.customerId === id);
  const customerTickets = tickets.filter((t) => t.customerId === id);
  const customerContracts = contracts.filter((c) => c.customerId === id);

  return (
    <div>
      <PageHeader
        title={customer.name}
        breadcrumbs={[
          { label: "Customers", href: "/customers" },
          { label: customer.name },
        ]}
        actions={
          <button className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            <Edit className="h-4 w-4" />
            Edit
          </button>
        }
      />

      {/* Customer Info Card */}
      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-2">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-100 text-xl font-bold text-brand-700">
              {getInitials(customer.name)}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-semibold text-slate-900">
                  {customer.name}
                </h2>
                <StatusBadge status={customer.status} />
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                  {customer.category}
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-500">
                Customer since {formatDate(customer.createdAt)} &middot; ID:{" "}
                {customer.id}
              </p>
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Phone className="h-4 w-4 text-slate-400" />
                  {customer.phone}
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Mail className="h-4 w-4 text-slate-400" />
                  {customer.email}
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <MapPin className="h-4 w-4 text-slate-400" />
                  {customer.address}, {customer.city}
                </div>
                {customer.gst && (
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Building className="h-4 w-4 text-slate-400" />
                    GST: {customer.gst}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Financial Summary */}
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <h3 className="font-semibold text-slate-900 mb-4">
            Financial Summary
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">Total Billed</span>
              <span className="font-medium text-slate-900">
                {formatCurrency(customer.totalPaid + customer.totalDue)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">Total Paid</span>
              <span className="font-medium text-green-600">
                {formatCurrency(customer.totalPaid)}
              </span>
            </div>
            <div className="border-t border-slate-100 pt-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700">
                  Outstanding
                </span>
                <span
                  className={`text-lg font-bold ${customer.totalDue > 0 ? "text-red-600" : "text-green-600"}`}
                >
                  {formatCurrency(customer.totalDue)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        tabs={[
          {
            id: "assets",
            label: "Assets",
            count: customerAssets.length,
            content: (
              <DataTable<Asset>
                columns={[
                  {
                    key: "name",
                    header: "Asset",
                    render: (a) => (
                      <div>
                        <p className="font-medium text-slate-900">{a.name}</p>
                        <p className="text-xs text-slate-500">{a.model}</p>
                      </div>
                    ),
                  },
                  {
                    key: "serial",
                    header: "Serial No.",
                    render: (a) => a.serialNumber,
                  },
                  {
                    key: "installed",
                    header: "Installed",
                    render: (a) => formatDate(a.installationDate),
                  },
                  {
                    key: "amc",
                    header: "Coverage",
                    render: (a) => a.amcStatus,
                  },
                  {
                    key: "nextService",
                    header: "Next Service",
                    render: (a) => formatDate(a.nextServiceDate),
                  },
                  {
                    key: "status",
                    header: "Status",
                    render: (a) => <StatusBadge status={a.status} />,
                  },
                ]}
                data={customerAssets}
                onRowClick={(a) => router.push(`/assets/${a.id}`)}
              />
            ),
          },
          {
            id: "invoices",
            label: "Invoices",
            count: customerInvoices.length,
            content: (
              <DataTable<Invoice>
                columns={[
                  {
                    key: "number",
                    header: "Invoice",
                    render: (i) => (
                      <span className="font-medium">{i.invoiceNumber}</span>
                    ),
                  },
                  {
                    key: "amount",
                    header: "Amount",
                    render: (i) => formatCurrency(i.amount),
                  },
                  {
                    key: "paid",
                    header: "Paid",
                    render: (i) => formatCurrency(i.paidAmount),
                  },
                  {
                    key: "due",
                    header: "Due Date",
                    render: (i) => formatDate(i.dueDate),
                  },
                  {
                    key: "status",
                    header: "Status",
                    render: (i) => <StatusBadge status={i.status} />,
                  },
                ]}
                data={customerInvoices}
                onRowClick={(i) => router.push(`/invoices/${i.id}`)}
              />
            ),
          },
          {
            id: "complaints",
            label: "Complaints",
            count: customerTickets.length,
            content: (
              <DataTable<Ticket>
                columns={[
                  {
                    key: "ticket",
                    header: "Ticket",
                    render: (t) => (
                      <div>
                        <p className="font-medium text-slate-900">
                          {t.subject}
                        </p>
                        <p className="text-xs text-slate-500">
                          {t.ticketNumber}
                        </p>
                      </div>
                    ),
                  },
                  {
                    key: "priority",
                    header: "Priority",
                    render: (t) => <StatusBadge status={t.priority} />,
                  },
                  {
                    key: "status",
                    header: "Status",
                    render: (t) => <StatusBadge status={t.status} />,
                  },
                  {
                    key: "created",
                    header: "Created",
                    render: (t) => formatDate(t.createdAt),
                  },
                ]}
                data={customerTickets}
                onRowClick={(t) => router.push(`/complaints/${t.id}`)}
              />
            ),
          },
          {
            id: "contracts",
            label: "Contracts",
            count: customerContracts.length,
            content: (
              <DataTable<Contract>
                columns={[
                  {
                    key: "contract",
                    header: "Contract",
                    render: (c) => (
                      <div>
                        <p className="font-medium text-slate-900">{c.plan}</p>
                        <p className="text-xs text-slate-500">
                          {c.contractNumber}
                        </p>
                      </div>
                    ),
                  },
                  {
                    key: "asset",
                    header: "Asset",
                    render: (c) => c.assetName,
                  },
                  {
                    key: "period",
                    header: "Period",
                    render: (c) =>
                      `${formatDate(c.startDate)} - ${formatDate(c.endDate)}`,
                  },
                  {
                    key: "visits",
                    header: "Visits",
                    render: (c) => `${c.visitsUsed} / ${c.visitsCovered}`,
                  },
                  {
                    key: "status",
                    header: "Status",
                    render: (c) => <StatusBadge status={c.status} />,
                  },
                ]}
                data={customerContracts}
                onRowClick={(c) => router.push(`/contracts/${c.id}`)}
              />
            ),
          },
        ]}
      />
    </div>
  );
}
