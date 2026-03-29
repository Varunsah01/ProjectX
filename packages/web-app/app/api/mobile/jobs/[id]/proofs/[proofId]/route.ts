import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getMobileSession } from "@/lib/mobile/auth";
import { deleteStoredJobProof } from "@/lib/mobile/job-proofs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function DELETE(
  request: Request,
  context: { params: { id: string; proofId: string } },
) {
  try {
    const session = await getMobileSession(request);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const job = await db.job.findFirst({
      where: {
        id: context.params.id,
        organizationId: session.user.organizationId,
        technicianId: session.user.id,
      },
      select: {
        id: true,
      },
    });

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const deleted = await deleteStoredJobProof(
      session.user,
      job.id,
      context.params.proofId,
    );

    if (!deleted) {
      return NextResponse.json({ error: "Proof not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Mobile proof delete failed", error);
    return NextResponse.json(
      { error: "Unable to remove proof right now." },
      { status: 500 },
    );
  }
}
