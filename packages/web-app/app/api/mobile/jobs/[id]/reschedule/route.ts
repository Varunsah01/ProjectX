import { NextResponse } from "next/server";
import { JobStatus } from "@prisma/client";
import { z } from "zod";
import { jobDetailsInclude, mapJob } from "@/lib/data-mappers";
import { cleanOptional, parseDateInput } from "@/lib/actions/helpers";
import { db } from "@/lib/db";
import { getMobileSession } from "@/lib/mobile/auth";
import { parseJsonBody } from "@/lib/security/api";

export const dynamic = "force-dynamic";

const rescheduleJobSchema = z.object({
  scheduledDate: z.string().trim().min(1, "Scheduled date is required."),
  note: z.string().trim().optional().or(z.literal("")),
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
    const body = await parseJsonBody(request, rescheduleJobSchema);
    const nextScheduledDate = parseDateInput(body.scheduledDate);

    if (Number.isNaN(nextScheduledDate.getTime())) {
      return NextResponse.json(
        { error: "Scheduled date must be in YYYY-MM-DD format." },
        { status: 400 },
      );
    }

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

    if (job.status === JobStatus.COMPLETED || job.status === JobStatus.CANCELLED) {
      return NextResponse.json(
        { error: "Only active jobs can be rescheduled from mobile." },
        { status: 400 },
      );
    }

    const nextServiceReport = cleanOptional(body.note) ?? job.serviceReport;

    await db.job.update({
      where: { id: job.id },
      data: {
        status: JobStatus.ASSIGNED,
        scheduledDate: nextScheduledDate,
        completedAt: null,
        serviceReport: nextServiceReport,
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
        { error: error.issues[0]?.message ?? "Invalid reschedule request." },
        { status: 400 },
      );
    }

    console.error("Mobile job reschedule failed", error);
    return NextResponse.json(
      { error: "Unable to reschedule job." },
      { status: 500 },
    );
  }
}
