import { DataTableSkeleton, Skeleton } from "@/components/ui/Skeleton";

export default function AssetsLoading() {
  return (
    <div>
      <div className="mb-6">
        <Skeleton className="h-8 w-24 rounded" />
        <Skeleton className="mt-2 h-4 w-52 rounded" />
      </div>
      <div className="mb-4">
        <Skeleton className="h-10 w-full rounded-lg" />
      </div>
      <DataTableSkeleton columns={7} rows={8} />
    </div>
  );
}
