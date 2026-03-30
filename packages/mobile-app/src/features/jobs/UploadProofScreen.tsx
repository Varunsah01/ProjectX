import { useEffect, useState } from "react";
import {
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import NoticeCard from "../../components/ui/NoticeCard";
import StatusBadge from "../../components/ui/StatusBadge";
import ScreenHeader from "../../components/shell/ScreenHeader";
import { colors, radius, spacing } from "../../constants/theme";
import { useAuth } from "../../hooks/useAuth";
import { useSync } from "../../hooks/useSync";
import { getErrorMessage } from "../../services/api";
import { cleanupManagedProofFile } from "../../services/proof-files";
import { getSavedJobProofStatus } from "../../services/job-proofs";
import {
  captureProofFromCamera,
  pickProofsFromGallery,
  ProofPermissionError,
  retakeProofDraft,
  saveProofDrafts,
  type ProofDraft,
} from "../../services/proof-upload";
import type { JobProof, JobProofType } from "../../types/domain";
import {
  confirmDiscardUnsavedChanges,
  UNSAVED_CHANGES_BACK_GUARD_REASON,
} from "../../utils/unsaved-changes";
import { formatDateTime, titleCase } from "../../utils/format";

const proofTypeOptions: JobProofType[] = [
  "before_photo",
  "after_photo",
  "installation_proof",
  "closure_proof",
];

function formatImageCount(count: number) {
  return `${count} photo${count === 1 ? "" : "s"}`;
}

function formatProofImageCount(count: number) {
  return `${count} proof photo${count === 1 ? "" : "s"}`;
}

function buildSavedProofMessage(savedProofs: JobProof[]) {
  const pendingCount = savedProofs.filter((proof) => proof.syncState === "pending").length;
  const syncedCount = savedProofs.length - pendingCount;

  if (savedProofs.length === 0) {
    return "";
  }

  if (pendingCount === 0) {
    return `${formatProofImageCount(savedProofs.length)} uploaded.`;
  }

  if (syncedCount === 0) {
    return `${formatProofImageCount(savedProofs.length)} saved on this phone and waiting to upload.`;
  }

  return `${formatProofImageCount(syncedCount)} uploaded. ${formatProofImageCount(
    pendingCount,
  )} saved on this phone and waiting to upload.`;
}

type PermissionIssue = {
  permission: "camera" | "gallery";
  state: "denied" | "blocked";
  message: string;
  canAskAgain: boolean;
};

type DraftProofStatus = "pending" | "uploading" | "failed";

export default function UploadProofScreen({
  jobId,
  proofs,
  onBack,
  onAddProofs,
  onBackGuardChange,
  onBackInterceptChange,
  onRemoveProof,
}: {
  jobId: string;
  proofs: JobProof[];
  onBack: () => void;
  onAddProofs: (jobId: string, proofs: JobProof[]) => void;
  onBackGuardChange?: (blocked: boolean, reason?: string) => void;
  onBackInterceptChange?: (handler: (() => boolean) | null) => void;
  onRemoveProof: (jobId: string, proofId: string) => Promise<void>;
}) {
  const { request } = useAuth();
  const { isSyncing, lastSyncError, replayPendingActions } = useSync();
  const [proofType, setProofType] = useState<JobProofType>("before_photo");
  const [pendingProofs, setPendingProofs] = useState<ProofDraft[]>([]);
  const [draftStatuses, setDraftStatuses] = useState<Record<string, DraftProofStatus>>({});
  const [loadingAction, setLoadingAction] = useState<
    "camera" | "gallery" | "save" | null
  >(null);
  const [savingProofIds, setSavingProofIds] = useState<string[]>([]);
  const [retakingProofId, setRetakingProofId] = useState<string | null>(null);
  const [removingProofId, setRemovingProofId] = useState<string | null>(null);
  const [discardingPendingProofs, setDiscardingPendingProofs] = useState(false);
  const [openingSettings, setOpeningSettings] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permissionIssue, setPermissionIssue] = useState<PermissionIssue | null>(null);
  const [statusNotice, setStatusNotice] = useState<{
    tone: "success" | "warning";
    title: string;
    message: string;
  } | null>(null);
  const isBusy =
    loadingAction !== null ||
    retakingProofId !== null ||
    removingProofId !== null ||
    discardingPendingProofs ||
    openingSettings;
  const hasUnsavedChanges = pendingProofs.length > 0;
  const hasUnsavedChangeBackGuard =
    hasUnsavedChanges &&
    (loadingAction === "save" || retakingProofId !== null || discardingPendingProofs);
  const pendingSavedProofCount = proofs.filter(
    (proof) => proof.syncState === "pending",
  ).length;
  const savingProofIdSet = new Set(savingProofIds);
  const backGuardReason = hasUnsavedChangeBackGuard
    ? UNSAVED_CHANGES_BACK_GUARD_REASON
    : undefined;

  useEffect(() => {
    onBackGuardChange?.(hasUnsavedChangeBackGuard, backGuardReason);

    return () => {
      onBackGuardChange?.(false);
    };
  }, [backGuardReason, hasUnsavedChangeBackGuard, onBackGuardChange]);

  useEffect(() => {
    if (!hasUnsavedChanges || hasUnsavedChangeBackGuard) {
      onBackInterceptChange?.(null);
      return () => {
        onBackInterceptChange?.(null);
      };
    }

    onBackInterceptChange?.(() => {
      confirmDiscardUnsavedChanges({
        onDiscard: () => {
          onBackInterceptChange?.(null);
          setDiscardingPendingProofs(true);
          void cleanupDraftFiles(pendingProofs).finally(() => {
            setPendingProofs([]);
            setDraftStatuses({});
            setDiscardingPendingProofs(false);
            onBack();
          });
        },
      });
      return true;
    });

    return () => {
      onBackInterceptChange?.(null);
    };
  }, [hasUnsavedChanges, hasUnsavedChangeBackGuard, onBack, onBackInterceptChange, pendingProofs]);

  async function cleanupDraftFiles(drafts: ProofDraft[]) {
    await Promise.all(drafts.map((draft) => cleanupManagedProofFile(draft.uri)));
  }

  async function removePendingDraft(proofId: string) {
    const proofToRemove = pendingProofs.find((proof) => proof.id === proofId);
    await cleanupManagedProofFile(proofToRemove?.uri);
    setPendingProofs((current) => current.filter((currentProof) => currentProof.id !== proofId));
    setDraftStatuses((current) => {
      const next = { ...current };
      delete next[proofId];
      return next;
    });
  }

  function applyProofActionError(proofError: unknown) {
    if (proofError instanceof ProofPermissionError) {
      setPermissionIssue({
        permission: proofError.permission,
        state: proofError.state,
        message: proofError.message,
        canAskAgain: proofError.canAskAgain,
      });
      setError(null);
      return;
    }

    setPermissionIssue(null);
    setError(getErrorMessage(proofError));
  }

  async function handleOpenAppSettings() {
    setOpeningSettings(true);
    setError(null);

    try {
      await Linking.openSettings();
    } catch {
      setError(
        "Couldn't open Android settings. Open Settings manually, allow access, and try again.",
      );
    } finally {
      setOpeningSettings(false);
    }
  }

  async function appendProofDrafts(action: "camera" | "gallery") {
    setLoadingAction(action);
    setError(null);
    setPermissionIssue(null);
    setStatusNotice(null);

    try {
      const drafts =
        action === "camera"
          ? await captureProofFromCamera(proofType)
          : await pickProofsFromGallery(proofType);

      if (drafts.length === 0) {
        return;
      }

      const existingProofIds = new Set([
        ...pendingProofs.map((proof) => proof.id),
        ...proofs.map((proof) => proof.id),
      ]);
      const acceptedDrafts: ProofDraft[] = [];
      const duplicateDrafts: ProofDraft[] = [];

      for (const draft of drafts) {
        if (existingProofIds.has(draft.id)) {
          duplicateDrafts.push(draft);
          continue;
        }

        existingProofIds.add(draft.id);
        acceptedDrafts.push(draft);
      }

      if (duplicateDrafts.length > 0) {
        await cleanupDraftFiles(duplicateDrafts);
      }

      if (acceptedDrafts.length === 0) {
        setStatusNotice({
          tone: "warning",
          title: "Photo Already Added",
          message:
            "That photo is already saved for this job or is still waiting on this screen. Take a new photo or choose a different one.",
        });
        return;
      }

      setPendingProofs((current) => [...current, ...acceptedDrafts]);
      setDraftStatuses((current) => {
        const next = { ...current };

        acceptedDrafts.forEach((draft) => {
          next[draft.id] = "pending";
        });

        return next;
      });

      if (duplicateDrafts.length > 0) {
        setStatusNotice({
          tone: "warning",
          title: "Some Photos Were Skipped",
          message: `${formatImageCount(acceptedDrafts.length)} ready to save. ${formatImageCount(
            duplicateDrafts.length,
          )} skipped because ${duplicateDrafts.length === 1 ? "it is" : "they are"} already attached to this job or already selected here.`,
        });
      }
    } catch (proofError) {
      applyProofActionError(proofError);
    } finally {
      setLoadingAction(null);
    }
  }

  async function handleRetake(proofId: string) {
    const currentDraft = pendingProofs.find((proof) => proof.id === proofId);

    if (!currentDraft) {
      return;
    }

    setRetakingProofId(proofId);
    setError(null);
    setPermissionIssue(null);

    try {
      const replacement = await retakeProofDraft(currentDraft);

      if (!replacement) {
        return;
      }

      await cleanupManagedProofFile(currentDraft.uri);

      setPendingProofs((current) =>
        current.map((proof) =>
          proof.id === proofId
            ? {
                ...replacement,
                id: proofId,
              }
            : proof,
        ),
      );
      setDraftStatuses((current) => ({
        ...current,
        [proofId]: "pending",
      }));
    } catch (proofError) {
      applyProofActionError(proofError);
    } finally {
      setRetakingProofId(null);
    }
  }

  async function saveDrafts(draftsToSave: ProofDraft[]) {
    if (draftsToSave.length === 0) {
      return;
    }

    const draftIds = draftsToSave.map((draft) => draft.id);
    setLoadingAction("save");
    setSavingProofIds(draftIds);
    setError(null);
    setPermissionIssue(null);
    setStatusNotice(null);
    setDraftStatuses((current) => {
      const next = { ...current };

      draftIds.forEach((draftId) => {
        next[draftId] = "uploading";
      });

      return next;
    });

    try {
      const { savedProofs, failedDrafts, duplicateDrafts, firstError } = await saveProofDrafts(
        request,
        jobId,
        draftsToSave,
      );

      if (duplicateDrafts.length > 0) {
        await cleanupDraftFiles(duplicateDrafts);
      }

      if (savedProofs.length > 0) {
        onAddProofs(jobId, savedProofs);
      }

      const savedProofsById = new Map(savedProofs.map((savedProof) => [savedProof.id, savedProof]));
      const savedProofIds = new Set(savedProofs.map((savedProof) => savedProof.id));
      const failedDraftIds = new Set(failedDrafts.map((failedDraft) => failedDraft.id));
      await Promise.all(
        draftsToSave.map((originalDraft) => {
          const savedProof = savedProofsById.get(originalDraft.id);

          if (
            savedProof &&
            savedProof.syncState === "synced" &&
            savedProof.uri &&
            savedProof.uri !== originalDraft.uri
          ) {
            return cleanupManagedProofFile(originalDraft.uri);
          }

          return Promise.resolve();
        }),
      );
      setPendingProofs((current) =>
        current.filter((proof) => !savedProofIds.has(proof.id)),
      );
      setDraftStatuses((current) => {
        const next = { ...current };

        savedProofIds.forEach((proofId) => {
          delete next[proofId];
        });

        failedDraftIds.forEach((proofId) => {
          next[proofId] = "failed";
        });

        draftsToSave.forEach((draft) => {
          if (!savedProofIds.has(draft.id) && !failedDraftIds.has(draft.id)) {
            next[draft.id] = "pending";
          }
        });

        return next;
      });

      if (failedDrafts.length > 0) {
        const failureMessage = firstError
          ? getErrorMessage(firstError)
          : "Some selected images could not be saved.";
        const savedProofMessage = buildSavedProofMessage(savedProofs);

        setStatusNotice({
          tone: "warning",
          title: savedProofs.length > 0 ? "Some Photos Still Need Attention" : "Couldn't Save Photos",
          message: `${savedProofMessage ? `${savedProofMessage} ` : ""}${formatImageCount(
            failedDrafts.length,
          )} ${failedDrafts.length === 1 ? "is" : "are"} still only on this screen and not attached to the job yet. ${failureMessage} Retry save, retake, or remove the remaining ${failedDrafts.length === 1 ? "photo" : "photos"}.`,
        });
        return;
      }

      const pendingCount = savedProofs.filter((proof) => proof.syncState === "pending").length;

      setStatusNotice(
        pendingCount > 0
          ? {
              tone: "warning",
              title: "Saved on This Phone",
              message: `${buildSavedProofMessage(
                savedProofs,
              )} These photos are already attached to the job and will retry automatically when the connection improves or the app is active again.`,
            }
          : {
              tone: "success",
              title: "Photos Saved",
              message: buildSavedProofMessage(savedProofs),
            },
      );
    } catch (proofError) {
      setError(getErrorMessage(proofError));
      setDraftStatuses((current) => {
        const next = { ...current };

        draftIds.forEach((draftId) => {
          next[draftId] = "failed";
        });

        return next;
      });
    } finally {
      setSavingProofIds([]);
      setLoadingAction(null);
    }
  }

  async function handleSaveProofs() {
    await saveDrafts([...pendingProofs]);
  }

  async function handleRetryFailedProof(proofId: string) {
    const failedDraft = pendingProofs.find((proof) => proof.id === proofId);

    if (!failedDraft) {
      return;
    }

    await saveDrafts([failedDraft]);
  }

  async function handleRemoveSavedProof(proofId: string) {
    setRemovingProofId(proofId);
    setError(null);

    try {
      await onRemoveProof(jobId, proofId);
    } catch (proofError) {
      setError(getErrorMessage(proofError));
    } finally {
      setRemovingProofId(null);
    }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <ScreenHeader
        title="Upload Proof"
        subtitle="Take or pick proof photos, then save them to this job."
        backLabel="Back to Job"
        backDisabled={hasUnsavedChangeBackGuard}
        onBack={onBack}
      />

      {statusNotice ? (
        <NoticeCard
          tone={statusNotice.tone}
          title={statusNotice.title}
          message={statusNotice.message}
        />
      ) : null}

      <Card>
        <Text style={styles.sectionTitle}>Photo Type</Text>
        <View style={styles.typeRow}>
          {proofTypeOptions.map((option) => (
            <Pressable
              key={option}
              onPress={() => setProofType(option)}
              disabled={isBusy}
              testID={`upload-proof.photo-type.${option}`}
              style={({ pressed }) => [
                styles.typeChip,
                proofType === option && styles.typeChipActive,
                isBusy && styles.typeChipDisabled,
                pressed && !isBusy && styles.typeChipPressed,
              ]}
            >
              <Text
                style={[
                  styles.typeChipLabel,
                  proofType === option && styles.typeChipLabelActive,
                ]}
              >
                {titleCase(option)}
              </Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.helperText}>
          Pick the photo type before you add photos.
        </Text>
      </Card>

      {pendingSavedProofCount > 0 ? (
        <Card>
          <Text style={styles.sectionTitle}>
            {isSyncing ? "Uploading Saved Photos" : "Saved Photos Waiting"}
          </Text>
          <Text style={styles.helperText}>
            {formatProofImageCount(pendingSavedProofCount)} already{" "}
            {pendingSavedProofCount === 1 ? "is" : "are"} attached to this job but still{" "}
            {isSyncing ? "uploading now." : "waiting to upload."} They retry automatically when
            the app is active again or the connection improves.
          </Text>
          <Button
            label="Retry Upload"
            variant="secondary"
            onPress={() => void replayPendingActions()}
            loading={isSyncing}
            disabled={isBusy}
            testID="upload-proof.retry-upload-button"
          />
          {!isSyncing && lastSyncError ? (
            <Text style={styles.helperText}>Last retry failed: {lastSyncError}</Text>
          ) : null}
        </Card>
      ) : null}

      <Card>
        <Text style={styles.sectionTitle}>Add Photos</Text>
        <Text style={styles.helperText}>
          Take a photo now or choose one from the gallery.
        </Text>
        <View style={styles.actionRow}>
          <Button
            label="Take Photo"
            onPress={() => void appendProofDrafts("camera")}
            loading={loadingAction === "camera"}
            disabled={isBusy && loadingAction !== "camera"}
            style={styles.actionButton}
            testID="upload-proof.take-photo-button"
          />
          <Button
            label="Pick from Gallery"
            variant="secondary"
            onPress={() => void appendProofDrafts("gallery")}
            loading={loadingAction === "gallery"}
            disabled={isBusy && loadingAction !== "gallery"}
            style={styles.actionButton}
            testID="upload-proof.pick-gallery-button"
          />
        </View>
      </Card>

      {permissionIssue ? (
        <Card>
          <Text style={styles.sectionTitle}>
            {permissionIssue.permission === "camera"
              ? permissionIssue.state === "blocked"
                ? "Turn On Camera Access"
                : "Camera Access Needed"
              : permissionIssue.state === "blocked"
                ? "Turn On Photo Access"
                : "Photo Access Needed"}
          </Text>
          <Text style={styles.helperText}>{permissionIssue.message}</Text>
          <View style={styles.actionRow}>
            {permissionIssue.canAskAgain ? (
              <Button
                label={permissionIssue.permission === "camera" ? "Retry Camera" : "Retry Gallery"}
                onPress={() =>
                  void appendProofDrafts(
                    permissionIssue.permission === "camera" ? "camera" : "gallery",
                  )
                }
                disabled={isBusy}
                style={styles.actionButton}
              />
            ) : (
              <Button
                label="Open App Settings"
                onPress={() => void handleOpenAppSettings()}
                loading={openingSettings}
                disabled={isBusy && !openingSettings}
                style={styles.actionButton}
              />
            )}
            <Button
              label={
                permissionIssue.permission === "camera"
                  ? "Use Gallery Instead"
                  : "Use Camera Instead"
              }
              variant="secondary"
              onPress={() =>
                void appendProofDrafts(
                  permissionIssue.permission === "camera" ? "gallery" : "camera",
                )
              }
              disabled={isBusy}
              style={styles.actionButton}
            />
          </View>
          <Button
            label="Dismiss"
            variant="ghost"
            onPress={() => setPermissionIssue(null)}
            disabled={isBusy}
          />
        </Card>
      ) : null}

      <Card>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Selected Photos</Text>
          <Text style={styles.helperText}>
            {pendingProofs.length === 0
              ? "No new photos selected yet."
              : `${formatImageCount(pendingProofs.length)} copied to this phone and ready to save.`}
          </Text>
        </View>
        <Text style={styles.helperText}>
          {pendingProofs.length === 0
            ? "Take a photo or choose one from the gallery to add proof."
            : "These photos stay only on this screen until you tap Save Photos. They are not attached to the job yet."}
        </Text>

        {pendingProofs.length === 0 ? (
          <Text style={styles.helperText}>
            Use the buttons above to add proof photos.
          </Text>
        ) : (
          pendingProofs.map((proof) => (
            <ProofPreviewCard
              key={proof.id}
              proof={proof}
              status={savingProofIdSet.has(proof.id) ? "uploading" : draftStatuses[proof.id] ?? "pending"}
              disabled={isBusy}
              onRemove={() => void removePendingDraft(proof.id)}
              onRetake={() => void handleRetake(proof.id)}
              onRetrySave={() => void handleRetryFailedProof(proof.id)}
              retaking={retakingProofId === proof.id}
            />
          ))
        )}

        <Button
          label="Save Photos"
          onPress={() => void handleSaveProofs()}
          loading={loadingAction === "save"}
          disabled={pendingProofs.length === 0 || (isBusy && loadingAction !== "save")}
          testID="upload-proof.save-photos-button"
        />
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Saved Photos</Text>
        {proofs.length === 0 ? (
          <Text style={styles.helperText}>No proof photos saved for this job yet.</Text>
        ) : (
          proofs.map((proof) => (
            <SavedProofRow
              key={proof.id}
              proof={proof}
              status={getSavedJobProofStatus(proof, { isSyncing })}
              removing={removingProofId === proof.id}
              onRemove={() => void handleRemoveSavedProof(proof.id)}
            />
          ))
        )}
      </Card>

      {error ? <NoticeCard tone="danger" title="Couldn't Update Photos" message={error} /> : null}
    </ScrollView>
  );
}

function ProofPreviewCard({
  proof,
  status,
  disabled,
  onRemove,
  onRetake,
  onRetrySave,
  retaking,
}: {
  proof: ProofDraft;
  status: DraftProofStatus;
  disabled?: boolean;
  onRemove: () => void;
  onRetake: () => void;
  onRetrySave: () => void;
  retaking: boolean;
}) {
  return (
    <View style={styles.previewCard}>
      <Image source={{ uri: proof.uri }} style={styles.previewImage} />
      <View style={styles.previewCopy}>
        <View style={styles.previewTitleRow}>
          <Text style={styles.previewTitle}>{proof.label}</Text>
          <StatusBadge value={status} />
        </View>
        <Text style={styles.previewMeta}>
          {titleCase(proof.type)} · {titleCase(proof.source)}
        </Text>
        {proof.width && proof.height ? (
          <Text style={styles.previewMeta}>
            {proof.width} × {proof.height}
          </Text>
        ) : null}
        <Text style={styles.previewStatusText}>
          {status === "pending"
            ? "Ready to save to this job."
            : status === "uploading"
              ? "Saving now. Keep this screen open."
              : "Couldn't save this photo. Retry, retake, or remove it."}
        </Text>
      </View>
      <View style={styles.previewActions}>
        {status === "failed" ? (
          <Button
            label="Retry Save"
            onPress={onRetrySave}
            disabled={disabled}
            style={styles.previewActionButton}
            testID={`upload-proof.draft-retry-button.${proof.id}`}
          />
        ) : null}
        <Button
          label="Retake"
          variant="secondary"
          onPress={onRetake}
          loading={retaking}
          disabled={disabled}
          style={styles.previewActionButton}
          testID={`upload-proof.draft-retake-button.${proof.id}`}
        />
        <Button
          label="Remove"
          variant="ghost"
          onPress={onRemove}
          disabled={disabled}
          style={styles.previewActionButton}
          testID={`upload-proof.draft-remove-button.${proof.id}`}
        />
      </View>
    </View>
  );
}

function SavedProofRow({
  proof,
  status,
  removing,
  onRemove,
}: {
  proof: JobProof;
  status: "pending" | "uploading" | "uploaded";
  removing: boolean;
  onRemove: () => void;
}) {
  return (
    <View style={styles.savedProofRow}>
      {proof.uri ? <Image source={{ uri: proof.uri }} style={styles.savedThumb} /> : null}
      <View style={styles.proofCopy}>
        <View style={styles.savedProofHeader}>
          <Text style={styles.proofLabel}>{proof.label}</Text>
          <StatusBadge value={status} />
        </View>
        <Text style={styles.proofMeta}>
          {titleCase(proof.type)} · {formatDateTime(proof.createdAt)}
        </Text>
        <Text style={styles.proofMeta}>
          {status === "pending"
            ? "Saved on this phone and waiting to upload."
            : status === "uploading"
              ? "Uploading now. Keep the app open."
              : "Uploaded to this job."}
        </Text>
      </View>
      <Button
        label="Remove"
        variant="ghost"
        onPress={onRemove}
        loading={removing}
        disabled={removing}
        testID={`upload-proof.saved-remove-button.${proof.id}`}
      />
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
  sectionHeader: {
    gap: spacing.xs,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: colors.text,
  },
  helperText: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.textMuted,
  },
  typeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  typeChip: {
    minHeight: 40,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.md,
  },
  typeChipActive: {
    borderColor: colors.brand,
    backgroundColor: colors.brandSoft,
  },
  typeChipPressed: {
    opacity: 0.92,
  },
  typeChipDisabled: {
    opacity: 0.6,
  },
  typeChipLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.textMuted,
  },
  typeChipLabelActive: {
    color: colors.brand,
  },
  actionRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  actionButton: {
    flex: 1,
  },
  previewCard: {
    gap: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
  previewImage: {
    width: "100%",
    height: 220,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
  },
  previewCopy: {
    gap: 4,
  },
  previewTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  previewTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
    flex: 1,
  },
  previewMeta: {
    fontSize: 13,
    color: colors.textMuted,
  },
  previewStatusText: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.textMuted,
  },
  previewActions: {
    flexDirection: "row",
    gap: spacing.md,
    flexWrap: "wrap",
  },
  previewActionButton: {
    flex: 1,
    minWidth: 108,
  },
  savedProofRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
  savedThumb: {
    width: 68,
    height: 68,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
  },
  proofCopy: {
    flex: 1,
    gap: 4,
  },
  savedProofHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  proofLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
    flex: 1,
  },
  proofMeta: {
    fontSize: 13,
    color: colors.textMuted,
  },
});
