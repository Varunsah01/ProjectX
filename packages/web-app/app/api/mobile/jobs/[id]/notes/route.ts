import { NextResponse } from "next/server";
import { z } from "zod";
import { ticketDetailsInclude } from "@/lib/data-mappers";
import { db } from "@/lib/db";
import { getMobileSession } from "@/lib/mobile/auth";
import { cleanOptional } from "@/lib/actions/helpers";
import { enumToUi, toDateString, toDateTimeString } from "@/lib/query-utils";
import { parseJsonBody } from "@/lib/security/api";

export const dynamic = "force-dynamic";

const updateJobNotesSchema = z.object({
  serviceReport: z.string().trim().optional().or(z.literal("")),
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
    const body = await parseJsonBody(request, updateJobNotesSchema);

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

    const updatedJob = await db.job.update({
      where: { id: job.id },
      data: {
        serviceReport: cleanOptional(body.serviceReport),
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

    return NextResponse.json({
      data: {
        id: updatedJob.id,
        jobNumber: updatedJob.jobNumber,
        type: enumToUi(updatedJob.type),
        status: enumToUi(updatedJob.status),
        scheduledDate: toDateString(updatedJob.scheduledDate),
        completedAt: toDateTimeString(updatedJob.completedAt) || undefined,
        notes: updatedJob.notes ?? undefined,
        serviceReport: updatedJob.serviceReport ?? undefined,
        customer: {
          id: updatedJob.customer.id,
          name: updatedJob.customer.name,
          address: updatedJob.customer.address,
          city: updatedJob.customer.city,
          phone: updatedJob.customer.phone,
          email: updatedJob.customer.email,
        },
        asset: updatedJob.asset
          ? {
              id: updatedJob.asset.id,
              name: updatedJob.asset.name,
              model: updatedJob.asset.model,
              serialNumber: updatedJob.asset.serialNumber,
              category: updatedJob.asset.category,
              status: enumToUi(updatedJob.asset.status),
              location: updatedJob.asset.location ?? undefined,
              notes: updatedJob.asset.notes ?? undefined,
            }
          : undefined,
        complaint: updatedJob.ticket
          ? {
              id: updatedJob.ticket.id,
              ticketNumber: updatedJob.ticket.ticketNumber,
              subject: updatedJob.ticket.subject,
              description: updatedJob.ticket.description,
              category: updatedJob.ticket.category,
              priority: enumToUi(updatedJob.ticket.priority),
              status: enumToUi(updatedJob.ticket.status),
            }
          : undefined,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid notes update request." },
        { status: 400 },
      );
    }

    console.error("Mobile job notes update failed", error);
    return NextResponse.json(
      { error: "Unable to save job notes." },
      { status: 500 },
    );
  }
}
