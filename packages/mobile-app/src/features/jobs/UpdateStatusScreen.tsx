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
import StatusBadge from "../../components/ui/StatusBadge";
import ScreenHeader from "../../components/shell/ScreenHeader";
import FullscreenState from "../../components/states/FullscreenState";
import { colors, radius, spacing } from "../../constants/theme";
import { useAuth } from "../../hooks/useAuth";
import { useJobDetail } from "../../hooks/useJobDetail";
import { getErrorMessage } from "../../services/api";
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
  onDone,
}: {
  jobId: string;
  proofs: JobProof[];
  onBack: () => void;
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
      ? "No proof reference is attached yet."
      : `${proofs.length} proof reference${proofs.length === 1 ? "" : "s"} attached to this job.`;

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

  if (loading) {
    return (
      <FullscreenState
        title="Loading status flow"
        message="Checking the current job state before applying an update."
        loading
      />
    );
  }

  if (!job) {
    return (
      <FullscreenState
        title="Job unavailable"
        message={error ?? "The selected job could not be loaded."}
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
        title="Update Status"
        subtitle="Move the visit through the technician workflow without changing the existing app structure."
        backLabel="Back to Job"
        backDisabled={submitting}
        onBack={onBack}
      />

      <JobContextCard job={job} />

      <Card>
        <Text style={styles.sectionTitle}>Current status</Text>
        <View style={styles.currentStatusRow}>
          <StatusBadge value={currentStatus} />
          <Text style={styles.helperText}>{operatorStatusMeta[currentStatus].helper}</Text>
        </View>
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Next status</Text>
        <Text style={styles.helperText}>
          Only valid transitions from the current state are shown here.
        </Text>

        {availableOptions.length === 0 ? (
          <Text style={styles.helperText}>
            No further status updates are available for this job.
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
        <Text style={styles.sectionTitle}>Comment</Text>
        <Input
          label="Comment"
          value={comment}
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
              ? "Explain the reason for this status update."
              : selectedStatus === "completed"
                ? "Describe the work completed or the final handoff."
                : "Add an optional technician comment."
          }
          error={fieldErrors.comment}
          helperText={
            selectedStatus === "completed"
              ? `${proofSummary} Completion requires a note or proof.`
              : selectedStatus === "failed" || selectedStatus === "rescheduled"
                ? "A reason is required for this selection."
                : "Optional note that will be saved with the job."
          }
        />
      </Card>

      {selectedStatus === "rescheduled" ? (
        <Card>
          <Input
            label="Next scheduled date"
            value={scheduledDate}
            onChangeText={(value) => {
              setScheduledDate(value);
              if (fieldErrors.scheduledDate) {
                updateErrors({ scheduledDate: undefined });
              }
            }}
            editable={!submitting}
            placeholder="YYYY-MM-DD"
            error={fieldErrors.scheduledDate}
            helperText="Use the new visit date in YYYY-MM-DD format."
          />
        </Card>
      ) : null}

      {submitError ? (
        <Card>
          <Text style={styles.errorText}>{submitError}</Text>
        </Card>
      ) : null}

      <Button
        label={selectedMeta?.actionLabel ?? "Apply Status Update"}
        onPress={() => void handleSubmit()}
        loading={submitting}
        disabled={availableOptions.length === 0 || !selectedStatus}
        variant={selectedStatus === "failed" ? "danger" : "primary"}
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
