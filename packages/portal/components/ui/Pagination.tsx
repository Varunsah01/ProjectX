"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  page: number;
  totalPages: number;
}

export function Pagination({ page, totalPages }: PaginationProps) {
  const searchParams = useSearchParams();

  function buildHref(targetPage: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(targetPage));
    return `?${params.toString()}`;
  }

  if (totalPages <= 1) return null;

  const isFirst = page <= 1;
  const isLast = page >= totalPages;

  return (
    <div className="mt-6 flex items-center justify-center gap-2 text-sm">
      {isFirst ? (
        <span className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-slate-300 cursor-not-allowed">
          <ChevronLeft className="h-4 w-4" />
          Previous
        </span>
      ) : (
        <Link
          href={buildHref(page - 1)}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-slate-600 hover:bg-slate-50 transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </Link>
      )}

      <span className="text-slate-500 px-2">
        Page {page} of {totalPages}
      </span>

      {isLast ? (
        <span className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-slate-300 cursor-not-allowed">
          Next
          <ChevronRight className="h-4 w-4" />
        </span>
      ) : (
        <Link
          href={buildHref(page + 1)}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-slate-600 hover:bg-slate-50 transition-colors"
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}
