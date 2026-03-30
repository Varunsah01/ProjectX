import type { AuthenticatedRequest } from "./api";
import { shouldQueueOfflineMutation } from "./api";
import type {
  DetailResponse,
  JobProofDto,
  ListResponse,
  MutationResponse,
} from "../types/api";
import type { JobProof } from "../types/domain";
import type { ProofDraft } from "./proof-upload";
import {
  getPendingProofsForJob,
  loadPendingActions,
  queueJobProofUpload,
  removePendingProofUpload,
} from "./offline-sync";
import { createLocalJobProof } from "./jobs";
import { cleanupManagedProofFile, ensureProofFileAvailable } from "./proof-files";
import { logTestEvent, logTestWarning } from "./test-logger";

export type SavedJobProofStatus = "pending" | "uploading" | "uploaded";

type ReactNativeUploadFile = {
  uri: string;
  name: string;
  type: string;
};

function mapJobProof(dto: JobProofDto): JobProof {
  return {
    id: dto.id,
    jobId: dto.jobId,
    type: dto.type,
    label: dto.label,
    createdAt: dto.createdAt,
    uri: dto.uri,
    source: dto.source,
    syncState: "synced",
    fileName: dto.fileName,
    mimeType: dto.mimeType,
    width: dto.width,
    height: dto.height,
    sizeBytes: dto.sizeBytes,
  };
}

export function getSavedJobProofStatus(
  proof: Pick<JobProof, "syncState">,
  options: {
    isSyncing?: boolean;
  } = {},
): SavedJobProofStatus {
  if (proof.syncState === "pending") {
    return options.isSyncing ? "uploading" : "pending";
  }

  return "uploaded";
}

export function dedupeJobProofs(proofs: JobProof[]) {
  const dedupedProofs = new Map<string, JobProof>();

  for (const proof of proofs) {
    if (!dedupedProofs.has(proof.id)) {
      dedupedProofs.set(proof.id, proof);
    }
  }

  return Array.from(dedupedProofs.values());
}

async function buildUploadFormData(draft: ProofDraft) {
  await ensureProofFileAvailable(draft.uri);
  const formData = new FormData();
  formData.append("type", draft.type);
  formData.append("label", draft.label);
  formData.append("source", draft.source);
  formData.append("clientProofId", draft.id);
  formData.append("createdAt", draft.createdAt);

  if (draft.fileName) {
    formData.append("fileName", draft.fileName);
  }

  if (draft.mimeType) {
    formData.append("mimeType", draft.mimeType);
  }

  if (draft.width) {
    formData.append("width", String(draft.width));
  }

  if (draft.height) {
    formData.append("height", String(draft.height));
  }

  const uploadFile: ReactNativeUploadFile = {
    uri: draft.uri,
    name: draft.fileName ?? `${draft.id}.jpg`,
    type: draft.mimeType ?? "image/jpeg",
  };

  formData.append("file", uploadFile as unknown as Blob);
  return formData;
}

export async function listJobProofs(
  request: AuthenticatedRequest,
  jobId: string,
) {
  const pendingActions = await loadPendingActions();
  const pendingProofs = getPendingProofsForJob(jobId, pendingActions);

  try {
    const response = await request<ListResponse<JobProofDto>>(`/jobs/${jobId}/proofs`, {
      retry: 1,
    });

    return dedupeJobProofs([...response.data.map(mapJobProof), ...pendingProofs]);
  } catch (error) {
    if (!shouldQueueOfflineMutation(error)) {
      throw error;
    }

    return dedupeJobProofs(pendingProofs);
  }
}

export async function uploadJobProof(
  request: AuthenticatedRequest,
  jobId: string,
  draft: ProofDraft,
) {
  try {
    logTestEvent("proof", "upload-start", {
      jobId,
      proofId: draft.id,
      source: draft.source,
      type: draft.type,
    });
    const response = await request<DetailResponse<JobProofDto>>(`/jobs/${jobId}/proofs`, {
      method: "POST",
      body: await buildUploadFormData(draft),
      retry: 1,
      timeoutMs: 20000,
    });

    const savedProof = mapJobProof(response.data);
    logTestEvent("proof", "upload-success", {
      jobId,
      proofId: draft.id,
    });
    return {
      ...savedProof,
      uri: savedProof.uri ?? draft.uri,
    };
  } catch (error) {
    if (!shouldQueueOfflineMutation(error)) {
      throw error;
    }

    logTestWarning("proof", "upload-queued", {
      jobId,
      proofId: draft.id,
      errorMessage: error instanceof Error ? error.message : "Unknown error",
    });
    await queueJobProofUpload({
      jobId,
      proofId: draft.id,
      type: draft.type,
      label: draft.label,
      createdAt: draft.createdAt,
      uri: draft.uri,
      source: draft.source,
      fileName: draft.fileName,
      mimeType: draft.mimeType,
      width: draft.width,
      height: draft.height,
    });

    return createLocalJobProof({
      jobId,
      id: draft.id,
      type: draft.type,
      label: draft.label,
      uri: draft.uri,
      source: draft.source,
      createdAt: draft.createdAt,
      fileName: draft.fileName,
      mimeType: draft.mimeType,
      width: draft.width,
      height: draft.height,
      syncState: "pending",
    });
  }
}

export async function deleteJobProof(
  request: AuthenticatedRequest,
  jobId: string,
  proofId: string,
  proofUri?: string,
) {
  const pendingActions = await loadPendingActions();
  const hasPendingProof = pendingActions.some(
    (action) =>
      action.type === "job_proof_upload" &&
      action.jobId === jobId &&
      action.payload.proofId === proofId,
  );

  if (hasPendingProof) {
    await removePendingProofUpload(jobId, proofId);
    await cleanupManagedProofFile(proofUri);
    return;
  }

  await request<MutationResponse>(`/jobs/${jobId}/proofs/${proofId}`, {
    method: "DELETE",
    retry: 1,
    timeoutMs: 12000,
  });
  await cleanupManagedProofFile(proofUri);
}
