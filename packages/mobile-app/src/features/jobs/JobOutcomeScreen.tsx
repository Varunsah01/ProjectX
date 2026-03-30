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
import type { JobClosure, JobClosureType, JobProof } from "../../types/domain";
import {
  confirmDiscardUnsavedChanges,
  UNSAVED_CHANGES_BACK_GUARD_REASON,
} from "../../utils/unsaved-changes";
import JobContextCard from "./components/JobContextCard";
import {
  buildCompletedClosureNotes,
  buildFailureClosureNotes,
  buildRescheduleClosureNotes,
  createJobOutcomeFormValues,
  validateJobOutcomeForm,
  type JobOutcomeFormErrors,
  type JobOutcomeFormValues,
} from "./job-outcome";
import { listJobServiceWindowOptions } from "../../services/job-service-windows";

const serviceWindowOptions = listJobServiceWindowOptions();

const titleByOutcome: Record<JobClosureType, string> = {
  complete: "Complete Job",
  fail: "Mark Failed",
  reschedule: "Reschedule Job",
};

const subtitleByOutcome: Record<JobClosureType, string> = {
  complete: "Finish the visit with notes, customer confirmation, and optional proof.",
  fail: "Record why the visit could not be completed and add a photo if it helps.",
  reschedule: "Record why the visit is moving and choose the next visit time.",
};

function toTestIdSegment(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export default function JobOutcomeScreen({
  jobId,
  outcome,
  proofs,
  initialDraft,
  onBack,
  onBackGuardChange,
  onBackInterceptChange,
  onDiscardDraft,
  onDraftChange,
  onOpenUploadProof,
  onDone,
}: {
  jobId: string;
  outcome: JobClosureType;
  proofs: JobProof[];
  initialDraft?: JobOutcomeFormValues;
  onBack: () => void;
  onBackGuardChange?: (blocked: boolean, reason?: string) => void;
  onBackInterceptChange?: (handler: (() => boolean) | null) => void;
  onDiscardDraft: () => void;
  onDraftChange: (draft: JobOutcomeFormValues) => void;
  onOpenUploadProof: (jobId: string) => void;
  onDone: () => void;
}) {
  const { request } = useAuth();
  const { job, loading, error, reload } = useJobDetail(jobId);
  const [form, setForm] = useState<JobOutcomeFormValues>(
    createJobOutcomeFormValues("", initialDraft),
  );
  const [fieldErrors, setFieldErrors] = useState<JobOutcomeFormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const initializedFormKeyRef = useRef<string | null>(null);
  const initialFormSnapshotRef = useRef<string>(
    JSON.stringify(createJobOutcomeFormValues("")),
  );

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
    const nextFormKey = job ? `${job.id}:${outcome}` : null;

    if (job && initializedFormKeyRef.current !== nextFormKey) {
      const cleanForm = createJobOutcomeFormValues(job.scheduledDate, {
        closureNotes: outcome === "complete" ? job.serviceReport ?? "" : "",
      });
      const nextForm = createJobOutcomeFormValues(job.scheduledDate, {
        closureNotes: initialDraft?.closureNotes ?? cleanForm.closureNotes,
        failureReason: initialDraft?.failureReason,
        rescheduleReason: initialDraft?.rescheduleReason,
        preferredDate: initialDraft?.preferredDate ?? cleanForm.preferredDate,
        preferredSlot: initialDraft?.preferredSlot,
        customerConfirmed: initialDraft?.customerConfirmed,
      });

      setForm(nextForm);
      setFieldErrors({});
      initialFormSnapshotRef.current = JSON.stringify(cleanForm);
      initializedFormKeyRef.current = nextFormKey;
    }
  }, [initialDraft, job, outcome]);

  const hasUnsavedChanges = JSON.stringify(form) !== initialFormSnapshotRef.current;

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
          onDiscardDraft();
          onBack();
        },
      });
      return true;
    });

    return () => {
      onBackInterceptChange?.(null);
    };
  }, [
    hasUnsavedChanges,
    onBack,
    onBackInterceptChange,
    onDiscardDraft,
    submitting,
  ]);

  const proofSummary = useMemo(() => {
    if (proofs.length === 0) {
      return "No proof photo added yet.";
    }

    return `${proofs.length} proof photo${proofs.length === 1 ? "" : "s"} added.`;
  }, [proofs]);

  function updateForm(nextValues: Partial<JobOutcomeFormValues>) {
    setForm((current) => {
      const nextForm = {
        ...current,
        ...nextValues,
      };
      onDraftChange(nextForm);
      return nextForm;
    });
  }

  function clearFieldError(field: keyof JobOutcomeFormErrors) {
    if (!fieldErrors[field]) {
      return;
    }

    setFieldErrors((current) => ({
      ...current,
      [field]: undefined,
    }));
  }

  async function handleSubmit() {
    const nextErrors = validateJobOutcomeForm(outcome, form);
    setFieldErrors(nextErrors);
    setSubmitError(null);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    const baseClosure: JobClosure = {
      jobId,
      type: outcome,
      note:
        outcome === "complete"
          ? buildCompletedClosureNotes(form)
          : outcome === "fail"
            ? buildFailureClosureNotes(form)
            : buildRescheduleClosureNotes(form),
      proofs,
      scheduledDate: outcome === "reschedule" ? form.preferredDate.trim() : undefined,
    };

    setSubmitting(true);

    try {
      if (outcome === "complete") {
        await updateJobStatus(request, {
          jobId: baseClosure.jobId,
          status: "completed",
          note: buildJobClosureReport(baseClosure),
        });
      } else if (outcome === "fail") {
        await failJob(request, {
          jobId: baseClosure.jobId,
          note: buildJobClosureReport(baseClosure),
        });
      } else {
        await rescheduleJob(request, {
          jobId: baseClosure.jobId,
          scheduledDate: baseClosure.scheduledDate ?? form.preferredDate.trim(),
          note: buildJobClosureReport(baseClosure),
        });
      }

      onDone();
    } catch (outcomeError) {
      setSubmitError(getErrorMessage(outcomeError));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <FullscreenState
        title="Loading Visit Result"
        message="Getting the latest visit details before you save this result."
        loading
      />
    );
  }

  if (!job) {
    return (
      <FullscreenState
        title="Step Not Available"
        message={error ?? "This step could not be opened. Go back and try again."}
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
        title={titleByOutcome[outcome]}
        subtitle={subtitleByOutcome[outcome]}
        backLabel="Back to Job"
        backDisabled={submitting}
        onBack={onBack}
      />

      <JobContextCard job={job} />

      {outcome === "complete" ? (
        <>
          <Card>
            <Text style={styles.sectionTitle}>Visit Notes</Text>
            <Input
              label="Work done"
              value={form.closureNotes}
              testID="job-outcome.complete.notes-input"
              onChangeText={(value) => {
                updateForm({ closureNotes: value });
                clearFieldError("closureNotes");
                setSubmitError(null);
              }}
              editable={!submitting}
              multiline
              autoCapitalize="sentences"
              placeholder="Summarize the work done and anything the next team should know."
              error={fieldErrors.closureNotes}
              helperText="Keep it short and clear for the office and job history."
            />
          </Card>

          <Card>
            <View style={styles.statusRow}>
              <View style={styles.statusCopy}>
                <Text style={styles.sectionTitle}>Proof Photo</Text>
                <Text style={styles.helperText}>{proofSummary}</Text>
              </View>
              <ProofIndicator active={proofs.length > 0} />
            </View>
            <Button
              label={proofs.length > 0 ? "Manage Photos" : "Add Photo"}
              variant="secondary"
              onPress={() => onOpenUploadProof(jobId)}
              disabled={submitting}
              testID="job-outcome.complete.proof-button"
            />
          </Card>

          <Card>
            <Pressable
              onPress={() => {
                if (submitting) {
                  return;
                }

                updateForm({ customerConfirmed: !form.customerConfirmed });
                clearFieldError("customerConfirmed");
                setSubmitError(null);
              }}
              disabled={submitting}
              testID="job-outcome.complete.customer-confirmed-toggle"
              style={({ pressed }) => [
                styles.checkboxRow,
                submitting && styles.checkboxRowDisabled,
                pressed && !submitting && styles.checkboxRowPressed,
              ]}
            >
              <View
                style={[
                  styles.checkbox,
                  form.customerConfirmed && styles.checkboxActive,
                ]}
              >
                {form.customerConfirmed ? <Text style={styles.checkboxTick}>✓</Text> : null}
              </View>
              <View style={styles.checkboxCopy}>
                <Text style={styles.sectionTitle}>Customer Confirmed</Text>
                <Text style={styles.helperText}>
                  Tick this after the customer confirms the visit is complete.
                </Text>
              </View>
            </Pressable>
            {fieldErrors.customerConfirmed ? (
              <Text style={styles.errorText}>{fieldErrors.customerConfirmed}</Text>
            ) : null}
          </Card>
        </>
      ) : null}

      {outcome === "fail" ? (
        <>
          <Card>
            <Text style={styles.sectionTitle}>Why the Visit Failed</Text>
            <Input
              label="Reason"
              value={form.failureReason}
              testID="job-outcome.fail.reason-input"
              onChangeText={(value) => {
                updateForm({ failureReason: value });
                clearFieldError("failureReason");
                setSubmitError(null);
              }}
              editable={!submitting}
              multiline
              autoCapitalize="sentences"
              placeholder="Explain what stopped you from finishing the visit."
              error={fieldErrors.failureReason}
              helperText="Required. This will be saved to the job history."
            />
          </Card>

          <Card>
            <View style={styles.statusRow}>
              <View style={styles.statusCopy}>
                <Text style={styles.sectionTitle}>Photo</Text>
                <Text style={styles.helperText}>{proofSummary}</Text>
              </View>
              <ProofIndicator active={proofs.length > 0} />
            </View>
            <Button
              label={proofs.length > 0 ? "Manage Photo" : "Add Photo"}
              variant="secondary"
              onPress={() => onOpenUploadProof(jobId)}
              disabled={submitting}
              testID="job-outcome.fail.proof-button"
            />
          </Card>
        </>
      ) : null}

      {outcome === "reschedule" ? (
        <>
          <Card>
            <Text style={styles.sectionTitle}>Why Reschedule</Text>
            <Input
              label="Reason"
              value={form.rescheduleReason}
              testID="job-outcome.reschedule.reason-input"
              onChangeText={(value) => {
                updateForm({ rescheduleReason: value });
                clearFieldError("rescheduleReason");
                setSubmitError(null);
              }}
              editable={!submitting}
              multiline
              autoCapitalize="sentences"
              placeholder="Explain why this visit needs a new date."
              error={fieldErrors.rescheduleReason}
              helperText="Keep it short so the office can rebook quickly."
            />
          </Card>

          <Card>
            <Text style={styles.sectionTitle}>New Visit Date</Text>
            <Input
              label="Date"
              value={form.preferredDate}
              testID="job-outcome.reschedule.date-input"
              onChangeText={(value) => {
                updateForm({ preferredDate: value });
                clearFieldError("preferredDate");
                setSubmitError(null);
              }}
              editable={!submitting}
              placeholder="YYYY-MM-DD"
              error={fieldErrors.preferredDate}
              helperText="Enter the customer's preferred date as YYYY-MM-DD."
            />
          </Card>

          <Card>
            <Text style={styles.sectionTitle}>Preferred Time</Text>
            <View style={styles.slotGrid}>
              {serviceWindowOptions.map((slot) => (
                <Pressable
                  key={slot}
                  onPress={() => {
                    updateForm({ preferredSlot: slot });
                    clearFieldError("preferredSlot");
                    setSubmitError(null);
                  }}
                  disabled={submitting}
                  testID={`job-outcome.reschedule.slot.${toTestIdSegment(slot)}`}
                  style={({ pressed }) => [
                    styles.slotPill,
                    form.preferredSlot === slot && styles.slotPillActive,
                    submitting && styles.slotPillDisabled,
                    pressed && !submitting && styles.slotPillPressed,
                  ]}
                >
                  <Text
                    style={[
                      styles.slotPillLabel,
                      form.preferredSlot === slot && styles.slotPillLabelActive,
                    ]}
                  >
                    {slot}
                  </Text>
                </Pressable>
              ))}
            </View>
            {fieldErrors.preferredSlot ? (
              <Text style={styles.errorText}>{fieldErrors.preferredSlot}</Text>
            ) : null}
          </Card>
        </>
      ) : null}

      {submitError ? (
        <NoticeCard tone="danger" title="Couldn't Save Result" message={submitError} />
      ) : null}

      <Button
        label={titleByOutcome[outcome]}
        onPress={() => void handleSubmit()}
        loading={submitting}
        variant={outcome === "fail" ? "danger" : "primary"}
        testID={`job-outcome.${outcome}.submit-button`}
      />
    </ScrollView>
  );
}

function ProofIndicator({ active }: { active: boolean }) {
  return (
    <View
      style={[
        styles.proofIndicator,
        active ? styles.proofIndicatorActive : styles.proofIndicatorInactive,
      ]}
    >
      <Text
        style={[
          styles.proofIndicatorLabel,
          active
            ? styles.proofIndicatorLabelActive
            : styles.proofIndicatorLabelInactive,
        ]}
      >
        {active ? "Added" : "Not Added"}
      </Text>
    </View>
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
  helperText: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.textMuted,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  statusCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  proofIndicator: {
    minWidth: 88,
    minHeight: 36,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    alignItems: "center",
    justifyContent: "center",
  },
  proofIndicatorActive: {
    backgroundColor: colors.successSoft,
  },
  proofIndicatorInactive: {
    backgroundColor: colors.surfaceMuted,
  },
  proofIndicatorLabel: {
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  proofIndicatorLabelActive: {
    color: colors.success,
  },
  proofIndicatorLabelInactive: {
    color: colors.textMuted,
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
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
  slotGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  slotPill: {
    minHeight: 42,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.md,
  },
  slotPillActive: {
    borderColor: colors.brand,
    backgroundColor: colors.brandSoft,
  },
  slotPillPressed: {
    opacity: 0.92,
  },
  slotPillDisabled: {
    opacity: 0.6,
  },
  slotPillLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.textMuted,
  },
  slotPillLabelActive: {
    color: colors.brand,
  },
  errorText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.danger,
  },
});
