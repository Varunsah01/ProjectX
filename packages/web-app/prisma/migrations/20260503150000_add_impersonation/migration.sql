-- Add SUPPORT to UserRole enum
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'SUPPORT';

-- Add actUserId to audit_logs (nullable, for impersonation context)
ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "act_user_id" UUID;

-- Create impersonation_sessions table
CREATE TABLE IF NOT EXISTS "impersonation_sessions" (
    "id"              UUID NOT NULL DEFAULT gen_random_uuid(),
    "support_user_id" UUID NOT NULL,
    "target_user_id"  UUID NOT NULL,
    "target_org_id"   UUID NOT NULL,
    "reason"          TEXT NOT NULL,
    "started_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at"        TIMESTAMP(3),
    "ip"              TEXT,
    "user_agent"      TEXT,

    CONSTRAINT "impersonation_sessions_pkey" PRIMARY KEY ("id")
);

-- Indexes for impersonation_sessions
CREATE INDEX IF NOT EXISTS "impersonation_sessions_support_user_id_started_at_idx"
    ON "impersonation_sessions"("support_user_id", "started_at");

CREATE INDEX IF NOT EXISTS "impersonation_sessions_target_user_id_idx"
    ON "impersonation_sessions"("target_user_id");

-- FK constraints for impersonation_sessions
ALTER TABLE "impersonation_sessions"
    ADD CONSTRAINT "impersonation_sessions_support_user_id_fkey"
    FOREIGN KEY ("support_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "impersonation_sessions"
    ADD CONSTRAINT "impersonation_sessions_target_user_id_fkey"
    FOREIGN KEY ("target_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- FK constraint for audit_logs.act_user_id
ALTER TABLE "audit_logs"
    ADD CONSTRAINT "audit_logs_act_user_id_fkey"
    FOREIGN KEY ("act_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
