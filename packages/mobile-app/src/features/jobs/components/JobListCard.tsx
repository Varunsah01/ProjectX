import { StyleSheet, Text, View } from "react-native";
import Button from "../../../components/ui/Button";
import Card from "../../../components/ui/Card";
import StatusBadge from "../../../components/ui/StatusBadge";
import { colors, spacing } from "../../../constants/theme";
import { useSync } from "../../../hooks/useSync";
import { countPendingActionsForJob } from "../../../services/offline-sync";
import type { Job } from "../../../types/domain";
import {
  getJobAddressSnippet,
  getJobServiceLabel,
  getJobTimeSlot,
  getPrimaryJobActionLabel,
} from "../job-board";

export default function JobListCard({
  job,
  onOpenJob,
  testIdPrefix = "jobs",
}: {
  job: Job;
  onOpenJob: (jobId: string) => void;
  testIdPrefix?: string;
}) {
  const { pendingActions } = useSync();
  const pendingActionCount = countPendingActionsForJob(job.id, pendingActions);

  return (
    <View testID={`${testIdPrefix}.job-card.${job.id}`}>
      <Card>
        <View style={styles.header}>
          <View style={styles.copy}>
            <Text style={styles.customerName}>{job.customer.name}</Text>
            <Text style={styles.jobNumber}>{job.jobNumber}</Text>
          </View>
          <StatusBadge value={job.operatorStatus ?? job.status} />
        </View>

        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>{getJobServiceLabel(job)}</Text>
          <Text style={styles.metaDot}>•</Text>
          <Text style={styles.metaLabel}>{getJobTimeSlot(job)}</Text>
        </View>

        <Text style={styles.address} numberOfLines={2}>
          {getJobAddressSnippet(job)}
        </Text>

        {pendingActionCount > 0 ? (
          <Text style={styles.pendingSync}>
            {pendingActionCount} pending sync update{pendingActionCount === 1 ? "" : "s"}
          </Text>
        ) : null}

        <Button
          label={getPrimaryJobActionLabel(job)}
          variant={job.status === "completed" ? "ghost" : "secondary"}
          onPress={() => onOpenJob(job.id)}
          testID={`${testIdPrefix}.job-open-button.${job.id}`}
        />
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  copy: {
    flex: 1,
    gap: 4,
  },
  customerName: {
    fontSize: 17,
    fontWeight: "800",
    color: colors.text,
  },
  jobNumber: {
    fontSize: 13,
    color: colors.textSubtle,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  metaLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.textMuted,
  },
  metaDot: {
    fontSize: 12,
    color: colors.textSubtle,
  },
  address: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.text,
  },
  pendingSync: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.warning,
  },
});
