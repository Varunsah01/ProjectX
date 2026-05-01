import * as React from "react";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { generateToken } from "@/lib/auth-tokens";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { getAppUrl } from "@/lib/email-templates/_shared";
import { EmailVerificationEmail } from "@/lib/email-templates/email-verification";
import { renderEmailTemplate } from "@/lib/render-email-template";
import { rateLimit } from "@/lib/security/rate-limit";

export async function POST() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limit: 1 per minute per user
    const result = await rateLimit(`verify-email:${session.user.id}`, {
      limit: 1,
      windowMs: 60_000,
    });

    if (!result.allowed) {
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((result.resetAt - Date.now()) / 1000),
      );
      return NextResponse.json(
        { error: "Please wait before requesting another verification email." },
        {
          status: 429,
          headers: { "Retry-After": String(retryAfterSeconds) },
        },
      );
    }

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, name: true, email: true, emailVerified: true },
    });

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (user.emailVerified) {
      return NextResponse.json({ ok: true, alreadyVerified: true });
    }

    // Soft-expire existing unused tokens
    await db.emailVerificationToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { expiresAt: new Date() },
    });

    const token = await generateToken();

    await db.emailVerificationToken.create({
      data: {
        userId: user.id,
        selector: token.selector,
        tokenHash: token.tokenHash,
        expiresAt: token.expiresAt,
      },
    });

    const verificationUrl = `${getAppUrl()}/api/auth/verify-email?token=${token.raw}`;
    const html = await renderEmailTemplate(
      React.createElement(EmailVerificationEmail, {
        recipientName: user.name,
        verificationUrl,
      }),
    );

    await sendEmail(user.email, "Verify your email address", html);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("send-verification error", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
