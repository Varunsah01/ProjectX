-- CreateEnum
CREATE TYPE "BackupVerificationStatus" AS ENUM ('OK', 'FAIL');

-- CreateTable
CREATE TABLE "backup_verifications" (
    "id" UUID NOT NULL,
    "run_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "branch_name" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "duration_ms" INTEGER NOT NULL,
    "status" "BackupVerificationStatus" NOT NULL,
    "error" TEXT,
    "counts" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "backup_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "backup_verifications_run_at_idx" ON "backup_verifications"("run_at");
