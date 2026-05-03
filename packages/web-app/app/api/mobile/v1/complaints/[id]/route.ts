import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getMobileSession } from "@/lib/mobile/auth";
import { enumToUi, toDateString, toDateTimeString } from "@/lib/query-utils";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: { id: string } },
) {
  try {
    const session = await getMobileSession(request);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = context.params;

    const complaint = await db.ticket.findFirst({
      where: {
        id,
        organizationId: session.user.organizationId,
        assignedToId: session.user.id,
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            address: true,
            city: true,
            phone: true,
            email: true,
          },
        },
        asset: {
          select: {
            id: true,
            name: true,
            model: true,
            serialNumber: true,
            category: true,
            status: true,
            location: true,
            notes: true,
          },
        },
        timeline: {
          orderBy: {
            createdAt: "asc",
          },
          include: {
            byUser: {
              select: {
                name: true,
              },
            },
          },
        },
        jobs: {
          where: {
            technicianId: session.user.id,
          },
          orderBy: {
            scheduledDate: "desc",
          },
          select: {
            id: true,
            jobNumber: true,
            status: true,
            scheduledDate: true,
          },
        },
      },
    });

    if (!complaint) {
      return NextResponse.json({ error: "Complaint not found" }, { status: 404 });
    }

    return NextResponse.json({
      data: {
        id: complaint.id,
        ticketNumber: complaint.ticketNumber,
        subject: complaint.subject,
        description: complaint.description,
        category: complaint.category,
        priority: enumToUi(complaint.priority),
        status: enumToUi(complaint.status),
        createdAt: toDateTimeString(complaint.createdAt),
        updatedAt: toDateTimeString(complaint.updatedAt),
        resolvedAt: toDateTimeString(complaint.resolvedAt) || undefined,
        slaDeadline: toDateTimeString(complaint.slaDeadline),
        customer: {
          id: complaint.customer.id,
          name: complaint.customer.name,
          address: complaint.customer.address,
          city: complaint.customer.city,
          phone: complaint.customer.phone,
          email: complaint.customer.email,
        },
        asset: complaint.asset
          ? {
              id: complaint.asset.id,
              name: complaint.asset.name,
              model: complaint.asset.model,
              serialNumber: complaint.asset.serialNumber,
              category: complaint.asset.category,
              status: enumToUi(complaint.asset.status),
              location: complaint.asset.location ?? undefined,
              notes: complaint.asset.notes ?? undefined,
            }
          : undefined,
        timeline: complaint.timeline.map((entry) => ({
          id: entry.id,
          date: toDateTimeString(entry.createdAt),
          action: entry.action,
          by: entry.byUser?.name ?? "Customer",
          note: entry.note ?? undefined,
        })),
        linkedJobs: complaint.jobs.map((job) => ({
          id: job.id,
          jobNumber: job.jobNumber,
          status: enumToUi(job.status),
          scheduledDate: toDateString(job.scheduledDate),
        })),
      },
    });
  } catch (error) {
    console.error("Mobile complaint detail failed", error);
    return NextResponse.json(
      { error: "Unable to load complaint detail." },
      { status: 500 },
    );
  }
}
