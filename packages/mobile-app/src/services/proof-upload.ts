import * as ImagePicker from "expo-image-picker";
import type { AuthenticatedRequest } from "./api";
import { createLocalJobProof } from "./jobs";
import { uploadJobProof } from "./job-proofs";
import type { JobProof, JobProofSource, JobProofType } from "../types/domain";
import { titleCase } from "../utils/format";

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

function buildFallbackLabel(type: JobProofType, count: number) {
  return `${titleCase(type)} ${count}`;
}

function mapAssetToProofDraft(
  asset: ImagePicker.ImagePickerAsset,
  type: JobProofType,
  source: Extract<JobProofSource, "camera" | "gallery">,
  count: number,
): ProofDraft {
  const createdAt = new Date().toISOString();

  return {
    id: asset.assetId ?? `${source}-${type}-${Date.now()}-${count}`,
    type,
    label: asset.fileName ?? buildFallbackLabel(type, count),
    createdAt,
    uri: asset.uri,
    source,
    fileName: asset.fileName ?? undefined,
    mimeType: asset.mimeType ?? undefined,
    width: asset.width,
    height: asset.height,
  };
}

async function ensureCameraAccess() {
  const permission = await ImagePicker.requestCameraPermissionsAsync();

  if (permission.granted) {
    return;
  }

  throw new Error(
    permission.canAskAgain
      ? "Camera permission is required to take a proof photo."
      : "Camera permission is blocked. Enable it in Android app settings to take proof photos.",
  );
}

async function ensureLibraryAccess() {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

  if (permission.granted) {
    return;
  }

  throw new Error(
    permission.canAskAgain
      ? "Photo access is required to pick proof images from the gallery."
      : "Photo access is blocked. Enable media permissions in Android app settings to pick proof images.",
  );
}

export async function captureProofFromCamera(type: JobProofType) {
  await ensureCameraAccess();

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ["images"],
    allowsEditing: true,
    aspect: [4, 3],
    quality: 0.8,
  });

  if (result.canceled || !result.assets?.length) {
    return [];
  }

  return result.assets.map((asset, index) =>
    mapAssetToProofDraft(asset, type, "camera", index + 1),
  );
}

export async function pickProofsFromGallery(type: JobProofType) {
  await ensureLibraryAccess();

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsMultipleSelection: true,
    quality: 0.8,
    selectionLimit: 10,
  });

  if (result.canceled || !result.assets?.length) {
    return [];
  }

  return result.assets.map((asset, index) =>
    mapAssetToProofDraft(asset, type, "gallery", index + 1),
  );
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
) {
  const savedProofs: JobProof[] = [];

  for (const draft of drafts) {
    const savedProof = await adapter.save(jobId, draft);
    savedProofs.push(savedProof);
  }

  return savedProofs;
}
