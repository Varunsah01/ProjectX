import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import NoticeCard from "../../components/ui/NoticeCard";
import { colors, radius, spacing } from "../../constants/theme";
import { useAuth } from "../../hooks/useAuth";
import {
  checkApiReachability,
  type ApiReachabilityCheck,
} from "../../services/api";
import {
  getProofPermissionStatus,
  requestProofPermission,
  type ProofPermissionSummary,
} from "../../services/proof-upload";

type CheckTone = "info" | "warning" | "danger" | "success";

export default function DeviceCheckScreen({
  onContinue,
  onBack,
}: {
  onContinue: () => void;
  onBack?: () => void;
}) {
  const { user } = useAuth();
  const [networkCheck, setNetworkCheck] = useState<ApiReachabilityCheck | null>(null);
  const [cameraPermission, setCameraPermission] = useState<ProofPermissionSummary | null>(null);
  const [galleryPermission, setGalleryPermission] = useState<ProofPermissionSummary | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [galleryLoading, setGalleryLoading] = useState(false);
  const [settingsLoading, setSettingsLoading] = useState<"camera" | "gallery" | null>(null);
  const [screenError, setScreenError] = useState<string | null>(null);

  const loadChecks = useCallback(async () => {
    setRefreshing(true);
    setScreenError(null);

    try {
      const [nextNetworkCheck, nextCameraPermission, nextGalleryPermission] =
        await Promise.all([
          checkApiReachability(),
          getProofPermissionStatus("camera"),
          getProofPermissionStatus("gallery"),
        ]);

      setNetworkCheck(nextNetworkCheck);
      setCameraPermission(nextCameraPermission);
      setGalleryPermission(nextGalleryPermission);
    } catch (error) {
      setScreenError(
        error instanceof Error
          ? error.message
          : "Couldn't refresh this device check. Try again.",
      );
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadChecks();
  }, [loadChecks]);

  const signInSummary = user
    ? {
        tone: "success" as const,
        label: "Ready",
        message: `Signed in as ${user.name}. Jobs and complaints can load on this phone.`,
      }
    : {
        tone: "info" as const,
        label: "Needed",
        message: "You need to sign in before jobs, complaints, and saved updates will load.",
      };

  const networkSummary = useMemo(() => {
    if (!networkCheck) {
      return {
        tone: "info" as const,
        label: "Checking",
        message: "Checking whether this phone can reach the server.",
      };
    }

    if (networkCheck.status === "reachable") {
      return {
        tone: "success" as const,
        label: "Ready",
        message: networkCheck.message,
      };
    }

    if (networkCheck.status === "not_configured") {
      return {
        tone: "danger" as const,
        label: "Build Issue",
        message: networkCheck.message,
      };
    }

    return {
      tone: "warning" as const,
      label: "Check Connection",
      message: networkCheck.message,
    };
  }, [networkCheck]);

  const topNotice = useMemo(() => {
    if (!networkCheck || !cameraPermission || !galleryPermission) {
      return {
        tone: "info" as const,
        title: "Checking This Phone",
        message: "Review the items below before you start. You can continue when you are ready.",
      };
    }

    const hasBlockingIssue = networkSummary.tone === "danger";
    const hasAttentionItem =
      networkSummary.tone === "warning" ||
      cameraPermission?.state !== "granted" ||
      galleryPermission?.state !== "granted";

    if (hasBlockingIssue) {
      return {
        tone: "danger" as const,
        title: "This Build Needs Attention",
        message:
          "This phone is missing something important before testing can start. Check the items below, then continue only if your lead asked you to.",
      };
    }

    if (hasAttentionItem) {
      return {
        tone: "warning" as const,
        title: "Quick Check Before You Start",
        message:
          "You can continue now, but proof photos or live updates may not work until the items below are ready.",
      };
    }

    return {
      tone: "success" as const,
      title: "This Phone Looks Ready",
      message: "Sign-in, server access, and photo permissions all look ready.",
    };
  }, [cameraPermission, galleryPermission, networkCheck, networkSummary.tone]);

  async function handlePermissionRequest(permission: "camera" | "gallery") {
    if (permission === "camera") {
      setCameraLoading(true);
    } else {
      setGalleryLoading(true);
    }

    setScreenError(null);

    try {
      const result = await requestProofPermission(permission);

      if (permission === "camera") {
        setCameraPermission(result);
      } else {
        setGalleryPermission(result);
      }
    } catch (error) {
      setScreenError(
        error instanceof Error ? error.message : "Couldn't update permission status.",
      );
    } finally {
      if (permission === "camera") {
        setCameraLoading(false);
      } else {
        setGalleryLoading(false);
      }
    }
  }

  async function handleOpenSettings(permission: "camera" | "gallery") {
    setSettingsLoading(permission);
    setScreenError(null);

    try {
      await Linking.openSettings();
    } catch {
      setScreenError(
        "Couldn't open Android settings. Open Settings manually, allow access, and try again.",
      );
    } finally {
      setSettingsLoading(null);
    }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        {onBack ? (
          <Button label="Back to Profile" variant="ghost" onPress={onBack} />
        ) : null}
        <View style={styles.headerCopy}>
          <Text style={styles.title}>Device Check</Text>
          <Text style={styles.subtitle}>
            Quick setup check before you start. You can open this again later from
            Profile.
          </Text>
        </View>
      </View>

      <NoticeCard
        tone={topNotice.tone}
        title={topNotice.title}
        message={topNotice.message}
      />

      {screenError ? (
        <NoticeCard
          tone="danger"
          title="Couldn't Refresh Device Check"
          message={screenError}
          actionLabel="Try Again"
          onAction={() => void loadChecks()}
        />
      ) : null}

      <DeviceCheckItem
        title="Sign In"
        tone={signInSummary.tone}
        statusLabel={signInSummary.label}
        message={signInSummary.message}
      />

      <DeviceCheckItem
        title="Network"
        tone={networkSummary.tone}
        statusLabel={networkSummary.label}
        message={networkSummary.message}
        actionLabel="Check Again"
        onAction={() => void loadChecks()}
        actionLoading={refreshing}
      />

      <PermissionCheckItem
        title="Camera Access"
        summary={cameraPermission}
        loading={cameraLoading}
        settingsLoading={settingsLoading === "camera"}
        onAllow={() => void handlePermissionRequest("camera")}
        onOpenSettings={() => void handleOpenSettings("camera")}
      />

      <PermissionCheckItem
        title="Photo Access"
        summary={galleryPermission}
        loading={galleryLoading}
        settingsLoading={settingsLoading === "gallery"}
        onAllow={() => void handlePermissionRequest("gallery")}
        onOpenSettings={() => void handleOpenSettings("gallery")}
      />

      <Card>
        <Text style={styles.footerTitle}>What This Check Covers</Text>
        <Text style={styles.footerText}>
          Sign in is required before work loads. A live connection is needed for sign
          in and fresh data. Camera and photo access are needed before you can add
          proof photos.
        </Text>
        <Button label="Continue" onPress={onContinue} />
      </Card>
    </ScrollView>
  );
}

function PermissionCheckItem({
  title,
  summary,
  loading,
  settingsLoading,
  onAllow,
  onOpenSettings,
}: {
  title: string;
  summary: ProofPermissionSummary | null;
  loading: boolean;
  settingsLoading: boolean;
  onAllow: () => void;
  onOpenSettings: () => void;
}) {
  if (!summary) {
    return (
      <DeviceCheckItem
        title={title}
        tone="info"
        statusLabel="Checking"
        message="Checking permission status on this phone."
      />
    );
  }

  const tone: CheckTone =
    summary.state === "granted"
      ? "success"
      : summary.state === "blocked"
        ? "danger"
        : "warning";
  const statusLabel =
    summary.state === "granted"
      ? "Ready"
      : summary.state === "blocked"
        ? "Settings"
        : "Needed";

  return (
    <DeviceCheckItem
      title={title}
      tone={tone}
      statusLabel={statusLabel}
      message={summary.message}
      actionLabel={summary.state === "blocked" ? "Open Settings" : "Allow Access"}
      onAction={summary.state === "blocked" ? onOpenSettings : onAllow}
      actionLoading={summary.state === "blocked" ? settingsLoading : loading}
    />
  );
}

function DeviceCheckItem({
  title,
  tone,
  statusLabel,
  message,
  actionLabel,
  onAction,
  actionLoading = false,
}: {
  title: string;
  tone: CheckTone;
  statusLabel: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  actionLoading?: boolean;
}) {
  return (
    <Card>
      <View style={styles.itemHeader}>
        <Text style={styles.itemTitle}>{title}</Text>
        <StatusPill tone={tone} label={statusLabel} />
      </View>
      <Text style={styles.itemMessage}>{message}</Text>
      {actionLabel && onAction ? (
        <Button
          label={actionLabel}
          variant={tone === "danger" ? "danger" : "secondary"}
          onPress={onAction}
          loading={actionLoading}
        />
      ) : null}
    </Card>
  );
}

function StatusPill({
  tone,
  label,
}: {
  tone: CheckTone;
  label: string;
}) {
  return (
    <View
      style={[
        styles.statusPill,
        tone === "success"
          ? styles.statusPillSuccess
          : tone === "warning"
            ? styles.statusPillWarning
            : tone === "danger"
              ? styles.statusPillDanger
              : styles.statusPillInfo,
      ]}
    >
      <Text
        style={[
          styles.statusPillLabel,
          tone === "success"
            ? styles.statusPillLabelSuccess
            : tone === "warning"
              ? styles.statusPillLabelWarning
              : tone === "danger"
                ? styles.statusPillLabelDanger
                : styles.statusPillLabelInfo,
        ]}
      >
        {label}
      </Text>
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
  header: {
    gap: spacing.md,
  },
  headerCopy: {
    gap: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.text,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.textMuted,
  },
  itemHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  itemTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: "800",
    color: colors.text,
  },
  itemMessage: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.textMuted,
  },
  statusPill: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  statusPillSuccess: {
    backgroundColor: colors.successSoft,
  },
  statusPillWarning: {
    backgroundColor: colors.warningSoft,
  },
  statusPillDanger: {
    backgroundColor: colors.dangerSoft,
  },
  statusPillInfo: {
    backgroundColor: colors.infoSoft,
  },
  statusPillLabel: {
    fontSize: 12,
    fontWeight: "800",
  },
  statusPillLabelSuccess: {
    color: colors.success,
  },
  statusPillLabelWarning: {
    color: colors.warning,
  },
  statusPillLabelDanger: {
    color: colors.danger,
  },
  statusPillLabelInfo: {
    color: colors.info,
  },
  footerTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.text,
  },
  footerText: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.textMuted,
  },
});
