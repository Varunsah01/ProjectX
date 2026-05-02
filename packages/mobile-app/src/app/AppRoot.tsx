import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BackHandler,
  SafeAreaView,
  StatusBar as NativeStatusBar,
  StyleSheet,
  View,
} from "react-native";
import {
  NavigationContainer,
  useNavigationContainerRef,
} from "@react-navigation/native";
import DeviceCheckScreen from "../features/device-check/DeviceCheckScreen";
import FullscreenState from "../components/states/FullscreenState";
import NoticeCard from "../components/ui/NoticeCard";
import { APP_DISPLAY_NAME } from "../constants/branding";
import { colors } from "../constants/theme";
import { useAuth } from "../hooks/useAuth";
import { usePushNotifications } from "../hooks/usePushNotifications";
import { useSync } from "../hooks/useSync";
import { AuthProvider } from "../providers/AuthProvider";
import { SyncProvider } from "../providers/SyncProvider";
import { JobStateProvider, useJobState } from "../providers/JobStateProvider";
import { getApiTargetNotice } from "../services/api";
import {
  dismissDeviceCheck,
  loadDeviceCheckDismissed,
} from "../services/device-check";
import RootNavigator from "../navigation/RootNavigator";
import { linking } from "../navigation/linking";
import type { RootStackParamList } from "../navigation/types";
import { logTestEvent } from "../services/test-logger";

const ROOT_EXIT_BACK_WINDOW_MS = 2000;

type SyncStatusNoticeState = {
  tone: "info" | "warning";
  title: string;
  message: string;
};

export default function AppRoot() {
  return (
    <AuthProvider>
      <SyncProvider>
        <JobStateProvider>
          <MobileApp />
        </JobStateProvider>
      </SyncProvider>
    </AuthProvider>
  );
}

function MobileApp() {
  const { isLoading } = useAuth();
  const [deviceCheckLoading, setDeviceCheckLoading] = useState(true);
  const [deviceCheckDismissed, setDeviceCheckDismissed] = useState(false);

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

  return <AppShell />;
}

function AppShell() {
  const { sessionNotice, user } = useAuth();
  const {
    isSyncing,
    lastSyncError,
    pendingCount,
    replayPendingActions,
  } = useSync();
  const {
    navigationNotice,
    showNavigationNotice,
    dismissNavigationNotice,
  } = useJobState();
  const navigationRef = useNavigationContainerRef<RootStackParamList>();
  const exitBackPressAtRef = useRef(0);
  const apiTargetNotice = getApiTargetNotice();

  const handleNotificationTap = useCallback(
    (data: { type: string; id: string }) => {
      if (data.type === "job" && data.id) {
        navigationRef.navigate("JobDetail", { jobId: data.id });
      } else if (data.type === "complaint" && data.id) {
        navigationRef.navigate("ComplaintDetail", { complaintId: data.id });
      }
    },
    [navigationRef],
  );

  usePushNotifications(handleNotificationTap);

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
        } sending now. Keep the app open until ${
          pendingCount === 1 ? "it finishes." : "they finish."
        }`,
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

  const handleRetrySync = useCallback(() => {
    void replayPendingActions();
  }, [replayPendingActions]);

  useEffect(() => {
    if (!user) {
      return;
    }

    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        if (navigationRef.canGoBack()) {
          return false;
        }

        const now = Date.now();

        if (now - exitBackPressAtRef.current < ROOT_EXIT_BACK_WINDOW_MS) {
          logTestEvent("navigation", "hardware-back-exit");
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
        logTestEvent("navigation", "hardware-back-exit-prompt");
        return true;
      },
    );

    return () => {
      subscription.remove();
    };
  }, [navigationRef, showNavigationNotice, user]);

  useEffect(() => {
    if (!user) {
      exitBackPressAtRef.current = 0;
      dismissNavigationNotice();
    }
  }, [dismissNavigationNotice, user]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.appShell}>
        {apiTargetNotice ||
        sessionNotice ||
        syncStatusNotice ||
        navigationNotice ? (
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
        <View style={styles.content}>
          <NavigationContainer
            ref={navigationRef}
            linking={linking}
            onStateChange={(state) => {
              if (!state) {
                return;
              }

              const route = findFocusedRoute(state);
              if (route) {
                logTestEvent("navigation", "route-visible", {
                  routeName: route.name,
                });
              }
            }}
          >
            <RootNavigator />
          </NavigationContainer>
        </View>
      </View>
    </SafeAreaView>
  );
}

function findFocusedRoute(state: unknown): { name: string } | null {
  if (!state || typeof state !== "object") {
    return null;
  }

  const candidate = state as {
    index?: number;
    routes?: Array<{ name?: string; state?: unknown }>;
  };

  if (
    typeof candidate.index !== "number" ||
    !Array.isArray(candidate.routes)
  ) {
    return null;
  }

  const route = candidate.routes[candidate.index];

  if (!route || typeof route.name !== "string") {
    return null;
  }

  if (route.state) {
    const nested = findFocusedRoute(route.state);
    if (nested) {
      return nested;
    }
  }

  return { name: route.name };
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
