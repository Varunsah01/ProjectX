import { useCallback, useEffect, useState } from "react";
import { useAuth } from "./useAuth";
import {
  loadComplaintDetailCache,
  saveComplaintDetailCache,
} from "../services/complaint-cache";
import { fetchComplaintDetail } from "../services/complaints";
import { getErrorMessage } from "../services/api";
import type { ComplaintDetail } from "../types/domain";

export function useComplaintDetail(complaintId: string) {
  const { request } = useAuth();
  const [complaint, setComplaint] = useState<ComplaintDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showingCachedData, setShowingCachedData] = useState(false);

  const replaceComplaint = useCallback((nextComplaint: ComplaintDetail) => {
    setComplaint(nextComplaint);
    setShowingCachedData(false);
    setError(null);
  }, []);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const detail = await fetchComplaintDetail(request, complaintId);
      setComplaint(detail);
      setShowingCachedData(false);
      await saveComplaintDetailCache(detail);
    } catch (complaintError) {
      const cachedComplaint = await loadComplaintDetailCache(complaintId);

      if (cachedComplaint) {
        setComplaint(cachedComplaint);
        setShowingCachedData(true);
        setError(
          "Showing the last saved complaint details. Complaint updates still require a working connection.",
        );
      } else {
        setComplaint(null);
        setShowingCachedData(false);
        setError(getErrorMessage(complaintError));
      }
    } finally {
      setLoading(false);
    }
  }, [complaintId, request]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return {
    complaint,
    loading,
    error,
    reload,
    setComplaint: replaceComplaint,
    showingCachedData,
  };
}
