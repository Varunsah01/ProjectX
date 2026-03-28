"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { FilterBar } from "@/components/ui/FilterBar";
import { DataTable } from "@/components/ui/DataTable";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatCurrency } from "@/lib/utils";
import { customers, type Customer } from "@/lib/mock-data";

export default function CustomersPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const filtered = customers.filter((c) => {
    const matchSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search) ||
      c.city.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || c.status === statusFilter;
    const matchCategory =
      categoryFilter === "all" || c.category === categoryFilter;
    return matchSearch && matchStatus && matchCategory;
  });

  return (
    <div>
      <PageHeader
        title="Customers"
        subtitle={`${customers.length} total customers`}
        actions={
          <button
            onClick={() => router.push("/customers/new")}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            <Plus className="h-4 w-4" />
            Add Customer
          </button>
        }
      />

      <FilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by name, phone, or city..."
        filters={[
          {
            label: "Status",
            value: statusFilter,
            onChange: setStatusFilter,
            options: [
              { label: "All Status", value: "all" },
              { label: "Active", value: "active" },
              { label: "Inactive", value: "inactive" },
              { label: "Suspended", value: "suspended" },
            ],
          },
          {
            label: "Category",
            value: categoryFilter,
            onChange: setCategoryFilter,
            options: [
              { label: "All Categories", value: "all" },
              { label: "Commercial", value: "Commercial" },
              { label: "Residential", value: "Residential" },
            ],
          },
        ]}
      />

      <DataTable<Customer>
        totalCount={customers.length}
        columns={[
          {
            key: "name",
            header: "Customer",
            render: (c) => (
              <div>
                <p className="font-medium text-slate-900">{c.name}</p>
                <p className="text-xs text-slate-500">{c.city}</p>
              </div>
            ),
          },
          {
            key: "contact",
            header: "Contact",
            render: (c) => (
              <div>
                <p className="text-slate-700">{c.phone}</p>
                <p className="text-xs text-slate-500">{c.email}</p>
              </div>
            ),
          },
          {
            key: "category",
            header: "Category",
            render: (c) => (
              <span className="text-sm text-slate-600">{c.category}</span>
            ),
          },
          {
            key: "assets",
            header: "Assets",
            render: (c) => c.assetsCount,
          },
          {
            key: "due",
            header: "Due Amount",
            render: (c) => (
              <span
                className={
                  c.totalDue > 0
                    ? "font-medium text-red-600"
                    : "text-slate-500"
                }
              >
                {c.totalDue > 0 ? formatCurrency(c.totalDue) : "-"}
              </span>
            ),
          },
          {
            key: "status",
            header: "Status",
            render: (c) => <StatusBadge status={c.status} />,
          },
        ]}
        data={filtered}
        onRowClick={(c) => router.push(`/customers/${c.id}`)}
      />
    </div>
  );
}
