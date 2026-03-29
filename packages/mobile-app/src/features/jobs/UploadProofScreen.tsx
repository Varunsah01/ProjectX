import { useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import ScreenHeader from "../../components/shell/ScreenHeader";
import { colors, radius, spacing } from "../../constants/theme";
import { useAuth } from "../../hooks/useAuth";
import { getErrorMessage } from "../../services/api";
import {
  captureProofFromCamera,
  pickProofsFromGallery,
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

export default function UploadProofScreen({
  jobId,
  proofs,
  onBack,
  onAddProofs,
  onRemoveProof,
}: {
  jobId: string;
  proofs: JobProof[];
  onBack: () => void;
  onAddProofs: (jobId: string, proofs: JobProof[]) => void;
  onRemoveProof: (jobId: string, proofId: string) => Promise<void>;
}) {
  const { request } = useAuth();
  const [proofType, setProofType] = useState<JobProofType>("before_photo");
  const [pendingProofs, setPendingProofs] = useState<ProofDraft[]>([]);
  const [loadingAction, setLoadingAction] = useState<
    "camera" | "gallery" | "save" | null
  >(null);
  const [retakingProofId, setRetakingProofId] = useState<string | null>(null);
  const [removingProofId, setRemovingProofId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isBusy =
    loadingAction !== null || retakingProofId !== null || removingProofId !== null;
  const pendingSavedProofCount = proofs.filter(
    (proof) => proof.syncState === "pending",
  ).length;

  async function appendProofDrafts(action: "camera" | "gallery") {
    setLoadingAction(action);
    setError(null);

    try {
      const drafts =
        action === "camera"
          ? await captureProofFromCamera(proofType)
          : await pickProofsFromGallery(proofType);

      if (drafts.length === 0) {
        return;
      }

      setPendingProofs((current) => [...current, ...drafts]);
    } catch (proofError) {
      setError(getErrorMessage(proofError));
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

    try {
      const replacement = await retakeProofDraft(currentDraft);

      if (!replacement) {
        return;
      }

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
      setError(getErrorMessage(proofError));
    } finally {
      setRetakingProofId(null);
    }
  }

  async function handleSaveProofs() {
    if (pendingProofs.length === 0) {
      return;
    }

    setLoadingAction("save");
    setError(null);

    try {
      const savedProofs = await saveProofDrafts(request, jobId, pendingProofs);
      onAddProofs(jobId, savedProofs);
      setPendingProofs([]);
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
            {pendingSavedProofCount} proof image{pendingSavedProofCount === 1 ? "" : "s"} saved
            locally and waiting for a stronger connection to finish uploading.
          </Text>
        </Card>
      ) : null}

      <Card>
        <Text style={styles.sectionTitle}>Capture</Text>
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

      <Card>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Selected Images</Text>
          <Text style={styles.helperText}>
            {pendingProofs.length === 0
              ? "No new images selected yet."
              : `${pendingProofs.length} image${pendingProofs.length === 1 ? "" : "s"} ready to save.`}
          </Text>
        </View>

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
              onRemove={() =>
                setPendingProofs((current) =>
                  current.filter((currentProof) => currentProof.id !== proof.id),
                )
              }
              onRetake={() => void handleRetake(proof.id)}
              retaking={retakingProofId === proof.id}
            />
          ))
        )}

        <Button
          label="Save Selected Proof"
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

      {error ? (
        <Card>
          <Text style={styles.errorText}>{error}</Text>
        </Card>
      ) : null}
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
  errorText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.danger,
  },
});
