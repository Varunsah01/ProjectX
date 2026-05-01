import { NextResponse } from "next/server";
import { ticketDetailsInclude } from "@/lib/data-mappers";
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

    const job = await db.job.findFirst({
      where: {
        id,
        organizationId: session.user.organizationId,
        technicianId: session.user.id,
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
        ticket: {
          include: ticketDetailsInclude,
        },
      },
    });

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    return NextResponse.json({
      data: {
        id: job.id,
        jobNumber: job.jobNumber,
        type: enumToUi(job.type),
        status: enumToUi(job.status),
        scheduledDate: toDateString(job.scheduledDate),
        completedAt: toDateTimeString(job.completedAt) || undefined,
        notes: job.notes ?? undefined,
        serviceReport: job.serviceReport ?? undefined,
        customer: {
          id: job.customer.id,
          name: job.customer.name,
          address: job.customer.address,
          city: job.customer.city,
          phone: job.customer.phone,
          email: job.customer.email,
        },
        asset: job.asset
          ? {
              id: job.asset.id,
              name: job.asset.name,
              model: job.asset.model,
              serialNumber: job.asset.serialNumber,
              category: job.asset.category,
              status: enumToUi(job.asset.status),
              location: job.asset.location ?? undefined,
              notes: job.asset.notes ?? undefined,
            }
          : undefined,
        complaint: job.ticket
          ? {
              id: job.ticket.id,
              ticketNumber: job.ticket.ticketNumber,
              subject: job.ticket.subject,
              description: job.ticket.description,
              category: job.ticket.category,
              priority: enumToUi(job.ticket.priority),
              status: enumToUi(job.ticket.status),
            }
          : undefined,
      },
    });
  } catch (error) {
    console.error("Mobile job detail failed", error);
    return NextResponse.json(
      { error: "Unable to load job detail." },
      { status: 500 },
    );
  }
}
