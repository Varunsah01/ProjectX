import { StyleSheet, Text } from "react-native";
import Card from "../../../components/ui/Card";
import { colors, spacing } from "../../../constants/theme";

export default function JobSummaryCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "warning" | "success" | "danger";
}) {
  const accentColor =
    tone === "warning"
      ? colors.warning
      : tone === "success"
        ? colors.success
        : tone === "danger"
          ? colors.danger
          : colors.brand;

  return (
    <Card style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, { color: accentColor }]}>{value}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minHeight: 112,
    justifyContent: "space-between",
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.textMuted,
  },
  value: {
    marginTop: spacing.sm,
    fontSize: 30,
    fontWeight: "800",
  },
});
