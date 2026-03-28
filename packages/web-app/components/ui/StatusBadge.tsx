import { cn } from "@/lib/cn";
import { getStatusColor, getStatusDotColor } from "@/lib/utils";

export function StatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
        getStatusColor(status),
        className
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", getStatusDotColor(status))} />
      {status.replace(/_/g, " ")}
    </span>
  );
}
