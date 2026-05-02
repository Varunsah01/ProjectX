import type { PortalTicketTimelineEntry } from "@/lib/portal-types";

export function TicketTimeline({
  entries,
}: {
  entries: PortalTicketTimelineEntry[];
}) {
  return (
    <div className="relative">
      <div className="absolute left-3 top-0 bottom-0 w-px bg-slate-200" />
      <div className="space-y-4">
        {entries.map((entry, idx) => {
          const isCustomer = entry.by === "You";
          return (
            <div key={entry.id ?? idx} className="relative pl-8">
              <div
                className={`absolute left-2 top-1 h-2.5 w-2.5 rounded-full border-2 border-white ${
                  isCustomer ? "bg-brand-500" : "bg-slate-400"
                }`}
              />
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-slate-900">
                    {entry.by}
                  </span>
                  <span className="text-xs text-slate-400">{entry.date}</span>
                </div>
                <p className="text-sm text-slate-700 mt-0.5">{entry.action}</p>
                {entry.note && (
                  <p className="text-sm text-slate-500 mt-1 whitespace-pre-wrap">
                    {entry.note}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
