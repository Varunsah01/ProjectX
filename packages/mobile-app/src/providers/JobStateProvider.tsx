import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "../hooks/useAuth";
import { useSync } from "../hooks/useSync";
import { deleteJobProof, listJobProofs } from "../services/job-proofs";
import type { JobClosureType, JobProof } from "../types/domain";
import type { JobOutcomeFormValues } from "../features/jobs/job-outcome";

export type NavigationNoticeState = {
  tone: "info" | "warning";
  title: string;
  message: string;
};

type JobStateContextValue = {
  jobProofs: Record<string, JobProof[]>;
  ensureProofsForJob: (jobId: string) => void;
  addProofs: (jobId: string, proofs: JobProof[]) => void;
  removeProof: (jobId: string, proofId: string) => Promise<void>;
  saveOutcomeDraft: (
    jobId: string,
    outcome: JobClosureType,
    draft: JobOutcomeFormValues,
  ) => void;
  clearOutcomeDraft: (jobId: string, outcome: JobClosureType) => void;
  getOutcomeDraft: (
    jobId: string,
    outcome: JobClosureType,
  ) => JobOutcomeFormValues | undefined;
  navigationNotice: NavigationNoticeState | null;
  showNavigationNotice: (
    notice: NavigationNoticeState,
    autoHideMs?: number,
  ) => void;
  dismissNavigationNotice: () => void;
};

const JobStateContext = createContext<JobStateContextValue | null>(null);

function getOutcomeDraftKey(jobId: string, outcome: JobClosureType) {
  return `${jobId}:${outcome}`;
}

export function JobStateProvider({ children }: { children: ReactNode }) {
  const { request, user } = useAuth();
  const { pendingActions } = useSync();
  const [jobProofs, setJobProofs] = useState<Record<string, JobProof[]>>({});
  const [jobOutcomeDrafts, setJobOutcomeDrafts] = useState<
    Record<string, JobOutcomeFormValues>
  >({});
  const [navigationNotice, setNavigationNotice] =
    useState<NavigationNoticeState | null>(null);
  const navigationNoticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const trackedJobIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!user) {
      setJobProofs({});
      setJobOutcomeDrafts({});
      trackedJobIdsRef.current = new Set();
    }
  }, [user]);

  const dismissNavigationNotice = useCallback(() => {
    if (navigationNoticeTimerRef.current) {
      clearTimeout(navigationNoticeTimerRef.current);
      navigationNoticeTimerRef.current = null;
    }
    setNavigationNotice(null);
  }, []);

  const showNavigationNotice = useCallback(
    (notice: NavigationNoticeState, autoHideMs?: number) => {
      if (navigationNoticeTimerRef.current) {
        clearTimeout(navigationNoticeTimerRef.current);
        navigationNoticeTimerRef.current = null;
      }

      setNavigationNotice(notice);

      if (autoHideMs) {
        navigationNoticeTimerRef.current = setTimeout(() => {
          navigationNoticeTimerRef.current = null;
          setNavigationNotice(null);
        }, autoHideMs);
      }
    },
    [],
  );

  useEffect(() => {
    return () => {
      if (navigationNoticeTimerRef.current) {
        clearTimeout(navigationNoticeTimerRef.current);
      }
    };
  }, []);

  const loadProofsForJob = useCallback(
    async (jobId: string) => {
      try {
        const proofs = await listJobProofs(request, jobId);
        setJobProofs((current) => ({
          ...current,
          [jobId]: proofs,
        }));
      } catch {
        setJobProofs((current) => ({
          ...current,
          [jobId]: current[jobId] ?? [],
        }));
      }
    },
    [request],
  );

  const ensureProofsForJob = useCallback(
    (jobId: string) => {
      trackedJobIdsRef.current.add(jobId);
      void loadProofsForJob(jobId);
    },
    [loadProofsForJob],
  );

  useEffect(() => {
    if (!user) {
      return;
    }

    for (const jobId of trackedJobIdsRef.current) {
      void loadProofsForJob(jobId);
    }
  }, [loadProofsForJob, pendingActions, user]);

  const addProofs = useCallback((jobId: string, proofs: JobProof[]) => {
    if (proofs.length === 0) {
      return;
    }

    setJobProofs((current) => {
      const nextProofs = [...(current[jobId] ?? [])];

      for (const proof of proofs) {
        const existingProofIndex = nextProofs.findIndex(
          (currentProof) => currentProof.id === proof.id,
        );

        if (existingProofIndex >= 0) {
          nextProofs[existingProofIndex] = proof;
          continue;
        }

        nextProofs.push(proof);
      }

      return {
        ...current,
        [jobId]: nextProofs,
      };
    });
  }, []);

  const removeProof = useCallback(
    async (jobId: string, proofId: string) => {
      const proofUri = jobProofs[jobId]?.find((proof) => proof.id === proofId)
        ?.uri;
      await deleteJobProof(request, jobId, proofId, proofUri);

      setJobProofs((current) => {
        const nextProofs = (current[jobId] ?? []).filter(
          (proof) => proof.id !== proofId,
        );

        return {
          ...current,
          [jobId]: nextProofs,
        };
      });
    },
    [jobProofs, request],
  );

  const saveOutcomeDraft = useCallback(
    (
      jobId: string,
      outcome: JobClosureType,
      draft: JobOutcomeFormValues,
    ) => {
      const key = getOutcomeDraftKey(jobId, outcome);
      setJobOutcomeDrafts((current) => ({
        ...current,
        [key]: draft,
      }));
    },
    [],
  );

  const clearOutcomeDraft = useCallback(
    (jobId: string, outcome: JobClosureType) => {
      const key = getOutcomeDraftKey(jobId, outcome);
      setJobOutcomeDrafts((current) => {
        const next = { ...current };
        delete next[key];
        return next;
      });
    },
    [],
  );

  const getOutcomeDraft = useCallback(
    (jobId: string, outcome: JobClosureType) => {
      return jobOutcomeDrafts[getOutcomeDraftKey(jobId, outcome)];
    },
    [jobOutcomeDrafts],
  );

  const value = useMemo<JobStateContextValue>(
    () => ({
      jobProofs,
      ensureProofsForJob,
      addProofs,
      removeProof,
      saveOutcomeDraft,
      clearOutcomeDraft,
      getOutcomeDraft,
      navigationNotice,
      showNavigationNotice,
      dismissNavigationNotice,
    }),
    [
      addProofs,
      clearOutcomeDraft,
      dismissNavigationNotice,
      ensureProofsForJob,
      getOutcomeDraft,
      jobProofs,
      navigationNotice,
      removeProof,
      saveOutcomeDraft,
      showNavigationNotice,
    ],
  );

  return (
    <JobStateContext.Provider value={value}>
      {children}
    </JobStateContext.Provider>
  );
}

export function useJobState() {
  const context = useContext(JobStateContext);

  if (!context) {
    throw new Error("useJobState must be used inside JobStateProvider");
  }

  return context;
}
