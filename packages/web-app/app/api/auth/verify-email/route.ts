import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { splitRawToken, verifyTokenHash } from "@/lib/auth-tokens";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3001";

  try {
    const raw = request.nextUrl.searchParams.get("token") ?? "";

    let selector: string;
    let verifier: string;

    try {
      ({ selector, verifier } = splitRawToken(raw));
    } catch {
      return NextResponse.redirect(
        new URL("/verify-email?error=invalid", appUrl),
      );
    }

    const record = await db.emailVerificationToken.findUnique({
      where: { selector },
      include: { user: { select: { id: true } } },
    });

    if (
      !record ||
      record.usedAt !== null ||
      record.expiresAt <= new Date()
    ) {
      return NextResponse.redirect(
        new URL("/verify-email?error=expired", appUrl),
      );
    }

    const isValid = await verifyTokenHash(verifier, record.tokenHash);

    if (!isValid) {
      return NextResponse.redirect(
        new URL("/verify-email?error=invalid", appUrl),
      );
    }

    await db.$transaction([
      db.emailVerificationToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
      db.user.update({
        where: { id: record.user.id },
        data: { emailVerified: new Date() },
      }),
    ]);

    return NextResponse.redirect(
      new URL("/verify-email?success=true", appUrl),
    );
  } catch (error) {
    console.error("verify-email error", error);
    return NextResponse.redirect(
      new URL("/verify-email?error=invalid", appUrl),
    );
  }
}
