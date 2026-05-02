import { NextResponse } from "next/server";
import { requirePortalAuth } from "@/lib/portal-auth";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/security/rate-limit";

export const runtime = "nodejs";

export async function GET() {
  try {
    const session = await requirePortalAuth();
    const { customerId, organizationId } = session.user;

    const rl = await rateLimit(`portal:assets:${customerId}`, { limit: 30, windowMs: 60_000 });
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const assets = await db.asset.findMany({
      where: { customerId, organizationId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ success: true, data: assets });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Failed to fetch assets", error);
    return NextResponse.json(
      { error: "Failed to fetch assets" },
      { status: 500 },
    );
  }
}
