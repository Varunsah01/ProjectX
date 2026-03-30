import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BackHandler,
  SafeAreaView,
  StatusBar as NativeStatusBar,
  StyleSheet,
  View,
} from "react-native";
import LoginScreen from "../features/auth/LoginScreen";
import ComplaintDetailScreen from "../features/complaints/ComplaintDetailScreen";
import ComplaintsScreen from "../features/complaints/ComplaintsScreen";
import DeviceCheckScreen from "../features/device-check/DeviceCheckScreen";
import HomeScreen from "../features/home/HomeScreen";
import DiagnosticsScreen from "../features/diagnostics/DiagnosticsScreen";
import AddNotesScreen from "../features/jobs/AddNotesScreen";
import JobDetailScreen from "../features/jobs/JobDetailScreen";
import JobOutcomeScreen from "../features/jobs/JobOutcomeScreen";
import JobsScreen from "../features/jobs/JobsScreen";
import UpdateStatusScreen from "../features/jobs/UpdateStatusScreen";
import UploadProofScreen from "../features/jobs/UploadProofScreen";
import ProfileScreen from "../features/profile/ProfileScreen";
import BottomTabBar from "../components/shell/BottomTabBar";
import FullscreenState from "../components/states/FullscreenState";
import NoticeCard from "../components/ui/NoticeCard";
import { APP_DISPLAY_NAME } from "../constants/branding";
import { colors } from "../constants/theme";
import { useAuth } from "../hooks/useAuth";
import { useSync } from "../hooks/useSync";
import { AuthProvider } from "../providers/AuthProvider";
import { SyncProvider } from "../providers/SyncProvider";
import { getApiTargetNotice } from "../services/api";
import {
  dismissDeviceCheck,
  loadDeviceCheckDismissed,
} from "../services/device-check";
import { type AppRoute, createRoute, getActiveTabForRoute, type MainTabRouteName } from "./navigation";
import type { JobClosureType, JobProof } from "../types/domain";
import type { JobOutcomeFormValues } from "../features/jobs/job-outcome";
import {
  deleteJobProof,
  listJobProofs,
} from "../services/job-proofs";
import { logTestEvent, logTestWarning } from "../services/test-logger";

const ROOT_EXIT_BACK_WINDOW_MS = 2000;

type NavigationNoticeState = {
  tone: "info" | "warning";
  title: string;
  message: string;
};

type SyncStatusNoticeState = {
  tone: "info" | "warning";
  title: string;
  message: string;
};

export default function AppRoot() {
  return (
    <AuthProvider>
      <SyncProvider>
        <MobileApp />
      </SyncProvider>
    </AuthProvider>
  );
}

function MobileApp() {
  const { isLoading, user, request, sessionNotice } = useAuth();
  const { isSyncing, lastSyncError, pendingActions, pendingCount, replayPendingActions } = useSync();
  const [stack, setStack] = useState<AppRoute[]>([createRoute("home")]);
  const [deviceCheckLoading, setDeviceCheckLoading] = useState(true);
  const [deviceCheckDismissed, setDeviceCheckDismissed] = useState(false);
  const [jobProofs, setJobProofs] = useState<Record<string, JobProof[]>>({});
  const [jobOutcomeDrafts, setJobOutcomeDrafts] = useState<Record<string, JobOutcomeFormValues>>(
    {},
  );
  const [backGuardReason, setBackGuardReason] = useState<string | null>(null);
  const [navigationNotice, setNavigationNotice] = useState<NavigationNoticeState | null>(null);
  const apiTargetNotice = getApiTargetNotice();
  const backInterceptorRef = useRef<(() => boolean) | null>(null);
  const exitBackPressAtRef = useRef(0);
  const navigationNoticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    let active = true;

    async function loadPreflightState() {
      const dismissed = await loadDeviceCheckDismissed();

      if (!active) {
        return;
      }

      setDeviceCheckDismissed(dismissed);
      setDeviceCheckLoading(false);
    }

    void loadPreflightState();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (navigationNoticeTimerRef.current) {
        clearTimeout(navigationNoticeTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!user) {
      setStack([createRoute("home")]);
      setJobProofs({});
      setJobOutcomeDrafts({});
      setBackGuardReason(null);
      dismissNavigationNotice();
      backInterceptorRef.current = null;
      exitBackPressAtRef.current = 0;
    }
  }, [dismissNavigationNotice, user]);

  const currentRoute = stack[stack.length - 1] ?? createRoute("home");
  const activeTab = useMemo(() => getActiveTabForRoute(currentRoute), [currentRoute]);
  const syncStatusNotice = useMemo<SyncStatusNoticeState | null>(() => {
    if (pendingCount === 0) {
      return null;
    }

    if (isSyncing) {
      return {
        tone: "info",
        title: "Syncing Saved Updates",
        message: `${pendingCount} saved update${pendingCount === 1 ? "" : "s"} ${
          pendingCount === 1 ? "is" : "are"
        } sending now. Keep the app open until ${pendingCount === 1 ? "it finishes." : "they finish."}`,
      };
    }

    if (lastSyncError) {
      return {
        tone: "warning",
        title: "Saved Updates Still Waiting",
        message: `${pendingCount} saved update${pendingCount === 1 ? "" : "s"} ${
          pendingCount === 1 ? "is" : "are"
        } still saved on this phone. ${lastSyncError}`,
      };
    }

    return {
      tone: "info",
      title: "Saved Updates Waiting",
      message: `${pendingCount} saved update${pendingCount === 1 ? "" : "s"} ${
        pendingCount === 1 ? "is" : "are"
      } saved on this phone and will retry automatically.`,
    };
  }, [isSyncing, lastSyncError, pendingCount]);

  useEffect(() => {
    dismissNavigationNotice();
    exitBackPressAtRef.current = 0;
    logTestEvent("navigation", "route-visible", {
      routeName: currentRoute.name,
      stackDepth: stack.length,
    });
  }, [currentRoute.name, dismissNavigationNotice, stack.length]);

  useEffect(() => {
    const routeJobId = getCurrentJobProofRouteId(currentRoute);

    if (!routeJobId) {
      return;
    }

    const jobId = routeJobId;

    let active = true;

    async function loadProofs() {
      try {
        const proofs = await listJobProofs(request, jobId);

        if (!active) {
          return;
        }

        setJobProofs((current) => ({
          ...current,
          [jobId]: proofs,
        }));
      } catch {
        if (!active) {
          return;
        }

        setJobProofs((current) => ({
          ...current,
          [jobId]: current[jobId] ?? [],
        }));
      }
    }

    void loadProofs();

    return () => {
      active = false;
    };
  }, [currentRoute, pendingActions, request]);

  const handleBackRequest = useCallback(
    (source: "hardware" | "button") => {
      if (backGuardReason) {
        showNavigationNotice({
          tone: "warning",
          title: "Back Action Blocked",
          message: backGuardReason,
        });
        logTestWarning("navigation", `${source}-back-blocked`, {
          routeName: currentRoute.name,
          reason: backGuardReason,
        });
        return true;
      }

      if (backInterceptorRef.current?.()) {
        logTestEvent("navigation", `${source}-back-intercepted`, {
          routeName: currentRoute.name,
        });
        return true;
      }

      dismissNavigationNotice();

      if (stack.length > 1) {
        setStack((current) => current.slice(0, -1));
        logTestEvent("navigation", `${source}-back-pop`, {
          routeName: currentRoute.name,
          stackDepth: stack.length,
        });
        return true;
      }

      if (activeTab !== "home") {
        setStack([createRoute("home")]);
        logTestEvent("navigation", `${source}-back-reset-home`, {
          fromTab: activeTab,
        });
        return true;
      }

      const now = Date.now();

      if (now - exitBackPressAtRef.current < ROOT_EXIT_BACK_WINDOW_MS) {
        logTestEvent("navigation", `${source}-back-exit`, {
          routeName: currentRoute.name,
        });
        return false;
      }

      exitBackPressAtRef.current = now;
      showNavigationNotice(
        {
          tone: "info",
          title: "Press Back Again to Exit",
          message: "Press back again within 2 seconds to close the app.",
        },
        ROOT_EXIT_BACK_WINDOW_MS,
      );
      logTestEvent("navigation", `${source}-back-exit-prompt`, {
        routeName: currentRoute.name,
      });
      return true;
    },
    [
      activeTab,
      backGuardReason,
      currentRoute.name,
      dismissNavigationNotice,
      showNavigationNotice,
      stack.length,
    ],
  );

  useEffect(() => {
    const subscription = BackHandler.addEventListener("hardwareBackPress", () =>
      handleBackRequest("hardware"),
    );

    return () => {
      subscription.remove();
    };
  }, [handleBackRequest]);

  function pushRoute(route: AppRoute) {
    setStack((current) => {
      const currentRoute = current[current.length - 1];

      if (currentRoute && isSameRoute(currentRoute, route)) {
        return current;
      }

      logTestEvent("navigation", "push-route", {
        from: currentRoute?.name ?? "unknown",
        to: route.name,
      });
      return [...current, route];
    });
  }

  function replaceRoute(route: AppRoute) {
    setStack((current) => {
      const currentRoute = current[current.length - 1];

      if (currentRoute && isSameRoute(currentRoute, route)) {
        return current;
      }

      logTestEvent("navigation", "replace-route", {
        from: currentRoute?.name ?? "unknown",
        to: route.name,
      });
      return [...current.slice(0, -1), route];
    });
  }

  function resetToTab(tab: MainTabRouteName) {
    setStack((current) => {
      if (current.length === 1 && current[0]?.name === tab) {
        return current;
      }

      logTestEvent("navigation", "reset-tab", {
        to: tab,
      });
      return [createRoute(tab)];
    });
  }

  const handleBackButtonPress = useCallback(() => {
    handleBackRequest("button");
  }, [handleBackRequest]);

  const handleRetrySync = useCallback(() => {
    void replayPendingActions();
  }, [replayPendingActions]);

  const handleScreenBackGuardChange = useCallback(
    (blocked: boolean, reason?: string) => {
      setBackGuardReason(
        blocked ? reason ?? "Finish the current action before leaving this screen." : null,
      );

      if (!blocked) {
        dismissNavigationNotice();
      }
    },
    [dismissNavigationNotice],
  );

  const handleScreenBackInterceptChange = useCallback((handler: (() => boolean) | null) => {
    backInterceptorRef.current = handler;
  }, []);

  function addProofs(jobId: string, proofs: JobProof[]) {
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
  }

  async function removeProof(jobId: string, proofId: string) {
    const proofUri = jobProofs[jobId]?.find((proof) => proof.id === proofId)?.uri;
    await deleteJobProof(request, jobId, proofId, proofUri);

    setJobProofs((current) => {
      const nextProofs = (current[jobId] ?? []).filter((proof) => proof.id !== proofId);

      return {
        ...current,
        [jobId]: nextProofs,
      };
    });
  }

  function getOutcomeDraftKey(jobId: string, outcome: JobClosureType) {
    return `${jobId}:${outcome}`;
  }

  function saveOutcomeDraft(jobId: string, outcome: JobClosureType, draft: JobOutcomeFormValues) {
    const key = getOutcomeDraftKey(jobId, outcome);
    setJobOutcomeDrafts((current) => ({
      ...current,
      [key]: draft,
    }));
  }

  function clearOutcomeDraft(jobId: string, outcome: JobClosureType) {
    const key = getOutcomeDraftKey(jobId, outcome);
    setJobOutcomeDrafts((current) => {
      const next = { ...current };
      delete next[key];
      return next;
    });
  }

  const handleDismissDeviceCheck = useCallback(() => {
    void dismissDeviceCheck().finally(() => {
      setDeviceCheckDismissed(true);
    });
  }, []);

  if (isLoading || deviceCheckLoading) {
    return (
      <FullscreenState
        title={APP_DISPLAY_NAME}
        message="Checking your saved sign-in before loading your work."
        loading
      />
    );
  }

  if (!deviceCheckDismissed) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.appShell}>
          <View style={styles.content}>
            <DeviceCheckScreen onContinue={handleDismissDeviceCheck} />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  const content =
    currentRoute.name === "home" ? (
      <HomeScreen
        onOpenJob={(jobId) => pushRoute(createRoute("jobDetail", { jobId }))}
        onOpenComplaint={(complaintId) =>
          pushRoute(createRoute("complaintDetail", { complaintId }))
        }
        onOpenTab={(tab) => resetToTab(tab)}
      />
    ) : currentRoute.name === "jobs" ? (
      <JobsScreen
        onOpenJob={(jobId) => pushRoute(createRoute("jobDetail", { jobId }))}
      />
    ) : currentRoute.name === "complaints" ? (
      <ComplaintsScreen
        onOpenComplaint={(complaintId) =>
          pushRoute(createRoute("complaintDetail", { complaintId }))
        }
      />
    ) : currentRoute.name === "profile" ? (
      <ProfileScreen
        onOpenDeviceCheck={() => pushRoute(createRoute("deviceCheck"))}
        onOpenDiagnostics={() => pushRoute(createRoute("diagnostics"))}
      />
    ) : currentRoute.name === "deviceCheck" ? (
      <DeviceCheckScreen
        onBack={handleBackButtonPress}
        onContinue={handleBackButtonPress}
      />
    ) : currentRoute.name === "diagnostics" ? (
      <DiagnosticsScreen
        currentRouteName={currentRoute.name}
        onBack={handleBackButtonPress}
      />
    ) : currentRoute.name === "jobDetail" ? (
      <JobDetailScreen
        jobId={currentRoute.params.jobId}
        proofs={jobProofs[currentRoute.params.jobId] ?? []}
        onBack={handleBackButtonPress}
        onOpenComplaint={(complaintId) =>
          pushRoute(createRoute("complaintDetail", { complaintId }))
        }
        onOpenUpdateStatus={(jobId) =>
          pushRoute(createRoute("jobUpdateStatus", { jobId }))
        }
        onOpenAddNotes={(jobId) => pushRoute(createRoute("jobAddNotes", { jobId }))}
        onOpenUploadProof={(jobId) =>
          pushRoute(createRoute("jobUploadProof", { jobId }))
        }
        onOpenOutcome={(jobId, outcome) =>
          pushRoute(createRoute("jobOutcome", { jobId, outcome }))
        }
      />
    ) : currentRoute.name === "jobUpdateStatus" ? (
      <UpdateStatusScreen
        jobId={currentRoute.params.jobId}
        proofs={jobProofs[currentRoute.params.jobId] ?? []}
        onBack={handleBackButtonPress}
        onBackGuardChange={handleScreenBackGuardChange}
        onBackInterceptChange={handleScreenBackInterceptChange}
        onDone={() =>
          replaceRoute(createRoute("jobDetail", { jobId: currentRoute.params.jobId }))
        }
      />
    ) : currentRoute.name === "jobAddNotes" ? (
      <AddNotesScreen
        jobId={currentRoute.params.jobId}
        onBack={handleBackButtonPress}
        onBackGuardChange={handleScreenBackGuardChange}
        onBackInterceptChange={handleScreenBackInterceptChange}
        onDone={() =>
          replaceRoute(createRoute("jobDetail", { jobId: currentRoute.params.jobId }))
        }
      />
    ) : currentRoute.name === "jobUploadProof" ? (
      <UploadProofScreen
        jobId={currentRoute.params.jobId}
        proofs={jobProofs[currentRoute.params.jobId] ?? []}
        onBack={handleBackButtonPress}
        onAddProofs={addProofs}
        onBackGuardChange={handleScreenBackGuardChange}
        onBackInterceptChange={handleScreenBackInterceptChange}
        onRemoveProof={removeProof}
      />
    ) : currentRoute.name === "jobOutcome" ? (
      <JobOutcomeScreen
        jobId={currentRoute.params.jobId}
        outcome={currentRoute.params.outcome}
        proofs={jobProofs[currentRoute.params.jobId] ?? []}
        initialDraft={
          jobOutcomeDrafts[
          getOutcomeDraftKey(currentRoute.params.jobId, currentRoute.params.outcome)
          ]
        }
        onBack={handleBackButtonPress}
        onOpenUploadProof={(jobId) =>
          pushRoute(createRoute("jobUploadProof", { jobId }))
        }
        onBackGuardChange={handleScreenBackGuardChange}
        onBackInterceptChange={handleScreenBackInterceptChange}
        onDiscardDraft={() =>
          clearOutcomeDraft(currentRoute.params.jobId, currentRoute.params.outcome)
        }
        onDraftChange={(draft) =>
          saveOutcomeDraft(currentRoute.params.jobId, currentRoute.params.outcome, draft)
        }
        onDone={() => {
          clearOutcomeDraft(currentRoute.params.jobId, currentRoute.params.outcome);
          replaceRoute(createRoute("jobDetail", { jobId: currentRoute.params.jobId }));
        }}
      />
    ) : (
      <ComplaintDetailScreen
        complaintId={currentRoute.params.complaintId}
        onBack={handleBackButtonPress}
        onBackGuardChange={handleScreenBackGuardChange}
        onBackInterceptChange={handleScreenBackInterceptChange}
        onOpenJob={(jobId) => pushRoute(createRoute("jobDetail", { jobId }))}
      />
    );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.appShell}>
        {(apiTargetNotice || sessionNotice || syncStatusNotice || navigationNotice) ? (
          <View style={styles.noticeStack}>
            {apiTargetNotice ? (
              <NoticeCard
                tone="warning"
                title="Build Check"
                message={apiTargetNotice}
              />
            ) : null}
            {sessionNotice ? (
              <NoticeCard
                tone={sessionNotice.tone}
                title="Sign-In Status"
                message={sessionNotice.message}
              />
            ) : null}
            {syncStatusNotice ? (
              <NoticeCard
                tone={syncStatusNotice.tone}
                title={syncStatusNotice.title}
                message={syncStatusNotice.message}
                actionLabel={!isSyncing ? "Retry Sync" : undefined}
                onAction={!isSyncing ? handleRetrySync : undefined}
              />
            ) : null}
            {navigationNotice ? (
              <NoticeCard
                tone={navigationNotice.tone}
                title={navigationNotice.title}
                message={navigationNotice.message}
              />
            ) : null}
          </View>
        ) : null}
        <View style={styles.content}>{content}</View>
        {stack.length === 1 ? (
          <BottomTabBar activeTab={activeTab} onSelectTab={resetToTab} />
        ) : null}
      </View>
    </SafeAreaView>
  );
}

function getCurrentJobProofRouteId(route: AppRoute) {
  switch (route.name) {
    case "jobDetail":
    case "jobUpdateStatus":
    case "jobUploadProof":
    case "jobOutcome":
      return route.params.jobId;
    default:
      return null;
  }
}

function isSameRoute(left: AppRoute, right: AppRoute) {
  if (left.name !== right.name) {
    return false;
  }

  const leftParams = "params" in left ? JSON.stringify(left.params) : "";
  const rightParams = "params" in right ? JSON.stringify(right.params) : "";

  return leftParams === rightParams;
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: NativeStatusBar.currentHeight ?? 0,
  },
  appShell: {
    flex: 1,
  },
  noticeStack: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 12,
  },
  content: {
    flex: 1,
  },
});
