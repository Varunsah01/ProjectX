import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { HeadBucketCommand, S3Client } from "@aws-sdk/client-s3";
import nodemailer from "nodemailer";
import { db } from "@/lib/db";
import { logger } from "@/lib/log";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const CHECK_TIMEOUT_MS = 2_000;

type CheckResult =
  | { ok: true; latencyMs: number }
  | { ok: false; latencyMs: number }
  | { ok: "skip" };

function withTimeout<T>(promise: Promise<T>, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} check timed out`)), CHECK_TIMEOUT_MS),
    ),
  ]);
}

async function checkDb(): Promise<CheckResult> {
  const start = Date.now();
  try {
    await withTimeout(db.$queryRawUnsafe("SELECT 1"), "db");
    return { ok: true, latencyMs: Date.now() - start };
  } catch {
    return { ok: false, latencyMs: Date.now() - start };
  }
}

async function checkRedis(): Promise<CheckResult> {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!url || !token) return { ok: "skip" };

  const start = Date.now();
  try {
    const redis = new Redis({ url, token });
    await withTimeout(redis.ping(), "redis");
    return { ok: true, latencyMs: Date.now() - start };
  } catch {
    return { ok: false, latencyMs: Date.now() - start };
  }
}

async function checkS3(): Promise<CheckResult> {
  const bucket = process.env.S3_BUCKET?.trim();
  const region = process.env.S3_REGION?.trim();
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY?.trim();
  if (!bucket || !region || !accessKeyId || !secretAccessKey) return { ok: "skip" };

  const start = Date.now();
  try {
    const client = new S3Client({
      region,
      credentials: { accessKeyId, secretAccessKey },
    });
    await withTimeout(
      client.send(new HeadBucketCommand({ Bucket: bucket })),
      "s3",
    );
    return { ok: true, latencyMs: Date.now() - start };
  } catch {
    return { ok: false, latencyMs: Date.now() - start };
  }
}

async function checkSmtp(): Promise<CheckResult> {
  const host = process.env.SMTP_HOST?.trim();
  const port = Number(process.env.SMTP_PORT ?? 0);
  if (!host || !port) return { ok: "skip" };

  const start = Date.now();
  try {
    const user = process.env.SMTP_USER?.trim();
    const password = process.env.SMTP_PASSWORD?.trim();
    const auth = user && password ? { user, pass: password } : undefined;
    const transporter = nodemailer.createTransport({ host, port, secure: port === 465, auth });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- @types/nodemailer@8 omits verify()/close() from Transporter
    const t = transporter as any;
    await withTimeout(t.verify() as Promise<true>, "smtp");
    t.close();
    return { ok: true, latencyMs: Date.now() - start };
  } catch {
    return { ok: false, latencyMs: Date.now() - start };
  }
}

export async function GET(request: NextRequest) {
  const token = process.env.STATUS_TOKEN?.trim();
  if (!token) {
    return NextResponse.json({ error: "Status endpoint not configured" }, { status: 503 });
  }

  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${token}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [dbResult, redisResult, s3Result, smtpResult] = await Promise.all([
    checkDb(),
    checkRedis(),
    checkS3(),
    checkSmtp(),
  ]);

  const checks = { db: dbResult, redis: redisResult, s3: s3Result, smtp: smtpResult };

  const dbDown = dbResult.ok === false;
  const anyDown = Object.values(checks).some((c) => c.ok === false);

  const status = dbDown ? "down" : anyDown ? "degraded" : "ok";
  const httpStatus = status === "down" ? 503 : 200;

  if (status !== "ok") {
    logger.warn({ event: "status.check", status, checks }, "status check not ok");
  }

  return NextResponse.json({ status, checks }, { status: httpStatus });
}
