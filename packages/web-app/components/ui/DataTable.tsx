"use client";

import React from "react";
import { cn } from "@/lib/cn";
import { PaginationControls } from "@/components/ui/PaginationControls";

export type MobilePriority = "primary" | "secondary" | "meta" | "hide";

export interface Column<T> {
  key: string;
  header: string;
  className?: string;
  render: (item: T) => React.ReactNode;
  mobileCardLabel?: string;
  mobilePriority?: MobilePriority;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (item: T) => void;
  className?: string;
  emptyMessage?: string;
  page?: number;
  pageSize?: number;
  totalCount?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  getRowId?: (item: T) => string;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
  renderExpandedRow?: (item: T) => React.ReactNode;
}

export function DataTable<T>({
  columns,
  data,
  onRowClick,
  className,
  emptyMessage = "No records found",
  page,
  pageSize,
  totalCount,
  totalPages,
  onPageChange,
  onPageSizeChange,
  getRowId,
  selectedIds = [],
  onSelectionChange,
  renderExpandedRow,
}: DataTableProps<T>) {
  const hasPagination =
    totalCount !== undefined &&
    page !== undefined &&
    pageSize !== undefined &&
    totalPages !== undefined &&
    onPageChange !== undefined;
  const hasSelection =
    getRowId !== undefined && onSelectionChange !== undefined;
  const currentRowIds = hasSelection ? data.map((item) => getRowId(item)) : [];
  const selectedCurrentIds = hasSelection
    ? currentRowIds.filter((id) => selectedIds.includes(id))
    : [];
  const allSelected =
    hasSelection &&
    data.length > 0 &&
    currentRowIds.every((id) => selectedIds.includes(id));
  const someSelected =
    hasSelection &&
    selectedCurrentIds.length > 0 &&
    selectedCurrentIds.length < data.length;

  const toggleRow = (id: string) => {
    if (!hasSelection) return;
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter((itemId) => itemId !== id));
      return;
    }
    onSelectionChange([...selectedIds, id]);
  };

  const toggleAllRows = () => {
    if (!hasSelection) return;
    if (allSelected) {
      onSelectionChange(
        selectedIds.filter((id) => !currentRowIds.includes(id)),
      );
      return;
    }
    onSelectionChange([...new Set([...selectedIds, ...currentRowIds])]);
  };

  const emptyState = (
    <div className="px-4 py-16 text-center">
      <div className="flex flex-col items-center gap-2">
        <div className="rounded-full bg-slate-100 p-3">
          <svg className="h-6 w-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <p className="text-sm font-medium text-slate-500">{emptyMessage}</p>
        <p className="text-xs text-slate-400">Try adjusting your search or filters</p>
      </div>
    </div>
  );

  const primaryCols  = columns.filter((c) => c.mobilePriority === "primary");
  const secondaryCols = columns.filter((c) => c.mobilePriority === "secondary");
  const metaCols     = columns.filter((c) => c.mobilePriority === "meta");

  const footer = hasPagination ? (
    <PaginationControls
      page={page}
      pageSize={pageSize}
      totalCount={totalCount}
      totalPages={totalPages}
      onPageChange={onPageChange}
      onPageSizeChange={onPageSizeChange}
    />
  ) : (
    data.length > 0 &&
    totalCount !== undefined && (
      <div className="border-t border-slate-100 bg-slate-50/50 px-4 py-2.5">
        <p className="text-xs text-slate-500">
          Showing <span className="font-medium text-slate-700">{data.length}</span>
          {totalCount !== data.length && (
            <>
              {" "}of <span className="font-medium text-slate-700">{totalCount}</span>
            </>
          )}{" "}
          result{data.length !== 1 ? "s" : ""}
        </p>
      </div>
    )
  );

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-slate-200 bg-white",
        className,
      )}
    >
      {/* ── Mobile card list (below md) ─────────────────────────────────── */}
      <div className="md:hidden divide-y divide-slate-100">
        {data.length === 0 ? (
          emptyState
        ) : (
          data.map((item, i) => {
            const rowId = hasSelection ? getRowId(item) : String(i);
            const isSelected = hasSelection && selectedIds.includes(getRowId(item));

            return (
              <div
                key={rowId}
                onClick={() => onRowClick?.(item)}
                className={cn(
                  "relative px-4 py-3.5 transition-colors",
                  onRowClick && "cursor-pointer active:bg-brand-50/60",
                  isSelected && "bg-brand-50/30",
                )}
              >
                {/* Checkbox — top-right */}
                {hasSelection && (
                  <div className="absolute right-4 top-3.5">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleRow(getRowId(item))}
                      onClick={(e) => e.stopPropagation()}
                      className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                      aria-label="Select row"
                    />
                  </div>
                )}

                {/* Primary — card title */}
                {primaryCols.map((col) => (
                  <div
                    key={col.key}
                    className={cn(
                      "text-sm font-semibold text-slate-900",
                      hasSelection && "pr-8",
                    )}
                  >
                    {col.render(item)}
                  </div>
                ))}

                {/* Secondary — subtitle */}
                {secondaryCols.length > 0 && (
                  <div className="mt-0.5 space-y-0.5">
                    {secondaryCols.map((col) => (
                      <div key={col.key} className="text-sm text-slate-600">
                        {col.render(item)}
                      </div>
                    ))}
                  </div>
                )}

                {/* Meta — footer chip area */}
                {metaCols.length > 0 && (
                  <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5">
                    {metaCols.map((col) => (
                      <div
                        key={col.key}
                        className="flex items-center gap-1 text-xs text-slate-500"
                      >
                        {col.mobileCardLabel && (
                          <span className="font-medium text-slate-400">
                            {col.mobileCardLabel}:
                          </span>
                        )}
                        {col.render(item)}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* ── Desktop table (md and above) ────────────────────────────────── */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/80">
              {hasSelection ? (
                <th className="w-12 px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={Boolean(allSelected)}
                    ref={(input) => {
                      if (input) {
                        input.indeterminate = Boolean(someSelected);
                      }
                    }}
                    onChange={toggleAllRows}
                    className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                    aria-label="Select all rows"
                  />
                </th>
              ) : null}
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500",
                    col.className,
                  )}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (hasSelection ? 1 : 0)}
                  className="px-4 py-16 text-center"
                >
                  <div className="flex flex-col items-center gap-2">
                    <div className="rounded-full bg-slate-100 p-3">
                      <svg className="h-6 w-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <p className="text-sm font-medium text-slate-500">
                      {emptyMessage}
                    </p>
                    <p className="text-xs text-slate-400">
                      Try adjusting your search or filters
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              data.map((item, i) => {
                const rowKey = hasSelection ? getRowId(item) : i;
                return (
                  <React.Fragment key={rowKey}>
                    <tr
                      onClick={() => onRowClick?.(item)}
                      className={cn(
                        "transition-colors",
                        onRowClick &&
                          "cursor-pointer hover:bg-brand-50/40 active:bg-brand-50/60",
                      )}
                    >
                      {hasSelection ? (
                        <td className="px-4 py-3.5 text-sm text-slate-700">
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(getRowId(item))}
                            onChange={() => toggleRow(getRowId(item))}
                            onClick={(event) => event.stopPropagation()}
                            className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                            aria-label="Select row"
                          />
                        </td>
                      ) : null}
                      {columns.map((col) => (
                        <td
                          key={col.key}
                          className={cn(
                            "px-4 py-3.5 text-sm text-slate-700",
                            col.className,
                          )}
                        >
                          {col.render(item)}
                        </td>
                      ))}
                    </tr>
                    {renderExpandedRow?.(item)}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {footer}
    </div>
  );
}
