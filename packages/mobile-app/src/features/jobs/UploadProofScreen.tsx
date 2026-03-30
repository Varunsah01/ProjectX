import { useEffect, useState } from "react";
import {
  Alert,
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
import ScreenHeader from "../../components/shell/ScreenHeader";
import { colors, radius, spacing } from "../../constants/theme";
import { useAuth } from "../../hooks/useAuth";
import { useSync } from "../../hooks/useSync";
import { getErrorMessage } from "../../services/api";
import { cleanupManagedProofFile } from "../../services/proof-files";
import {
  captureProofFromCamera,
  pickProofsFromGallery,
  ProofPermissionError,
  retakeProofDraft,
  saveProofDrafts,
  type ProofDraft,
} from "../../services/proof-upload";
import type { JobProof, JobProofType } from "../../types/domain";
import { titleCase } from "../../utils/format";

const proofTypeOptions: JobProofType[] = [
  "before_photo",
  "after_photo",
  "installation_proof",
  "closure_proof",
];

function formatImageCount(count: number) {
  return `${count} image${count === 1 ? "" : "s"}`;
}

function formatProofImageCount(count: number) {
  return `${count} proof image${count === 1 ? "" : "s"}`;
}

function buildSavedProofMessage(savedProofs: JobProof[]) {
  const pendingCount = savedProofs.filter((proof) => proof.syncState === "pending").length;
  const syncedCount = savedProofs.length - pendingCount;

  if (savedProofs.length === 0) {
    return "";
  }

  if (pendingCount === 0) {
    return `${formatProofImageCount(savedProofs.length)} uploaded successfully.`;
  }

  if (syncedCount === 0) {
    return `${formatProofImageCount(savedProofs.length)} saved on device and waiting to upload.`;
  }

  return `${formatProofImageCount(syncedCount)} uploaded. ${formatProofImageCount(
    pendingCount,
  )} saved on device and waiting to upload.`;
}

type PermissionIssue = {
  permission: "camera" | "gallery";
  state: "denied" | "blocked";
  message: string;
  canAskAgain: boolean;
};

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
  const [loadingAction, setLoadingAction] = useState<
    "camera" | "gallery" | "save" | null
  >(null);
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
  const pendingSavedProofCount = proofs.filter(
    (proof) => proof.syncState === "pending",
  ).length;
  const backGuardReason =
    loadingAction === "save"
      ? "Wait for the proof save to finish before leaving this screen."
      : retakingProofId
        ? "Wait for the camera retake to finish before leaving this screen."
        : removingProofId
          ? "Wait for proof removal to finish before leaving this screen."
          : discardingPendingProofs
            ? "Wait for the unsaved proof cleanup to finish before leaving this screen."
          : undefined;

  useEffect(() => {
    onBackGuardChange?.(isBusy, backGuardReason);

    return () => {
      onBackGuardChange?.(false);
    };
  }, [backGuardReason, discardingPendingProofs, isBusy, onBackGuardChange]);

  useEffect(() => {
    if (pendingProofs.length === 0 || isBusy) {
      onBackInterceptChange?.(null);
      return () => {
        onBackInterceptChange?.(null);
      };
    }

    onBackInterceptChange?.(() => {
      Alert.alert(
        "Discard Selected Proof?",
        "These selected images are not attached to the job yet. Leave this screen and remove the unsaved selections?",
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
              setDiscardingPendingProofs(true);
              void cleanupDraftFiles(pendingProofs).finally(() => {
                setPendingProofs([]);
                setDiscardingPendingProofs(false);
                onBack();
              });
            },
          },
        ],
      );
      return true;
    });

    return () => {
      onBackInterceptChange?.(null);
    };
  }, [isBusy, onBack, onBackInterceptChange, pendingProofs]);

  async function cleanupDraftFiles(drafts: ProofDraft[]) {
    await Promise.all(drafts.map((draft) => cleanupManagedProofFile(draft.uri)));
  }

  async function removePendingDraft(proofId: string) {
    const proofToRemove = pendingProofs.find((proof) => proof.id === proofId);
    await cleanupManagedProofFile(proofToRemove?.uri);
    setPendingProofs((current) => current.filter((currentProof) => currentProof.id !== proofId));
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
      setError("Unable to open Android app settings on this device. Open Settings manually and allow the required permission.");
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
          title: "Proof Already Added",
          message:
            "The selected image is already saved for this job or is still waiting to be saved on this screen. Capture a new image or choose a different gallery item.",
        });
        return;
      }

      setPendingProofs((current) => [...current, ...acceptedDrafts]);

      if (duplicateDrafts.length > 0) {
        setStatusNotice({
          tone: "warning",
          title: "Some Images Skipped",
          message: `${formatImageCount(acceptedDrafts.length)} ready to save. ${formatImageCount(
            duplicateDrafts.length,
          )} skipped because ${duplicateDrafts.length === 1 ? "it is" : "they are"} already attached to this job or already selected.`,
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
    } catch (proofError) {
      applyProofActionError(proofError);
    } finally {
      setRetakingProofId(null);
    }
  }

  async function handleSaveProofs() {
    if (pendingProofs.length === 0) {
      return;
    }

    const draftsToSave = [...pendingProofs];
    setLoadingAction("save");
    setError(null);
    setPermissionIssue(null);
    setStatusNotice(null);

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
      setPendingProofs(failedDrafts);

      if (failedDrafts.length > 0) {
        const failureMessage = firstError
          ? getErrorMessage(firstError)
          : "Some selected images could not be saved.";
        const savedProofMessage = buildSavedProofMessage(savedProofs);

        setStatusNotice({
          tone: "warning",
          title: savedProofs.length > 0 ? "Some Proof Still Needs Attention" : "Proof Save Failed",
          message: `${savedProofMessage ? `${savedProofMessage} ` : ""}${formatImageCount(
            failedDrafts.length,
          )} remain only on this screen and ${failedDrafts.length === 1 ? "has" : "have"} not been added to the job yet. ${failureMessage} Retry save, retake, or remove the remaining ${failedDrafts.length === 1 ? "image" : "images"}.`,
        });
        return;
      }

      const pendingCount = savedProofs.filter((proof) => proof.syncState === "pending").length;

      setStatusNotice(
        pendingCount > 0
          ? {
              tone: "warning",
              title: "Saved on Device",
              message: `${buildSavedProofMessage(
                savedProofs,
              )} These proof items are already attached to the job and will retry automatically when the connection improves or the app becomes active again.`,
            }
          : {
              tone: "success",
              title: "Proof Saved",
              message: buildSavedProofMessage(savedProofs),
            },
      );
    } catch (proofError) {
      setError(getErrorMessage(proofError));
    } finally {
      setLoadingAction(null);
    }
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
        subtitle="Capture proof photos now and upload them to the current mobile backend without changing the app flow."
        backLabel="Back to Job"
        backDisabled={isBusy}
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
        <Text style={styles.sectionTitle}>Proof Type</Text>
        <View style={styles.typeRow}>
          {proofTypeOptions.map((option) => (
            <Pressable
              key={option}
              onPress={() => setProofType(option)}
              disabled={isBusy}
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
          Choose the proof category first, then capture from camera or select images from gallery.
        </Text>
      </Card>

      {pendingSavedProofCount > 0 ? (
        <Card>
          <Text style={styles.sectionTitle}>Pending Upload</Text>
          <Text style={styles.helperText}>
            {formatProofImageCount(pendingSavedProofCount)} already attached to this job but still
            waiting for upload. They retry automatically when the app becomes active again or the
            connection improves.
          </Text>
          <Button
            label="Retry Pending Uploads"
            variant="secondary"
            onPress={() => void replayPendingActions()}
            loading={isSyncing}
            disabled={isBusy}
          />
          {!isSyncing && lastSyncError ? (
            <Text style={styles.helperText}>{lastSyncError}</Text>
          ) : null}
        </Card>
      ) : null}

      <Card>
        <Text style={styles.sectionTitle}>Capture</Text>
        <Text style={styles.helperText}>
          If Android denies camera or gallery access, the proof flow stays on this screen and offers retry or settings guidance.
        </Text>
        <View style={styles.actionRow}>
          <Button
            label="Take Photo"
            onPress={() => void appendProofDrafts("camera")}
            loading={loadingAction === "camera"}
            disabled={isBusy && loadingAction !== "camera"}
            style={styles.actionButton}
          />
          <Button
            label="Pick from Gallery"
            variant="secondary"
            onPress={() => void appendProofDrafts("gallery")}
            loading={loadingAction === "gallery"}
            disabled={isBusy && loadingAction !== "gallery"}
            style={styles.actionButton}
          />
        </View>
      </Card>

      {permissionIssue ? (
        <Card>
          <Text style={styles.sectionTitle}>
            {permissionIssue.permission === "camera"
              ? permissionIssue.state === "blocked"
                ? "Camera Access Blocked"
                : "Camera Permission Denied"
              : permissionIssue.state === "blocked"
                ? "Gallery Access Blocked"
                : "Gallery Permission Denied"}
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
          <Text style={styles.sectionTitle}>Selected Images</Text>
          <Text style={styles.helperText}>
            {pendingProofs.length === 0
              ? "No new images selected yet."
              : `${formatImageCount(pendingProofs.length)} copied locally and ready to save.`}
          </Text>
        </View>
        <Text style={styles.helperText}>
          {pendingProofs.length === 0
            ? "New proof images are copied into app storage first so upload retry still works after the app is reopened."
            : "These selected images are only local to this screen until you tap Save Selected Proofs. They are not attached to the job or queued for retry yet."}
        </Text>

        {pendingProofs.length === 0 ? (
          <Text style={styles.helperText}>
            Use the buttons above to take a proof photo or choose one from the gallery.
          </Text>
        ) : (
          pendingProofs.map((proof) => (
            <ProofPreviewCard
              key={proof.id}
              proof={proof}
              disabled={isBusy}
              onRemove={() => void removePendingDraft(proof.id)}
              onRetake={() => void handleRetake(proof.id)}
              retaking={retakingProofId === proof.id}
            />
          ))
        )}

        <Button
          label="Save Selected Proofs"
          onPress={() => void handleSaveProofs()}
          loading={loadingAction === "save"}
          disabled={pendingProofs.length === 0 || (isBusy && loadingAction !== "save")}
        />
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Saved Proof</Text>
        {proofs.length === 0 ? (
          <Text style={styles.helperText}>No proof images saved for this job yet.</Text>
        ) : (
          proofs.map((proof) => (
            <SavedProofRow
              key={proof.id}
              proof={proof}
              removing={removingProofId === proof.id}
              onRemove={() => void handleRemoveSavedProof(proof.id)}
            />
          ))
        )}
      </Card>

      {error ? <NoticeCard tone="danger" title="Proof Action Failed" message={error} /> : null}
    </ScrollView>
  );
}

function ProofPreviewCard({
  proof,
  disabled,
  onRemove,
  onRetake,
  retaking,
}: {
  proof: ProofDraft;
  disabled?: boolean;
  onRemove: () => void;
  onRetake: () => void;
  retaking: boolean;
}) {
  return (
    <View style={styles.previewCard}>
      <Image source={{ uri: proof.uri }} style={styles.previewImage} />
      <View style={styles.previewCopy}>
        <Text style={styles.previewTitle}>{proof.label}</Text>
        <Text style={styles.previewMeta}>
          {titleCase(proof.type)} · {titleCase(proof.source)}
        </Text>
        {proof.width && proof.height ? (
          <Text style={styles.previewMeta}>
            {proof.width} × {proof.height}
          </Text>
        ) : null}
      </View>
      <View style={styles.previewActions}>
        <Button
          label="Retake"
          variant="secondary"
          onPress={onRetake}
          loading={retaking}
          disabled={disabled}
        />
        <Button label="Remove" variant="ghost" onPress={onRemove} disabled={disabled} />
      </View>
    </View>
  );
}

function SavedProofRow({
  proof,
  removing,
  onRemove,
}: {
  proof: JobProof;
  removing: boolean;
  onRemove: () => void;
}) {
  return (
    <View style={styles.savedProofRow}>
      {proof.uri ? <Image source={{ uri: proof.uri }} style={styles.savedThumb} /> : null}
      <View style={styles.proofCopy}>
        <Text style={styles.proofLabel}>{proof.label}</Text>
        <Text style={styles.proofMeta}>
          {titleCase(proof.type)} · {new Date(proof.createdAt).toLocaleString("en-IN")}
          {proof.syncState === "pending" ? " · Pending sync" : ""}
        </Text>
      </View>
      <Button
        label="Remove"
        variant="ghost"
        onPress={onRemove}
        loading={removing}
        disabled={removing}
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
  previewTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
  },
  previewMeta: {
    fontSize: 13,
    color: colors.textMuted,
  },
  previewActions: {
    flexDirection: "row",
    gap: spacing.md,
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
  proofLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
  },
  proofMeta: {
    fontSize: 13,
    color: colors.textMuted,
  },
});
