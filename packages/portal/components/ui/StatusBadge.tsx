import { cn } from "@/lib/cn";

const STATUS_COLORS: Record<string, string> = {
  // Invoice
  issued: "bg-blue-50 text-blue-700",
  paid: "bg-green-50 text-green-700",
  overdue: "bg-red-50 text-red-700",
  partial: "bg-amber-50 text-amber-700",
  cancelled: "bg-slate-100 text-slate-600",
  refunded: "bg-purple-50 text-purple-700",
  partially_refunded: "bg-purple-50 text-purple-700",
  // Contract
  active: "bg-green-50 text-green-700",
  expired: "bg-red-50 text-red-700",
  expiring_soon: "bg-amber-50 text-amber-700",
  renewed: "bg-blue-50 text-blue-700",
  // Job
  pending: "bg-slate-100 text-slate-600",
  assigned: "bg-blue-50 text-blue-700",
  en_route: "bg-indigo-50 text-indigo-700",
  in_progress: "bg-amber-50 text-amber-700",
  completed: "bg-green-50 text-green-700",
  // Ticket
  open: "bg-blue-50 text-blue-700",
  on_hold: "bg-amber-50 text-amber-700",
  resolved: "bg-green-50 text-green-700",
  closed: "bg-slate-100 text-slate-600",
  reopened: "bg-red-50 text-red-700",
};

// Priority
const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-slate-100 text-slate-600",
  medium: "bg-blue-50 text-blue-700",
  high: "bg-amber-50 text-amber-700",
  critical: "bg-red-50 text-red-700",
};

interface StatusBadgeProps {
  status: string;
  variant?: "status" | "priority";
  className?: string;
}

export function StatusBadge({
  status,
  variant = "status",
  className,
}: StatusBadgeProps) {
  const colorMap = variant === "priority" ? PRIORITY_COLORS : STATUS_COLORS;
  const colors = colorMap[status] ?? "bg-slate-100 text-slate-600";
  const label = status.replace(/_/g, " ");

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize",
        colors,
        className,
      )}
    >
      {label}
    </span>
  );
}
