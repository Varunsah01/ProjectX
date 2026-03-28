"use client";

import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { DataTable } from "@/components/ui/DataTable";
import { ExportMenu } from "@/components/ui/ExportMenu";
import { FilterBar } from "@/components/ui/FilterBar";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { listAssetsAction } from "@/lib/actions/assets";
import { fetchAllExportRows, type ExportColumn } from "@/lib/export";
import { useListUrlState } from "@/lib/use-list-url-state";
import { DEFAULT_PAGE_SIZE } from "@/lib/url-search-params";
import { formatDate } from "@/lib/utils";
import type { Asset, PaginatedData } from "@/lib/types";

const assetExportColumns: ExportColumn<Asset>[] = [
  { header: "Asset Name", value: (asset) => asset.name },
  { header: "Model", value: (asset) => asset.model },
  { header: "Serial Number", value: (asset) => asset.serialNumber },
  { header: "Customer", value: (asset) => asset.customerName },
  { header: "Category", value: (asset) => asset.category },
  {
    header: "Installation Date",
    value: (asset) => formatDate(asset.installationDate),
  },
  { header: "Warranty End", value: (asset) => formatDate(asset.warrantyEnd) },
  { header: "Coverage", value: (asset) => asset.amcStatus },
  {
    header: "Last Service",
    value: (asset) => formatDate(asset.lastServiceDate),
  },
  {
    header: "Next Service",
    value: (asset) => formatDate(asset.nextServiceDate),
  },
  { header: "Location", value: (asset) => asset.location ?? "" },
  { header: "Status", value: (asset) => asset.status },
];

export default function AssetsPageClient({
  assets,
  categories,
  params,
}: {
  assets: PaginatedData<Asset>;
  categories: string[];
  params: {
    search: string;
    category: string;
    page: number;
    pageSize: number;
  };
}) {
  const router = useRouter();
  const { updateParams } = useListUrlState({
    search: "",
    category: "all",
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
  });

  const loadExportData = () =>
    fetchAllExportRows<Asset, PaginatedData<Asset>>(
      (page, pageSize) =>
        listAssetsAction({
          search: params.search || undefined,
          category: params.category !== "all" ? params.category : undefined,
          page,
          pageSize,
          sortBy: "createdAt",
          sortOrder: "desc",
        }),
      {
        getRows: (pageData) => pageData.data,
        getTotalPages: (pageData) => pageData.totalPages,
      },
    );

  return (
    <div>
      <PageHeader
        title="Assets"
        subtitle={`${assets.total} tracked assets`}
        actions={
          <button
            onClick={() => router.push("/assets/new")}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700"
          >
            <Plus className="h-4 w-4" />
            Add Asset
          </button>
        }
      />

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <FilterBar
          className="mb-0 flex-1"
          searchValue={params.search}
          onSearchChange={(value) => updateParams({ search: value, page: 1 })}
          searchPlaceholder="Search by asset name, customer, or serial..."
          onClearAll={() => updateParams({ search: "", category: "all", page: 1 })}
          filters={[
            {
              label: "Category",
              value: params.category,
              onChange: (value) => updateParams({ category: value, page: 1 }),
              options: [
                { label: "All Categories", value: "all" },
                ...categories.map((category) => ({ label: category, value: category })),
              ],
            },
          ]}
        />
        <ExportMenu
          columns={assetExportColumns}
          filename="assets-export"
          loadData={loadExportData}
        />
      </div>

      <DataTable<Asset>
        page={assets.page}
        pageSize={assets.pageSize}
        totalCount={assets.total}
        totalPages={assets.totalPages}
        onPageChange={(page) => updateParams({ page })}
        onPageSizeChange={(pageSize) => updateParams({ pageSize, page: 1 })}
        columns={[
          {
            key: "name",
            header: "Asset",
            render: (asset) => (
              <div>
                <p className="font-medium text-slate-900">{asset.name}</p>
                <p className="text-xs text-slate-500">
                  {asset.model} &middot; {asset.serialNumber}
                </p>
              </div>
            ),
          },
          {
            key: "customer",
            header: "Customer",
            render: (asset) => asset.customerName,
          },
          {
            key: "category",
            header: "Category",
            render: (asset) => (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                {asset.category}
              </span>
            ),
          },
          {
            key: "coverage",
            header: "Coverage",
            render: (asset) => asset.amcStatus,
          },
          {
            key: "lastService",
            header: "Last Service",
            render: (asset) => formatDate(asset.lastServiceDate),
          },
          {
            key: "nextService",
            header: "Next Service",
            render: (asset) => formatDate(asset.nextServiceDate),
          },
          {
            key: "status",
            header: "Status",
            render: (asset) => <StatusBadge status={asset.status} />,
          },
        ]}
        data={assets.data}
        onRowClick={(asset) => router.push(`/assets/${asset.id}`)}
      />
    </div>
  );
}
