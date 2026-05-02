import * as React from "react";
import { hash } from "bcrypt";
import { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { generateToken } from "@/lib/auth-tokens";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { getAppUrl } from "@/lib/email-templates/_shared";
import { EmailVerificationEmail } from "@/lib/email-templates/email-verification";
import { notifyWelcomeUser } from "@/lib/notifications";
import { renderEmailTemplate } from "@/lib/render-email-template";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      name?: string;
      email?: string;
      password?: string;
      organizationName?: string;
    };

    const name = body.name?.trim() ?? "";
    const email = body.email?.trim().toLowerCase() ?? "";
    const password = body.password ?? "";
    const organizationName = body.organizationName?.trim() ?? "";

    if (!name || !email || !password || !organizationName) {
      return NextResponse.json(
        { error: "All fields are required." },
        { status: 400 },
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters long." },
        { status: 400 },
      );
    }

    const existingUser = await db.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 },
      );
    }

    const passwordHash = await hash(password, 10);

    const { userId } = await db.$transaction(async (tx) => {
      const slugBase = slugify(organizationName);
      let slug = slugBase;
      let suffix = 1;

      while (await tx.organization.findUnique({ where: { slug } })) {
        suffix += 1;
        slug = `${slugBase}-${suffix}`;
      }

      const organization = await tx.organization.create({
        data: {
          name: organizationName,
          slug,
          phone: "",
          email,
          address: "",
          city: "",
        },
      });

      const user = await tx.user.create({
        data: {
          organizationId: organization.id,
          name,
          email,
          passwordHash,
          role: UserRole.ADMIN,
          status: "ACTIVE",
          avatar: null,
          image: null,
          emailVerified: null,
        },
      });

      await tx.orgMembership.create({
        data: {
          userId: user.id,
          organizationId: organization.id,
          role: UserRole.ADMIN,
        },
      });

      return { userId: user.id };
    });

    await notifyWelcomeUser(userId);

    // Send email verification (fire-and-forget, don't block registration)
    const verificationToken = await generateToken();
    await db.emailVerificationToken.create({
      data: {
        userId,
        selector: verificationToken.selector,
        tokenHash: verificationToken.tokenHash,
        expiresAt: verificationToken.expiresAt,
      },
    });

    const verificationUrl = `${getAppUrl()}/api/auth/verify-email?token=${verificationToken.raw}`;
    sendEmail(
      email,
      "Verify your email address",
      await renderEmailTemplate(
        React.createElement(EmailVerificationEmail, {
          recipientName: name,
          verificationUrl,
        }),
      ),
    ).catch((err) => console.error("Failed to send verification email", err));

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Registration error", error);

    return NextResponse.json(
      { error: "Unable to create your account right now." },
      { status: 500 },
    );
  }
}

function slugify(value: string) {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "organization";
}
