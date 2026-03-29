import { NextResponse } from "next/server";
import { JobStatus } from "@prisma/client";
import { jobDetailsInclude, mapJob } from "@/lib/data-mappers";
import { db } from "@/lib/db";
import { getMobileSession } from "@/lib/mobile/auth";
import { toEnumValue } from "@/lib/query-utils";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const session = await getMobileSession(request);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = new URL(request.url).searchParams;
    const status = toEnumValue<JobStatus>(searchParams.get("status") ?? undefined);

    const jobs = await db.job.findMany({
      where: {
        organizationId: session.user.organizationId,
        technicianId: session.user.id,
        ...(status ? { status } : {}),
      },
      include: jobDetailsInclude,
      orderBy: [
        { scheduledDate: "asc" },
        { createdAt: "desc" },
      ],
    });

    return NextResponse.json({
      data: jobs.map(mapJob),
    });
  } catch (error) {
    console.error("Mobile jobs list failed", error);
    return NextResponse.json(
      { error: "Unable to load jobs." },
      { status: 500 },
    );
  }
}
