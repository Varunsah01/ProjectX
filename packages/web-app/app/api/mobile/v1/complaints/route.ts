import { NextResponse } from "next/server";
import { TicketPriority, TicketStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { getMobileSession } from "@/lib/mobile/auth";
import { mapTicket, ticketDetailsInclude } from "@/lib/data-mappers";
import { toEnumValue } from "@/lib/query-utils";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const session = await getMobileSession(request);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = new URL(request.url).searchParams;
    const status = toEnumValue<TicketStatus>(searchParams.get("status") ?? undefined);
    const priority = toEnumValue<TicketPriority>(searchParams.get("priority") ?? undefined);

    const complaints = await db.ticket.findMany({
      where: {
        organizationId: session.user.organizationId,
        assignedToId: session.user.id,
        ...(status ? { status } : {}),
        ...(priority ? { priority } : {}),
      },
      include: ticketDetailsInclude,
      orderBy: [{ createdAt: "desc" }],
      take: 100,
    });

    return NextResponse.json({
      data: complaints.map(mapTicket),
    });
  } catch (error) {
    console.error("Mobile complaints list failed", error);
    return NextResponse.json(
      { error: "Unable to load complaints." },
      { status: 500 },
    );
  }
}
