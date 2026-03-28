"use client";

import { Search, X } from "lucide-react";
import { cn } from "@/lib/cn";

interface FilterOption {
  label: string;
  value: string;
}

interface FilterBarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  onClearAll?: () => void;
  filters?: {
    label: string;
    value: string;
    options: FilterOption[];
    onChange: (value: string) => void;
  }[];
  className?: string;
  resultCount?: number;
  totalCount?: number;
}

export function FilterBar({
  searchValue,
  onSearchChange,
  searchPlaceholder = "Search...",
  onClearAll,
  filters,
  className,
}: FilterBarProps) {
  const hasActiveFilters =
    searchValue || filters?.some((f) => f.value !== "all");

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-3 mb-4",
        className
      )}
    >
      <div className="relative flex-1 min-w-[200px] max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder}
          className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-8 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all"
        />
        {searchValue && (
          <button
            onClick={() => onSearchChange("")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      {filters?.map((filter) => (
        <select
          key={filter.label}
          value={filter.value}
          onChange={(e) => filter.onChange(e.target.value)}
          className={cn(
            "rounded-lg border bg-white px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all cursor-pointer",
            filter.value !== "all"
              ? "border-brand-300 text-brand-700 bg-brand-50"
              : "border-slate-200 text-slate-700"
          )}
        >
          {filter.options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      ))}
      {hasActiveFilters && (
        <button
          onClick={() => {
            if (onClearAll) {
              onClearAll();
              return;
            }

            onSearchChange("");
            filters?.forEach((f) => f.onChange("all"));
          }}
          className="text-xs text-slate-500 hover:text-slate-700 transition-colors"
        >
          Clear all
        </button>
      )}
    </div>
  );
}
