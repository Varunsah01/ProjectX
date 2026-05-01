import { NextResponse } from "next/server";
import { z } from "zod";
import {
  proofSourceSchema,
  proofTypeSchema,
} from "@project-x/shared/schemas/jobs";
import { db } from "@/lib/db";
import { getMobileSession, validateMobileCsrf, type MobileSessionUser } from "@/lib/mobile/auth";
import {
  listStoredJobProofs,
  saveStoredJobProof,
} from "@/lib/mobile/job-proofs";
import { parseJsonBody } from "@/lib/security/api";
import { StorageNotConfiguredError } from "@/lib/storage/s3";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const positiveIntSchema = z
  .number()
  .int()
  .positive()
  .optional()
  .or(z.null().transform(() => undefined));

const createProofSchema = z.object({
  key: z.string().trim().min(1, "key is required."),
  type: proofTypeSchema,
  source: proofSourceSchema,
  label: z.string().trim().min(1, "Proof label is required."),
  clientProofId: z.string().trim().optional(),
  createdAt: z.string().trim().optional(),
  fileName: z.string().trim().optional(),
  mimeType: z
    .string()
    .trim()
    .regex(/^image\//, "Only image proof uploads are supported."),
  width: positiveIntSchema,
  height: positiveIntSchema,
  sizeBytes: positiveIntSchema,
});

async function assertMobileJobAccess(
  jobId: string,
  sessionUser: MobileSessionUser,
) {
  return db.job.findFirst({
    where: {
      id: jobId,
      organizationId: sessionUser.organizationId,
      technicianId: sessionUser.id,
    },
    select: { id: true },
  });
}

export async function GET(
  request: Request,
  context: { params: { id: string } },
) {
  try {
    const session = await getMobileSession(request);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const job = await assertMobileJobAccess(context.params.id, session.user);

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const proofs = await listStoredJobProofs(session.user, job.id);
    return NextResponse.json({ data: proofs });
  } catch (error) {
    if (error instanceof StorageNotConfiguredError) {
      return NextResponse.json(
        { error: "Storage is not configured on the server." },
        { status: 503 },
      );
    }

    console.error("Mobile job proof list failed", error);
    return NextResponse.json(
      { error: "Unable to load job proof." },
      { status: 500 },
    );
  }
}

export async function POST(
  request: Request,
  context: { params: { id: string } },
) {
  try {
    const session = await getMobileSession(request);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!validateMobileCsrf(request, session)) {
      return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 });
    }

    const job = await assertMobileJobAccess(context.params.id, session.user);

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const body = await parseJsonBody(request, createProofSchema);

    const proof = await saveStoredJobProof({
      sessionUser: session.user,
      jobId: job.id,
      key: body.key,
      clientProofId: body.clientProofId,
      type: body.type,
      label: body.label,
      source: body.source,
      createdAt: body.createdAt,
      fileName: body.fileName,
      mimeType: body.mimeType,
      width: body.width,
      height: body.height,
      sizeBytes: body.sizeBytes,
    });

    return NextResponse.json({ data: proof }, { status: 201 });
  } catch (error) {
    if (error instanceof StorageNotConfiguredError) {
      return NextResponse.json(
        { error: "Storage is not configured on the server." },
        { status: 503 },
      );
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid proof upload request." },
        { status: 400 },
      );
    }

    if (error instanceof Error && /does not belong/.test(error.message)) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.error("Mobile proof upload failed", error);
    return NextResponse.json(
      { error: "Unable to record proof right now." },
      { status: 500 },
    );
  }
}
