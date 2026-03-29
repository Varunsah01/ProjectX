import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useEffect, useState } from "react";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import Input from "../../components/ui/Input";
import StatusBadge from "../../components/ui/StatusBadge";
import { colors, spacing } from "../../constants/theme";
import { useAuth } from "../../hooks/useAuth";
import type { ComplaintDetail, ComplaintStatus, DetailResponse } from "../../types/api";
import { formatDate, formatDateTime } from "../../utils/format";
import { getErrorMessage } from "../../services/api";

export default function ComplaintDetailScreen({
  complaintId,
  onBack,
  onOpenJob,
}: {
  complaintId: string;
  onBack: () => void;
  onOpenJob: (jobId: string) => void;
}) {
  const { request } = useAuth();
  const [complaint, setComplaint] = useState<ComplaintDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState("");

  const loadComplaint = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await request<DetailResponse<ComplaintDetail>>(
        `/complaints/${complaintId}`,
      );
      setComplaint(response.data);
    } catch (complaintError) {
      setError(getErrorMessage(complaintError));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadComplaint();
  }, [complaintId, request]);

  const updateStatus = async (
    status: Extract<ComplaintStatus, "in_progress" | "on_hold" | "resolved">,
  ) => {
    setSubmitting(true);
    setError(null);

    try {
      await request(`/complaints/${complaintId}/status`, {
        method: "POST",
        body: {
          status,
          note,
        },
      });

      setNote("");
      await loadComplaint();
    } catch (statusError) {
      setError(getErrorMessage(statusError));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <Text style={styles.loadingText}>Loading complaint...</Text>
      </View>
    );
  }

  if (!complaint) {
    return (
      <View style={styles.centered}>
        <Text style={styles.loadingText}>Complaint unavailable.</Text>
        <Button label="Back" onPress={onBack} style={styles.backButton} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={() => void loadComplaint()} />
      }
    >
      <Button label="Back to Complaints" variant="ghost" onPress={onBack} />

      <Card>
        <View style={styles.row}>
          <View style={styles.copy}>
            <Text style={styles.title}>{complaint.subject}</Text>
            <Text style={styles.subtitle}>
              {complaint.ticketNumber} · {complaint.customer.name}
            </Text>
          </View>
          <View style={styles.statuses}>
            <StatusBadge value={complaint.priority} />
            <StatusBadge value={complaint.status} />
          </View>
        </View>

        <Text style={styles.bodyText}>{complaint.description}</Text>
        <Text style={styles.metaText}>Created: {formatDateTime(complaint.createdAt)}</Text>
        <Text style={styles.metaText}>SLA: {formatDateTime(complaint.slaDeadline)}</Text>
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Customer</Text>
        <Text style={styles.bodyText}>{complaint.customer.name}</Text>
        <Text style={styles.metaText}>{complaint.customer.address}</Text>
        <Text style={styles.metaText}>
          {complaint.customer.phone} · {complaint.customer.email}
        </Text>
      </Card>

      {complaint.asset ? (
        <Card>
          <Text style={styles.sectionTitle}>Asset</Text>
          <Text style={styles.bodyText}>{complaint.asset.name}</Text>
          <Text style={styles.metaText}>
            {complaint.asset.model} · {complaint.asset.serialNumber}
          </Text>
          <View style={styles.badgeRow}>
            <StatusBadge value={complaint.asset.status} />
            <Text style={styles.metaText}>{complaint.asset.category}</Text>
          </View>
        </Card>
      ) : null}

      <Card>
        <Text style={styles.sectionTitle}>Timeline</Text>
        {complaint.timeline.map((entry) => (
          <View key={`${entry.id ?? entry.date}-${entry.action}`} style={styles.timelineRow}>
            <Text style={styles.timelineAction}>{entry.action}</Text>
            <Text style={styles.timelineMeta}>
              {entry.by} · {formatDateTime(entry.date)}
            </Text>
            {entry.note ? <Text style={styles.timelineNote}>{entry.note}</Text> : null}
          </View>
        ))}
      </Card>

      {complaint.linkedJobs.length > 0 ? (
        <Card>
          <Text style={styles.sectionTitle}>Linked Jobs</Text>
          {complaint.linkedJobs.map((job) => (
            <View key={job.id} style={styles.linkedJobRow}>
              <View style={styles.copy}>
                <Text style={styles.bodyText}>{job.jobNumber}</Text>
                <Text style={styles.metaText}>{formatDate(job.scheduledDate)}</Text>
              </View>
              <View style={styles.linkedJobActions}>
                <StatusBadge value={job.status} />
                <Button label="Open" variant="secondary" onPress={() => onOpenJob(job.id)} />
              </View>
            </View>
          ))}
        </Card>
      ) : null}

      {!["resolved", "closed"].includes(complaint.status) ? (
        <Card>
          <Text style={styles.sectionTitle}>Update Complaint</Text>
          <Input
            label="Operator note"
            value={note}
            onChangeText={setNote}
            multiline
            autoCapitalize="sentences"
            placeholder="Add what you found, what changed, or why the issue is on hold."
          />
          <View style={styles.actionStack}>
            {(complaint.status === "assigned" ||
              complaint.status === "open" ||
              complaint.status === "reopened" ||
              complaint.status === "on_hold") ? (
              <Button
                label={complaint.status === "on_hold" ? "Resume Work" : "Start Work"}
                onPress={() => void updateStatus("in_progress")}
                loading={submitting}
              />
            ) : null}
            {complaint.status === "in_progress" ? (
              <Button
                label="Put On Hold"
                variant="secondary"
                onPress={() => void updateStatus("on_hold")}
                loading={submitting}
              />
            ) : null}
            {(complaint.status === "assigned" ||
              complaint.status === "in_progress" ||
              complaint.status === "on_hold" ||
              complaint.status === "reopened") ? (
              <Button
                label="Resolve Complaint"
                variant="danger"
                onPress={() => void updateStatus("resolved")}
                loading={submitting}
              />
            ) : null}
          </View>
        </Card>
      ) : null}

      {error ? (
        <Card>
          <Text style={styles.errorText}>{error}</Text>
        </Card>
      ) : null}
    </ScrollView>
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
  centered: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
    gap: spacing.md,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
  },
  backButton: {
    minWidth: 120,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  copy: {
    flex: 1,
    gap: 4,
  },
  statuses: {
    gap: spacing.xs,
    alignItems: "flex-end",
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textMuted,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: colors.text,
  },
  bodyText: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.text,
  },
  metaText: {
    fontSize: 13,
    color: colors.textMuted,
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    alignItems: "center",
  },
  timelineRow: {
    gap: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
  timelineAction: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
  },
  timelineMeta: {
    fontSize: 13,
    color: colors.textMuted,
  },
  timelineNote: {
    fontSize: 14,
    color: colors.text,
  },
  linkedJobRow: {
    gap: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
  linkedJobActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  actionStack: {
    gap: spacing.sm,
  },
  errorText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.danger,
  },
});
