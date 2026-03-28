"use client";

import { cn } from "@/lib/cn";

interface Column<T> {
  key: string;
  header: string;
  className?: string;
  render: (item: T) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (item: T) => void;
  className?: string;
  emptyMessage?: string;
  totalCount?: number;
}

export function DataTable<T>({
  columns,
  data,
  onRowClick,
  className,
  emptyMessage = "No records found",
  totalCount,
}: DataTableProps<T>) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-slate-200 bg-white",
        className
      )}
    >
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/80">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500",
                    col.className
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
                  colSpan={columns.length}
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
              data.map((item, i) => (
                <tr
                  key={i}
                  onClick={() => onRowClick?.(item)}
                  className={cn(
                    "transition-colors",
                    onRowClick &&
                      "cursor-pointer hover:bg-brand-50/40 active:bg-brand-50/60"
                  )}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={cn(
                        "px-4 py-3.5 text-sm text-slate-700",
                        col.className
                      )}
                    >
                      {col.render(item)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {/* Result count footer */}
      {data.length > 0 && (
        <div className="border-t border-slate-100 bg-slate-50/50 px-4 py-2.5">
          <p className="text-xs text-slate-500">
            Showing <span className="font-medium text-slate-700">{data.length}</span>
            {totalCount !== undefined && totalCount !== data.length && (
              <> of <span className="font-medium text-slate-700">{totalCount}</span></>
            )}{" "}
            result{data.length !== 1 ? "s" : ""}
          </p>
        </div>
      )}
    </div>
  );
}
