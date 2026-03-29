import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import { useSync } from "../../hooks/useSync";
import { getErrorMessage } from "../../services/api";
import { loadJobsCache, saveJobsCache } from "../../services/job-cache";
import { applyPendingActionsToJobs } from "../../services/offline-sync";
import { fetchJobs } from "../../services/jobs";
import type { Job } from "../../types/domain";

export function useJobsFeed() {
  const { request } = useAuth();
  const { pendingActions } = useSync();
  const [baseJobs, setBaseJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetchJobs(request);
      setBaseJobs(response);
      await saveJobsCache(response);
    } catch (jobsError) {
      const cachedJobs = await loadJobsCache();

      if (cachedJobs.length > 0) {
        setBaseJobs(cachedJobs);
        setError("Showing the last saved route. Pending field updates will sync when the connection returns.");
      } else {
        setError(getErrorMessage(jobsError));
      }
    } finally {
      setLoading(false);
    }
  }, [request]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const jobs = useMemo(
    () => applyPendingActionsToJobs(baseJobs, pendingActions),
    [baseJobs, pendingActions],
  );

  return {
    jobs,
    loading,
    error,
    reload,
  };
}
