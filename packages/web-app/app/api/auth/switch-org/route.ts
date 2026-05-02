import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as { organizationId?: string };
    const targetOrgId = body.organizationId?.trim();

    if (!targetOrgId) {
      return NextResponse.json(
        { error: "organizationId is required" },
        { status: 400 },
      );
    }

    // Verify the user has a membership in the target org
    const membership = await db.orgMembership.findUnique({
      where: {
        userId_organizationId: {
          userId: session.user.id,
          organizationId: targetOrgId,
        },
      },
      include: {
        organization: { select: { name: true } },
      },
    });

    if (!membership) {
      return NextResponse.json(
        { error: "You do not have access to this organization" },
        { status: 403 },
      );
    }

    return NextResponse.json({
      success: true,
      activeOrgId: membership.organizationId,
      activeRole: membership.role,
      orgName: membership.organization.name,
    });
  } catch (error) {
    console.error("Failed to switch organization", error);
    return NextResponse.json(
      { error: "Failed to switch organization" },
      { status: 500 },
    );
  }
}
