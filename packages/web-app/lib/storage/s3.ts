import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export class StorageNotConfiguredError extends Error {
  constructor(missing: string[]) {
    super(
      `Object storage is not configured. Missing env: ${missing.join(", ")}.`,
    );
    this.name = "StorageNotConfiguredError";
  }
}

type StorageConfig = {
  bucket: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
};

function readStorageConfig(): StorageConfig {
  const bucket = process.env.S3_BUCKET?.trim();
  const region = process.env.S3_REGION?.trim();
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY?.trim();

  const missing: string[] = [];
  if (!bucket) missing.push("S3_BUCKET");
  if (!region) missing.push("S3_REGION");
  if (!accessKeyId) missing.push("AWS_ACCESS_KEY_ID");
  if (!secretAccessKey) missing.push("AWS_SECRET_ACCESS_KEY");

  if (missing.length > 0) {
    throw new StorageNotConfiguredError(missing);
  }

  return {
    bucket: bucket as string,
    region: region as string,
    accessKeyId: accessKeyId as string,
    secretAccessKey: secretAccessKey as string,
  };
}

function buildClient(config: StorageConfig) {
  return new S3Client({
    region: config.region,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
}

export async function getPresignedPutUrl(
  key: string,
  contentType: string,
  expiresInSec = 300,
): Promise<string> {
  const config = readStorageConfig();
  const client = buildClient(config);
  const command = new PutObjectCommand({
    Bucket: config.bucket,
    Key: key,
    ContentType: contentType,
  });

  return getSignedUrl(client, command, { expiresIn: expiresInSec });
}

export async function getPresignedGetUrl(
  key: string,
  expiresInSec = 900,
): Promise<string> {
  const config = readStorageConfig();
  const client = buildClient(config);
  const command = new GetObjectCommand({
    Bucket: config.bucket,
    Key: key,
  });

  return getSignedUrl(client, command, { expiresIn: expiresInSec });
}

export async function putObject(
  key: string,
  body: Buffer,
  contentType: string,
): Promise<void> {
  const config = readStorageConfig();
  const client = buildClient(config);
  await client.send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
}

export function isStorageConfigured(): boolean {
  try {
    readStorageConfig();
    return true;
  } catch (error) {
    if (error instanceof StorageNotConfiguredError) {
      return false;
    }
    throw error;
  }
}
