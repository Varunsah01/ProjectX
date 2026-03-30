import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Clipboard,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import ScreenHeader from "../../components/shell/ScreenHeader";
import FullscreenState from "../../components/states/FullscreenState";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import NoticeCard from "../../components/ui/NoticeCard";
import { APP_ANDROID_PACKAGE_ID, APP_VERSION } from "../../constants/branding";
import { colors, spacing } from "../../constants/theme";
import { useAuth } from "../../hooks/useAuth";
import { useSync } from "../../hooks/useSync";
import {
  getApiConfigError,
  getApiDiagnostics,
  getApiTargetNotice,
} from "../../services/api";
import {
  getLastRetainedTestLogRecord,
  isInternalDiagnosticsEnabled,
  subscribeRetainedTestLogRecord,
  type RetainedTestLogRecord,
} from "../../services/test-logger";
import { formatDateTime, titleCase } from "../../utils/format";

type ActionNotice = {
  tone: "info" | "warning" | "danger" | "success";
  title: string;
  message: string;
};

export default function DiagnosticsScreen({
  currentRouteName,
  onBack,
}: {
  currentRouteName: string;
  onBack: () => void;
}) {
  const internalDiagnosticsEnabled = isInternalDiagnosticsEnabled();
  const { hasSessionToken, sessionNotice, user } = useAuth();
  const {
    clearPendingActions,
    isSyncing,
    lastSyncError,
    pendingActions,
    pendingCount,
    replayPendingActions,
  } = useSync();
  const [actionNotice, setActionNotice] = useState<ActionNotice | null>(null);
  const [isRetryingSync, setIsRetryingSync] = useState(false);
  const [isClearingQueue, setIsClearingQueue] = useState(false);
  const [lastRetainedLogRecord, setLastRetainedLogRecord] = useState<RetainedTestLogRecord | null>(
    () => getLastRetainedTestLogRecord(),
  );
  const apiDiagnostics = getApiDiagnostics();
  const apiConfigError = getApiConfigError();
  const apiTargetNotice = getApiTargetNotice();
  const buildProfileLabel = apiDiagnostics.buildProfile
    ? apiDiagnostics.buildProfile
    : apiDiagnostics.buildIntent === "development"
      ? "Local dev session"
      : "Not reported";
  const backendTargetLabel = apiDiagnostics.baseUrl ?? "Not configured";
  const testerBuildMessage = apiDiagnostics.baseUrl
    ? apiDiagnostics.mode === "android-emulator-fallback"
      ? "This build is pointed at the Android emulator backend. That is only correct for emulator testing."
      : "A tester can confirm this is the correct internal build by matching the version, Android app id, build profile, and backend target below."
    : "This build does not currently expose a safe backend target for internal testing.";
  const pendingActionPreview = pendingActions.length
    ? pendingActions
      .slice(0, 3)
      .map((action) => `${titleCase(action.type)} (${action.jobId})`)
      .join(", ")
    : "None";

  useEffect(() => {
    return subscribeRetainedTestLogRecord(setLastRetainedLogRecord);
  }, []);

  const diagnosticsSummary = useMemo(() => {
    const lastNoticeSummary = sessionNotice
      ? `${titleCase(sessionNotice.tone)}: ${sessionNotice.message}`
      : "None";
    const lastRetainedSummary = lastRetainedLogRecord
      ? `${titleCase(lastRetainedLogRecord.level)} at ${formatDateTime(lastRetainedLogRecord.occurredAt)}: ${lastRetainedLogRecord.message}`
      : "None";

    return [
      `App Version: ${APP_VERSION}`,
      `Android App Id: ${APP_ANDROID_PACKAGE_ID}`,
      `Current Route: ${currentRouteName}`,
      `Internal Diagnostics Enabled: ${internalDiagnosticsEnabled ? "Yes" : "No"}`,
      `Build Profile: ${buildProfileLabel}`,
      `Backend Target: ${backendTargetLabel}`,
      `EXPO_PUBLIC_API_URL Configured: ${apiDiagnostics.apiUrlConfigured ? "Yes" : "No"}`,
      `Configured API URL: ${apiDiagnostics.configuredApiUrl ?? "Not set"}`,
      `API Resolution Mode: ${apiDiagnostics.mode}`,
      `API Base URL: ${apiDiagnostics.baseUrl ?? "Not available"}`,
      `Mobile API URL: ${apiDiagnostics.mobileApiBaseUrl ?? "Not available"}`,
      `API URL Required: ${apiDiagnostics.apiUrlRequired ? "Yes" : "No"}`,
      `API Localhost-like URL: ${apiDiagnostics.isLocalhostLikeApiUrl ? "Yes" : "No"}`,
      `Build Intent: ${apiDiagnostics.buildIntent}`,
      `Build Profile: ${apiDiagnostics.buildProfile ?? "Not set"}`,
      `API Config Error: ${apiConfigError ?? "None"}`,
      `API Target Notice: ${apiTargetNotice ?? "None"}`,
      `Session Token Present: ${hasSessionToken ? "Yes" : "No"}`,
      `User ID: ${user?.id ?? "Not available"}`,
      `User Name: ${user?.name ?? "Not available"}`,
      `User Phone: ${user?.phone ?? "Not available"}`,
      `User Role: ${user ? titleCase(user.role) : "Not available"}`,
      `User Territory: ${user?.territory ?? "Not available"}`,
      `User Status: ${user?.status ?? "Not available"}`,
      `Session Notice: ${lastNoticeSummary}`,
      `Pending Sync Actions: ${pendingCount}`,
      `Sync In Progress: ${isSyncing ? "Yes" : "No"}`,
      `Pending Action Preview: ${pendingActionPreview}`,
      `Last Sync Error: ${lastSyncError ?? "None"}`,
      `Last Warning/Error: ${lastRetainedSummary}`,
    ].join("\n");
  }, [
    apiConfigError,
    APP_ANDROID_PACKAGE_ID,
    APP_VERSION,
    apiDiagnostics.apiUrlConfigured,
    apiDiagnostics.apiUrlRequired,
    apiDiagnostics.baseUrl,
    apiDiagnostics.buildIntent,
    apiDiagnostics.buildProfile,
    apiDiagnostics.configuredApiUrl,
    apiDiagnostics.isLocalhostLikeApiUrl,
    apiDiagnostics.mobileApiBaseUrl,
    apiDiagnostics.mode,
    apiTargetNotice,
    currentRouteName,
    buildProfileLabel,
    backendTargetLabel,
    hasSessionToken,
    internalDiagnosticsEnabled,
    isSyncing,
    lastRetainedLogRecord,
    lastSyncError,
    pendingActionPreview,
    pendingCount,
    sessionNotice,
    user,
  ]);

  if (!internalDiagnosticsEnabled) {
    return (
      <FullscreenState
        title="Diagnostics unavailable"
        message="Internal diagnostics are only enabled in development or test-log builds."
        actionLabel="Back"
        onAction={onBack}
      />
    );
  }

  async function handleForceSyncRetry() {
    setIsRetryingSync(true);
    setActionNotice(null);

    try {
      await replayPendingActions();
      setActionNotice({
        tone: "info",
        title: "Sync Retry Requested",
        message: "The app replayed the current pending queue. Review the sync section for the latest result.",
      });
    } finally {
      setIsRetryingSync(false);
    }
  }

  function handleCopyDiagnostics() {
    Clipboard.setString(diagnosticsSummary);
    setActionNotice({
      tone: "success",
      title: "Copied to Clipboard",
      message: "The current diagnostics summary is ready to paste into an internal bug report.",
    });
  }

  async function handleClearPendingQueue() {
    setIsClearingQueue(true);
    setActionNotice(null);

    try {
      await clearPendingActions();
      setActionNotice({
        tone: "warning",
        title: "Pending Queue Cleared",
        message: "Local pending sync actions were removed from this device.",
      });
    } finally {
      setIsClearingQueue(false);
    }
  }

  function confirmClearPendingQueue() {
    Alert.alert(
      "Clear Pending Sync Queue?",
      "This removes all queued offline sync actions from this device. This cannot be undone.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Clear Queue",
          style: "destructive",
          onPress: () => {
            void handleClearPendingQueue();
          },
        },
      ],
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <ScreenHeader
        title="Diagnostics"
        subtitle="Internal-only device, session, and sync checks for field validation."
        backLabel="Back to Profile"
        onBack={onBack}
      />

      {actionNotice ? (
        <NoticeCard
          tone={actionNotice.tone}
          title={actionNotice.title}
          message={actionNotice.message}
        />
      ) : null}

      {apiConfigError ? (
        <NoticeCard
          tone="danger"
          title="API Configuration Error"
          message={apiConfigError}
        />
      ) : apiTargetNotice ? (
        <NoticeCard
          tone="warning"
          title="API Target Notice"
          message={apiTargetNotice}
        />
      ) : null}

      {sessionNotice ? (
        <NoticeCard
          tone={sessionNotice.tone}
          title="Session Notice"
          message={sessionNotice.message}
        />
      ) : null}

      {lastSyncError ? (
        <NoticeCard
          tone="warning"
          title="Last Sync Warning"
          message={lastSyncError}
        />
      ) : null}

      <Card>
        <Text style={styles.sectionTitle}>Tester Build Check</Text>
        <Text style={styles.helperText}>{testerBuildMessage}</Text>
        <DiagnosticsLine label="App version" value={APP_VERSION} />
        <DiagnosticsLine label="Android app id" value={APP_ANDROID_PACKAGE_ID} />
        <DiagnosticsLine label="Build profile" value={buildProfileLabel} />
        <DiagnosticsLine label="Backend target" value={backendTargetLabel} />
        <DiagnosticsLine label="Current route" value={currentRouteName} />
        <DiagnosticsLine
          label="Internal diagnostics"
          value={internalDiagnosticsEnabled ? "Enabled" : "Disabled"}
        />
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>API</Text>
        <DiagnosticsLine
          label="EXPO_PUBLIC_API_URL configured"
          value={apiDiagnostics.apiUrlConfigured ? "Yes" : "No"}
        />
        <DiagnosticsLine
          label="Configured API URL"
          value={apiDiagnostics.configuredApiUrl ?? "Not set"}
        />
        <DiagnosticsLine label="Resolution mode" value={apiDiagnostics.mode} />
        <DiagnosticsLine label="Current backend target" value={backendTargetLabel} />
        <DiagnosticsLine
          label="Mobile API URL"
          value={apiDiagnostics.mobileApiBaseUrl ?? "Not available"}
        />
        <DiagnosticsLine
          label="API URL required"
          value={apiDiagnostics.apiUrlRequired ? "Yes" : "No"}
        />
        <DiagnosticsLine
          label="Localhost-like URL"
          value={apiDiagnostics.isLocalhostLikeApiUrl ? "Yes" : "No"}
        />
        <DiagnosticsLine label="Build intent" value={apiDiagnostics.buildIntent} />
        <DiagnosticsLine
          label="Build profile"
          value={apiDiagnostics.buildProfile ?? "Not set"}
        />
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Session</Text>
        <DiagnosticsLine
          label="Session token present"
          value={hasSessionToken ? "Yes" : "No"}
        />
        <DiagnosticsLine label="User ID" value={user?.id ?? "Not available"} />
        <DiagnosticsLine label="Name" value={user?.name ?? "Not available"} />
        <DiagnosticsLine label="Phone" value={user?.phone ?? "Not available"} />
        <DiagnosticsLine
          label="Role"
          value={user ? titleCase(user.role) : "Not available"}
        />
        <DiagnosticsLine
          label="Territory"
          value={user?.territory ?? "Not available"}
        />
        <DiagnosticsLine label="Status" value={user?.status ?? "Not available"} />
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Sync</Text>
        <DiagnosticsLine label="Pending actions" value={String(pendingCount)} />
        <DiagnosticsLine label="Sync in progress" value={isSyncing ? "Yes" : "No"} />
        <DiagnosticsLine label="Pending preview" value={pendingActionPreview} />
        <DiagnosticsLine
          label="Last sync error"
          value={lastSyncError ?? "None"}
          muted={!lastSyncError}
        />
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Last Warning / Error</Text>
        {lastRetainedLogRecord ? (
          <>
            <DiagnosticsLine
              label="Level"
              value={titleCase(lastRetainedLogRecord.level)}
            />
            <DiagnosticsLine
              label="Occurred at"
              value={formatDateTime(lastRetainedLogRecord.occurredAt)}
            />
            <DiagnosticsLine
              label="Scope"
              value={lastRetainedLogRecord.scope}
            />
            <DiagnosticsLine
              label="Event"
              value={lastRetainedLogRecord.event}
            />
            <DiagnosticsLine
              label="Message"
              value={lastRetainedLogRecord.message}
            />
          </>
        ) : (
          <DiagnosticsLine
            label="State"
            value="No retained warning or error is available in this session."
            muted
          />
        )}
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Actions</Text>
        <Button
          label="Force Sync Retry"
          onPress={() => {
            void handleForceSyncRetry();
          }}
          loading={isRetryingSync}
          disabled={isSyncing || isClearingQueue}
        />
        <Button
          label="Copy Diagnostics Summary"
          variant="secondary"
          onPress={handleCopyDiagnostics}
          disabled={isClearingQueue}
        />
        <Button
          label="Clear Local Pending Queue"
          variant="danger"
          onPress={confirmClearPendingQueue}
          disabled={pendingCount === 0 || isSyncing || isClearingQueue}
          loading={isClearingQueue}
        />
      </Card>
    </ScrollView>
  );
}

function DiagnosticsLine({
  label,
  muted = false,
  value,
}: {
  label: string;
  muted?: boolean;
  value: string;
}) {
  return (
    <View style={styles.line}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, muted && styles.valueMuted]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.text,
  },
  helperText: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.textMuted,
  },
  line: {
    gap: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
  label: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.textSubtle,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  value: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "600",
    color: colors.text,
  },
  valueMuted: {
    color: colors.textMuted,
  },
});
