"use client";

import { useState } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
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
  const [drawerOpen, setDrawerOpen] = useState(false);

  const hasActiveFilters = searchValue || filters?.some((f) => f.value !== "all");
  const activeFilterCount = filters?.filter((f) => f.value !== "all").length ?? 0;

  const handleClearAll = () => {
    if (onClearAll) {
      onClearAll();
      return;
    }
    onSearchChange("");
    filters?.forEach((f) => f.onChange("all"));
  };

  return (
    <>
      {/* ── Mobile bar ────────────────────────────────────────────────── */}
      <div className={cn("md:hidden flex items-center gap-2 mb-4", className)}>
        {/* Search input */}
        <div className="relative flex-1">
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

        {/* Filters button */}
        {filters && filters.length > 0 && (
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className={cn(
              "relative flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors",
              activeFilterCount > 0
                ? "border-brand-300 bg-brand-50 text-brand-700"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
            )}
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filters
            {activeFilterCount > 0 && (
              <span className="ml-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-brand-600 text-[10px] font-bold text-white">
                {activeFilterCount}
              </span>
            )}
          </button>
        )}
      </div>

      {/* ── Mobile drawer ─────────────────────────────────────────────── */}
      {drawerOpen && (
        <>
          {/* Backdrop */}
          <div
            className="md:hidden fixed inset-0 z-40 bg-black/40"
            onClick={() => setDrawerOpen(false)}
          />
          {/* Sheet */}
          <div className="md:hidden fixed inset-x-0 bottom-0 z-50 rounded-t-2xl bg-white pb-8 shadow-xl">
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="h-1 w-10 rounded-full bg-slate-300" />
            </div>

            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <h3 className="text-base font-semibold text-slate-900">Filters</h3>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="px-4 pt-4 space-y-4">
              {filters?.map((filter) => (
                <div key={filter.label}>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                    {filter.label}
                  </label>
                  <select
                    value={filter.value}
                    onChange={(e) => filter.onChange(e.target.value)}
                    className={cn(
                      "w-full rounded-lg border bg-white px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all cursor-pointer",
                      filter.value !== "all"
                        ? "border-brand-300 text-brand-700 bg-brand-50"
                        : "border-slate-200 text-slate-700",
                    )}
                  >
                    {filter.options.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            <div className="mt-4 flex gap-3 px-4">
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={() => {
                    handleClearAll();
                    setDrawerOpen(false);
                  }}
                  className="flex-1 rounded-lg border border-slate-200 bg-white py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Clear all
                </button>
              )}
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="flex-1 rounded-lg bg-brand-600 py-2.5 text-sm font-medium text-white hover:bg-brand-700 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── Desktop bar (md and above) ────────────────────────────────── */}
      <div
        className={cn(
          "hidden md:flex flex-wrap items-center gap-3 mb-4",
          className,
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
                : "border-slate-200 text-slate-700",
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
            onClick={handleClearAll}
            className="text-xs text-slate-500 hover:text-slate-700 transition-colors"
          >
            Clear all
          </button>
        )}
      </div>
    </>
  );
}
