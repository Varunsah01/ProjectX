import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import Input from "../../components/ui/Input";
import NoticeCard from "../../components/ui/NoticeCard";
import StatusBadge from "../../components/ui/StatusBadge";
import ScreenHeader from "../../components/shell/ScreenHeader";
import FullscreenState from "../../components/states/FullscreenState";
import { colors, spacing } from "../../constants/theme";
import { useAuth } from "../../hooks/useAuth";
import { useComplaintDetail } from "../../hooks/useComplaintDetail";
import { getErrorMessage } from "../../services/api";
import {
  fetchComplaintDetail,
  updateComplaintStatus,
} from "../../services/complaints";
import {
  saveComplaintDetailCache,
} from "../../services/complaint-cache";
import type { ComplaintStatus } from "../../types/api";
import { formatDate, formatDateTime } from "../../utils/format";

type ComplaintActionStatus = Extract<ComplaintStatus, "in_progress" | "on_hold" | "resolved">;

function getComplaintActionConfig(status: ComplaintStatus) {
  return {
    canStartWork:
      status === "assigned" ||
      status === "open" ||
      status === "reopened" ||
      status === "on_hold",
    canPutOnHold: status === "in_progress",
    canResolve:
      status === "assigned" ||
      status === "in_progress" ||
      status === "on_hold" ||
      status === "reopened",
  };
}

export default function ComplaintDetailScreen({
  complaintId,
  onBack,
  onBackGuardChange,
  onBackInterceptChange,
  onOpenJob,
}: {
  complaintId: string;
  onBack: () => void;
  onBackGuardChange?: (blocked: boolean, reason?: string) => void;
  onBackInterceptChange?: (handler: (() => boolean) | null) => void;
  onOpenJob: (jobId: string) => void;
}) {
  const { request } = useAuth();
  const {
    complaint,
    loading,
    error,
    reload,
    setComplaint,
    showingCachedData,
  } = useComplaintDetail(complaintId);
  const [note, setNote] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [statusAction, setStatusAction] = useState<ComplaintActionStatus | null>(null);
  const submitting = statusAction !== null;
  const noteHasUnsavedChanges = note.trim().length > 0;

  useEffect(() => {
    onBackGuardChange?.(
      submitting,
      submitting ? "Wait for the complaint status update to finish before leaving this screen." : undefined,
    );

    return () => {
      onBackGuardChange?.(false);
    };
  }, [onBackGuardChange, submitting]);

  useEffect(() => {
    if (!noteHasUnsavedChanges || submitting) {
      onBackInterceptChange?.(null);
      return () => {
        onBackInterceptChange?.(null);
      };
    }

    onBackInterceptChange?.(() => {
      Alert.alert(
        "Discard Complaint Note?",
        "This complaint note has not been submitted yet. Leave this screen and lose the current note?",
        [
          {
            text: "Stay",
            style: "cancel",
          },
          {
            text: "Discard",
            style: "destructive",
            onPress: () => {
              onBackInterceptChange?.(null);
              onBack();
            },
          },
        ],
      );
      return true;
    });

    return () => {
      onBackInterceptChange?.(null);
    };
  }, [noteHasUnsavedChanges, onBack, onBackInterceptChange, submitting]);

  const actionConfig = useMemo(
    () => (complaint ? getComplaintActionConfig(complaint.status) : null),
    [complaint],
  );

  async function handleOpenJob(jobId: string) {
    if (!noteHasUnsavedChanges) {
      onOpenJob(jobId);
      return;
    }

    Alert.alert(
      "Discard Complaint Note?",
      "Opening the linked job will discard the unsaved complaint note on this screen.",
      [
        {
          text: "Stay",
          style: "cancel",
        },
        {
          text: "Open Job",
          style: "destructive",
          onPress: () => onOpenJob(jobId),
        },
      ],
    );
  }

  async function handleUpdateStatus(status: ComplaintActionStatus) {
    setStatusAction(status);
    setSubmitError(null);

    try {
      const updatedComplaint = await updateComplaintStatus(request, {
        complaintId,
        status,
        note,
      });

      setNote("");

      if (updatedComplaint) {
        setComplaint(updatedComplaint);
        await saveComplaintDetailCache(updatedComplaint);
        return;
      }

      const refreshedComplaint = await fetchComplaintDetail(request, complaintId);
      setComplaint(refreshedComplaint);
      await saveComplaintDetailCache(refreshedComplaint);
    } catch (statusError) {
      setSubmitError(getErrorMessage(statusError));
    } finally {
      setStatusAction(null);
    }
  }

  if (loading && !complaint) {
    return (
      <FullscreenState
        title="Loading complaint"
        message="Fetching the latest complaint detail and service timeline."
        loading
      />
    );
  }

  if (!complaint) {
    return (
      <FullscreenState
        title="Complaint unavailable"
        message={error ?? "The selected complaint could not be loaded."}
        actionLabel="Back"
        onAction={onBack}
      />
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void reload()} />}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
    >
      <ScreenHeader
        title="Complaint Detail"
        subtitle="Review the complaint context, field history, and current service state before taking action."
        backLabel="Back to Complaints"
        backDisabled={submitting}
        onBack={onBack}
      />

      {showingCachedData && error ? (
        <NoticeCard
          tone="warning"
          title="Showing Saved Complaint Data"
          message={error}
          actionLabel="Retry"
          onAction={() => void reload()}
        />
      ) : null}

      {!showingCachedData && error ? (
        <NoticeCard
          tone="danger"
          title="Unable to Refresh Complaint"
          message={error}
          actionLabel="Retry"
          onAction={() => void reload()}
        />
      ) : null}

      {submitError ? (
        <NoticeCard
          tone="danger"
          title="Complaint Update Failed"
          message={submitError}
        />
      ) : null}

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
        {complaint.timeline.length === 0 ? (
          <Text style={styles.metaText}>
            No complaint timeline entries are available yet for this issue.
          </Text>
        ) : (
          complaint.timeline.map((entry) => (
            <View key={`${entry.id ?? entry.date}-${entry.action}`} style={styles.timelineRow}>
              <Text style={styles.timelineAction}>{entry.action}</Text>
              <Text style={styles.timelineMeta}>
                {entry.by} · {formatDateTime(entry.date)}
              </Text>
              {entry.note ? <Text style={styles.timelineNote}>{entry.note}</Text> : null}
            </View>
          ))
        )}
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Linked Jobs</Text>
        {complaint.linkedJobs.length === 0 ? (
          <Text style={styles.metaText}>
            No linked field jobs are attached to this complaint yet.
          </Text>
        ) : (
          complaint.linkedJobs.map((job) => (
            <View key={job.id} style={styles.linkedJobRow}>
              <View style={styles.copy}>
                <Text style={styles.bodyText}>{job.jobNumber}</Text>
                <Text style={styles.metaText}>{formatDate(job.scheduledDate)}</Text>
              </View>
              <View style={styles.linkedJobActions}>
                <StatusBadge value={job.status} />
                <Button
                  label="Open"
                  variant="secondary"
                  onPress={() => void handleOpenJob(job.id)}
                  disabled={submitting}
                />
              </View>
            </View>
          ))
        )}
      </Card>

      {!["resolved", "closed"].includes(complaint.status) ? (
        <Card>
          <Text style={styles.sectionTitle}>Update Complaint</Text>
          <Input
            label="Operator note"
            value={note}
            onChangeText={(value) => {
              setNote(value);
              setSubmitError(null);
            }}
            editable={!submitting}
            multiline
            autoCapitalize="sentences"
            placeholder="Add what you found, what changed, or why the issue is on hold."
            helperText="Complaint updates still require a working connection and are not queued offline."
          />
          <View style={styles.actionStack}>
            {actionConfig?.canStartWork ? (
              <Button
                label={complaint.status === "on_hold" ? "Resume Work" : "Start Work"}
                onPress={() => void handleUpdateStatus("in_progress")}
                loading={statusAction === "in_progress"}
                disabled={submitting}
              />
            ) : null}
            {actionConfig?.canPutOnHold ? (
              <Button
                label="Put On Hold"
                variant="secondary"
                onPress={() => void handleUpdateStatus("on_hold")}
                loading={statusAction === "on_hold"}
                disabled={submitting}
              />
            ) : null}
            {actionConfig?.canResolve ? (
              <Button
                label="Resolve Complaint"
                variant="danger"
                onPress={() => void handleUpdateStatus("resolved")}
                loading={statusAction === "resolved"}
                disabled={submitting}
              />
            ) : null}
          </View>
        </Card>
      ) : (
        <Card>
          <Text style={styles.sectionTitle}>Complaint Status</Text>
          <Text style={styles.metaText}>
            This complaint is already {complaint.status === "closed" ? "closed" : "resolved"} and
            no further mobile status updates are available.
          </Text>
        </Card>
      )}
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
    lineHeight: 19,
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
});
