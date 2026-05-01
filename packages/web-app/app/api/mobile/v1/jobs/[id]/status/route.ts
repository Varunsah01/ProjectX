import { NextResponse } from "next/server";
import { JobStatus } from "@prisma/client";
import { z } from "zod";
import { updateJobStatusSchema } from "@project-x/shared/schemas/jobs";
import { mapJob, jobDetailsInclude } from "@/lib/data-mappers";
import { db } from "@/lib/db";
import { getMobileSession, validateMobileCsrf } from "@/lib/mobile/auth";
import { notifyJobCompleted } from "@/lib/notifications";
import { cleanOptional } from "@/lib/actions/helpers";
import { parseJsonBody } from "@/lib/security/api";

export const dynamic = "force-dynamic";

const allowedJobTransitions: Record<JobStatus, JobStatus[]> = {
  PENDING: ["EN_ROUTE", "IN_PROGRESS"],
  ASSIGNED: ["EN_ROUTE", "IN_PROGRESS"],
  EN_ROUTE: ["IN_PROGRESS"],
  IN_PROGRESS: ["COMPLETED"],
  COMPLETED: [],
  CANCELLED: [],
};

function canTransitionJobStatus(current: JobStatus, next: JobStatus) {
  return current === next || allowedJobTransitions[current].includes(next);
}

const ARRIVED_STATUS_MARKER = "[operator_status:arrived]";

function stripArrivedMarker(value?: string | null) {
  if (!value) {
    return undefined;
  }

  const cleaned = value
    .split("\n")
    .filter((line) => line.trim() !== ARRIVED_STATUS_MARKER)
    .join("\n")
    .trim();

  return cleaned || undefined;
}

function appendTechnicianProgressNote(
  currentValue: string | null,
  nextNote?: string,
  options?: {
    markArrived?: boolean;
  },
) {
  const sections: string[] = [];
  const existing = cleanOptional(stripArrivedMarker(currentValue));

  if (existing) {
    sections.push(existing);
  }

  if (options?.markArrived) {
    sections.push(ARRIVED_STATUS_MARKER);
  }

  if (nextNote) {
    sections.push(nextNote);
  }

  return cleanOptional(sections.join("\n\n"));
}

function buildProgressComment(
  status: z.infer<typeof updateJobStatusSchema>["status"],
  comment?: string,
) {
  const trimmedComment = cleanOptional(comment);

  if (!trimmedComment) {
    return undefined;
  }

  if (status === "en_route") {
    return `On the way: ${trimmedComment}`;
  }

  if (status === "arrived") {
    return `Arrived: ${trimmedComment}`;
  }

  return `Work started: ${trimmedComment}`;
}

function hasStoredProgressComment(
  currentValue: string | null,
  nextNote?: string,
) {
  if (!nextNote) {
    return true;
  }

  return stripArrivedMarker(currentValue)?.includes(nextNote) ?? false;
}

async function loadUpdatedJob(jobId: string, organizationId: string) {
  return db.job.findFirst({
    where: { id: jobId, organizationId },
    include: jobDetailsInclude,
  });
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

    const { id } = context.params;
    const body = await parseJsonBody(request, updateJobStatusSchema);
    const nextStatus =
      body.status === "arrived"
        ? JobStatus.EN_ROUTE
        : (body.status.toUpperCase() as JobStatus);

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

    const requestedArrived = body.status === "arrived";
    const canMoveToArrived =
      requestedArrived &&
      (job.status === JobStatus.PENDING ||
        job.status === JobStatus.ASSIGNED ||
        job.status === JobStatus.EN_ROUTE);

    if (!canMoveToArrived && !canTransitionJobStatus(job.status, nextStatus)) {
      return NextResponse.json(
        { error: "That status update is not allowed from the current job state." },
        { status: 400 },
      );
    }

    const progressComment = buildProgressComment(body.status, body.comment);
    const cleanedServiceReport = cleanOptional(body.serviceReport);
    const completionReport = cleanedServiceReport ?? cleanOptional(body.comment);
    const repeatedProgressUpdate =
      job.status === nextStatus &&
      (body.status === "en_route" || body.status === "arrived" || body.status === "in_progress") &&
      hasStoredProgressComment(job.serviceReport, progressComment) &&
      (body.status !== "arrived" || job.serviceReport?.includes(ARRIVED_STATUS_MARKER));
    const repeatedCompletionUpdate =
      nextStatus === JobStatus.COMPLETED &&
      job.status === JobStatus.COMPLETED &&
      (!completionReport ||
        cleanOptional(stripArrivedMarker(job.serviceReport)) === completionReport);

    if (repeatedProgressUpdate || repeatedCompletionUpdate) {
      const unchangedJob = await loadUpdatedJob(job.id, session.user.organizationId);

      if (!unchangedJob) {
        return NextResponse.json({ error: "Job not found" }, { status: 404 });
      }

      return NextResponse.json({
        data: mapJob(unchangedJob),
      });
    }

    await db.job.update({
      where: { id: job.id },
      data: {
        status: nextStatus,
        ...(nextStatus === JobStatus.COMPLETED
          ? {
              completedAt: job.completedAt ?? new Date(),
              serviceReport: completionReport ?? job.serviceReport,
            }
          : {
              completedAt: null,
              serviceReport:
                body.status === "en_route" || body.status === "arrived" || body.status === "in_progress"
                  ? appendTechnicianProgressNote(job.serviceReport, progressComment, {
                      markArrived: body.status === "arrived",
                    })
                  : job.serviceReport,
            }),
      },
    });

    const updatedJob = await loadUpdatedJob(job.id, session.user.organizationId);

    if (!updatedJob) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    if (nextStatus === JobStatus.COMPLETED) {
      await notifyJobCompleted(job.id);
    }

    return NextResponse.json({
      data: mapJob(updatedJob),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid job update request." },
        { status: 400 },
      );
    }

    console.error("Mobile job status update failed", error);
    return NextResponse.json(
      { error: "Unable to update job status." },
      { status: 500 },
    );
  }
}
