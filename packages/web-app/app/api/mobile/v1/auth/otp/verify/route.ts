import { NextResponse } from "next/server";
import { z } from "zod";
import { logger } from "@/lib/log";
import {
  createMobileSession,
  findActiveTechnicianByPhone,
} from "@/lib/mobile/auth";
import {
  OtpVerificationError,
  verifyOtp,
} from "@/lib/otp/service";
import { parseJsonBody } from "@/lib/security/api";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const verifyOtpSchema = z.object({
  phone: z
    .string()
    .trim()
    .min(10, "Phone number is required.")
    .max(15, "Invalid phone number."),
  code: z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code."),
});

export async function POST(request: Request) {
  try {
    const body = await parseJsonBody(request, verifyOtpSchema);

    const { phone } = await verifyOtp(body.phone, body.code);

    const user = await findActiveTechnicianByPhone(phone);

    if (!user) {
      return NextResponse.json(
        { error: "No active operator account for this phone." },
        { status: 401 },
      );
    }

    const { sessionToken, csrfToken } = await createMobileSession(user.id);

    return NextResponse.json({ token: sessionToken, csrfToken, user });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid OTP verification." },
        { status: 400 },
      );
    }

    if (error instanceof OtpVerificationError) {
      const status = error.reason === "locked" ? 429 : 401;
      return NextResponse.json({ error: error.message }, { status });
    }

    logger.error({ event: "otp.verify.error", err: error }, "otp verify failed");
    return NextResponse.json(
      { error: "Unable to verify OTP right now." },
      { status: 500 },
    );
  }
}
