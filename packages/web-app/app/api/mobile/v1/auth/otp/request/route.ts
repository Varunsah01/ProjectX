import { NextResponse } from "next/server";
import { z } from "zod";
import { logger } from "@/lib/log";
import {
  OtpRateLimitedError,
  requestOtp,
} from "@/lib/otp/service";
import { OTPProviderError } from "@/lib/otp/provider";
import { parseJsonBody } from "@/lib/security/api";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const requestOtpSchema = z.object({
  phone: z
    .string()
    .trim()
    .min(10, "Phone number is required.")
    .max(15, "Invalid phone number."),
});

export async function POST(request: Request) {
  try {
    const body = await parseJsonBody(request, requestOtpSchema);
    const result = await requestOtp(body.phone);
    return NextResponse.json({ ok: true, expiresAt: result.expiresAt });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid OTP request." },
        { status: 400 },
      );
    }

    if (error instanceof OtpRateLimitedError) {
      const response = NextResponse.json(
        { error: error.message },
        { status: 429 },
      );
      response.headers.set("Retry-After", String(error.retryAfterSeconds));
      return response;
    }

    if (error instanceof OTPProviderError) {
      logger.error({ event: "otp.request.provider-error", err: error });
      return NextResponse.json(
        { error: "OTP service is not available. Try password sign-in." },
        { status: 503 },
      );
    }

    logger.error({ event: "otp.request.error", err: error }, "otp request failed");
    return NextResponse.json(
      { error: "Unable to send OTP right now." },
      { status: 500 },
    );
  }
}
