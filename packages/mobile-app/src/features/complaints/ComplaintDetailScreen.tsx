import { useEffect, useMemo, useState } from "react";
import {
  Pressable,
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
import { colors, radius, spacing } from "../../constants/theme";
import { useAuth } from "../../hooks/useAuth";
import { useComplaintDetail } from "../../hooks/useComplaintDetail";
import { getErrorMessage } from "../../services/api";
import {
  createJobFromComplaint,
  fetchComplaintDetail,
  updateComplaintStatus,
} from "../../services/complaints";
import {
  saveComplaintDetailCache,
} from "../../services/complaint-cache";
import type { ComplaintStatus } from "../../types/api";
import {
  confirmDiscardUnsavedChanges,
  UNSAVED_CHANGES_BACK_GUARD_REASON,
} from "../../utils/unsaved-changes";
import { formatDate, formatDateTime } from "../../utils/format";

// ─── Types ────────────────────────────────────────────────────────────────────

type ComplaintActionStatus = Extract<ComplaintStatus, "in_progress" | "on_hold" | "resolved">;

// ─── Action config ────────────────────────────────────────────────────────────

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

// ─── Today's date as YYYY-MM-DD ───────────────────────────────────────────────

function todayDateString() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// ─── Screen ───────────────────────────────────────────────────────────────────

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

  // Status update state
  const [note, setNote] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [statusAction, setStatusAction] = useState<ComplaintActionStatus | null>(null);
  const submitting = statusAction !== null;
  const noteHasUnsavedChanges = note.trim().length > 0;

  // Resolve confirmation
  const [customerConfirmed, setCustomerConfirmed] = useState(false);

  // Create-job inline form
  const [createJobMode, setCreateJobMode] = useState(false);
  const [createJobDate, setCreateJobDate] = useState(todayDateString);
  const [createJobSubmitting, setCreateJobSubmitting] = useState(false);
  const [createJobError, setCreateJobError] = useState<string | null>(null);

  const anyBusy = submitting || createJobSubmitting;

  // ─── Back guard: block back while submitting ────────────────────────────────

  useEffect(() => {
    onBackGuardChange?.(
      submitting,
      submitting ? UNSAVED_CHANGES_BACK_GUARD_REASON : undefined,
    );

    return () => {
      onBackGuardChange?.(false);
    };
  }, [onBackGuardChange, submitting]);

  // ─── Back intercept: warn when note has unsaved content ────────────────────

  useEffect(() => {
    if (!noteHasUnsavedChanges || submitting) {
      onBackInterceptChange?.(null);
      return () => {
        onBackInterceptChange?.(null);
      };
    }

    onBackInterceptChange?.(() => {
      confirmDiscardUnsavedChanges({
        message: "Leave this screen and lose the current complaint note?",
        onDiscard: () => {
          onBackInterceptChange?.(null);
          onBack();
        },
      });
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

  // ─── Handlers ───────────────────────────────────────────────────────────────

  async function handleOpenJob(jobId: string) {
    if (!noteHasUnsavedChanges) {
      onOpenJob(jobId);
      return;
    }

    confirmDiscardUnsavedChanges({
      confirmLabel: "View Job",
      message: "Opening the linked job will discard the current complaint note.",
      onDiscard: () => onOpenJob(jobId),
    });
  }

  async function handleUpdateStatus(status: ComplaintActionStatus) {
    setSubmitError(null);

    if (status === "resolved") {
      if (!note.trim()) {
        setSubmitError("Add a resolution note describing what was done before resolving.");
        return;
      }
      if (!customerConfirmed) {
        setSubmitError("Confirm the customer has accepted the resolution before resolving.");
        return;
      }
    }

    setStatusAction(status);

    try {
      const updatedComplaint = await updateComplaintStatus(request, {
        complaintId,
        status,
        note,
      });

      setNote("");
      setCustomerConfirmed(false);

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

  async function handleCreateJob() {
    setCreateJobError(null);

    const trimmedDate = createJobDate.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmedDate)) {
      setCreateJobError("Enter the scheduled date as YYYY-MM-DD.");
      return;
    }

    setCreateJobSubmitting(true);

    try {
      const newJob = await createJobFromComplaint(request, {
        complaintId,
        scheduledDate: trimmedDate,
      });

      setCreateJobMode(false);
      onOpenJob(newJob.id);
    } catch (err) {
      setCreateJobError(getErrorMessage(err));
    } finally {
      setCreateJobSubmitting(false);
    }
  }

  // ─── Loading / error states ─────────────────────────────────────────────────

  if (loading && !complaint) {
    return (
      <FullscreenState
        title="Loading Complaint"
        message="Getting the latest complaint details."
        loading
      />
    );
  }

  if (!complaint) {
    return (
      <FullscreenState
        title="Complaint Not Available"
        message={error ?? "This complaint could not be opened. Go back and try again."}
        actionLabel="Go Back"
        onAction={onBack}
      />
    );
  }

  const isTerminal = complaint.status === "resolved" || complaint.status === "closed";

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void reload()} />}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
    >
      <ScreenHeader
        title="Complaint Details"
        subtitle="Review the issue, linked jobs, and what to do next."
        backLabel="Back to Complaints"
        backDisabled={anyBusy}
        onBack={onBack}
      />

      {/* Data freshness notices */}
      {showingCachedData && error ? (
        <NoticeCard
          tone="warning"
          title="Showing Saved Details"
          message={error}
          actionLabel="Retry"
          onAction={() => void reload()}
        />
      ) : null}
      {!showingCachedData && error ? (
        <NoticeCard
          tone="danger"
          title="Can't Refresh Complaint"
          message={error}
          actionLabel="Retry"
          onAction={() => void reload()}
        />
      ) : null}

      {/* Action error */}
      {submitError ? (
        <NoticeCard
          tone="danger"
          title="Couldn't Save Complaint Update"
          message={submitError}
        />
      ) : null}

      {/* ── Complaint summary ── */}
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
        <Text style={styles.metaText}>Logged: {formatDateTime(complaint.createdAt)}</Text>
        <Text style={styles.metaText}>Due by: {formatDateTime(complaint.slaDeadline)}</Text>
      </Card>

      {/* ── Customer ── */}
      <Card>
        <Text style={styles.sectionTitle}>Customer</Text>
        <Text style={styles.bodyText}>{complaint.customer.name}</Text>
        <Text style={styles.metaText}>{complaint.customer.address}</Text>
        <Text style={styles.metaText}>
          {complaint.customer.phone} · {complaint.customer.email}
        </Text>
      </Card>

      {/* ── Asset ── */}
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

      {/* ── Timeline ── */}
      <Card>
        <Text style={styles.sectionTitle}>Timeline</Text>
        {complaint.timeline.length === 0 ? (
          <Text style={styles.metaText}>
            No updates have been added to this complaint yet.
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

      {/* ── Linked Jobs ── */}
      <Card>
        <Text style={styles.sectionTitle}>Linked Jobs</Text>
        {complaint.linkedJobs.length === 0 ? (
          <>
            <Text style={styles.metaText}>No jobs are linked to this complaint yet.</Text>
            {!isTerminal && !createJobMode ? (
              <Button
                label="Create Job"
                variant="secondary"
                onPress={() => setCreateJobMode(true)}
                disabled={anyBusy}
              />
            ) : null}
            {createJobMode ? (
              <View style={styles.createJobForm}>
                <Input
                  label="Scheduled date"
                  value={createJobDate}
                  onChangeText={(v) => {
                    setCreateJobDate(v);
                    setCreateJobError(null);
                  }}
                  editable={!createJobSubmitting}
                  placeholder="YYYY-MM-DD"
                  helperText="Enter the date for this service visit."
                />
                {createJobError ? (
                  <NoticeCard
                    tone="danger"
                    title="Couldn't Create Job"
                    message={createJobError}
                  />
                ) : null}
                <View style={styles.actionStack}>
                  <Button
                    label="Create & View Job"
                    onPress={() => void handleCreateJob()}
                    loading={createJobSubmitting}
                    disabled={createJobSubmitting}
                  />
                  <Button
                    label="Cancel"
                    variant="ghost"
                    onPress={() => {
                      setCreateJobMode(false);
                      setCreateJobError(null);
                      setCreateJobDate(todayDateString());
                    }}
                    disabled={createJobSubmitting}
                  />
                </View>
              </View>
            ) : null}
          </>
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
                  label="View Job"
                  variant="secondary"
                  onPress={() => void handleOpenJob(job.id)}
                  disabled={anyBusy}
                />
              </View>
            </View>
          ))
        )}
      </Card>

      {/* ── Actions / closed state ── */}
      {!isTerminal ? (
        <Card>
          <Text style={styles.sectionTitle}>Add Update</Text>
          <Input
            label="Update note"
            value={note}
            onChangeText={(value) => {
              setNote(value);
              setSubmitError(null);
            }}
            editable={!submitting}
            multiline
            autoCapitalize="sentences"
            placeholder="Write what you found, what changed, or why work is paused."
            helperText={
              actionConfig?.canResolve
                ? "Required when resolving. Describe what was done to close this complaint."
                : "You need a live connection to save complaint updates."
            }
          />

          {/* Customer confirmation — shown only when resolution is possible */}
          {actionConfig?.canResolve ? (
            <Pressable
              onPress={() => {
                if (submitting) return;
                setCustomerConfirmed((v) => !v);
                setSubmitError(null);
              }}
              disabled={submitting}
              style={({ pressed }) => [
                styles.checkboxRow,
                submitting && styles.checkboxRowDisabled,
                pressed && !submitting && styles.checkboxRowPressed,
              ]}
            >
              <View
                style={[
                  styles.checkbox,
                  customerConfirmed && styles.checkboxActive,
                ]}
              >
                {customerConfirmed ? (
                  <Text style={styles.checkboxTick}>✓</Text>
                ) : null}
              </View>
              <View style={styles.checkboxCopy}>
                <Text style={styles.sectionTitle}>Customer Confirmed</Text>
                <Text style={styles.helperText}>
                  Tick this after the customer confirms the complaint is resolved to their
                  satisfaction.
                </Text>
              </View>
            </Pressable>
          ) : null}

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
                label="Pause Work"
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
                disabled={submitting || !note.trim() || !customerConfirmed}
              />
            ) : null}
          </View>

          {actionConfig?.canResolve && (!note.trim() || !customerConfirmed) ? (
            <Text style={styles.resolveHint}>
              {!note.trim() && !customerConfirmed
                ? "Add a resolution note and confirm with the customer to enable resolve."
                : !note.trim()
                  ? "Add a resolution note to enable resolve."
                  : "Confirm with the customer to enable resolve."}
            </Text>
          ) : null}
        </Card>
      ) : (
        <Card>
          <Text style={styles.sectionTitle}>Complaint Status</Text>
          <Text style={styles.metaText}>
            This complaint is{" "}
            {complaint.status === "closed" ? "closed" : "resolved"}.{" "}
            No further updates are needed.
          </Text>
          {complaint.resolvedAt ? (
            <Text style={styles.metaText}>
              Resolved: {formatDateTime(complaint.resolvedAt)}
            </Text>
          ) : null}
        </Card>
      )}
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

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
  helperText: {
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
  createJobForm: {
    gap: spacing.md,
    paddingTop: spacing.sm,
  },
  actionStack: {
    gap: spacing.sm,
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  checkboxRowPressed: {
    opacity: 0.9,
  },
  checkboxRowDisabled: {
    opacity: 0.6,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  checkboxActive: {
    borderColor: colors.success,
    backgroundColor: colors.success,
  },
  checkboxTick: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "800",
  },
  checkboxCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  resolveHint: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.textMuted,
    fontStyle: "italic",
  },
});
