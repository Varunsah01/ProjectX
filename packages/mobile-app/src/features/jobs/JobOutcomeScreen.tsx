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
  fail: "Fail Visit",
  reschedule: "Reschedule Job",
};

const subtitleByOutcome: Record<JobClosureType, string> = {
  complete: "Close the job quickly with closure notes, customer handoff confirmation, and optional proof.",
  fail: "Capture the failure reason clearly and attach a photo if it helps explain the failed visit.",
  reschedule: "Record why the visit is moving and note the preferred new date and service slot.",
};

export default function JobOutcomeScreen({
  jobId,
  outcome,
  proofs,
  initialDraft,
  onBack,
  onBackGuardChange,
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

  useEffect(() => {
    onBackGuardChange?.(
      submitting,
      submitting ? "Wait for the job outcome submission to finish before leaving this screen." : undefined,
    );

    return () => {
      onBackGuardChange?.(false);
    };
  }, [onBackGuardChange, submitting]);

  useEffect(() => {
    const nextFormKey = job ? `${job.id}:${outcome}` : null;

    if (job && initializedFormKeyRef.current !== nextFormKey) {
      setForm(
        createJobOutcomeFormValues(job.scheduledDate, {
          closureNotes:
            initialDraft?.closureNotes ??
            (outcome === "complete" ? job.serviceReport ?? "" : ""),
          failureReason: initialDraft?.failureReason,
          rescheduleReason: initialDraft?.rescheduleReason,
          preferredDate: initialDraft?.preferredDate,
          preferredSlot: initialDraft?.preferredSlot,
          customerConfirmed: initialDraft?.customerConfirmed,
        }),
      );
      setFieldErrors({});
      initializedFormKeyRef.current = nextFormKey;
    }
  }, [initialDraft, job, outcome]);

  const proofSummary = useMemo(() => {
    if (proofs.length === 0) {
      return "No proof attached yet.";
    }

    return `${proofs.length} proof image${proofs.length === 1 ? "" : "s"} attached.`;
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
        title="Loading outcome flow"
        message="Fetching the latest job state before applying this workflow action."
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
            <Text style={styles.sectionTitle}>Closure Notes</Text>
            <Input
              label="Closure notes"
              value={form.closureNotes}
              onChangeText={(value) => {
                updateForm({ closureNotes: value });
                clearFieldError("closureNotes");
                setSubmitError(null);
              }}
              editable={!submitting}
              multiline
              autoCapitalize="sentences"
              placeholder="Summarize work completed, final checks, and customer handoff."
              error={fieldErrors.closureNotes}
              helperText="Keep it short and operator-friendly for dispatch and service history."
            />
          </Card>

          <Card>
            <View style={styles.statusRow}>
              <View style={styles.statusCopy}>
                <Text style={styles.sectionTitle}>Proof Attached</Text>
                <Text style={styles.helperText}>{proofSummary}</Text>
              </View>
              <ProofIndicator active={proofs.length > 0} />
            </View>
            <Button
              label={proofs.length > 0 ? "Manage Proof" : "Attach Proof"}
              variant="secondary"
              onPress={() => onOpenUploadProof(jobId)}
              disabled={submitting}
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
                <Text style={styles.sectionTitle}>Customer Confirmation</Text>
                <Text style={styles.helperText}>
                  Confirm that the customer acknowledged the completed visit.
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
            <Text style={styles.sectionTitle}>Failure Reason</Text>
            <Input
              label="Failure reason"
              value={form.failureReason}
              onChangeText={(value) => {
                updateForm({ failureReason: value });
                clearFieldError("failureReason");
                setSubmitError(null);
              }}
              editable={!submitting}
              multiline
              autoCapitalize="sentences"
              placeholder="Explain why the visit failed and what blocked completion."
              error={fieldErrors.failureReason}
              helperText="This reason is required and will be saved on the job history."
            />
          </Card>

          <Card>
            <View style={styles.statusRow}>
              <View style={styles.statusCopy}>
                <Text style={styles.sectionTitle}>Optional Failure Photo</Text>
                <Text style={styles.helperText}>{proofSummary}</Text>
              </View>
              <ProofIndicator active={proofs.length > 0} />
            </View>
            <Button
              label={proofs.length > 0 ? "Manage Failure Photo" : "Attach Failure Photo"}
              variant="secondary"
              onPress={() => onOpenUploadProof(jobId)}
              disabled={submitting}
            />
          </Card>
        </>
      ) : null}

      {outcome === "reschedule" ? (
        <>
          <Card>
            <Text style={styles.sectionTitle}>Reschedule Reason</Text>
            <Input
              label="Reason"
              value={form.rescheduleReason}
              onChangeText={(value) => {
                updateForm({ rescheduleReason: value });
                clearFieldError("rescheduleReason");
                setSubmitError(null);
              }}
              editable={!submitting}
              multiline
              autoCapitalize="sentences"
              placeholder="Explain why this visit needs a new appointment."
              error={fieldErrors.rescheduleReason}
              helperText="Keep the reason practical so dispatch can act on it immediately."
            />
          </Card>

          <Card>
            <Text style={styles.sectionTitle}>Preferred New Date</Text>
            <Input
              label="New date"
              value={form.preferredDate}
              onChangeText={(value) => {
                updateForm({ preferredDate: value });
                clearFieldError("preferredDate");
                setSubmitError(null);
              }}
              editable={!submitting}
              placeholder="YYYY-MM-DD"
              error={fieldErrors.preferredDate}
              helperText="Use the customer’s preferred revisit date in YYYY-MM-DD format."
            />
          </Card>

          <Card>
            <Text style={styles.sectionTitle}>Preferred Slot</Text>
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
        <Card>
          <Text style={styles.errorText}>{submitError}</Text>
        </Card>
      ) : null}

      <Button
        label={titleByOutcome[outcome]}
        onPress={() => void handleSubmit()}
        loading={submitting}
        variant={outcome === "fail" ? "danger" : "primary"}
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
        {active ? "Attached" : "Missing"}
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
