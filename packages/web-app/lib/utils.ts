export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(date: string): string {
  return new Date(date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function daysUntil(date: string): number {
  const now = new Date();
  const target = new Date(date);
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    active: "bg-green-100 text-green-700",
    inactive: "bg-slate-100 text-slate-600",
    suspended: "bg-red-100 text-red-700",
    paid: "bg-green-100 text-green-700",
    unpaid: "bg-red-100 text-red-700",
    overdue: "bg-red-100 text-red-700",
    partial: "bg-amber-100 text-amber-700",
    draft: "bg-slate-100 text-slate-600",
    issued: "bg-blue-100 text-blue-700",
    cancelled: "bg-slate-100 text-slate-500",
    open: "bg-blue-100 text-blue-700",
    assigned: "bg-purple-100 text-purple-700",
    in_progress: "bg-amber-100 text-amber-700",
    on_hold: "bg-slate-100 text-slate-600",
    resolved: "bg-green-100 text-green-700",
    closed: "bg-slate-100 text-slate-500",
    reopened: "bg-red-100 text-red-700",
    pending: "bg-amber-100 text-amber-700",
    completed: "bg-green-100 text-green-700",
    en_route: "bg-blue-100 text-blue-700",
    available: "bg-green-100 text-green-700",
    on_job: "bg-amber-100 text-amber-700",
    off_duty: "bg-slate-100 text-slate-500",
    expired: "bg-red-100 text-red-700",
    expiring_soon: "bg-amber-100 text-amber-700",
    renewed: "bg-green-100 text-green-700",
  };
  return colors[status] || "bg-slate-100 text-slate-600";
}

export function getStatusDotColor(status: string): string {
  const dots: Record<string, string> = {
    active: "bg-green-500",
    inactive: "bg-slate-400",
    suspended: "bg-red-500",
    paid: "bg-green-500",
    unpaid: "bg-red-500",
    overdue: "bg-red-500",
    partial: "bg-amber-500",
    draft: "bg-slate-400",
    issued: "bg-blue-500",
    cancelled: "bg-slate-400",
    open: "bg-blue-500",
    assigned: "bg-purple-500",
    in_progress: "bg-amber-500",
    on_hold: "bg-slate-400",
    resolved: "bg-green-500",
    closed: "bg-slate-400",
    reopened: "bg-red-500",
    pending: "bg-amber-500",
    completed: "bg-green-500",
    en_route: "bg-blue-500",
    available: "bg-green-500",
    on_job: "bg-amber-500",
    off_duty: "bg-slate-400",
    expired: "bg-red-500",
    expiring_soon: "bg-amber-500",
    renewed: "bg-green-500",
    critical: "bg-red-500",
    high: "bg-orange-500",
    medium: "bg-amber-500",
    low: "bg-blue-500",
  };
  return dots[status] || "bg-slate-400";
}
