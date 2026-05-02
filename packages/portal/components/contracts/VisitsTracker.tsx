interface VisitsTrackerProps {
  used: number;
  covered: number;
}

export function VisitsTracker({ used, covered }: VisitsTrackerProps) {
  const percent = covered > 0 ? Math.min(100, (used / covered) * 100) : 0;

  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <span className="text-xs font-medium text-slate-700">
          Service Visits
        </span>
        <span className="text-xs text-slate-500">
          {used} / {covered}
        </span>
      </div>
      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
        <div
          className="h-full rounded-full bg-brand-500 transition-all"
          style={{ width: `${percent}%` }}
        />
      </div>
      {used >= covered && covered > 0 && (
        <p className="text-xs text-amber-600 mt-1">
          All covered visits have been used
        </p>
      )}
    </div>
  );
}
