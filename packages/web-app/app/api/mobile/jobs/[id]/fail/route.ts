import { NextResponse } from "next/server";
import { JobStatus } from "@prisma/client";
import { z } from "zod";
import { jobDetailsInclude, mapJob } from "@/lib/data-mappers";
import { db } from "@/lib/db";
import { getMobileSession } from "@/lib/mobile/auth";
import { cleanOptional } from "@/lib/actions/helpers";
import { parseJsonBody } from "@/lib/security/api";

export const dynamic = "force-dynamic";

const failJobSchema = z.object({
  reason: z.string().trim().min(1, "Reason is required."),
});

export async function POST(
  request: Request,
  context: { params: { id: string } },
) {
  try {
    const session = await getMobileSession(request);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = context.params;
    const body = await parseJsonBody(request, failJobSchema);

    const job = await db.job.findFirst({
      where: {
        id,
        organizationId: session.user.organizationId,
        technicianId: session.user.id,
      },
    });

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const cleanedReason = cleanOptional(body.reason);

    if (
      job.status === JobStatus.CANCELLED &&
      cleanOptional(job.serviceReport) === cleanedReason
    ) {
      const unchangedJob = await db.job.findFirst({
        where: { id: job.id },
        include: jobDetailsInclude,
      });

      if (!unchangedJob) {
        return NextResponse.json({ error: "Job not found" }, { status: 404 });
      }

      return NextResponse.json({
        data: mapJob(unchangedJob),
      });
    }

    if (job.status === JobStatus.COMPLETED || job.status === JobStatus.CANCELLED) {
      return NextResponse.json(
        { error: "Only active jobs can be failed from mobile." },
        { status: 400 },
      );
    }

    await db.job.update({
      where: { id: job.id },
      data: {
        status: JobStatus.CANCELLED,
        completedAt: null,
        serviceReport: cleanedReason,
      },
    });

    const updatedJob = await db.job.findFirst({
      where: { id: job.id },
      include: jobDetailsInclude,
    });

    if (!updatedJob) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    return NextResponse.json({
      data: mapJob(updatedJob),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid fail job request." },
        { status: 400 },
      );
    }

    console.error("Mobile job fail update failed", error);
    return NextResponse.json(
      { error: "Unable to fail job." },
      { status: 500 },
    );
  }
}
