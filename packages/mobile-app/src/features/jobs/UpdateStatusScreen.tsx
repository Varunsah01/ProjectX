import { useEffect, useMemo, useRef, useState } from "react";
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
import { useJobDetail } from "../../hooks/useJobDetail";
import { getErrorMessage } from "../../services/api";
import {
  confirmDiscardUnsavedChanges,
  UNSAVED_CHANGES_BACK_GUARD_REASON,
} from "../../utils/unsaved-changes";
import {
  buildJobClosureReport,
  failJob,
  rescheduleJob,
  updateJobStatus,
} from "../../services/jobs";
import type { FieldOperatorJobStatus, JobProof } from "../../types/domain";
import JobContextCard from "./components/JobContextCard";
import {
  getAvailableNextStatuses,
  getCurrentOperatorStatus,
  operatorStatusMeta,
  validateJobStatusForm,
  type JobStatusFormErrors,
} from "./status-flow";

export default function UpdateStatusScreen({
  jobId,
  proofs,
  onBack,
  onBackGuardChange,
  onBackInterceptChange,
  onDone,
}: {
  jobId: string;
  proofs: JobProof[];
  onBack: () => void;
  onBackGuardChange?: (blocked: boolean, reason?: string) => void;
  onBackInterceptChange?: (handler: (() => boolean) | null) => void;
  onDone: () => void;
}) {
  const { request } = useAuth();
  const { job, loading, error, reload } = useJobDetail(jobId);
  const [selectedStatus, setSelectedStatus] = useState<FieldOperatorJobStatus | null>(null);
  const [comment, setComment] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [fieldErrors, setFieldErrors] = useState<JobStatusFormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const initializedJobIdRef = useRef<string | null>(null);

  useEffect(() => {
    onBackGuardChange?.(
      submitting,
      submitting ? UNSAVED_CHANGES_BACK_GUARD_REASON : undefined,
    );

    return () => {
      onBackGuardChange?.(false);
    };
  }, [onBackGuardChange, submitting]);

  useEffect(() => {
    if (job && initializedJobIdRef.current !== job.id) {
      setScheduledDate(job.scheduledDate);
      initializedJobIdRef.current = job.id;
    }
  }, [job]);

  const currentStatus = job ? getCurrentOperatorStatus(job) : "assigned";
  const availableOptions = useMemo(
    () => getAvailableNextStatuses(currentStatus),
    [currentStatus],
  );
  const selectedMeta = selectedStatus ? operatorStatusMeta[selectedStatus] : null;
  const proofSummary =
    proofs.length === 0
      ? "No proof photo added yet."
      : `${proofs.length} proof photo${proofs.length === 1 ? "" : "s"} added to this job.`;
  const hasUnsavedChanges =
    selectedStatus !== null ||
    comment.trim().length > 0 ||
    scheduledDate.trim() !== (job?.scheduledDate ?? "").trim();

  function updateErrors(nextErrors: Partial<JobStatusFormErrors>) {
    setFieldErrors((currentErrors) => ({
      ...currentErrors,
      ...nextErrors,
    }));
  }

  function handleSelectStatus(status: FieldOperatorJobStatus) {
    setSelectedStatus(status);
    setSubmitError(null);
    updateErrors({
      nextStatus: undefined,
      comment: undefined,
      scheduledDate: status === "rescheduled" ? fieldErrors.scheduledDate : undefined,
    });
  }

  async function handleSubmit() {
    const nextErrors = validateJobStatusForm(
      {
        nextStatus: selectedStatus,
        comment,
        scheduledDate,
      },
      {
        currentStatus,
        proofs,
      },
    );

    setFieldErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0 || !selectedStatus) {
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      if (
        selectedStatus === "on_the_way" ||
        selectedStatus === "arrived" ||
        selectedStatus === "work_started"
      ) {
        await updateJobStatus(request, {
          jobId,
          status: selectedStatus,
          note: comment.trim(),
        });
      } else if (selectedStatus === "completed") {
        await updateJobStatus(request, {
          jobId,
          status: "completed",
          note: buildJobClosureReport({
            note: comment.trim(),
            proofs,
          }),
        });
      } else if (selectedStatus === "failed") {
        await failJob(request, {
          jobId,
          note: buildJobClosureReport({
            note: comment.trim(),
            proofs,
          }),
        });
      } else {
        await rescheduleJob(request, {
          jobId,
          scheduledDate: scheduledDate.trim(),
          note: buildJobClosureReport({
            note: comment.trim(),
            proofs,
          }),
        });
      }

      onDone();
    } catch (updateError) {
      setSubmitError(getErrorMessage(updateError));
    } finally {
      setSubmitting(false);
    }
  }

  useEffect(() => {
    if (!hasUnsavedChanges || submitting) {
      onBackInterceptChange?.(null);
      return () => {
        onBackInterceptChange?.(null);
      };
    }

    onBackInterceptChange?.(() => {
      confirmDiscardUnsavedChanges({
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
  }, [hasUnsavedChanges, onBack, onBackInterceptChange, submitting]);

  if (loading) {
    return (
      <FullscreenState
        title="Loading Status"
        message="Checking the latest visit status before you save a change."
        loading
      />
    );
  }

  if (!job) {
    return (
      <FullscreenState
        title="Status Not Available"
        message={error ?? "This status screen could not be opened. Go back and try again."}
        actionLabel="Go Back"
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
        title="Update Status"
        subtitle="Choose the next step for this visit and save it to the job."
        backLabel="Back to Job"
        backDisabled={submitting}
        onBack={onBack}
      />

      <JobContextCard job={job} />

      <Card>
        <Text style={styles.sectionTitle}>Current Status</Text>
        <View style={styles.currentStatusRow}>
          <StatusBadge value={currentStatus} />
          <Text style={styles.helperText}>{operatorStatusMeta[currentStatus].helper}</Text>
        </View>
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Next Status</Text>
        <Text style={styles.helperText}>
          Choose what happened next on this visit.
        </Text>

        {availableOptions.length === 0 ? (
          <Text style={styles.helperText}>
            No more status changes are available here for this job.
          </Text>
        ) : (
          <View style={styles.optionList}>
            {availableOptions.map((status) => {
              const option = operatorStatusMeta[status];
              const selected = selectedStatus === status;

              return (
                <Pressable
                  key={status}
                  onPress={() => handleSelectStatus(status)}
                  disabled={submitting}
                  testID={`update-status.status-option.${status}`}
                  style={[
                    styles.optionCard,
                    selected && styles.optionCardSelected,
                    submitting && styles.optionCardDisabled,
                  ]}
                >
                  <View style={styles.optionCopy}>
                    <View style={styles.optionHeader}>
                      <Text style={styles.optionTitle}>{option.label}</Text>
                      <StatusBadge value={status} />
                    </View>
                    <Text style={styles.optionHelper}>{option.helper}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}

        {fieldErrors.nextStatus ? (
          <Text style={styles.errorText}>{fieldErrors.nextStatus}</Text>
        ) : null}
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Update Note</Text>
        <Input
          label="Note"
          value={comment}
          testID="update-status.note-input"
          onChangeText={(value) => {
            setComment(value);
            if (fieldErrors.comment) {
              updateErrors({ comment: undefined });
            }
          }}
          editable={!submitting}
          multiline
          autoCapitalize="sentences"
          placeholder={
            selectedStatus === "failed" || selectedStatus === "rescheduled"
              ? "Explain why you are making this change."
              : selectedStatus === "completed"
                ? "Summarize the work done or final handoff."
                : "Add an optional note."
          }
          error={fieldErrors.comment}
          helperText={
            selectedStatus === "completed"
              ? `${proofSummary} Add a note or proof before you finish this job.`
              : selectedStatus === "failed" || selectedStatus === "rescheduled"
                ? "Add the reason for this change."
                : "Optional note saved with this job."
          }
        />
      </Card>

      {selectedStatus === "rescheduled" ? (
        <Card>
          <Input
            label="New visit date"
            value={scheduledDate}
            testID="update-status.date-input"
            onChangeText={(value) => {
              setScheduledDate(value);
              if (fieldErrors.scheduledDate) {
                updateErrors({ scheduledDate: undefined });
              }
            }}
            editable={!submitting}
            placeholder="YYYY-MM-DD"
            error={fieldErrors.scheduledDate}
            helperText="Enter the next visit date as YYYY-MM-DD."
          />
        </Card>
      ) : null}

      {submitError ? (
        <NoticeCard tone="danger" title="Couldn't Save Status" message={submitError} />
      ) : null}

      <Button
        label={selectedMeta?.actionLabel ?? "Save Status"}
        onPress={() => void handleSubmit()}
        loading={submitting}
        disabled={availableOptions.length === 0 || !selectedStatus}
        variant={selectedStatus === "failed" ? "danger" : "primary"}
        testID="update-status.submit-button"
      />
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
  sectionTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: colors.text,
  },
  currentStatusRow: {
    gap: spacing.md,
  },
  helperText: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.textMuted,
  },
  optionList: {
    gap: spacing.md,
  },
  optionCard: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.md,
  },
  optionCardSelected: {
    borderColor: colors.brand,
    backgroundColor: colors.brandSoft,
  },
  optionCardDisabled: {
    opacity: 0.6,
  },
  optionCopy: {
    gap: spacing.xs,
  },
  optionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.md,
    alignItems: "center",
  },
  optionTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
  },
  optionHelper: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.textMuted,
  },
  errorText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.danger,
  },
});
