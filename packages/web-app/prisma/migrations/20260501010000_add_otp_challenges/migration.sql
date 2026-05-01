-- Phone OTP challenge store for mobile login.

CREATE TABLE "otp_challenges" (
  "id"         UUID         NOT NULL DEFAULT gen_random_uuid(),
  "phone"      TEXT         NOT NULL,
  "code_hash"  TEXT         NOT NULL,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "attempts"   INTEGER      NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "otp_challenges_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "otp_challenges_phone_expires_at_key"
  ON "otp_challenges" ("phone", "expires_at");

CREATE INDEX "otp_challenges_phone_created_at_idx"
  ON "otp_challenges" ("phone", "created_at" DESC);
