import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { JobStatusTimeline } from "@/components/jobs/JobStatusTimeline";
import type { PortalJob } from "@/lib/portal-types";

export function JobListCard({ job }: { job: PortalJob }) {
  const isEnRoute = job.status === "en_route";

  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900 truncate">
            {job.jobNumber}
          </p>
          <p className="text-xs text-slate-500 mt-0.5">
            {job.type}
            {job.assetName && <> &middot; {job.assetName}</>}
          </p>
        </div>
        <StatusBadge status={job.status} />
      </div>

      <div className="mt-3">
        <JobStatusTimeline status={job.status} />
      </div>

      {isEnRoute && (
        <div className="mt-2 flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-indigo-500" />
          </span>
          <span className="text-xs font-medium text-indigo-600">
            Technician on the way
          </span>
        </div>
      )}

      <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
        <span>
          Scheduled: {job.scheduledDate}
          {job.completedAt && <> &middot; Done: {job.completedAt}</>}
        </span>
        <span>{job.technicianName}</span>
      </div>
    </Card>
  );
}
