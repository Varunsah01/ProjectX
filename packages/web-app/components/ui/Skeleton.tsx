import { cn } from "@/lib/cn";

// ── Primitive ─────────────────────────────────────────────────────────────────

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse bg-slate-200", className)} />;
}

// ── MetricCardSkeleton ────────────────────────────────────────────────────────
// Mirrors MetricCard's exact DOM so layout doesn't shift on load.

export function MetricCardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-xl border border-slate-200 bg-white p-5",
        className,
      )}
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1 space-y-1.5">
          <Skeleton className="h-4 w-24 rounded" />
          <Skeleton className="h-8 w-32 rounded" />
          <Skeleton className="h-3 w-20 rounded" />
        </div>
        <Skeleton className="h-10 w-10 rounded-xl" />
      </div>
    </div>
  );
}

// ── DataTableSkeleton ─────────────────────────────────────────────────────────

interface DataTableSkeletonProps {
  /** Number of column headers to render. */
  columns: number;
  /** Number of body rows. Defaults to 8 (matches DEFAULT_PAGE_SIZE). */
  rows?: number;
  /** Prepend a checkbox column when the real table supports row selection. */
  hasSelection?: boolean;
}

export function DataTableSkeleton({
  columns,
  rows = 8,
  hasSelection = false,
}: DataTableSkeletonProps) {
  const totalCols = hasSelection ? columns + 1 : columns;

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/80">
              {hasSelection && (
                <th className="w-12 px-4 py-3">
                  <Skeleton className="h-4 w-4 rounded" />
                </th>
              )}
              {Array.from({ length: columns }).map((_, i) => (
                <th key={i} className="px-4 py-3 text-left">
                  <Skeleton className="h-3 w-16 rounded" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }).map((_, rowIdx) => (
              <tr key={rowIdx} className="border-b border-slate-100 last:border-0">
                {Array.from({ length: totalCols }).map((_, colIdx) => (
                  <td key={colIdx} className="px-4 py-3">
                    <Skeleton
                      className={cn(
                        "h-4 rounded",
                        // Vary widths slightly for a more natural look
                        colIdx === 0 && hasSelection ? "w-4" : rowIdx % 3 === 0 ? "w-3/4" : "w-full",
                      )}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Footer — mirrors PaginationControls */}
      <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/50 px-4 py-2.5">
        <Skeleton className="h-3 w-40 rounded" />
        <Skeleton className="h-7 w-48 rounded-lg" />
      </div>
    </div>
  );
}
