import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getMobileSession, type MobileSessionUser } from "@/lib/mobile/auth";
import {
  listStoredJobProofs,
  saveStoredJobProof,
} from "@/lib/mobile/job-proofs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const proofTypeSchema = z.enum([
  "before_photo",
  "after_photo",
  "installation_proof",
  "closure_proof",
]);

const proofSourceSchema = z.enum(["camera", "gallery", "remote"]);

const widthHeightSchema = z
  .string()
  .trim()
  .transform((value) => {
    if (!value) {
      return undefined;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
  });

async function assertMobileJobAccess(jobId: string, sessionUser: MobileSessionUser) {
  return db.job.findFirst({
    where: {
      id: jobId,
      organizationId: sessionUser.organizationId,
      technicianId: sessionUser.id,
    },
    select: {
      id: true,
    },
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
    return NextResponse.json({
      data: proofs,
    });
  } catch (error) {
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

    const job = await assertMobileJobAccess(context.params.id, session.user);

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const formData = await request.formData();
    const type = proofTypeSchema.parse(formData.get("type"));
    const source = proofSourceSchema.parse(formData.get("source"));
    const label = String(formData.get("label") ?? "").trim();
    const clientProofId = String(formData.get("clientProofId") ?? "").trim() || undefined;
    const createdAt = String(formData.get("createdAt") ?? "").trim() || undefined;
    const fileName = String(formData.get("fileName") ?? "").trim() || undefined;
    const mimeType = String(formData.get("mimeType") ?? "").trim() || undefined;
    const width = widthHeightSchema.parse(String(formData.get("width") ?? ""));
    const height = widthHeightSchema.parse(String(formData.get("height") ?? ""));
    const fileEntry = formData.get("file");

    if (!label) {
      return NextResponse.json({ error: "Proof label is required." }, { status: 400 });
    }

    if (!(fileEntry instanceof File) || fileEntry.size === 0) {
      return NextResponse.json({ error: "Proof image file is required." }, { status: 400 });
    }

    const effectiveMimeType = mimeType ?? fileEntry.type;

    if (!effectiveMimeType.startsWith("image/")) {
      return NextResponse.json(
        { error: "Only image proof uploads are supported." },
        { status: 400 },
      );
    }

    const proof = await saveStoredJobProof({
      sessionUser: session.user,
      jobId: job.id,
      origin: new URL(request.url).origin,
      clientProofId,
      type,
      label,
      source,
      createdAt,
      file: fileEntry,
      fileName,
      mimeType: effectiveMimeType,
      width,
      height,
    });

    return NextResponse.json(
      {
        data: proof,
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid proof upload request." },
        { status: 400 },
      );
    }

    console.error("Mobile proof upload failed", error);
    return NextResponse.json(
      { error: "Unable to upload proof right now." },
      { status: 500 },
    );
  }
}
