import { NextResponse } from "next/server";
import { getMobileSession } from "@/lib/mobile/auth";
import { grantConsent, withdrawConsent } from "@/lib/compliance/consent";
import { grantWithdrawConsentSchema } from "@/lib/validations/consent";

export async function POST(request: Request) {
  try {
    const session = await getMobileSession(request);
    if (!session) {
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
        session.user.organizationId,
        session.user.id,
        "USER",
        purpose,
        "Technician consent via mobile application"
      );
    } else {
      await withdrawConsent(session.user.organizationId, session.user.id, "USER", purpose);
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to update consent" }, { status: 500 });
  }
}
