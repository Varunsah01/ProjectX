import * as FileSystem from "expo-file-system";
import type { AuthenticatedRequest } from "./api";
import { ApiError } from "./api";
import { logTestEvent, logTestError } from "./test-logger";

export type UploadKind = "job-proof" | "complaint-proof";

export type UploadResult = {
  key: string;
  getUrl: string;
  expiresAt: string;
};

type SignResponse = {
  uploadUrl: string;
  key: string;
  getUrl: string;
  expiresAt: string;
};

export class StorageNotConfiguredOnServerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StorageNotConfiguredOnServerError";
  }
}

export async function uploadProof(
  request: AuthenticatedRequest,
  input: {
    localUri: string;
    kind: UploadKind;
    resourceId: string;
    contentType: string;
    ext: string;
  },
): Promise<UploadResult> {
  let signResponse: SignResponse;

  try {
    signResponse = await request<SignResponse>("/uploads/sign", {
      method: "POST",
      body: {
        kind: input.kind,
        resourceId: input.resourceId,
        contentType: input.contentType,
        ext: input.ext,
      },
      retry: 1,
      timeoutMs: 12000,
    });
  } catch (error) {
    if (error instanceof ApiError && error.status === 503) {
      logTestError("upload", "storage-not-configured", {
        kind: input.kind,
        resourceId: input.resourceId,
      });
      throw new StorageNotConfiguredOnServerError(
        error.message ||
          "Proof storage isn't set up yet. Ask your admin before retrying.",
      );
    }

    throw error;
  }

  logTestEvent("upload", "presigned-acquired", {
    kind: input.kind,
    resourceId: input.resourceId,
  });

  const uploadResponse = await FileSystem.uploadAsync(
    signResponse.uploadUrl,
    input.localUri,
    {
      httpMethod: "PUT",
      uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
      headers: { "Content-Type": input.contentType },
    },
  );

  if (uploadResponse.status < 200 || uploadResponse.status >= 300) {
    logTestError("upload", "s3-put-failed", {
      kind: input.kind,
      resourceId: input.resourceId,
      status: uploadResponse.status,
    });
    throw new Error(
      `Upload to storage failed with status ${uploadResponse.status}.`,
    );
  }

  logTestEvent("upload", "s3-put-success", {
    kind: input.kind,
    resourceId: input.resourceId,
  });

  return {
    key: signResponse.key,
    getUrl: signResponse.getUrl,
    expiresAt: signResponse.expiresAt,
  };
}
