import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-utils";
import { hasPermission } from "@/lib/security/rbac";
import { recordConsentsForCustomer } from "@/lib/compliance/consent";
import { recordConsentSchema } from "@/lib/validations/consent";
import { db } from "@/lib/db";
import { buildAuditLog } from "@/lib/audit/log";

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user?.organizationId || !user.role) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(user.role, "customers:create")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = recordConsentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const { customerId, purposes, legalBasis, evidence } = parsed.data;

    // Verify customer belongs to this organization
    const customer = await db.customer.findFirst({
      where: { id: customerId, organizationId: user.organizationId },
      select: { id: true },
    });

    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    await recordConsentsForCustomer(
      user.organizationId,
      customerId,
      purposes,
      legalBasis,
      evidence ?? {},
      user.id
    );

    await db.auditLog.create({
      data: buildAuditLog({
        actor: user,
        action: "CONSENT_GRANT",
        entity: "Consent",
        entityId: customerId,
        after: { customerId, purposes, legalBasis, dataPrincipalType: "CUSTOMER" },
      }),
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to record consent" }, { status: 500 });
  }
}
