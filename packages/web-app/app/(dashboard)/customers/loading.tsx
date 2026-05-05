import { DataTableSkeleton, Skeleton } from "@/components/ui/Skeleton";

export default function CustomersLoading() {
  return (
    <div>
      <div className="mb-6">
        <Skeleton className="h-8 w-36 rounded" />
        <Skeleton className="mt-2 h-4 w-56 rounded" />
      </div>
      <div className="mb-4">
        <Skeleton className="h-10 w-full rounded-lg" />
      </div>
      <DataTableSkeleton columns={6} rows={8} hasSelection />
    </div>
  );
}
