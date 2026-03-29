import { StyleSheet, Text, View } from "react-native";
import Button from "../ui/Button";
import { colors, spacing } from "../../constants/theme";
import { useSync } from "../../hooks/useSync";

export default function ScreenHeader({
  title,
  subtitle,
  backLabel = "Back",
  backDisabled = false,
  onBack,
}: {
  title: string;
  subtitle?: string;
  backLabel?: string;
  backDisabled?: boolean;
  onBack?: () => void;
}) {
  const { isSyncing, pendingCount, lastSyncError } = useSync();
  const statusLabel = isSyncing
    ? `Syncing ${pendingCount} pending action${pendingCount === 1 ? "" : "s"}`
    : pendingCount > 0
      ? `${pendingCount} action${pendingCount === 1 ? "" : "s"} pending sync`
      : lastSyncError
        ? "Last sync needs attention"
        : null;

  return (
    <View style={styles.container}>
      {onBack ? (
        <Button
          label={backLabel}
          variant="ghost"
          onPress={onBack}
          disabled={backDisabled}
        />
      ) : null}
      <View style={styles.copy}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        {statusLabel ? (
          <View
            style={[
              styles.syncPill,
              isSyncing
                ? styles.syncPillActive
                : pendingCount > 0
                  ? styles.syncPillPending
                  : styles.syncPillError,
            ]}
          >
            <Text
              style={[
                styles.syncPillLabel,
                isSyncing
                  ? styles.syncPillLabelActive
                  : pendingCount > 0
                    ? styles.syncPillLabelPending
                    : styles.syncPillLabelError,
              ]}
            >
              {statusLabel}
            </Text>
          </View>
        ) : null}
        {!isSyncing && lastSyncError && pendingCount > 0 ? (
          <Text style={styles.syncError}>{lastSyncError}</Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  copy: {
    gap: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textMuted,
    lineHeight: 21,
  },
  syncPill: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    marginTop: spacing.xs,
  },
  syncPillActive: {
    backgroundColor: colors.infoSoft,
  },
  syncPillPending: {
    backgroundColor: colors.warningSoft,
  },
  syncPillError: {
    backgroundColor: colors.dangerSoft,
  },
  syncPillLabel: {
    fontSize: 12,
    fontWeight: "700",
  },
  syncPillLabelActive: {
    color: colors.info,
  },
  syncPillLabelPending: {
    color: colors.warning,
  },
  syncPillLabelError: {
    color: colors.danger,
  },
  syncError: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.textMuted,
  },
});
