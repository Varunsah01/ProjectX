import { NextResponse } from "next/server";
import { JobType, JobStatus } from "@prisma/client";
import { z } from "zod";
import { createJobFromComplaintSchema } from "@project-x/shared/schemas/complaints";
import { db } from "@/lib/db";
import { getMobileSession } from "@/lib/mobile/auth";
import { enumToUi, toDateString } from "@/lib/query-utils";
import { parseJsonBody } from "@/lib/security/api";

export const dynamic = "force-dynamic";

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
    const body = await parseJsonBody(request, createJobFromComplaintSchema);

    const complaint = await db.ticket.findFirst({
      where: {
        id,
        organizationId: session.user.organizationId,
        assignedToId: session.user.id,
      },
    });

    if (!complaint) {
      return NextResponse.json({ error: "Complaint not found." }, { status: 404 });
    }

    if (complaint.status === "RESOLVED" || complaint.status === "CLOSED") {
      return NextResponse.json(
        { error: "Cannot create a job for a resolved or closed complaint." },
        { status: 400 },
      );
    }

    const scheduledDate = new Date(body.scheduledDate);

    if (isNaN(scheduledDate.getTime())) {
      return NextResponse.json({ error: "Invalid scheduled date." }, { status: 400 });
    }

    const jobCount = await db.job.count({
      where: { organizationId: session.user.organizationId },
    });
    const jobNumber = `JOB-${String(jobCount + 1).padStart(5, "0")}`;

    const newJob = await db.$transaction(async (tx) => {
      const job = await tx.job.create({
        data: {
          organizationId: session.user.organizationId,
          jobNumber,
          type: JobType.COMPLAINT,
          status: JobStatus.ASSIGNED,
          scheduledDate,
          notes: body.notes?.trim() || null,
          customerId: complaint.customerId,
          assetId: complaint.assetId ?? null,
          technicianId: session.user.id,
          ticketId: complaint.id,
        },
      });

      await tx.ticketTimeline.create({
        data: {
          ticketId: complaint.id,
          organizationId: session.user.organizationId,
          byUserId: session.user.id,
          action: "Job created",
          note: `Service job ${jobNumber} created from this complaint.`,
        },
      });

      return job;
    });

    return NextResponse.json({
      data: {
        id: newJob.id,
        jobNumber: newJob.jobNumber,
        scheduledDate: toDateString(newJob.scheduledDate),
        status: enumToUi(newJob.status),
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid request." },
        { status: 400 },
      );
    }

    console.error("Mobile complaint create-job failed", error);
    return NextResponse.json(
      { error: "Unable to create job from complaint." },
      { status: 500 },
    );
  }
}
