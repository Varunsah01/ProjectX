import { randomUUID } from "node:crypto";
import { readFile, rm, unlink } from "node:fs/promises";
import path from "node:path";
import type { Prisma } from "@prisma/client";
import type { MobileSessionUser } from "@/lib/mobile/auth";
import { db } from "@/lib/db";
import {
  StorageNotConfiguredError,
  getPresignedGetUrl,
  isStorageConfigured,
} from "@/lib/storage/s3";

export type MobileJobProofType =
  | "before_photo"
  | "after_photo"
  | "installation_proof"
  | "closure_proof";

export type MobileJobProofSource = "camera" | "gallery" | "remote";

type StoredProofMetadata = {
  id: string;
  key: string;
  type: MobileJobProofType;
  label: string;
  source: MobileJobProofSource;
  createdAt: string;
  fileName?: string;
  mimeType?: string;
  width?: number;
  height?: number;
  sizeBytes?: number;
  clientProofId?: string;
};

type LegacyProofRecord = {
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
};

export type MobileJobProofResponse = {
  id: string;
  jobId: string;
  type: MobileJobProofType;
  label: string;
  createdAt: string;
  uri?: string;
  source: MobileJobProofSource;
  fileName?: string;
  mimeType?: string;
  width?: number;
  height?: number;
  sizeBytes?: number;
};

const legacyJobProofDataDir = path.join(
  process.cwd(),
  ".data",
  "mobile-job-proofs",
);

function getLegacyJobProofIndexPath(jobId: string) {
  return path.join(legacyJobProofDataDir, `${jobId}.json`);
}

async function readLegacyProofIndex(jobId: string): Promise<LegacyProofRecord[]> {
  try {
    const payload = await readFile(getLegacyJobProofIndexPath(jobId), "utf8");
    const parsed = JSON.parse(payload) as LegacyProofRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

function parseStoredMetadata(value: Prisma.JsonValue | null | undefined) {
  if (!Array.isArray(value)) {
    return [] as StoredProofMetadata[];
  }

  return value.filter(
    (entry): entry is StoredProofMetadata =>
      Boolean(entry) &&
      typeof entry === "object" &&
      typeof (entry as StoredProofMetadata).id === "string" &&
      typeof (entry as StoredProofMetadata).key === "string",
  );
}

function mapLegacyProof(record: LegacyProofRecord): MobileJobProofResponse {
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

async function mapStoredProofToResponse(
  jobId: string,
  metadata: StoredProofMetadata,
): Promise<MobileJobProofResponse> {
  let uri: string | undefined;

  try {
    uri = await getPresignedGetUrl(metadata.key);
  } catch (error) {
    if (!(error instanceof StorageNotConfiguredError)) {
      throw error;
    }
    uri = undefined;
  }

  return {
    id: metadata.id,
    jobId,
    type: metadata.type,
    label: metadata.label,
    createdAt: metadata.createdAt,
    uri,
    source: metadata.source,
    fileName: metadata.fileName,
    mimeType: metadata.mimeType,
    width: metadata.width,
    height: metadata.height,
    sizeBytes: metadata.sizeBytes,
  };
}

export async function listStoredJobProofs(
  sessionUser: MobileSessionUser,
  jobId: string,
): Promise<MobileJobProofResponse[]> {
  const job = await db.job.findFirst({
    where: {
      id: jobId,
      organizationId: sessionUser.organizationId,
      technicianId: sessionUser.id,
    },
    select: {
      id: true,
      proofKeys: true,
      proofMetadata: true,
    },
  });

  const stored = job ? parseStoredMetadata(job.proofMetadata) : [];
  const remote = await Promise.all(
    stored.map((metadata) => mapStoredProofToResponse(jobId, metadata)),
  );

  const legacyRecords = await readLegacyProofIndex(jobId);
  const legacy = legacyRecords
    .filter(
      (record) =>
        record.organizationId === sessionUser.organizationId &&
        record.technicianId === sessionUser.id,
    )
    .map(mapLegacyProof);

  return [...remote, ...legacy];
}

export async function saveStoredJobProof({
  sessionUser,
  jobId,
  key,
  clientProofId,
  type,
  label,
  source,
  createdAt,
  fileName,
  mimeType,
  width,
  height,
  sizeBytes,
}: {
  sessionUser: MobileSessionUser;
  jobId: string;
  key: string;
  clientProofId?: string;
  type: MobileJobProofType;
  label: string;
  source: MobileJobProofSource;
  createdAt?: string;
  fileName?: string;
  mimeType?: string;
  width?: number;
  height?: number;
  sizeBytes?: number;
}): Promise<MobileJobProofResponse> {
  const expectedPrefix = `org/${sessionUser.organizationId}/job-proof/${jobId}/`;

  if (!key.startsWith(expectedPrefix)) {
    throw new Error("Proof key does not belong to this job.");
  }

  const job = await db.job.findFirst({
    where: {
      id: jobId,
      organizationId: sessionUser.organizationId,
      technicianId: sessionUser.id,
    },
    select: {
      id: true,
      proofKeys: true,
      proofMetadata: true,
    },
  });

  if (!job) {
    throw new Error("Job not found.");
  }

  const existing = parseStoredMetadata(job.proofMetadata);

  if (clientProofId) {
    const duplicate = existing.find(
      (record) => record.clientProofId === clientProofId,
    );

    if (duplicate) {
      return mapStoredProofToResponse(jobId, duplicate);
    }
  }

  const newRecord: StoredProofMetadata = {
    id: randomUUID(),
    key,
    type,
    label: label.trim(),
    source,
    createdAt: createdAt?.trim() || new Date().toISOString(),
    fileName,
    mimeType,
    width,
    height,
    sizeBytes,
    clientProofId,
  };

  const nextMetadata = [...existing, newRecord];
  const nextKeys = job.proofKeys.includes(key)
    ? job.proofKeys
    : [...job.proofKeys, key];

  await db.job.update({
    where: { id: job.id },
    data: {
      proofKeys: nextKeys,
      proofMetadata: nextMetadata as unknown as Prisma.InputJsonValue,
    },
  });

  return mapStoredProofToResponse(jobId, newRecord);
}

export async function deleteStoredJobProof(
  sessionUser: MobileSessionUser,
  jobId: string,
  proofId: string,
): Promise<boolean> {
  const job = await db.job.findFirst({
    where: {
      id: jobId,
      organizationId: sessionUser.organizationId,
      technicianId: sessionUser.id,
    },
    select: {
      id: true,
      proofKeys: true,
      proofMetadata: true,
    },
  });

  if (job) {
    const stored = parseStoredMetadata(job.proofMetadata);
    const target = stored.find((record) => record.id === proofId);

    if (target) {
      const nextMetadata = stored.filter((record) => record.id !== proofId);
      const nextKeys = job.proofKeys.filter((key) => key !== target.key);

      await db.job.update({
        where: { id: job.id },
        data: {
          proofKeys: nextKeys,
          proofMetadata: nextMetadata as unknown as Prisma.InputJsonValue,
        },
      });

      return true;
    }
  }

  return deleteLegacyJobProof(sessionUser, jobId, proofId);
}

async function deleteLegacyJobProof(
  sessionUser: MobileSessionUser,
  jobId: string,
  proofId: string,
): Promise<boolean> {
  const proofs = await readLegacyProofIndex(jobId);
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
  await writeLegacyProofIndex(jobId, nextProofs);

  try {
    await unlink(proof.storagePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
  }

  if (nextProofs.length === 0) {
    await rm(getLegacyJobProofIndexPath(jobId), { force: true });
  }

  return true;
}

async function writeLegacyProofIndex(
  jobId: string,
  records: LegacyProofRecord[],
) {
  const { mkdir, writeFile } = await import("node:fs/promises");
  await mkdir(legacyJobProofDataDir, { recursive: true });
  await writeFile(
    getLegacyJobProofIndexPath(jobId),
    JSON.stringify(records, null, 2),
    "utf8",
  );
}

export function isProofStorageConfigured(): boolean {
  return isStorageConfigured();
}
