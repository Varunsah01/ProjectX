import { DataTableSkeleton, MetricCardSkeleton, Skeleton } from "@/components/ui/Skeleton";

export default function CollectionsLoading() {
  return (
    <div>
      <div className="mb-6">
        <Skeleton className="h-8 w-36 rounded" />
        <Skeleton className="mt-2 h-4 w-52 rounded" />
      </div>

      {/* 3 MetricCards matching CollectionsPageClient */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <MetricCardSkeleton key={i} />
        ))}
      </div>

      {/* Aging buckets panel */}
      <div className="mb-6 overflow-hidden rounded-xl border border-slate-200 bg-white p-5">
        <Skeleton className="mb-4 h-5 w-40 rounded" />
        <Skeleton className="mb-3 h-6 w-full rounded-full" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="space-y-1">
              <Skeleton className="h-3 w-20 rounded" />
              <Skeleton className="h-5 w-16 rounded" />
            </div>
          ))}
        </div>
      </div>

      <div className="mb-4">
        <Skeleton className="h-10 w-full rounded-lg" />
      </div>
      <DataTableSkeleton columns={6} rows={8} />
    </div>
  );
}
