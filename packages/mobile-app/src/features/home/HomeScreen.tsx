import JobBoard from "../jobs/components/JobBoard";
import { useAuth } from "../../hooks/useAuth";
import { useJobsFeed } from "../jobs/useJobsFeed";

export default function HomeScreen({
  onOpenJob,
  onOpenComplaint: _onOpenComplaint,
  onOpenTab,
}: {
  onOpenJob: (jobId: string) => void;
  onOpenComplaint: (complaintId: string) => void;
  onOpenTab: (tab: "jobs" | "complaints") => void;
}) {
  const { user } = useAuth();
  const { jobs, loading, error, reload } = useJobsFeed();

  return (
    <JobBoard
      screenLabel="Home"
      operatorName={user?.name ?? "Field Operator"}
      subtitle={`Territory: ${user?.territory || "Unassigned"} · Pull to refresh for the latest assigned jobs.`}
      jobs={jobs}
      loading={loading}
      error={error}
      onRefresh={() => void reload()}
      onOpenJob={onOpenJob}
      secondaryActionLabel="Complaints"
      onSecondaryAction={() => onOpenTab("complaints")}
    />
  );
}
