"use client";

import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/cn";

type PaginationItem = number | "ellipsis-start" | "ellipsis-end";

interface PaginationControlsProps {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  className?: string;
}

function getVisiblePages(page: number, totalPages: number): PaginationItem[] {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  if (page <= 3) {
    return [1, 2, 3, 4, "ellipsis-end", totalPages];
  }

  if (page >= totalPages - 2) {
    return [1, "ellipsis-start", totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  }

  return [1, "ellipsis-start", page - 1, page, page + 1, "ellipsis-end", totalPages];
}

export function PaginationControls({
  page,
  pageSize,
  totalCount,
  totalPages,
  onPageChange,
  onPageSizeChange,
  className,
}: PaginationControlsProps) {
  const start = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = totalCount === 0 ? 0 : Math.min(page * pageSize, totalCount);
  const pageSizeOptions = [10, 25, 50];
  const visiblePageSizes = pageSizeOptions.includes(pageSize)
    ? pageSizeOptions
    : [pageSize, ...pageSizeOptions].sort((left, right) => left - right);

  return (
    <div
      className={cn(
        "flex flex-col gap-3 border-t border-slate-100 bg-slate-50/50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-xs text-slate-500">
          Showing <span className="font-medium text-slate-700">{start}</span>-
          <span className="font-medium text-slate-700">{end}</span> of{" "}
          <span className="font-medium text-slate-700">{totalCount}</span>{" "}
          results
        </p>
        {onPageSizeChange && (
          <label className="flex items-center gap-2 text-xs text-slate-500">
            <span>Rows</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            >
              {visiblePageSizes.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      {totalPages > 0 && (
        <div className="flex flex-wrap items-center gap-1">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Previous
          </button>
          {getVisiblePages(page, totalPages).map((item, index) =>
            typeof item === "number" ? (
              <button
                key={`${item}-${index}`}
                type="button"
                onClick={() => onPageChange(item)}
                className={cn(
                  "min-w-8 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
                  item === page
                    ? "bg-brand-600 text-white"
                    : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
                )}
              >
                {item}
              </button>
            ) : (
              <span
                key={`${item}-${index}`}
                className="inline-flex h-8 items-center px-1 text-slate-400"
              >
                <MoreHorizontal className="h-4 w-4" />
              </span>
            ),
          )}
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
