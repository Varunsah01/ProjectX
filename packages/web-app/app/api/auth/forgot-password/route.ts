import * as React from "react";
import { NextResponse } from "next/server";
import { z } from "zod";
import { generateToken } from "@/lib/auth-tokens";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { getAppUrl } from "@/lib/email-templates/_shared";
import { PasswordResetEmail } from "@/lib/email-templates/password-reset";
import { renderEmailTemplate } from "@/lib/render-email-template";
import { rateLimit } from "@/lib/security/rate-limit";

const bodySchema = z.object({
  email: z.string().trim().toLowerCase().email(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = bodySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ ok: true });
    }

    const { email } = parsed.data;

    const requestIp =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      "anonymous";

    // Rate limit: 3/hr per email + 10/hr per IP
    const [emailLimit, ipLimit] = await Promise.all([
      rateLimit(`forgot-pwd:email:${email}`, {
        limit: 3,
        windowMs: 3_600_000,
      }),
      rateLimit(`forgot-pwd:ip:${requestIp}`, {
        limit: 10,
        windowMs: 3_600_000,
      }),
    ]);

    if (!emailLimit.allowed || !ipLimit.allowed) {
      // Still return 200 to avoid leaking information
      return NextResponse.json({ ok: true });
    }

    const user = await db.user.findUnique({
      where: { email },
      select: { id: true, name: true, status: true },
    });

    if (!user || user.status === "INACTIVE" || user.status === "REMOVED") {
      return NextResponse.json({ ok: true });
    }

    // Soft-expire any existing unused tokens for this user
    await db.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { expiresAt: new Date() },
    });

    const token = await generateToken();

    await db.passwordResetToken.create({
      data: {
        userId: user.id,
        selector: token.selector,
        tokenHash: token.tokenHash,
        expiresAt: token.expiresAt,
      },
    });

    const resetUrl = `${getAppUrl()}/reset-password?token=${token.raw}`;
    const html = await renderEmailTemplate(
      React.createElement(PasswordResetEmail, {
        recipientName: user.name,
        resetUrl,
      }),
    );

    await sendEmail(email, "Reset your password", html);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("forgot-password error", error);
    // Still return 200 to avoid leaking information via error states
    return NextResponse.json({ ok: true });
  }
}
