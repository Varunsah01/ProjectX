"use client";

import { X } from "lucide-react";
import { cn } from "@/lib/cn";

interface BulkAction {
  key: string;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "danger";
}

interface BulkActionBarProps {
  selectedCount: number;
  actions: BulkAction[];
  onClear: () => void;
  className?: string;
}

export function BulkActionBar({
  selectedCount,
  actions,
  onClear,
  className,
}: BulkActionBarProps) {
  if (selectedCount <= 0) {
    return null;
  }

  return (
    <div
      className={cn(
        // Mobile: fixed bottom bar
        "fixed inset-x-0 bottom-0 z-50 border-t border-brand-200 bg-brand-50 px-4 py-3",
        // Desktop: inline bar above the table
        "md:static md:z-auto md:mb-4 md:rounded-xl md:border md:border-brand-200",
        className,
      )}
    >
      <div className="flex items-center gap-3 md:justify-between">
        {/* Count badge + label */}
        <div className="flex shrink-0 items-center gap-2">
          <span className="rounded-full bg-brand-600 px-2.5 py-1 text-xs font-semibold text-white">
            {selectedCount}
          </span>
          <p className="shrink-0 text-sm font-medium text-slate-700">
            {selectedCount} item{selectedCount === 1 ? "" : "s"} selected
          </p>
        </div>

        {/* Actions — horizontal scroll on mobile, wrap on desktop */}
        <div className="ml-auto flex items-center gap-2 overflow-x-auto md:ml-0 md:overflow-visible md:flex-wrap">
          {actions.map((action) => (
            <button
              key={action.key}
              type="button"
              disabled={action.disabled}
              onClick={action.onClick}
              className={cn(
                "shrink-0 rounded-lg px-3 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-70",
                action.variant === "primary" &&
                  "bg-brand-600 text-white hover:bg-brand-700",
                action.variant === "danger" &&
                  "bg-red-600 text-white hover:bg-red-700",
                (!action.variant || action.variant === "secondary") &&
                  "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
              )}
            >
              {action.label}
            </button>
          ))}
          <button
            type="button"
            onClick={onClear}
            className="shrink-0 inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-slate-500 transition-colors hover:bg-white hover:text-slate-700"
          >
            <X className="h-4 w-4" />
            Clear
          </button>
        </div>
      </div>
    </div>
  );
}
