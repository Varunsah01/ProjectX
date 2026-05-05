import { Skeleton } from "@/components/ui/Skeleton";

export default function TechniciansLoading() {
  return (
    <div>
      <div className="mb-6">
        <Skeleton className="h-8 w-36 rounded" />
        <Skeleton className="mt-2 h-4 w-52 rounded" />
      </div>
      <div className="mb-4">
        <Skeleton className="h-10 w-full rounded-lg" />
      </div>
      {/* Card grid matching TechniciansPageClient layout */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-slate-200 bg-white p-6"
          >
            {/* Avatar + name header */}
            <div className="mb-4 flex items-start gap-4">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="min-w-0 flex-1 space-y-1.5">
                <Skeleton className="h-5 w-32 rounded" />
                <Skeleton className="h-3 w-24 rounded" />
              </div>
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
            {/* Stat rows */}
            {Array.from({ length: 3 }).map((_, j) => (
              <div key={j} className="flex items-center justify-between py-1">
                <Skeleton className="h-3 w-24 rounded" />
                <Skeleton className="h-3 w-12 rounded" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
