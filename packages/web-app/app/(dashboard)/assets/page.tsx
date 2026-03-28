"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { FilterBar } from "@/components/ui/FilterBar";
import { DataTable } from "@/components/ui/DataTable";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatDate } from "@/lib/utils";
import { assets, type Asset } from "@/lib/mock-data";

export default function AssetsPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const categories = [...new Set(assets.map((a) => a.category))];

  const filtered = assets.filter((a) => {
    const matchSearch =
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.customerName.toLowerCase().includes(search.toLowerCase()) ||
      a.serialNumber.toLowerCase().includes(search.toLowerCase());
    const matchCategory =
      categoryFilter === "all" || a.category === categoryFilter;
    return matchSearch && matchCategory;
  });

  return (
    <div>
      <PageHeader
        title="Assets"
        subtitle={`${assets.length} tracked assets`}
        actions={
          <button
            onClick={() => router.push("/assets/new")}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Asset
          </button>
        }
      />

      <FilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by asset name, customer, or serial..."
        filters={[
          {
            label: "Category",
            value: categoryFilter,
            onChange: setCategoryFilter,
            options: [
              { label: "All Categories", value: "all" },
              ...categories.map((c) => ({ label: c, value: c })),
            ],
          },
        ]}
      />

      <DataTable<Asset>
        totalCount={assets.length}
        columns={[
          {
            key: "name",
            header: "Asset",
            render: (a) => (
              <div>
                <p className="font-medium text-slate-900">{a.name}</p>
                <p className="text-xs text-slate-500">
                  {a.model} &middot; {a.serialNumber}
                </p>
              </div>
            ),
          },
          {
            key: "customer",
            header: "Customer",
            render: (a) => a.customerName,
          },
          {
            key: "category",
            header: "Category",
            render: (a) => (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                {a.category}
              </span>
            ),
          },
          {
            key: "coverage",
            header: "Coverage",
            render: (a) => a.amcStatus,
          },
          {
            key: "lastService",
            header: "Last Service",
            render: (a) => formatDate(a.lastServiceDate),
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
        data={filtered}
        onRowClick={(a) => router.push(`/assets/${a.id}`)}
      />
    </div>
  );
}
