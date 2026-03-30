import { useCallback, useEffect, useState } from "react";
import { useAuth } from "./useAuth";
import { loadComplaintsCache, saveComplaintsCache } from "../services/complaint-cache";
import { fetchComplaints } from "../services/complaints";
import { getErrorMessage } from "../services/api";
import type { ComplaintSummary } from "../types/domain";

export function useComplaintsFeed() {
  const { request } = useAuth();
  const [complaints, setComplaints] = useState<ComplaintSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showingCachedData, setShowingCachedData] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const nextComplaints = await fetchComplaints(request);
      setComplaints(nextComplaints);
      setShowingCachedData(false);
      await saveComplaintsCache(nextComplaints);
    } catch (complaintsError) {
      const cachedComplaints = await loadComplaintsCache();

      if (cachedComplaints.length > 0) {
        setComplaints(cachedComplaints);
        setShowingCachedData(true);
        setError(
          "Showing the last saved complaints list. Pull to refresh again when the connection improves.",
        );
      } else {
        setComplaints([]);
        setShowingCachedData(false);
        setError(getErrorMessage(complaintsError));
      }
    } finally {
      setLoading(false);
    }
  }, [request]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return {
    complaints,
    loading,
    error,
    reload,
    showingCachedData,
  };
}
