import { hash } from "bcrypt";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      token?: string;
      name?: string;
      password?: string;
    };

    const token = body.token?.trim();
    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

    // Validate invitation
    const invitation = await db.orgInvitation.findUnique({
      where: { token },
      include: {
        organization: { select: { name: true } },
      },
    });

    if (!invitation) {
      return NextResponse.json({ error: "Invalid invitation" }, { status: 404 });
    }

    if (invitation.acceptedAt) {
      return NextResponse.json(
        { error: "This invitation has already been accepted" },
        { status: 400 },
      );
    }

    if (invitation.expiresAt < new Date()) {
      return NextResponse.json(
        { error: "This invitation has expired" },
        { status: 400 },
      );
    }

    // Check if the user already exists
    const existingUser = await db.user.findUnique({
      where: { email: invitation.email },
      select: { id: true },
    });

    if (existingUser) {
      // Existing user: check if they already have a membership
      const existingMembership = await db.orgMembership.findUnique({
        where: {
          userId_organizationId: {
            userId: existingUser.id,
            organizationId: invitation.organizationId,
          },
        },
      });

      if (existingMembership) {
        // Mark invitation as accepted
        await db.orgInvitation.update({
          where: { id: invitation.id },
          data: { acceptedAt: new Date() },
        });

        return NextResponse.json({ success: true, action: "already_member" });
      }

      // Create membership for existing user
      await db.$transaction([
        db.orgMembership.create({
          data: {
            userId: existingUser.id,
            organizationId: invitation.organizationId,
            role: invitation.role,
          },
        }),
        db.orgInvitation.update({
          where: { id: invitation.id },
          data: { acceptedAt: new Date() },
        }),
      ]);

      return NextResponse.json({ success: true, action: "membership_created" });
    }

    // New user: require name and password
    const name = body.name?.trim();
    const password = body.password;

    if (!name || !password) {
      return NextResponse.json(
        { error: "Name and password are required for new accounts" },
        { status: 400 },
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 },
      );
    }

    const passwordHash = await hash(password, 10);

    await db.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          organizationId: invitation.organizationId,
          name,
          email: invitation.email,
          passwordHash,
          role: invitation.role,
          status: "ACTIVE",
        },
      });

      await tx.orgMembership.create({
        data: {
          userId: user.id,
          organizationId: invitation.organizationId,
          role: invitation.role,
        },
      });

      await tx.orgInvitation.update({
        where: { id: invitation.id },
        data: { acceptedAt: new Date() },
      });
    });

    return NextResponse.json({ success: true, action: "user_created" });
  } catch (error) {
    console.error("Failed to accept invitation", error);
    return NextResponse.json(
      { error: "Failed to accept invitation" },
      { status: 500 },
    );
  }
}

// GET: validate token and return invitation details
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

    const invitation = await db.orgInvitation.findUnique({
      where: { token },
      select: {
        email: true,
        role: true,
        acceptedAt: true,
        expiresAt: true,
        organization: { select: { name: true } },
      },
    });

    if (!invitation) {
      return NextResponse.json({ error: "Invalid invitation" }, { status: 404 });
    }

    if (invitation.acceptedAt) {
      return NextResponse.json(
        { error: "This invitation has already been accepted" },
        { status: 400 },
      );
    }

    if (invitation.expiresAt < new Date()) {
      return NextResponse.json(
        { error: "This invitation has expired" },
        { status: 400 },
      );
    }

    // Check if user already exists
    const existingUser = await db.user.findUnique({
      where: { email: invitation.email },
      select: { id: true },
    });

    return NextResponse.json({
      success: true,
      data: {
        email: invitation.email,
        role: invitation.role,
        orgName: invitation.organization.name,
        userExists: !!existingUser,
      },
    });
  } catch (error) {
    console.error("Failed to validate invitation", error);
    return NextResponse.json(
      { error: "Failed to validate invitation" },
      { status: 500 },
    );
  }
}
