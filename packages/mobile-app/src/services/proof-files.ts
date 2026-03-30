import * as FileSystem from "expo-file-system";
import type { JobProofSource, JobProofType } from "../types/domain";
import { logTestEvent, logTestWarning } from "./test-logger";

const PROOF_STORAGE_DIRECTORY = FileSystem.documentDirectory
  ? `${FileSystem.documentDirectory}proof-drafts`
  : null;

function ensureProofStorageDirectory() {
  if (!PROOF_STORAGE_DIRECTORY) {
    throw new Error(
      "Local proof storage is unavailable on this device. Restart the app and try again.",
    );
  }

  return PROOF_STORAGE_DIRECTORY;
}

function sanitizeSegment(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, "-").replace(/-+/g, "-").slice(0, 48) || "proof";
}

function getFileExtension(fileName?: string, mimeType?: string) {
  const normalizedFileName = fileName?.split("?")[0] ?? "";
  const fileNameExtension = normalizedFileName.includes(".")
    ? normalizedFileName.split(".").pop()?.toLowerCase()
    : undefined;

  if (fileNameExtension) {
    return fileNameExtension;
  }

  const normalizedMimeType = mimeType?.toLowerCase() ?? "";

  if (normalizedMimeType === "image/png") {
    return "png";
  }

  if (normalizedMimeType === "image/webp") {
    return "webp";
  }

  return "jpg";
}

async function ensureProofDirectoryExists() {
  const directory = ensureProofStorageDirectory();
  const directoryInfo = await FileSystem.getInfoAsync(directory);

  if (!directoryInfo.exists) {
    await FileSystem.makeDirectoryAsync(directory, {
      intermediates: true,
    });
  }

  return directory;
}

export function isManagedProofFileUri(uri?: string | null) {
  return Boolean(uri && PROOF_STORAGE_DIRECTORY && uri.startsWith(PROOF_STORAGE_DIRECTORY));
}

export async function persistProofFile(input: {
  sourceUri: string;
  proofType: JobProofType;
  source: Extract<JobProofSource, "camera" | "gallery">;
  fileName?: string;
  mimeType?: string;
  uniqueId: string;
}) {
  if (isManagedProofFileUri(input.sourceUri)) {
    return input.sourceUri;
  }

  const directory = await ensureProofDirectoryExists();
  const extension = getFileExtension(input.fileName, input.mimeType);
  const targetFileName = `${sanitizeSegment(
    `${input.source}-${input.proofType}-${input.uniqueId}`,
  )}.${extension}`;
  const targetUri = `${directory}/${targetFileName}`;

  await FileSystem.copyAsync({
    from: input.sourceUri,
    to: targetUri,
  });

  const copiedFile = await FileSystem.getInfoAsync(targetUri);

  if (!copiedFile.exists) {
    throw new Error("Proof image could not be prepared for upload on this device.");
  }

  logTestEvent("proof-file", "persisted", {
    source: input.source,
    proofType: input.proofType,
    targetUri,
  });

  return targetUri;
}

export async function ensureProofFileAvailable(uri: string) {
  if (!uri.startsWith("file://")) {
    return;
  }

  const fileInfo = await FileSystem.getInfoAsync(uri);

  if (fileInfo.exists) {
    return;
  }

  throw new Error(
    "Saved proof file is no longer available on this device. Capture the proof again before retrying the upload.",
  );
}

export async function cleanupManagedProofFile(uri?: string | null) {
  if (!isManagedProofFileUri(uri)) {
    return;
  }

  const targetUri = uri as string;
  const fileInfo = await FileSystem.getInfoAsync(targetUri);

  if (!fileInfo.exists) {
    return;
  }

  try {
    await FileSystem.deleteAsync(targetUri, {
      idempotent: true,
    });
    logTestEvent("proof-file", "deleted", {
      uri: targetUri,
    });
  } catch (error) {
    logTestWarning("proof-file", "delete-failed", {
      uri: targetUri,
      errorMessage: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
