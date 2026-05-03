import { hash } from "bcrypt";
import { NextResponse } from "next/server";
import { z } from "zod";
import { splitRawToken, verifyTokenHash } from "@/lib/auth-tokens";
import { db } from "@/lib/db";
import { verifyImpersonationToken } from "@/lib/security/impersonation";

const bodySchema = z.object({
  token: z
    .string()
    .length(64)
    .regex(/^[0-9a-f]+$/),
  password: z.string().min(8),
});

export async function POST(request: Request) {
  try {
    // Block password resets during impersonation
    const cookieHeader = request.headers.get("cookie") ?? "";
    const impMatch = cookieHeader.match(/(?:^|;\s*)__impersonate=([^;]+)/);
    if (impMatch?.[1]) {
      const imp = await verifyImpersonationToken(impMatch[1]);
      if (imp) {
        return NextResponse.json(
          { error: "Password reset is not permitted during impersonation" },
          { status: 403 },
        );
      }
    }

    const body = await request.json();
    const parsed = bodySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "This reset link is invalid or has expired." },
        { status: 400 },
      );
    }

    const { token, password } = parsed.data;

    let selector: string;
    let verifier: string;

    try {
      ({ selector, verifier } = splitRawToken(token));
    } catch {
      return NextResponse.json(
        { error: "This reset link is invalid or has expired." },
        { status: 400 },
      );
    }

    const record = await db.passwordResetToken.findUnique({
      where: { selector },
      include: { user: { select: { id: true, status: true } } },
    });

    if (
      !record ||
      record.usedAt !== null ||
      record.expiresAt <= new Date() ||
      record.user.status === "INACTIVE" ||
      record.user.status === "REMOVED"
    ) {
      return NextResponse.json(
        { error: "This reset link is invalid or has expired." },
        { status: 400 },
      );
    }

    const isValid = await verifyTokenHash(verifier, record.tokenHash);

    if (!isValid) {
      return NextResponse.json(
        { error: "This reset link is invalid or has expired." },
        { status: 400 },
      );
    }

    const passwordHash = await hash(password, 10);

    await db.$transaction([
      db.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
      db.user.update({
        where: { id: record.user.id },
        data: { passwordHash, tokenVersion: { increment: 1 } },
      }),
      db.session.deleteMany({ where: { userId: record.user.id } }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("reset-password error", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
