import { NextResponse } from "next/server";
import { TicketStatus } from "@prisma/client";
import { z } from "zod";
import { updateComplaintStatusSchema } from "@project-x/shared/schemas/complaints";
import { db } from "@/lib/db";
import { getMobileSession, validateMobileCsrf } from "@/lib/mobile/auth";
import { notifyTicketResolved } from "@/lib/notifications";
import { cleanOptional } from "@/lib/actions/helpers";
import { parseJsonBody } from "@/lib/security/api";

export const dynamic = "force-dynamic";

const complaintTimelineActions: Record<string, string> = {
  in_progress: "Work started",
  on_hold: "Complaint put on hold",
  resolved: "Complaint resolved",
};

const allowedComplaintTransitions: Record<TicketStatus, TicketStatus[]> = {
  OPEN: ["IN_PROGRESS"],
  ASSIGNED: ["IN_PROGRESS", "ON_HOLD", "RESOLVED"],
  IN_PROGRESS: ["ON_HOLD", "RESOLVED"],
  ON_HOLD: ["IN_PROGRESS", "RESOLVED"],
  RESOLVED: [],
  CLOSED: [],
  REOPENED: ["IN_PROGRESS", "ON_HOLD", "RESOLVED"],
};

function canTransitionComplaintStatus(current: TicketStatus, next: TicketStatus) {
  return current === next || allowedComplaintTransitions[current].includes(next);
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
    const body = await parseJsonBody(request, updateComplaintStatusSchema);
    const nextStatus = body.status.toUpperCase() as TicketStatus;

    const complaint = await db.ticket.findFirst({
      where: {
        id,
        organizationId: session.user.organizationId,
        assignedToId: session.user.id,
      },
    });

    if (!complaint) {
      return NextResponse.json({ error: "Complaint not found" }, { status: 404 });
    }

    if (!canTransitionComplaintStatus(complaint.status, nextStatus)) {
      return NextResponse.json(
        { error: "That status update is not allowed from the current complaint state." },
        { status: 400 },
      );
    }

    await db.ticket.update({
      where: { id: complaint.id },
      data: {
        status: nextStatus,
        ...(nextStatus === "RESOLVED"
          ? { resolvedAt: new Date() }
          : {}),
        timeline: {
          create: {
            organizationId: session.user.organizationId,
            byUserId: session.user.id,
            action: complaintTimelineActions[body.status],
            note: cleanOptional(body.note),
          },
        },
      },
    });

    if (nextStatus === "RESOLVED") {
      await notifyTicketResolved(complaint.id);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid complaint update request." },
        { status: 400 },
      );
    }

    console.error("Mobile complaint status update failed", error);
    return NextResponse.json(
      { error: "Unable to update complaint status." },
      { status: 500 },
    );
  }
}
