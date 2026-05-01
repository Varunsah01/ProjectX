import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getMobileSession, validateMobileCsrf } from "@/lib/mobile/auth";
import { parseJsonBody } from "@/lib/security/api";
import {
  StorageNotConfiguredError,
  getPresignedGetUrl,
  getPresignedPutUrl,
} from "@/lib/storage/s3";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const PRESIGN_PUT_EXPIRES_SEC = 300;
const PRESIGN_GET_EXPIRES_SEC = 900;

const signRequestSchema = z.object({
  kind: z.enum(["job-proof", "complaint-proof"]),
  resourceId: z.string().trim().uuid("resourceId must be a UUID."),
  contentType: z
    .string()
    .trim()
    .min(1, "contentType is required.")
    .regex(/^image\//, "Only image content types are supported."),
  ext: z
    .string()
    .trim()
    .min(1, "ext is required.")
    .regex(/^[a-z0-9]{1,8}$/i, "ext must be a short alphanumeric extension."),
});

async function ensureCallerOwnsResource(
  organizationId: string,
  technicianId: string,
  kind: "job-proof" | "complaint-proof",
  resourceId: string,
) {
  if (kind === "job-proof") {
    const job = await db.job.findFirst({
      where: {
        id: resourceId,
        organizationId,
        technicianId,
      },
      select: { id: true },
    });

    return Boolean(job);
  }

  const ticket = await db.ticket.findFirst({
    where: {
      id: resourceId,
      organizationId,
      assignedToId: technicianId,
    },
    select: { id: true },
  });

  return Boolean(ticket);
}

export async function POST(request: Request) {
  try {
    const session = await getMobileSession(request);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!validateMobileCsrf(request, session)) {
      return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 });
    }

    const body = await parseJsonBody(request, signRequestSchema);
    const owns = await ensureCallerOwnsResource(
      session.user.organizationId,
      session.user.id,
      body.kind,
      body.resourceId,
    );

    if (!owns) {
      return NextResponse.json(
        { error: "Resource not found." },
        { status: 404 },
      );
    }

    const cleanExt = body.ext.replace(/^\.+/, "").toLowerCase();
    const uuid = randomUUID();
    const key = `org/${session.user.organizationId}/${body.kind}/${body.resourceId}/${uuid}.${cleanExt}`;

    const [uploadUrl, getUrl] = await Promise.all([
      getPresignedPutUrl(key, body.contentType, PRESIGN_PUT_EXPIRES_SEC),
      getPresignedGetUrl(key, PRESIGN_GET_EXPIRES_SEC),
    ]);

    const expiresAt = new Date(
      Date.now() + PRESIGN_PUT_EXPIRES_SEC * 1000,
    ).toISOString();

    return NextResponse.json({ uploadUrl, key, getUrl, expiresAt });
  } catch (error) {
    if (error instanceof StorageNotConfiguredError) {
      return NextResponse.json(
        {
          error:
            "Storage is not configured on the server. Ask your admin to set the S3 environment variables before uploading proofs.",
        },
        { status: 503 },
      );
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid sign request." },
        { status: 400 },
      );
    }

    console.error("Mobile upload sign failed", error);
    return NextResponse.json(
      { error: "Unable to issue an upload URL right now." },
      { status: 500 },
    );
  }
}
