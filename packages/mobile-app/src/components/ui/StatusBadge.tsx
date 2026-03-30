import { StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing } from "../../constants/theme";
import { titleCase } from "../../utils/format";

const toneMap: Record<string, { background: string; text: string; dot: string }> = {
  pending: { background: colors.warningSoft, text: colors.warning, dot: "#d97706" },
  uploading: { background: colors.infoSoft, text: colors.info, dot: colors.info },
  uploaded: { background: colors.successSoft, text: colors.success, dot: colors.success },
  assigned: { background: colors.brandSoft, text: colors.brand, dot: colors.brand },
  on_the_way: { background: colors.infoSoft, text: colors.info, dot: colors.info },
  en_route: { background: colors.infoSoft, text: colors.info, dot: colors.info },
  arrived: { background: "#dbeafe", text: "#1d4ed8", dot: "#2563eb" },
  work_started: { background: colors.warningSoft, text: colors.warning, dot: "#d97706" },
  in_progress: { background: colors.warningSoft, text: colors.warning, dot: "#d97706" },
  completed: { background: colors.successSoft, text: colors.success, dot: colors.success },
  rescheduled: { background: "#fef3c7", text: "#b45309", dot: "#d97706" },
  failed: { background: colors.dangerSoft, text: colors.danger, dot: colors.danger },
  cancelled: { background: "#e2e8f0", text: colors.textMuted, dot: colors.textMuted },
  open: { background: colors.infoSoft, text: colors.info, dot: colors.info },
  on_hold: { background: "#e2e8f0", text: colors.textMuted, dot: colors.textMuted },
  resolved: { background: colors.successSoft, text: colors.success, dot: colors.success },
  critical: { background: colors.dangerSoft, text: colors.danger, dot: colors.danger },
  high: { background: "#ffedd5", text: "#c2410c", dot: "#ea580c" },
  medium: { background: colors.warningSoft, text: colors.warning, dot: "#d97706" },
  low: { background: colors.infoSoft, text: colors.info, dot: colors.info },
  available: { background: colors.successSoft, text: colors.success, dot: colors.success },
  on_job: { background: colors.warningSoft, text: colors.warning, dot: "#d97706" },
  off_duty: { background: "#e2e8f0", text: colors.textMuted, dot: colors.textMuted },
};

export default function StatusBadge({ value }: { value: string }) {
  const tone = toneMap[value] ?? {
    background: "#e2e8f0",
    text: colors.textMuted,
    dot: colors.textMuted,
  };

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: tone.background,
        },
      ]}
    >
      <View style={[styles.dot, { backgroundColor: tone.dot }]} />
      <Text style={[styles.label, { color: tone.text }]}>{titleCase(value)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: radius.pill,
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
  },
});
