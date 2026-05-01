import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth-utils";
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
  kind: z.enum(["logo", "signature"]),
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

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user?.organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = signRequestSchema.parse(await request.json());
    const cleanExt = body.ext.replace(/^\.+/, "").toLowerCase();
    const uuid = randomUUID();
    const key = `org/${user.organizationId}/${body.kind}/${uuid}.${cleanExt}`;

    const [uploadUrl, downloadUrl] = await Promise.all([
      getPresignedPutUrl(key, body.contentType, PRESIGN_PUT_EXPIRES_SEC),
      getPresignedGetUrl(key, PRESIGN_GET_EXPIRES_SEC),
    ]);

    const expiresAt = new Date(
      Date.now() + PRESIGN_PUT_EXPIRES_SEC * 1000,
    ).toISOString();

    return NextResponse.json({ uploadUrl, key, downloadUrl, expiresAt });
  } catch (error) {
    if (error instanceof StorageNotConfiguredError) {
      return NextResponse.json(
        { error: "Storage is not configured. Ask your admin to set S3 environment variables." },
        { status: 503 },
      );
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid request." },
        { status: 400 },
      );
    }

    console.error("Upload sign failed", error);
    return NextResponse.json(
      { error: "Unable to issue an upload URL right now." },
      { status: 500 },
    );
  }
}
