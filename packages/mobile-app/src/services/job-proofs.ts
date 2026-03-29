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

function buildUploadFormData(draft: ProofDraft) {
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

    return [...response.data.map(mapJobProof), ...pendingProofs];
  } catch (error) {
    if (!shouldQueueOfflineMutation(error)) {
      throw error;
    }

    return pendingProofs;
  }
}

export async function uploadJobProof(
  request: AuthenticatedRequest,
  jobId: string,
  draft: ProofDraft,
) {
  try {
    const response = await request<DetailResponse<JobProofDto>>(`/jobs/${jobId}/proofs`, {
      method: "POST",
      body: buildUploadFormData(draft),
      retry: 1,
    });

    return mapJobProof(response.data);
  } catch (error) {
    if (!shouldQueueOfflineMutation(error)) {
      throw error;
    }

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
    return;
  }

  await request<MutationResponse>(`/jobs/${jobId}/proofs/${proofId}`, {
    method: "DELETE",
    retry: 1,
  });
}
