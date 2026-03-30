import { useEffect, useRef, useState } from "react";
import {
  Alert,
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
import { saveJobNotes } from "../../services/jobs";
import type { JobUpdate } from "../../types/domain";
import JobContextCard from "./components/JobContextCard";
import {
  buildServiceReport,
  createEmptyServiceReportForm,
  issueTypeOptions,
  parseServiceReport,
  validateServiceReportForm,
  type ServiceReportFormErrors,
  type ServiceReportFormValues,
} from "./service-report";

export default function AddNotesScreen({
  jobId,
  onBack,
  onBackGuardChange,
  onBackInterceptChange,
  onDone,
}: {
  jobId: string;
  onBack: () => void;
  onBackGuardChange?: (blocked: boolean, reason?: string) => void;
  onBackInterceptChange?: (handler: (() => boolean) | null) => void;
  onDone: () => void;
}) {
  const { request } = useAuth();
  const { job, loading, error, reload } = useJobDetail(jobId);
  const [form, setForm] = useState<ServiceReportFormValues>(
    createEmptyServiceReportForm(),
  );
  const [fieldErrors, setFieldErrors] = useState<ServiceReportFormErrors>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const initializedJobIdRef = useRef<string | null>(null);
  const initialFormSnapshotRef = useRef<string>(JSON.stringify(createEmptyServiceReportForm()));

  useEffect(() => {
    onBackGuardChange?.(
      saving,
      saving ? "Wait for the service report save to finish before leaving this screen." : undefined,
    );

    return () => {
      onBackGuardChange?.(false);
    };
  }, [onBackGuardChange, saving]);

  useEffect(() => {
    if (job && initializedJobIdRef.current !== job.id) {
      const nextForm = parseServiceReport(job.serviceReport);
      setForm(nextForm);
      setFieldErrors({});
      initialFormSnapshotRef.current = JSON.stringify(nextForm);
      initializedJobIdRef.current = job.id;
    }
  }, [job]);

  const hasUnsavedChanges = JSON.stringify(form) !== initialFormSnapshotRef.current;

  function updateForm(nextValues: Partial<ServiceReportFormValues>) {
    setForm((currentValues) => ({
      ...currentValues,
      ...nextValues,
    }));
  }

  function clearFieldError(field: keyof ServiceReportFormErrors) {
    if (!fieldErrors[field]) {
      return;
    }

    setFieldErrors((currentErrors) => ({
      ...currentErrors,
      [field]: undefined,
    }));
  }

  async function handleSave() {
    const nextErrors = validateServiceReportForm(form);
    setFieldErrors(nextErrors);
    setSaveError(null);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    const update: JobUpdate = {
      jobId,
      note: buildServiceReport(form),
    };

    setSaving(true);

    try {
      await saveJobNotes(request, update);
      onDone();
    } catch (saveNotesError) {
      setSaveError(getErrorMessage(saveNotesError));
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    if (!hasUnsavedChanges || saving) {
      onBackInterceptChange?.(null);
      return () => {
        onBackInterceptChange?.(null);
      };
    }

    onBackInterceptChange?.(() => {
      Alert.alert(
        "Discard Service Report?",
        "This service report has unsaved changes. Leave this screen and lose the current edits?",
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
  }, [hasUnsavedChanges, onBack, onBackInterceptChange, saving]);

  if (loading) {
    return (
      <FullscreenState
        title="Loading service report"
        message="Fetching the latest job context before editing operator notes."
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
        title="Service Report"
        subtitle="Capture a clean field summary and save it to the current job record."
        backLabel="Back to Job"
        backDisabled={saving}
        onBack={onBack}
      />

      <JobContextCard job={job} />

      <Card>
        <Text style={styles.sectionTitle}>Service Notes</Text>
        <Input
          label="Service notes"
          value={form.serviceNotes}
          onChangeText={(value) => {
            updateForm({ serviceNotes: value });
            clearFieldError("serviceNotes");
            setSaveError(null);
          }}
          editable={!saving}
          multiline
          autoCapitalize="sentences"
          placeholder="Describe the issue observed on site, checks completed, and customer context."
          error={fieldErrors.serviceNotes}
          helperText="Keep this practical so the next operator or dispatcher can understand the visit quickly."
        />
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Issue Type</Text>
        <Text style={styles.helperText}>
          Pick the closest category for this visit.
        </Text>
        <View style={styles.optionGrid}>
          {issueTypeOptions.map((option) => (
            <IssueTypePill
              key={option.value}
              label={option.label}
              active={form.issueType === option.value}
              disabled={saving}
              onPress={() => {
                updateForm({ issueType: option.value });
                clearFieldError("issueType");
                setSaveError(null);
              }}
            />
          ))}
        </View>
        {fieldErrors.issueType ? (
          <Text style={styles.errorText}>{fieldErrors.issueType}</Text>
        ) : null}
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Work Done</Text>
        <Input
          label="Work done"
          value={form.workDone}
          onChangeText={(value) => {
            updateForm({ workDone: value });
            clearFieldError("workDone");
            setSaveError(null);
          }}
          editable={!saving}
          multiline
          autoCapitalize="sentences"
          placeholder="List repairs, parts replaced, tests run, or actions completed."
          error={fieldErrors.workDone}
          helperText="This becomes the operator’s saved service summary on the job."
        />
      </Card>

      <Card>
        <View style={styles.toggleHeader}>
          <View style={styles.toggleCopy}>
            <Text style={styles.sectionTitle}>Follow-up Required</Text>
            <Text style={styles.helperText}>
              Switch this on if another visit, approval, or part order is still needed.
            </Text>
          </View>
          <ToggleButton
            value={form.followUpRequired}
            disabled={saving}
            onPress={() => {
              updateForm({ followUpRequired: !form.followUpRequired });
              setSaveError(null);
            }}
          />
        </View>
      </Card>

      {saveError ? (
        <Card>
          <Text style={styles.errorText}>{saveError}</Text>
        </Card>
      ) : null}

      <Button label="Save Service Report" onPress={() => void handleSave()} loading={saving} />
    </ScrollView>
  );
}

function IssueTypePill({
  label,
  active,
  disabled,
  onPress,
}: {
  label: string;
  active: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.optionPill,
        active && styles.optionPillActive,
        disabled && styles.optionPillDisabled,
        pressed && !disabled && styles.optionPillPressed,
      ]}
    >
      <Text style={[styles.optionPillText, active && styles.optionPillTextActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

function ToggleButton({
  value,
  disabled,
  onPress,
}: {
  value: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.toggleTrack,
        value && styles.toggleTrackActive,
        disabled && styles.toggleDisabled,
        pressed && !disabled && styles.optionPillPressed,
      ]}
    >
      <View style={[styles.toggleThumb, value && styles.toggleThumbActive]} />
      <Text style={[styles.toggleLabel, value && styles.toggleLabelActive]}>
        {value ? "Yes" : "No"}
      </Text>
    </Pressable>
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
  optionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  optionPill: {
    minHeight: 44,
    minWidth: 104,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.md,
  },
  optionPillActive: {
    borderColor: colors.brand,
    backgroundColor: colors.brandSoft,
  },
  optionPillPressed: {
    opacity: 0.92,
  },
  optionPillDisabled: {
    opacity: 0.6,
  },
  optionPillText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.textMuted,
    textAlign: "center",
  },
  optionPillTextActive: {
    color: colors.brand,
  },
  toggleHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  toggleCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  toggleTrack: {
    minWidth: 96,
    minHeight: 48,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  toggleTrackActive: {
    borderColor: colors.success,
    backgroundColor: colors.successSoft,
  },
  toggleDisabled: {
    opacity: 0.6,
  },
  toggleThumb: {
    width: 24,
    height: 24,
    borderRadius: radius.pill,
    backgroundColor: colors.textSubtle,
  },
  toggleThumbActive: {
    backgroundColor: colors.success,
  },
  toggleLabel: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.textMuted,
  },
  toggleLabelActive: {
    color: colors.success,
  },
  errorText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.danger,
  },
});
