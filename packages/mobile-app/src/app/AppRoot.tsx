import { useEffect, useMemo, useState } from "react";
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
import HomeScreen from "../features/home/HomeScreen";
import AddNotesScreen from "../features/jobs/AddNotesScreen";
import JobDetailScreen from "../features/jobs/JobDetailScreen";
import JobOutcomeScreen from "../features/jobs/JobOutcomeScreen";
import JobsScreen from "../features/jobs/JobsScreen";
import UpdateStatusScreen from "../features/jobs/UpdateStatusScreen";
import UploadProofScreen from "../features/jobs/UploadProofScreen";
import ProfileScreen from "../features/profile/ProfileScreen";
import BottomTabBar from "../components/shell/BottomTabBar";
import FullscreenState from "../components/states/FullscreenState";
import { colors } from "../constants/theme";
import { useAuth } from "../hooks/useAuth";
import { useSync } from "../hooks/useSync";
import { AuthProvider } from "../providers/AuthProvider";
import { SyncProvider } from "../providers/SyncProvider";
import { type AppRoute, createRoute, getActiveTabForRoute, type MainTabRouteName } from "./navigation";
import type { JobClosureType, JobProof } from "../types/domain";
import type { JobOutcomeFormValues } from "../features/jobs/job-outcome";
import {
  deleteJobProof,
  listJobProofs,
} from "../services/job-proofs";

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
  const { isLoading, user, request } = useAuth();
  const { pendingActions } = useSync();
  const [stack, setStack] = useState<AppRoute[]>([createRoute("home")]);
  const [jobProofs, setJobProofs] = useState<Record<string, JobProof[]>>({});
  const [jobOutcomeDrafts, setJobOutcomeDrafts] = useState<Record<string, JobOutcomeFormValues>>(
    {},
  );

  useEffect(() => {
    if (!user) {
      setStack([createRoute("home")]);
      setJobProofs({});
      setJobOutcomeDrafts({});
    }
  }, [user]);

  const currentRoute = stack[stack.length - 1] ?? createRoute("home");
  const activeTab = useMemo(() => getActiveTabForRoute(currentRoute), [currentRoute]);

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

  useEffect(() => {
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      if (stack.length > 1) {
        setStack((current) => current.slice(0, -1));
        return true;
      }

      if (activeTab !== "home") {
        setStack([createRoute("home")]);
        return true;
      }

      return false;
    });

    return () => {
      subscription.remove();
    };
  }, [activeTab, stack.length]);

  function pushRoute(route: AppRoute) {
    setStack((current) => {
      const currentRoute = current[current.length - 1];

      if (currentRoute && isSameRoute(currentRoute, route)) {
        return current;
      }

      return [...current, route];
    });
  }

  function replaceRoute(route: AppRoute) {
    setStack((current) => {
      const currentRoute = current[current.length - 1];

      if (currentRoute && isSameRoute(currentRoute, route)) {
        return current;
      }

      return [...current.slice(0, -1), route];
    });
  }

  function resetToTab(tab: MainTabRouteName) {
    setStack((current) => {
      if (current.length === 1 && current[0]?.name === tab) {
        return current;
      }

      return [createRoute(tab)];
    });
  }

  function goBack() {
    setStack((current) => {
      if (current.length > 1) {
        return current.slice(0, -1);
      }

      return current;
    });
  }

  function addProofs(jobId: string, proofs: JobProof[]) {
    if (proofs.length === 0) {
      return;
    }

    setJobProofs((current) => ({
      ...current,
      [jobId]: [
        ...(current[jobId] ?? []),
        ...proofs,
      ],
    }));
  }

  async function removeProof(jobId: string, proofId: string) {
    await deleteJobProof(request, jobId, proofId);

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

  if (isLoading) {
    return (
      <FullscreenState
        title="Field Operator"
        message="Restoring the saved field session before loading assigned work."
        loading
      />
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
      <ProfileScreen />
    ) : currentRoute.name === "jobDetail" ? (
      <JobDetailScreen
        jobId={currentRoute.params.jobId}
        proofs={jobProofs[currentRoute.params.jobId] ?? []}
        onBack={goBack}
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
        onBack={goBack}
        onDone={() =>
          replaceRoute(createRoute("jobDetail", { jobId: currentRoute.params.jobId }))
        }
      />
    ) : currentRoute.name === "jobAddNotes" ? (
      <AddNotesScreen
        jobId={currentRoute.params.jobId}
        onBack={goBack}
        onDone={() =>
          replaceRoute(createRoute("jobDetail", { jobId: currentRoute.params.jobId }))
        }
      />
    ) : currentRoute.name === "jobUploadProof" ? (
      <UploadProofScreen
        jobId={currentRoute.params.jobId}
        proofs={jobProofs[currentRoute.params.jobId] ?? []}
        onBack={goBack}
        onAddProofs={addProofs}
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
        onBack={goBack}
        onOpenUploadProof={(jobId) =>
          pushRoute(createRoute("jobUploadProof", { jobId }))
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
        onBack={goBack}
        onOpenJob={(jobId) => pushRoute(createRoute("jobDetail", { jobId }))}
      />
    );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.appShell}>
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
  content: {
    flex: 1,
  },
});
