import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const email = session.user.email?.trim().toLowerCase() ?? "";
  if (!email) {
    return NextResponse.json({ invitation: null });
  }

  const invitation = await db.orgInvitation.findFirst({
    where: {
      email,
      acceptedAt: null,
      expiresAt:  { gt: new Date() },
    },
    include: {
      organization: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!invitation) {
    return NextResponse.json({ invitation: null });
  }

  return NextResponse.json({
    invitation: {
      id:      invitation.id,
      orgName: invitation.organization.name,
      role:    invitation.role,
      token:   invitation.token,
    },
  });
}
