import { StyleSheet, Text, View } from "react-native";
import Card from "../../../components/ui/Card";
import StatusBadge from "../../../components/ui/StatusBadge";
import { colors, spacing } from "../../../constants/theme";
import type { Job } from "../../../types/domain";
import { formatDate } from "../../../utils/format";

export default function JobContextCard({
  job,
}: {
  job: Job;
}) {
  const displayStatus = job.operatorStatus ?? job.status;

  return (
    <Card>
      <View style={styles.row}>
        <View style={styles.copy}>
          <Text style={styles.title}>{job.jobNumber}</Text>
          <Text style={styles.subtitle}>
            {job.customer.name} · {formatDate(job.scheduledDate)}
          </Text>
        </View>
        <StatusBadge value={displayStatus} />
      </View>

      <Text style={styles.body}>{job.notes ?? "No dispatcher notes on this job."}</Text>
      <Text style={styles.meta}>
        {job.asset ? `${job.asset.name} · ${job.asset.category}` : "No asset linked"}
      </Text>
      {job.serviceReport ? (
        <View style={styles.savedNote}>
          <Text style={styles.savedLabel}>Saved technician note</Text>
          <Text style={styles.savedBody}>{job.serviceReport}</Text>
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  copy: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textMuted,
  },
  body: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.text,
  },
  meta: {
    fontSize: 13,
    color: colors.textMuted,
  },
  savedNote: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
    gap: 4,
  },
  savedLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.textSubtle,
    textTransform: "uppercase",
  },
  savedBody: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.text,
  },
});
