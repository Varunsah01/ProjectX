"use client";

import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { addBillingCycle, formatBillingCycleLabel } from "@/lib/billing";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { BillingCycle } from "@/lib/types";

interface Props {
  startDate: string;
  endDate: string;
  billingCycle: BillingCycle;
  price: number;
  /** Wrap the table in a collapsible toggle (for forms). Default: false (always shown). */
  collapsible?: boolean;
}

interface ScheduleRow {
  index: number;
  dateStr: string;
  isPast: boolean;
}

function computeSchedule(
  startDate: string,
  endDate: string,
  billingCycle: BillingCycle,
): ScheduleRow[] {
  if (!startDate || !endDate) return [];

  const end = new Date(endDate);
  const todayStr = new Date().toISOString().split("T")[0];
  const rows: ScheduleRow[] = [];
  let current = new Date(startDate);
  let i = 0;

  // Guard: max 60 rows
  while (current <= end && i < 60) {
    const dateStr = current.toISOString().split("T")[0];
    rows.push({ index: i + 1, dateStr, isPast: dateStr < todayStr });
    current = addBillingCycle(current, billingCycle);
    i++;
  }

  return rows;
}

export function BillingSchedulePreview({
  startDate,
  endDate,
  billingCycle,
  price,
  collapsible = false,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);

  const rows = useMemo(
    () => computeSchedule(startDate, endDate, billingCycle),
    [startDate, endDate, billingCycle],
  );

  if (!startDate || !endDate || rows.length === 0) return null;

  const totalAmount = rows.length * price;
  const visible = !collapsible || isOpen;

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200">
      {collapsible && (
        <button
          type="button"
          onClick={() => setIsOpen((v) => !v)}
          className="flex w-full items-center justify-between bg-slate-50 px-4 py-3 text-left transition-colors hover:bg-slate-100"
        >
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-700">
              View billing schedule
            </span>
            <span className="rounded-full bg-brand-100 px-2 py-0.5 text-xs font-semibold text-brand-700">
              {rows.length} {rows.length === 1 ? "invoice" : "invoices"} ·{" "}
              {formatBillingCycleLabel(billingCycle)}
            </span>
          </div>
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-150 ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </button>
      )}

      {visible && (
        <>
          {!collapsible && (
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <span className="text-sm font-medium text-slate-700">
                Billing Schedule
              </span>
              <span className="text-xs text-slate-500">
                {rows.length} {rows.length === 1 ? "invoice" : "invoices"} ·{" "}
                {formatBillingCycleLabel(billingCycle)}
              </span>
            </div>
          )}

          <div className={collapsible ? "border-t border-slate-100" : ""}>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/80">
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    #
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Billing Date
                  </th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row) => (
                  <tr
                    key={row.index}
                    className={`transition-colors hover:bg-slate-50 ${
                      row.isPast ? "opacity-40" : ""
                    }`}
                  >
                    <td className="px-4 py-2.5 tabular-nums text-slate-500">
                      {row.index}
                    </td>
                    <td className="px-4 py-2.5 text-slate-900">
                      {formatDate(row.dateStr)}
                      {row.isPast && (
                        <span className="ml-2 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
                          past
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums font-medium text-slate-900">
                      {formatCurrency(price)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-slate-200 bg-slate-50">
                  <td
                    colSpan={2}
                    className="px-4 py-2.5 text-xs font-semibold text-slate-600"
                  >
                    Total contract value
                  </td>
                  <td className="px-4 py-2.5 text-right text-xs font-bold text-slate-900">
                    {formatCurrency(totalAmount)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
