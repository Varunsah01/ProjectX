import { compare, hash } from "bcrypt";
import { db } from "@/lib/db";
import { logger } from "@/lib/log";
import { rateLimit } from "@/lib/security/rate-limit";
import { getOTPProvider } from "./index";

const OTP_BCRYPT_COST = 8;
const OTP_TTL_MS = 5 * 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;
const OTP_REQUEST_LIMIT = 3;
const OTP_REQUEST_WINDOW_MS = 10 * 60 * 1000;

export class OtpRateLimitedError extends Error {
  retryAfterSeconds: number;
  constructor(retryAfterSeconds: number) {
    super("Too many OTP requests. Try again shortly.");
    this.name = "OtpRateLimitedError";
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export class OtpVerificationError extends Error {
  reason: "no_challenge" | "expired" | "locked" | "mismatch";
  constructor(reason: "no_challenge" | "expired" | "locked" | "mismatch") {
    super(
      reason === "locked"
        ? "Too many wrong attempts. Request a new code."
        : reason === "expired"
          ? "Code expired. Request a new one."
          : reason === "no_challenge"
            ? "No active code for this phone. Request a new one."
            : "Invalid code.",
    );
    this.name = "OtpVerificationError";
    this.reason = reason;
  }
}

export function normalizePhone(value: string) {
  return value.replace(/\D/g, "").slice(-10);
}

function generateOtpCode() {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return String(buf[0]! % 1_000_000).padStart(6, "0");
}

export async function requestOtp(rawPhone: string) {
  const phone = normalizePhone(rawPhone);

  if (phone.length !== 10) {
    throw new Error("Invalid phone number.");
  }

  const limit = await rateLimit(`otp:request:${phone}`, {
    limit: OTP_REQUEST_LIMIT,
    windowMs: OTP_REQUEST_WINDOW_MS,
  });

  if (!limit.allowed) {
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((limit.resetAt - Date.now()) / 1000),
    );
    throw new OtpRateLimitedError(retryAfterSeconds);
  }

  const code = generateOtpCode();
  const codeHash = await hash(code, OTP_BCRYPT_COST);
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);

  await db.otpChallenge.create({
    data: {
      phone,
      codeHash,
      expiresAt,
    },
  });

  await getOTPProvider().send(phone, code);

  logger.info({ event: "otp.request", phone, expiresAt: expiresAt.toISOString() }, "otp issued");

  return { expiresAt: expiresAt.toISOString() };
}

export async function verifyOtp(rawPhone: string, code: string) {
  const phone = normalizePhone(rawPhone);
  const trimmedCode = code.trim();

  if (phone.length !== 10) {
    throw new OtpVerificationError("no_challenge");
  }

  if (!/^\d{6}$/.test(trimmedCode)) {
    throw new OtpVerificationError("mismatch");
  }

  const challenge = await db.otpChallenge.findFirst({
    where: { phone },
    orderBy: { createdAt: "desc" },
  });

  if (!challenge) {
    throw new OtpVerificationError("no_challenge");
  }

  if (challenge.expiresAt.getTime() <= Date.now()) {
    throw new OtpVerificationError("expired");
  }

  if (challenge.attempts >= OTP_MAX_ATTEMPTS) {
    throw new OtpVerificationError("locked");
  }

  const matches = await compare(trimmedCode, challenge.codeHash);

  if (!matches) {
    await db.otpChallenge.update({
      where: { id: challenge.id },
      data: { attempts: { increment: 1 } },
    });
    const updatedAttempts = challenge.attempts + 1;
    if (updatedAttempts >= OTP_MAX_ATTEMPTS) {
      throw new OtpVerificationError("locked");
    }
    throw new OtpVerificationError("mismatch");
  }

  await db.otpChallenge.deleteMany({
    where: { phone },
  });

  logger.info({ event: "otp.verify.success", phone }, "otp verified");

  return { phone };
}
