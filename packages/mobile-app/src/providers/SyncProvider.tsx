import { AppState, type AppStateStatus } from "react-native";
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
import {
  ApiError,
  getErrorMessage,
  shouldQueueOfflineMutation,
  type AuthenticatedRequest,
} from "../services/api";
import {
  loadPendingActions,
  removePendingAction,
  subscribePendingActions,
  type PendingAction,
} from "../services/offline-sync";
import { uploadJobProof } from "../services/job-proofs";
import {
  sendFailJob,
  sendJobNotesSave,
  sendJobStatusUpdate,
  sendRescheduleJob,
} from "../services/jobs";
import { useAuth } from "../hooks/useAuth";
import { logTestError, logTestEvent, logTestWarning } from "../services/test-logger";

type SyncContextValue = {
  pendingActions: PendingAction[];
  pendingCount: number;
  isSyncing: boolean;
  lastSyncError: string | null;
  replayPendingActions: () => Promise<void>;
};

const SyncContext = createContext<SyncContextValue | null>(null);

async function replayPendingAction(request: AuthenticatedRequest, action: PendingAction) {
  if (action.type === "job_status_update") {
    await sendJobStatusUpdate(request, {
      jobId: action.jobId,
      status: action.payload.status,
      note: action.payload.note,
    });
    return;
  }

  if (action.type === "job_notes_save") {
    await sendJobNotesSave(request, {
      jobId: action.jobId,
      note: action.payload.note,
    });
    return;
  }

  if (action.type === "job_closure_submit") {
    if (action.payload.outcome === "fail") {
      await sendFailJob(request, {
        jobId: action.jobId,
        note: action.payload.note,
      });
      return;
    }

    if (action.payload.outcome === "reschedule") {
      await sendRescheduleJob(request, {
        jobId: action.jobId,
        note: action.payload.note,
        scheduledDate: action.payload.scheduledDate ?? "",
      });
      return;
    }

    await sendJobStatusUpdate(request, {
      jobId: action.jobId,
      status: "completed",
      note: action.payload.note,
    });
    return;
  }

  await uploadJobProof(request, action.jobId, {
    id: action.payload.proofId,
    type: action.payload.type,
    label: action.payload.label,
    createdAt: action.payload.createdAt,
    uri: action.payload.uri,
    source: action.payload.source,
    fileName: action.payload.fileName,
    mimeType: action.payload.mimeType,
    width: action.payload.width,
    height: action.payload.height,
  });
}

export function SyncProvider({ children }: { children: ReactNode }) {
  const { request, user } = useAuth();
  const [pendingActions, setPendingActions] = useState<PendingAction[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncError, setLastSyncError] = useState<string | null>(null);
  const replayInFlightRef = useRef(false);

  useEffect(() => {
    const unsubscribe = subscribePendingActions((actions) => {
      setPendingActions(actions);
    });

    return unsubscribe;
  }, []);

  const replayPendingActions = useCallback(async () => {
    if (!user || replayInFlightRef.current) {
      return;
    }

    const actions = await loadPendingActions();

    if (actions.length === 0) {
      setLastSyncError(null);
      return;
    }

    replayInFlightRef.current = true;
    setIsSyncing(true);
    setLastSyncError(null);
    logTestEvent("sync", "replay-start", {
      pendingCount: actions.length,
    });

    try {
      for (const action of actions) {
        try {
          logTestEvent("sync", "replay-action-start", {
            actionId: action.id,
            actionType: action.type,
            jobId: action.jobId,
          });
          await replayPendingAction(request, action);
          await removePendingAction(action.id);
          logTestEvent("sync", "replay-action-success", {
            actionId: action.id,
            actionType: action.type,
          });
        } catch (error) {
          if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
            setLastSyncError(
              "Session needs attention. Pending field updates stay on device and will retry after sign-in is restored.",
            );
            logTestWarning("sync", "replay-auth-blocked", {
              actionId: action.id,
              actionType: action.type,
              status: error.status,
            });
            break;
          }

          if (shouldQueueOfflineMutation(error)) {
            setLastSyncError(
              "Pending field updates are saved on device and will sync when the connection is back.",
            );
            logTestWarning("sync", "replay-offline-blocked", {
              actionId: action.id,
              actionType: action.type,
              errorMessage: error instanceof Error ? error.message : "Unknown error",
            });
            break;
          }

          setLastSyncError(getErrorMessage(error));
          logTestError("sync", "replay-failed", {
            actionId: action.id,
            actionType: action.type,
            errorMessage: error instanceof Error ? error.message : "Unknown error",
          });
          break;
        }
      }
    } finally {
      replayInFlightRef.current = false;
      setIsSyncing(false);
      logTestEvent("sync", "replay-finished");
    }
  }, [request, user]);

  useEffect(() => {
    if (!user) {
      setPendingActions([]);
      setIsSyncing(false);
      setLastSyncError(null);
      return;
    }

    void replayPendingActions();
  }, [replayPendingActions, user]);

  useEffect(() => {
    if (!user || pendingActions.length === 0) {
      return;
    }

    const subscription = AppState.addEventListener(
      "change",
      (nextState: AppStateStatus) => {
        if (nextState === "active") {
          void replayPendingActions();
        }
      },
    );

    return () => {
      subscription.remove();
    };
  }, [pendingActions.length, replayPendingActions, user]);

  useEffect(() => {
    if (!user || pendingActions.length === 0) {
      return;
    }

    const intervalId = setInterval(() => {
      void replayPendingActions();
    }, 30000);

    return () => {
      clearInterval(intervalId);
    };
  }, [pendingActions.length, replayPendingActions, user]);

  const value = useMemo(
    () => ({
      pendingActions,
      pendingCount: pendingActions.length,
      isSyncing,
      lastSyncError,
      replayPendingActions,
    }),
    [pendingActions, isSyncing, lastSyncError, replayPendingActions],
  );

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}

export function useSync() {
  const context = useContext(SyncContext);

  if (!context) {
    throw new Error("useSync must be used inside SyncProvider");
  }

  return context;
}
