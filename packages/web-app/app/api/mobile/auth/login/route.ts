import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticateTechnician, createMobileSession } from "@/lib/mobile/auth";
import { parseJsonBody } from "@/lib/security/api";

export const dynamic = "force-dynamic";

const loginSchema = z.object({
  identifierType: z.enum(["phone", "employee_id"]),
  identifier: z.string().trim().min(1, "Identifier is required"),
  authMethod: z.enum(["password"]),
  secret: z.string().trim().min(1, "Password or OTP is required"),
});

export async function POST(request: Request) {
  try {
    const body = await parseJsonBody(request, loginSchema);
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

    const token = await createMobileSession(user.id);

    return NextResponse.json({
      token,
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
