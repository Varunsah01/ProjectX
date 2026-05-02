import { cn } from "@/lib/cn";
import type { JobStatus } from "@/lib/portal-types";

const STEPS: { status: JobStatus; label: string }[] = [
  { status: "pending", label: "Pending" },
  { status: "assigned", label: "Assigned" },
  { status: "en_route", label: "En Route" },
  { status: "in_progress", label: "In Progress" },
  { status: "completed", label: "Completed" },
];

const STATUS_ORDER: Record<string, number> = {
  pending: 0,
  assigned: 1,
  en_route: 2,
  in_progress: 3,
  completed: 4,
  cancelled: -1,
};

export function JobStatusTimeline({ status }: { status: JobStatus }) {
  const currentIdx = STATUS_ORDER[status] ?? -1;

  if (status === "cancelled") {
    return (
      <span className="text-xs font-medium text-red-600">Cancelled</span>
    );
  }

  return (
    <div className="flex items-center gap-1">
      {STEPS.map((step, idx) => {
        const isActive = idx <= currentIdx;
        const isCurrent = idx === currentIdx;
        const isEnRoute = step.status === "en_route" && isCurrent;

        return (
          <div key={step.status} className="flex items-center gap-1">
            <div
              className={cn(
                "h-2 w-2 rounded-full transition-colors",
                isActive ? "bg-brand-500" : "bg-slate-200",
                isEnRoute && "animate-pulse bg-indigo-500",
              )}
            />
            {idx < STEPS.length - 1 && (
              <div
                className={cn(
                  "h-0.5 w-3 sm:w-5 transition-colors",
                  idx < currentIdx ? "bg-brand-500" : "bg-slate-200",
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
