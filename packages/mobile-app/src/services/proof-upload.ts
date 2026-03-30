import * as ImagePicker from "expo-image-picker";
import type { AuthenticatedRequest } from "./api";
import { createLocalJobProof } from "./jobs";
import { uploadJobProof } from "./job-proofs";
import type { JobProof, JobProofSource, JobProofType } from "../types/domain";
import { titleCase } from "../utils/format";
import { cleanupManagedProofFile, persistProofFile } from "./proof-files";
import { logTestEvent, logTestWarning } from "./test-logger";

export interface ProofDraft {
  id: string;
  type: JobProofType;
  label: string;
  createdAt: string;
  uri: string;
  source: Extract<JobProofSource, "camera" | "gallery">;
  fileName?: string;
  mimeType?: string;
  width?: number;
  height?: number;
}

export interface ProofStorageAdapter {
  save(jobId: string, draft: ProofDraft): Promise<JobProof>;
}

export type SaveProofDraftsResult = {
  savedProofs: JobProof[];
  failedDrafts: ProofDraft[];
  duplicateDrafts: ProofDraft[];
  firstError: unknown | null;
};

export type ProofPermissionKind = "camera" | "gallery";
export type ProofPermissionState = "denied" | "blocked";

export class ProofPermissionError extends Error {
  permission: ProofPermissionKind;
  state: ProofPermissionState;
  canAskAgain: boolean;

  constructor(input: {
    permission: ProofPermissionKind;
    state: ProofPermissionState;
    canAskAgain: boolean;
    message: string;
  }) {
    super(input.message);
    this.name = "ProofPermissionError";
    this.permission = input.permission;
    this.state = input.state;
    this.canAskAgain = input.canAskAgain;
  }
}

function buildFallbackLabel(type: JobProofType, count: number) {
  return `${titleCase(type)} ${count}`;
}

function hashProofIdentity(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return hash.toString(36);
}

function createProofDraftId(
  asset: ImagePicker.ImagePickerAsset,
  type: JobProofType,
  source: Extract<JobProofSource, "camera" | "gallery">,
  count: number,
) {
  const stableAssetIdentity =
    asset.assetId ??
    asset.uri ??
    `${asset.fileName ?? "proof"}-${asset.width ?? 0}x${asset.height ?? 0}-${count}`;

  return `${source}-${type}-${hashProofIdentity(stableAssetIdentity)}`;
}

async function mapAssetToProofDraft(
  asset: ImagePicker.ImagePickerAsset,
  type: JobProofType,
  source: Extract<JobProofSource, "camera" | "gallery">,
  count: number,
): Promise<ProofDraft> {
  const createdAt = new Date().toISOString();
  const draftId = createProofDraftId(asset, type, source, count);
  const persistedUri = await persistProofFile({
    sourceUri: asset.uri,
    proofType: type,
    source,
    fileName: asset.fileName ?? undefined,
    mimeType: asset.mimeType ?? undefined,
    uniqueId: `${draftId}-${Date.now()}`,
  });

  return {
    id: draftId,
    type,
    label: asset.fileName ?? buildFallbackLabel(type, count),
    createdAt,
    uri: persistedUri,
    source,
    fileName: asset.fileName ?? undefined,
    mimeType: asset.mimeType ?? undefined,
    width: asset.width,
    height: asset.height,
  };
}

async function mapAssetsToProofDrafts(
  assets: ImagePicker.ImagePickerAsset[],
  type: JobProofType,
  source: Extract<JobProofSource, "camera" | "gallery">,
) {
  const drafts: ProofDraft[] = [];

  try {
    for (const [index, asset] of assets.entries()) {
      drafts.push(await mapAssetToProofDraft(asset, type, source, index + 1));
    }
  } catch (error) {
    await Promise.all(drafts.map((draft) => cleanupManagedProofFile(draft.uri)));
    logTestWarning("proof", "draft-prepare-failed", {
      source,
      proofType: type,
      preparedCount: drafts.length,
      assetCount: assets.length,
      errorMessage: error instanceof Error ? error.message : "Unknown error",
    });
    throw error;
  }

  logTestEvent("proof", "drafts-prepared", {
    source,
    proofType: type,
    draftCount: drafts.length,
  });

  return drafts;
}

export function dedupeProofDrafts(drafts: ProofDraft[]) {
  const uniqueDrafts: ProofDraft[] = [];
  const duplicateDrafts: ProofDraft[] = [];
  const seenIds = new Set<string>();

  for (const draft of drafts) {
    if (seenIds.has(draft.id)) {
      duplicateDrafts.push(draft);
      continue;
    }

    seenIds.add(draft.id);
    uniqueDrafts.push(draft);
  }

  return {
    uniqueDrafts,
    duplicateDrafts,
  };
}

function createPermissionError(permission: ProofPermissionKind, canAskAgain: boolean) {
  const state: ProofPermissionState = canAskAgain ? "denied" : "blocked";

  if (permission === "camera") {
    return new ProofPermissionError({
      permission,
      state,
      canAskAgain,
      message: canAskAgain
        ? "Camera permission was denied. Allow camera access to take a proof photo, or use the gallery instead."
        : "Camera permission is blocked. Open Android app settings to enable camera access, or use the gallery instead.",
    });
  }

  return new ProofPermissionError({
    permission,
    state,
    canAskAgain,
    message: canAskAgain
      ? "Photo access was denied. Allow media access to pick proof images, or use the camera instead."
      : "Photo access is blocked. Open Android app settings to enable media access, or use the camera instead.",
  });
}

async function resolveImagePickerPermission(permission: ProofPermissionKind) {
  const currentPermission =
    permission === "camera"
      ? await ImagePicker.getCameraPermissionsAsync()
      : await ImagePicker.getMediaLibraryPermissionsAsync();

  logTestEvent("proof", `${permission}-permission-current`, {
    granted: currentPermission.granted,
    canAskAgain: currentPermission.canAskAgain,
    status: currentPermission.status,
  });

  if (currentPermission.granted) {
    return;
  }

  const requestedPermission =
    permission === "camera"
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

  logTestEvent("proof", `${permission}-permission-result`, {
    granted: requestedPermission.granted,
    canAskAgain: requestedPermission.canAskAgain,
    status: requestedPermission.status,
  });

  if (requestedPermission.granted) {
    return;
  }

  throw createPermissionError(permission, requestedPermission.canAskAgain);
}

async function ensureCameraAccess() {
  await resolveImagePickerPermission("camera");
}

async function ensureLibraryAccess() {
  await resolveImagePickerPermission("gallery");
}

export async function captureProofFromCamera(type: JobProofType) {
  await ensureCameraAccess();

  logTestEvent("proof", "camera-launch", {
    proofType: type,
  });

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ["images"],
    allowsEditing: true,
    aspect: [4, 3],
    quality: 0.8,
  });

  if (result.canceled || !result.assets?.length) {
    logTestEvent("proof", "camera-cancelled", {
      proofType: type,
    });
    return [];
  }

  return mapAssetsToProofDrafts(result.assets, type, "camera");
}

export async function pickProofsFromGallery(type: JobProofType) {
  await ensureLibraryAccess();

  logTestEvent("proof", "gallery-launch", {
    proofType: type,
  });

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsMultipleSelection: true,
    quality: 0.8,
    selectionLimit: 10,
  });

  if (result.canceled || !result.assets?.length) {
    logTestEvent("proof", "gallery-cancelled", {
      proofType: type,
    });
    return [];
  }

  return mapAssetsToProofDrafts(result.assets, type, "gallery");
}

export async function retakeProofDraft(
  currentDraft: Pick<ProofDraft, "type">,
) {
  const replacements = await captureProofFromCamera(currentDraft.type);
  return replacements[0] ?? null;
}

export const localProofStorageAdapter: ProofStorageAdapter = {
  async save(jobId, draft) {
    return createLocalJobProof({
      jobId,
      type: draft.type,
      label: draft.label,
      uri: draft.uri,
      source: draft.source,
      fileName: draft.fileName,
      mimeType: draft.mimeType,
      width: draft.width,
      height: draft.height,
      sizeBytes: undefined,
      createdAt: draft.createdAt,
      id: draft.id,
    });
  },
};

export function createRemoteProofStorageAdapter(
  request: AuthenticatedRequest,
): ProofStorageAdapter {
  return {
    async save(jobId, draft) {
      return uploadJobProof(request, jobId, draft);
    },
  };
}

export async function saveProofDrafts(
  request: AuthenticatedRequest,
  jobId: string,
  drafts: ProofDraft[],
  adapter: ProofStorageAdapter = createRemoteProofStorageAdapter(request),
): Promise<SaveProofDraftsResult> {
  const { uniqueDrafts, duplicateDrafts } = dedupeProofDrafts(drafts);
  const savedProofs: JobProof[] = [];
  const failedDrafts: ProofDraft[] = [];
  let firstError: unknown | null = null;

  if (duplicateDrafts.length > 0) {
    logTestWarning("proof", "save-deduped", {
      jobId,
      duplicateCount: duplicateDrafts.length,
    });
  }

  for (const draft of uniqueDrafts) {
    try {
      const savedProof = await adapter.save(jobId, draft);
      savedProofs.push(savedProof);
    } catch (error) {
      firstError ??= error;
      failedDrafts.push(draft);
      logTestWarning("proof", "save-failed", {
        jobId,
        proofId: draft.id,
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  const pendingCount = savedProofs.filter((proof) => proof.syncState === "pending").length;

  if (pendingCount > 0) {
    logTestWarning("proof", "saved-with-pending-sync", {
      jobId,
      proofCount: savedProofs.length,
      pendingCount,
    });
  } else {
    logTestEvent("proof", "saved-remote", {
      jobId,
      proofCount: savedProofs.length,
    });
  }

  if (failedDrafts.length > 0) {
    logTestWarning("proof", "save-partial", {
      jobId,
      savedCount: savedProofs.length,
      failedCount: failedDrafts.length,
    });
  }

  return {
    savedProofs,
    failedDrafts,
    duplicateDrafts,
    firstError,
  };
}
