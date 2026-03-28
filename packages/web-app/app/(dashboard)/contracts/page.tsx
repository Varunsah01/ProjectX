"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { FilterBar } from "@/components/ui/FilterBar";
import { DataTable } from "@/components/ui/DataTable";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { contracts, type Contract } from "@/lib/mock-data";

export default function ContractsPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  const filtered = contracts.filter((c) => {
    const matchSearch =
      c.customerName.toLowerCase().includes(search.toLowerCase()) ||
      c.assetName.toLowerCase().includes(search.toLowerCase()) ||
      c.contractNumber.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || c.status === statusFilter;
    const matchType = typeFilter === "all" || c.type === typeFilter;
    return matchSearch && matchStatus && matchType;
  });

  const expiringCount = contracts.filter(
    (c) => c.status === "expiring_soon"
  ).length;
  const expiredCount = contracts.filter(
    (c) => c.status === "expired"
  ).length;

  return (
    <div>
      <PageHeader
        title="Contracts"
        subtitle={`${contracts.length} contracts &middot; ${expiringCount} expiring soon &middot; ${expiredCount} expired`}
        actions={
          <button
            onClick={() => router.push("/contracts/new")}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Create Contract
          </button>
        }
      />

      <FilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by customer, asset, or contract number..."
        filters={[
          {
            label: "Status",
            value: statusFilter,
            onChange: setStatusFilter,
            options: [
              { label: "All Status", value: "all" },
              { label: "Active", value: "active" },
              { label: "Expiring Soon", value: "expiring_soon" },
              { label: "Expired", value: "expired" },
              { label: "Renewed", value: "renewed" },
              { label: "Cancelled", value: "cancelled" },
            ],
          },
          {
            label: "Type",
            value: typeFilter,
            onChange: setTypeFilter,
            options: [
              { label: "All Types", value: "all" },
              { label: "AMC", value: "amc" },
              { label: "Warranty", value: "warranty" },
            ],
          },
        ]}
      />

      <DataTable<Contract>
        totalCount={contracts.length}
        columns={[
          {
            key: "contract",
            header: "Contract",
            render: (c) => (
              <div>
                <p className="font-medium text-slate-900">{c.contractNumber}</p>
                <p className="text-xs text-slate-500 uppercase">{c.type}</p>
              </div>
            ),
          },
          {
            key: "customer",
            header: "Customer",
            render: (c) => c.customerName,
          },
          {
            key: "asset",
            header: "Asset",
            render: (c) => c.assetName,
          },
          {
            key: "plan",
            header: "Plan",
            render: (c) => c.plan,
          },
          {
            key: "period",
            header: "Period",
            render: (c) => (
              <div className="text-xs">
                <p>{formatDate(c.startDate)}</p>
                <p className="text-slate-400">to {formatDate(c.endDate)}</p>
              </div>
            ),
          },
          {
            key: "visits",
            header: "Visits",
            render: (c) => (
              <div>
                <span className="font-medium">{c.visitsUsed}</span>
                <span className="text-slate-400"> / {c.visitsCovered}</span>
              </div>
            ),
          },
          {
            key: "value",
            header: "Value",
            render: (c) => formatCurrency(c.value),
          },
          {
            key: "status",
            header: "Status",
            render: (c) => <StatusBadge status={c.status} />,
          },
        ]}
        data={filtered}
        onRowClick={(c) => router.push(`/contracts/${c.id}`)}
      />
    </div>
  );
}
