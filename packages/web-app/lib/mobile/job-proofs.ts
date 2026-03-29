import { randomUUID } from "node:crypto";
import { mkdir, readFile, rm, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import type { MobileSessionUser } from "@/lib/mobile/auth";

export type MobileJobProofType =
  | "before_photo"
  | "after_photo"
  | "installation_proof"
  | "closure_proof";

export type MobileJobProofSource = "camera" | "gallery" | "remote";

export interface MobileJobProofRecord {
  id: string;
  jobId: string;
  organizationId: string;
  technicianId: string;
  type: MobileJobProofType;
  label: string;
  createdAt: string;
  uri: string;
  source: MobileJobProofSource;
  fileName?: string;
  mimeType?: string;
  width?: number;
  height?: number;
  sizeBytes?: number;
  storagePath: string;
  clientProofId?: string;
}

const jobProofDataDir = path.join(process.cwd(), ".data", "mobile-job-proofs");
const jobProofFilesDir = path.join(process.cwd(), "public", "mobile-proofs");

function getJobProofIndexPath(jobId: string) {
  return path.join(jobProofDataDir, `${jobId}.json`);
}

function getJobProofFileExtension(fileName?: string | null, mimeType?: string | null) {
  const normalizedFileName = fileName?.trim();

  if (normalizedFileName) {
    const extension = path.extname(normalizedFileName).toLowerCase();

    if (extension) {
      return extension;
    }
  }

  switch (mimeType?.toLowerCase()) {
    case "image/png":
      return ".png";
    case "image/webp":
      return ".webp";
    case "image/heic":
      return ".heic";
    default:
      return ".jpg";
  }
}

function sanitizeFileName(value?: string | null) {
  const trimmedValue = value?.trim();

  if (!trimmedValue) {
    return undefined;
  }

  return trimmedValue.replace(/[^a-zA-Z0-9._-]/g, "_");
}

async function ensureJobProofDirs(jobId: string) {
  await mkdir(jobProofDataDir, { recursive: true });
  await mkdir(path.join(jobProofFilesDir, jobId), { recursive: true });
}

async function readJobProofIndex(jobId: string) {
  try {
    const payload = await readFile(getJobProofIndexPath(jobId), "utf8");
    const parsed = JSON.parse(payload) as MobileJobProofRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }

    throw error;
  }
}

async function writeJobProofIndex(jobId: string, proofs: MobileJobProofRecord[]) {
  await ensureJobProofDirs(jobId);
  await writeFile(
    getJobProofIndexPath(jobId),
    JSON.stringify(proofs, null, 2),
    "utf8",
  );
}

function mapStoredProof(record: MobileJobProofRecord) {
  return {
    id: record.id,
    jobId: record.jobId,
    type: record.type,
    label: record.label,
    createdAt: record.createdAt,
    uri: record.uri,
    source: record.source,
    fileName: record.fileName,
    mimeType: record.mimeType,
    width: record.width,
    height: record.height,
    sizeBytes: record.sizeBytes,
  };
}

export async function listStoredJobProofs(
  sessionUser: MobileSessionUser,
  jobId: string,
) {
  const proofs = await readJobProofIndex(jobId);

  return proofs
    .filter(
      (proof) =>
        proof.organizationId === sessionUser.organizationId &&
        proof.technicianId === sessionUser.id,
    )
    .map(mapStoredProof);
}

export async function saveStoredJobProof({
  sessionUser,
  jobId,
  origin,
  clientProofId,
  type,
  label,
  source,
  createdAt,
  file,
  fileName,
  mimeType,
  width,
  height,
}: {
  sessionUser: MobileSessionUser;
  jobId: string;
  origin: string;
  clientProofId?: string;
  type: MobileJobProofType;
  label: string;
  source: MobileJobProofSource;
  createdAt?: string;
  file: File;
  fileName?: string;
  mimeType?: string;
  width?: number;
  height?: number;
}) {
  await ensureJobProofDirs(jobId);

  const proofs = await readJobProofIndex(jobId);
  const existingProof =
    clientProofId
      ? proofs.find(
          (proof) =>
            proof.clientProofId === clientProofId &&
            proof.organizationId === sessionUser.organizationId &&
            proof.technicianId === sessionUser.id,
        )
      : undefined;

  if (existingProof) {
    return mapStoredProof(existingProof);
  }

  const proofId = randomUUID();
  const safeFileName = sanitizeFileName(fileName) ?? sanitizeFileName(file.name);
  const extension = getJobProofFileExtension(safeFileName, mimeType ?? file.type);
  const relativeStoragePath = path.join("mobile-proofs", jobId, `${proofId}${extension}`);
  const absoluteStoragePath = path.join(process.cwd(), "public", relativeStoragePath);
  const buffer = Buffer.from(await file.arrayBuffer());
  const effectiveMimeType = mimeType?.trim() || file.type || undefined;

  await writeFile(absoluteStoragePath, buffer);

  const record: MobileJobProofRecord = {
    id: proofId,
    jobId,
    organizationId: sessionUser.organizationId,
    technicianId: sessionUser.id,
    type,
    label: label.trim(),
    createdAt: createdAt?.trim() || new Date().toISOString(),
    uri: new URL(`/${relativeStoragePath.replace(/\\/g, "/")}`, origin).toString(),
    source,
    fileName: safeFileName,
    mimeType: effectiveMimeType,
    width,
    height,
    sizeBytes: buffer.byteLength,
    storagePath: absoluteStoragePath,
    clientProofId,
  };

  proofs.push(record);
  await writeJobProofIndex(jobId, proofs);
  return mapStoredProof(record);
}

export async function deleteStoredJobProof(
  sessionUser: MobileSessionUser,
  jobId: string,
  proofId: string,
) {
  const proofs = await readJobProofIndex(jobId);
  const proof = proofs.find(
    (record) =>
      record.id === proofId &&
      record.organizationId === sessionUser.organizationId &&
      record.technicianId === sessionUser.id,
  );

  if (!proof) {
    return false;
  }

  const nextProofs = proofs.filter((record) => record.id !== proofId);
  await writeJobProofIndex(jobId, nextProofs);

  try {
    await unlink(proof.storagePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
  }

  if (nextProofs.length === 0) {
    await rm(getJobProofIndexPath(jobId), { force: true });
  }

  return true;
}
