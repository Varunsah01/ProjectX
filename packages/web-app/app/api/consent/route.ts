import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-utils";
import { grantConsent, withdrawConsent, getConsentsForPrincipal } from "@/lib/compliance/consent";
import { grantWithdrawConsentSchema } from "@/lib/validations/consent";
import { db } from "@/lib/db";
import { buildAuditLog } from "@/lib/audit/log";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user?.organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const consents = await getConsentsForPrincipal(
      user.organizationId,
      user.id,
      "USER"
    );

    return NextResponse.json({ consents });
  } catch {
    return NextResponse.json({ error: "Failed to fetch consents" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user?.organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = grantWithdrawConsentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const { purpose, action } = parsed.data;

    if (action === "grant") {
      await grantConsent(
        user.organizationId,
        user.id,
        "USER",
        purpose,
        "Self-service consent via web application"
      );
    } else {
      await withdrawConsent(user.organizationId, user.id, "USER", purpose);
    }

    await db.auditLog.create({
      data: buildAuditLog({
        actor: user,
        action: action === "grant" ? "CONSENT_GRANT" : "CONSENT_WITHDRAW",
        entity: "Consent",
        entityId: user.id,
        after: { purpose, dataPrincipalType: "USER" },
      }),
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to update consent" }, { status: 500 });
  }
}
