import { useCallback, useEffect, useRef } from "react";
import {
  useFocusEffect,
  useRoute,
  type RouteProp,
} from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import {
  createBottomTabNavigator,
  type BottomTabBarProps,
} from "@react-navigation/bottom-tabs";
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
import { useAuth } from "../hooks/useAuth";
import { useSync } from "../hooks/useSync";
import { useJobState } from "../providers/JobStateProvider";
import {
  useAppNavigation,
  useRootNavigation,
  useTabNavigation,
} from "./hooks";
import type {
  AuthStackParamList,
  RootStackParamList,
  TabParamList,
} from "./types";
import { logTestEvent, logTestWarning } from "../services/test-logger";

const RootStack = createNativeStackNavigator<RootStackParamList>();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const Tabs = createBottomTabNavigator<TabParamList>();

const UNSAVED_BACK_FALLBACK_REASON =
  "Finish the current action before leaving this screen.";

type ScreenBackController = {
  setGuard: (blocked: boolean, reason?: string) => void;
  setInterceptor: (handler: (() => boolean) | null) => void;
};

function useScreenBackController(routeName: string): ScreenBackController & {
  bind: () => void;
} {
  const { showNavigationNotice, dismissNavigationNotice } = useJobState();
  const navigation = useAppNavigation();
  const guardRef = useRef<{ blocked: boolean; reason?: string }>({
    blocked: false,
  });
  const interceptorRef = useRef<(() => boolean) | null>(null);

  const setGuard = useCallback((blocked: boolean, reason?: string) => {
    guardRef.current = {
      blocked,
      reason: blocked ? reason ?? UNSAVED_BACK_FALLBACK_REASON : undefined,
    };
  }, []);

  const setInterceptor = useCallback((handler: (() => boolean) | null) => {
    interceptorRef.current = handler;
  }, []);

  const bind = useCallback(() => {
    const unsubscribe = navigation.addListener("beforeRemove", (event) => {
      if (guardRef.current.blocked) {
        event.preventDefault();
        showNavigationNotice({
          tone: "warning",
          title: "Back Action Blocked",
          message: guardRef.current.reason ?? UNSAVED_BACK_FALLBACK_REASON,
        });
        logTestWarning("navigation", "back-blocked", {
          routeName,
          reason: guardRef.current.reason,
        });
        return;
      }

      if (interceptorRef.current?.()) {
        event.preventDefault();
        logTestEvent("navigation", "back-intercepted", { routeName });
        return;
      }

      dismissNavigationNotice();
    });

    return unsubscribe;
  }, [dismissNavigationNotice, navigation, routeName, showNavigationNotice]);

  return { setGuard, setInterceptor, bind };
}

function HomeRoute() {
  const tabNavigation = useTabNavigation<"Home">();
  const rootNavigation = useRootNavigation<"Tabs">();
  const { user } = useAuth();
  const { replayPendingActions } = useSync();

  useFocusEffect(
    useCallback(() => {
      if (user) {
        void replayPendingActions();
      }
    }, [replayPendingActions, user]),
  );

  return (
    <HomeScreen
      onOpenJob={(jobId) => rootNavigation.navigate("JobDetail", { jobId })}
      onOpenComplaint={(complaintId) =>
        rootNavigation.navigate("ComplaintDetail", { complaintId })
      }
      onOpenTab={(tab) =>
        tabNavigation.navigate(tab === "complaints" ? "Complaints" : "Jobs")
      }
    />
  );
}

function JobsRoute() {
  const rootNavigation = useRootNavigation<"Tabs">();

  return (
    <JobsScreen
      onOpenJob={(jobId) => rootNavigation.navigate("JobDetail", { jobId })}
    />
  );
}

function ComplaintsRoute() {
  const rootNavigation = useRootNavigation<"Tabs">();

  return (
    <ComplaintsScreen
      onOpenComplaint={(complaintId) =>
        rootNavigation.navigate("ComplaintDetail", { complaintId })
      }
    />
  );
}

function ProfileRoute() {
  const rootNavigation = useRootNavigation<"Tabs">();

  return (
    <ProfileScreen
      onOpenDeviceCheck={() => rootNavigation.navigate("DeviceCheck")}
      onOpenDiagnostics={() => rootNavigation.navigate("Diagnostics")}
    />
  );
}

function AppTabs() {
  return (
    <Tabs.Navigator
      screenOptions={{ headerShown: false }}
      tabBar={(props: BottomTabBarProps) => <BottomTabBar {...props} />}
    >
      <Tabs.Screen name="Home" component={HomeRoute} />
      <Tabs.Screen name="Jobs" component={JobsRoute} />
      <Tabs.Screen name="Complaints" component={ComplaintsRoute} />
      <Tabs.Screen name="Profile" component={ProfileRoute} />
    </Tabs.Navigator>
  );
}

function JobDetailRoute() {
  const navigation = useAppNavigation<"JobDetail">();
  const route = useRoute<RouteProp<RootStackParamList, "JobDetail">>();
  const { jobId } = route.params;
  const { jobProofs, ensureProofsForJob } = useJobState();

  useFocusEffect(
    useCallback(() => {
      ensureProofsForJob(jobId);
    }, [ensureProofsForJob, jobId]),
  );

  return (
    <JobDetailScreen
      jobId={jobId}
      proofs={jobProofs[jobId] ?? []}
      onBack={() => navigation.goBack()}
      onOpenComplaint={(complaintId) =>
        navigation.navigate("ComplaintDetail", { complaintId })
      }
      onOpenUpdateStatus={(nextJobId) =>
        navigation.navigate("JobUpdateStatus", { jobId: nextJobId })
      }
      onOpenAddNotes={(nextJobId) =>
        navigation.navigate("JobAddNotes", { jobId: nextJobId })
      }
      onOpenUploadProof={(nextJobId) =>
        navigation.navigate("JobUploadProof", { jobId: nextJobId })
      }
      onOpenOutcome={(nextJobId, outcome) =>
        navigation.navigate("JobOutcome", { jobId: nextJobId, outcome })
      }
    />
  );
}

function JobUpdateStatusRoute() {
  const navigation = useAppNavigation<"JobUpdateStatus">();
  const route = useRoute<RouteProp<RootStackParamList, "JobUpdateStatus">>();
  const { jobId } = route.params;
  const { jobProofs, ensureProofsForJob } = useJobState();
  const back = useScreenBackController("JobUpdateStatus");

  useFocusEffect(
    useCallback(() => {
      ensureProofsForJob(jobId);
    }, [ensureProofsForJob, jobId]),
  );

  useEffect(() => back.bind(), [back]);

  return (
    <UpdateStatusScreen
      jobId={jobId}
      proofs={jobProofs[jobId] ?? []}
      onBack={() => navigation.goBack()}
      onBackGuardChange={back.setGuard}
      onBackInterceptChange={back.setInterceptor}
      onDone={() => {
        back.setGuard(false);
        back.setInterceptor(null);
        navigation.navigate("JobDetail", { jobId });
      }}
    />
  );
}

function JobAddNotesRoute() {
  const navigation = useAppNavigation<"JobAddNotes">();
  const route = useRoute<RouteProp<RootStackParamList, "JobAddNotes">>();
  const { jobId } = route.params;
  const back = useScreenBackController("JobAddNotes");

  useEffect(() => back.bind(), [back]);

  return (
    <AddNotesScreen
      jobId={jobId}
      onBack={() => navigation.goBack()}
      onBackGuardChange={back.setGuard}
      onBackInterceptChange={back.setInterceptor}
      onDone={() => {
        back.setGuard(false);
        back.setInterceptor(null);
        navigation.navigate("JobDetail", { jobId });
      }}
    />
  );
}

function JobUploadProofRoute() {
  const navigation = useAppNavigation<"JobUploadProof">();
  const route = useRoute<RouteProp<RootStackParamList, "JobUploadProof">>();
  const { jobId } = route.params;
  const { jobProofs, ensureProofsForJob, addProofs, removeProof } =
    useJobState();
  const back = useScreenBackController("JobUploadProof");

  useFocusEffect(
    useCallback(() => {
      ensureProofsForJob(jobId);
    }, [ensureProofsForJob, jobId]),
  );

  useEffect(() => back.bind(), [back]);

  return (
    <UploadProofScreen
      jobId={jobId}
      proofs={jobProofs[jobId] ?? []}
      onBack={() => navigation.goBack()}
      onAddProofs={addProofs}
      onBackGuardChange={back.setGuard}
      onBackInterceptChange={back.setInterceptor}
      onRemoveProof={removeProof}
    />
  );
}

function JobOutcomeRoute() {
  const navigation = useAppNavigation<"JobOutcome">();
  const route = useRoute<RouteProp<RootStackParamList, "JobOutcome">>();
  const { jobId, outcome } = route.params;
  const {
    jobProofs,
    ensureProofsForJob,
    getOutcomeDraft,
    saveOutcomeDraft,
    clearOutcomeDraft,
  } = useJobState();
  const back = useScreenBackController("JobOutcome");

  useFocusEffect(
    useCallback(() => {
      ensureProofsForJob(jobId);
    }, [ensureProofsForJob, jobId]),
  );

  useEffect(() => back.bind(), [back]);

  return (
    <JobOutcomeScreen
      jobId={jobId}
      outcome={outcome}
      proofs={jobProofs[jobId] ?? []}
      initialDraft={getOutcomeDraft(jobId, outcome)}
      onBack={() => navigation.goBack()}
      onBackGuardChange={back.setGuard}
      onBackInterceptChange={back.setInterceptor}
      onDiscardDraft={() => clearOutcomeDraft(jobId, outcome)}
      onDraftChange={(draft) => saveOutcomeDraft(jobId, outcome, draft)}
      onOpenUploadProof={(nextJobId) =>
        navigation.navigate("JobUploadProof", { jobId: nextJobId })
      }
      onDone={() => {
        clearOutcomeDraft(jobId, outcome);
        back.setGuard(false);
        back.setInterceptor(null);
        navigation.navigate("JobDetail", { jobId });
      }}
    />
  );
}

function ComplaintDetailRoute() {
  const navigation = useAppNavigation<"ComplaintDetail">();
  const route =
    useRoute<RouteProp<RootStackParamList, "ComplaintDetail">>();
  const { complaintId } = route.params;
  const back = useScreenBackController("ComplaintDetail");

  useEffect(() => back.bind(), [back]);

  return (
    <ComplaintDetailScreen
      complaintId={complaintId}
      onBack={() => navigation.goBack()}
      onBackGuardChange={back.setGuard}
      onBackInterceptChange={back.setInterceptor}
      onOpenJob={(jobId) => navigation.navigate("JobDetail", { jobId })}
    />
  );
}

function DeviceCheckRoute() {
  const navigation = useAppNavigation<"DeviceCheck">();

  return (
    <DeviceCheckScreen
      onBack={() => navigation.goBack()}
      onContinue={() => navigation.goBack()}
    />
  );
}

function DiagnosticsRoute() {
  const navigation = useAppNavigation<"Diagnostics">();

  return (
    <DiagnosticsScreen
      currentRouteName="Diagnostics"
      onBack={() => navigation.goBack()}
    />
  );
}

function AppStack() {
  return (
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
      <RootStack.Screen name="Tabs" component={AppTabs} />
      <RootStack.Screen name="JobDetail" component={JobDetailRoute} />
      <RootStack.Screen
        name="JobUpdateStatus"
        component={JobUpdateStatusRoute}
      />
      <RootStack.Screen name="JobAddNotes" component={JobAddNotesRoute} />
      <RootStack.Screen
        name="JobUploadProof"
        component={JobUploadProofRoute}
      />
      <RootStack.Screen name="JobOutcome" component={JobOutcomeRoute} />
      <RootStack.Screen
        name="ComplaintDetail"
        component={ComplaintDetailRoute}
      />
      <RootStack.Screen name="DeviceCheck" component={DeviceCheckRoute} />
      <RootStack.Screen name="Diagnostics" component={DiagnosticsRoute} />
    </RootStack.Navigator>
  );
}

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
    </AuthStack.Navigator>
  );
}

export default function RootNavigator() {
  const { user } = useAuth();
  return user ? <AppStack /> : <AuthNavigator />;
}
