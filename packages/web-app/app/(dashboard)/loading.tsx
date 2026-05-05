import { MetricCardSkeleton, Skeleton } from "@/components/ui/Skeleton";

export default function DashboardLoading() {
  return (
    <div>
      {/* PageHeader */}
      <div className="mb-6">
        <Skeleton className="h-8 w-48 rounded" />
        <Skeleton className="mt-2 h-4 w-64 rounded" />
      </div>

      {/* Quick actions */}
      <div className="mb-6 flex flex-wrap gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-32 rounded-lg" />
        ))}
      </div>

      {/* Primary metric cards */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <MetricCardSkeleton key={i} />
        ))}
      </div>

      {/* Action Required */}
      <div className="mb-8 overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4">
          <Skeleton className="h-4 w-4 rounded" />
          <Skeleton className="h-5 w-36 rounded" />
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5 last:border-0"
          >
            <Skeleton className="h-4 w-1/2 rounded" />
            <Skeleton className="h-7 w-24 rounded-lg" />
          </div>
        ))}
      </div>

      {/* Secondary stats */}
      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-slate-200 bg-white p-4"
          >
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-4 rounded" />
              <Skeleton className="h-3 w-24 rounded" />
            </div>
            <Skeleton className="mt-2 h-6 w-20 rounded" />
          </div>
        ))}
      </div>

      {/* Revenue chart */}
      <div className="mb-8 rounded-xl border border-slate-200 bg-white p-6">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div className="space-y-1.5">
            <Skeleton className="h-5 w-40 rounded" />
            <Skeleton className="h-3 w-48 rounded" />
          </div>
          <Skeleton className="h-8 w-40 rounded-lg" />
        </div>
        <Skeleton className="h-48 w-full rounded-lg" />
      </div>

      {/* Bottom cards */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="overflow-hidden rounded-xl border border-slate-200 bg-white"
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <Skeleton className="h-5 w-36 rounded" />
              <Skeleton className="h-4 w-16 rounded" />
            </div>
            {Array.from({ length: 5 }).map((_, j) => (
              <div
                key={j}
                className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5 last:border-0"
              >
                <div className="space-y-1">
                  <Skeleton className="h-4 w-40 rounded" />
                  <Skeleton className="h-3 w-28 rounded" />
                </div>
                <Skeleton className="h-5 w-16 rounded" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
