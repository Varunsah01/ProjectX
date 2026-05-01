import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticateTechnician, createMobileSession } from "@/lib/mobile/auth";

export const dynamic = "force-dynamic";

const loginSchema = z.object({
  identifierType: z.enum(["phone", "employee_id"]),
  identifier: z.string().trim().min(1, "Identifier is required"),
  authMethod: z.enum(["password"]),
  secret: z.string().trim().min(1, "Password or OTP is required"),
});

export async function POST(request: Request) {
  try {
    const rawBody = await request.json();

    if (
      rawBody &&
      typeof rawBody === "object" &&
      "otpCode" in rawBody &&
      rawBody.otpCode != null
    ) {
      return NextResponse.json(
        {
          error: "OTP login is not available yet. Use your password to sign in.",
        },
        { status: 503 },
      );
    }

    const body = loginSchema.parse(rawBody);
    const user = await authenticateTechnician({
      identifierType: body.identifierType,
      identifier: body.identifier,
      secret: body.secret,
    });

    if (!user) {
      return NextResponse.json(
        { error: "Invalid operator credentials." },
        { status: 401 },
      );
    }

    const { sessionToken, csrfToken } = await createMobileSession(user.id);

    return NextResponse.json({
      token: sessionToken,
      csrfToken,
      user,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid login request." },
        { status: 400 },
      );
    }

    console.error("Mobile login failed", error);
    return NextResponse.json(
      { error: "Unable to sign in right now." },
      { status: 500 },
    );
  }
}
