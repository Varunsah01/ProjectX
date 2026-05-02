import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePortalAuth } from "@/lib/portal-auth";
import { db } from "@/lib/db";
import { getNextTicketNumber, getSlaDeadline } from "@/lib/ticket-helpers";
import { rateLimit } from "@/lib/security/rate-limit";

export const runtime = "nodejs";

const createTicketSchema = z.object({
  subject: z.string().trim().min(1, "Subject is required").max(200),
  description: z.string().trim().min(1, "Description is required").max(2000),
  category: z.enum([
    "Service Request",
    "Complaint",
    "Billing Query",
    "Renewal Request",
    "Other",
  ]),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  assetId: z
    .string()
    .uuid()
    .optional()
    .or(z.literal("")),
});

export async function POST(request: Request) {
  try {
    const session = await requirePortalAuth();
    const { customerId, organizationId } = session.user;

    const rl = await rateLimit(`portal:ticket:${customerId}`, { limit: 10, windowMs: 60_000 });
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const body = createTicketSchema.parse(await request.json());

    const ticketNumber = await getNextTicketNumber(organizationId);
    const slaDeadline = getSlaDeadline(body.priority);

    // Validate assetId belongs to customer if provided
    if (body.assetId) {
      const asset = await db.asset.findFirst({
        where: {
          id: body.assetId,
          customerId,
          organizationId,
        },
        select: { id: true },
      });
      if (!asset) {
        return NextResponse.json(
          { error: "Asset not found" },
          { status: 400 },
        );
      }
    }

    const ticket = await db.ticket.create({
      data: {
        organizationId,
        customerId,
        ticketNumber,
        subject: body.subject,
        description: body.description,
        category: body.category,
        priority: body.priority.toUpperCase() as "LOW" | "MEDIUM" | "HIGH",
        status: "OPEN",
        slaDeadline,
        assetId: body.assetId || undefined,
        timeline: {
          create: {
            organizationId,
            action: "Ticket created via Customer Portal",
            note: body.description,
            byUserId: null,
          },
        },
      },
      select: {
        id: true,
        ticketNumber: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: ticket,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid ticket data" },
        { status: 400 },
      );
    }

    console.error("Failed to create ticket", error);
    return NextResponse.json(
      { error: "Failed to create ticket" },
      { status: 500 },
    );
  }
}
