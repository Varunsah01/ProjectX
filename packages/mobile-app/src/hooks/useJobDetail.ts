import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "./useAuth";
import { useSync } from "./useSync";
import { getErrorMessage } from "../services/api";
import { loadJobDetailCache, saveJobDetailCache } from "../services/job-cache";
import { applyPendingActionsToJob } from "../services/offline-sync";
import { fetchJobDetail } from "../services/jobs";
import type { Job } from "../types/domain";

export function useJobDetail(jobId: string) {
  const { request } = useAuth();
  const { pendingActions } = useSync();
  const [baseJob, setBaseJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const detail = await fetchJobDetail(request, jobId);
      setBaseJob(detail);
      await saveJobDetailCache(detail);
    } catch (jobError) {
      const cachedJob = await loadJobDetailCache(jobId);

      if (cachedJob) {
        setBaseJob(cachedJob);
        setError("Showing the last saved job details. Pending field updates will sync when the connection returns.");
      } else {
        setError(getErrorMessage(jobError));
      }
    } finally {
      setLoading(false);
    }
  }, [jobId, request]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const job = useMemo(
    () => (baseJob ? applyPendingActionsToJob(baseJob, pendingActions) : null),
    [baseJob, pendingActions],
  );

  return {
    job,
    loading,
    error,
    reload,
    setJob: setBaseJob,
  };
}
