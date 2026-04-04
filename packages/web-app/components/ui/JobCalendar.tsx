"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { listJobsAction } from "@/lib/actions/jobs";
import type { Job, Technician } from "@/lib/types";

// ── constants ──────────────────────────────────────────────────────────────

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const STATUS_CARD: Record<string, string> = {
  pending:     "bg-slate-100 border-slate-200 text-slate-700",
  assigned:    "bg-blue-50 border-blue-200 text-blue-800",
  en_route:    "bg-purple-50 border-purple-200 text-purple-800",
  in_progress: "bg-amber-50 border-amber-200 text-amber-800",
  completed:   "bg-emerald-50 border-emerald-200 text-emerald-800",
  cancelled:   "bg-slate-50 border-slate-100 text-slate-400",
};

const STATUS_DOT: Record<string, string> = {
  pending:     "bg-slate-400",
  assigned:    "bg-blue-500",
  en_route:    "bg-purple-500",
  in_progress: "bg-amber-500",
  completed:   "bg-emerald-500",
  cancelled:   "bg-slate-300",
};

// ── date helpers ─────────────────────────────────────────────────────────────

function toLocalDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function getMonday(d: Date): Date {
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);
  const dow = date.getDay(); // 0=Sun
  const diff = dow === 0 ? -6 : 1 - dow;
  date.setDate(date.getDate() + diff);
  return date;
}

function getMondayFromStr(s: string): Date {
  if (!s) return getMonday(new Date());
  const d = new Date(s + "T00:00:00");
  return isNaN(d.getTime()) ? getMonday(new Date()) : getMonday(d);
}

function getWeekDays(monday: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    return d;
  });
}

function weekRangeLabel(monday: Date): string {
  const sunday = new Date(monday);
  sunday.setDate(sunday.getDate() + 6);
  const sm = MONTHS[monday.getMonth()];
  const em = MONTHS[sunday.getMonth()];
  if (monday.getMonth() === sunday.getMonth()) {
    return `${sm} ${monday.getDate()} – ${sunday.getDate()}, ${sunday.getFullYear()}`;
  }
  return `${sm} ${monday.getDate()} – ${em} ${sunday.getDate()}, ${sunday.getFullYear()}`;
}

function isSameLocalDay(dateStr: string, day: Date): boolean {
  const d = new Date(dateStr);
  return (
    d.getFullYear() === day.getFullYear() &&
    d.getMonth() === day.getMonth() &&
    d.getDate() === day.getDate()
  );
}

function techInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

// ── JobCard ──────────────────────────────────────────────────────────────────

function JobCard({ job, onClick }: { job: Job; onClick: () => void }) {
  const cardCls = STATUS_CARD[job.status] ?? STATUS_CARD.pending;
  const dotCls = STATUS_DOT[job.status] ?? STATUS_DOT.pending;
  const isCancelled = job.status === "cancelled";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left rounded-lg border px-2 py-1.5 transition-opacity hover:opacity-75 ${cardCls} ${
        isCancelled ? "opacity-50" : ""
      }`}
    >
      <div className="flex items-center gap-1.5 mb-0.5">
        <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${dotCls}`} />
        <span className="text-xs font-semibold truncate leading-tight">
          {job.customerName}
        </span>
      </div>
      <div className="flex items-center gap-1.5 pl-3">
        <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-white/70 text-[8px] font-bold">
          {techInitials(job.technicianName)}
        </span>
        <span className="text-[10px] capitalize opacity-75 truncate">{job.type}</span>
      </div>
    </button>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="w-full animate-pulse rounded-lg border border-slate-100 bg-slate-50 px-2 py-2 space-y-1.5">
      <div className="h-3 w-3/4 rounded bg-slate-200" />
      <div className="h-2.5 w-1/2 rounded bg-slate-100" />
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export interface JobCalendarProps {
  technicians: Technician[];
  initialWeekStr: string;
  initialTechId: string;
}

export function JobCalendar({
  technicians,
  initialWeekStr,
  initialTechId,
}: JobCalendarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [weekStart, setWeekStart] = useState<Date>(() =>
    getMondayFromStr(initialWeekStr),
  );
  const [techId, setTechId] = useState(initialTechId);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  const todayStr = toLocalDateStr(new Date());

  // ── URL sync ──────────────────────────────────────────────────────────────

  const updateUrl = (overrides: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(overrides)) {
      if (v === null || v === "") next.delete(k);
      else next.set(k, v);
    }
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  };

  // ── Navigation ────────────────────────────────────────────────────────────

  const navigate = (direction: -1 | 1) => {
    const next = new Date(weekStart);
    next.setDate(next.getDate() + direction * 7);
    setWeekStart(next);
    updateUrl({ week: toLocalDateStr(next) });
  };

  const goToToday = () => {
    const monday = getMonday(new Date());
    setWeekStart(monday);
    updateUrl({ week: null });
  };

  const handleTechChange = (id: string) => {
    setTechId(id);
    updateUrl({ calTech: id || null });
  };

  // ── Data fetch ────────────────────────────────────────────────────────────

  const weekKey = toLocalDateStr(weekStart);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const monday = new Date(weekStart);
    const sunday = new Date(monday);
    sunday.setDate(sunday.getDate() + 6);

    listJobsAction({
      fromDate: toLocalDateStr(monday),
      toDate: toLocalDateStr(sunday),
      technicianId: techId || undefined,
      pageSize: 100,
      sortBy: "scheduledDate",
      sortOrder: "asc",
    }).then((result) => {
      if (!cancelled) {
        if (result.success) setJobs(result.data.data);
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekKey, techId]);

  // ── Render ────────────────────────────────────────────────────────────────

  const weekDays = getWeekDays(weekStart);

  return (
    <div>
      {/* Toolbar */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="Previous week"
            className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 transition-colors hover:bg-slate-50"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-[210px] text-center text-sm font-semibold text-slate-800">
            {weekRangeLabel(weekStart)}
          </span>
          <button
            type="button"
            onClick={() => navigate(1)}
            aria-label="Next week"
            className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 transition-colors hover:bg-slate-50"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={goToToday}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50"
          >
            Today
          </button>
        </div>

        {/* Technician filter */}
        <select
          value={techId}
          onChange={(e) => handleTechChange(e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="">All Technicians</option>
          {technicians.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>

      {/* Calendar */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        {/* Day header row */}
        <div className="grid grid-cols-7 border-b border-slate-200">
          {weekDays.map((day, i) => {
            const dayStr = toLocalDateStr(day);
            const isToday = dayStr === todayStr;
            return (
              <div
                key={dayStr}
                className={`border-r border-slate-100 px-2 py-3 text-center last:border-r-0 ${
                  isToday ? "bg-brand-50" : ""
                }`}
              >
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  {DAY_LABELS[i]}
                </p>
                {isToday ? (
                  <span className="mx-auto mt-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white">
                    {day.getDate()}
                  </span>
                ) : (
                  <p className="mt-0.5 text-sm font-bold text-slate-700">
                    {day.getDate()}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {/* Job columns */}
        <div className="grid grid-cols-7 divide-x divide-slate-100">
          {weekDays.map((day) => {
            const dayStr = toLocalDateStr(day);
            const isToday = dayStr === todayStr;
            const dayJobs = jobs.filter((j) => isSameLocalDay(j.scheduledDate, day));

            return (
              <div
                key={dayStr}
                className={`min-h-[440px] space-y-1.5 p-2 ${
                  isToday ? "bg-brand-50/20" : ""
                }`}
              >
                {loading ? (
                  <>
                    <SkeletonCard />
                    <SkeletonCard />
                  </>
                ) : dayJobs.length === 0 ? (
                  <p className="mt-10 select-none text-center text-[11px] text-slate-300">
                    No jobs
                  </p>
                ) : (
                  dayJobs.map((job) => (
                    <JobCard
                      key={job.id}
                      job={job}
                      onClick={() => router.push(`/jobs/${job.id}`)}
                    />
                  ))
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-slate-500">
        {[
          { label: "Pending",     dot: "bg-slate-400" },
          { label: "Assigned",    dot: "bg-blue-500" },
          { label: "En Route",    dot: "bg-purple-500" },
          { label: "In Progress", dot: "bg-amber-500" },
          { label: "Completed",   dot: "bg-emerald-500" },
        ].map((s) => (
          <div key={s.label} className="flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-full ${s.dot}`} />
            {s.label}
          </div>
        ))}
      </div>
    </div>
  );
}
