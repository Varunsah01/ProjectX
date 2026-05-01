-- Add S3 proof key storage to jobs and tickets.

ALTER TABLE "jobs"
  ADD COLUMN "proof_keys" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "proof_metadata" JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE "tickets"
  ADD COLUMN "proof_keys" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "proof_metadata" JSONB NOT NULL DEFAULT '[]'::jsonb;
