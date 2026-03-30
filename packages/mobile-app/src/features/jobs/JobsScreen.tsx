import JobBoard from "./components/JobBoard";
import { APP_OPERATOR_FALLBACK_NAME } from "../../constants/branding";
import { useAuth } from "../../hooks/useAuth";
import { useJobsFeed } from "./useJobsFeed";

export default function JobsScreen({
  onOpenJob,
}: {
  onOpenJob: (jobId: string) => void;
}) {
  const { user } = useAuth();
  const { jobs, loading, error, reload } = useJobsFeed();

  return (
    <JobBoard
      screenLabel="Job List"
      operatorName={user?.name ?? APP_OPERATOR_FALLBACK_NAME}
      subtitle="Assigned jobs grouped into today, upcoming visits, and overdue follow-up work."
      jobs={jobs}
      loading={loading}
      error={error}
      onRefresh={() => void reload()}
      onOpenJob={onOpenJob}
    />
  );
}
