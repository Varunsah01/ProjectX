import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-utils";
import { UserRole } from "@prisma/client";
import { createBreach } from "@/lib/compliance/breach";
import { createBreachSchema } from "@/lib/validations/breach";
import { db } from "@/lib/db";
import { buildAuditLog } from "@/lib/audit/log";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user?.organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const breaches = await db.breachLog.findMany({
      where: { organizationId: user.organizationId },
      include: {
        createdBy: { select: { id: true, name: true } },
      },
      orderBy: { detectedAt: "desc" },
    });

    return NextResponse.json({ breaches });
  } catch {
    return NextResponse.json({ error: "Failed to fetch breach logs" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user?.organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = createBreachSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const breach = await createBreach(user.organizationId, parsed.data, user.id);

    await db.auditLog.create({
      data: buildAuditLog({
        actor: user,
        action: "BREACH_LOG",
        entity: "BreachLog",
        entityId: breach.id,
        after: { scope: breach.scope, affectedPrincipals: breach.affectedPrincipals },
      }),
    });

    return NextResponse.json({ breach }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create breach log" }, { status: 500 });
  }
}
