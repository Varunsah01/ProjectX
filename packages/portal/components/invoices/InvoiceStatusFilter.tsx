"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/cn";

const TABS = [
  { label: "All", value: "all" },
  { label: "Issued", value: "issued" },
  { label: "Overdue", value: "overdue" },
  { label: "Partial", value: "partial" },
  { label: "Paid", value: "paid" },
] as const;

export function InvoiceStatusFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = searchParams.get("status") || "all";

  function handleChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") {
      params.delete("status");
    } else {
      params.set("status", value);
    }
    params.delete("page");
    router.push(`?${params.toString()}`);
  }

  return (
    <div className="flex gap-1 overflow-x-auto pb-1">
      {TABS.map((tab) => (
        <button
          key={tab.value}
          onClick={() => handleChange(tab.value)}
          className={cn(
            "whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
            current === tab.value
              ? "bg-brand-600 text-white"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200",
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
