import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-utils";
import { UserRole } from "@prisma/client";
import { DATA_FLOWS } from "@/lib/compliance/data-flows";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user?.organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ dataFlows: DATA_FLOWS });
  } catch {
    return NextResponse.json({ error: "Failed to fetch data flows" }, { status: 500 });
  }
}
