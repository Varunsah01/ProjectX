-- CreateEnum
CREATE TYPE "DataPrincipalType" AS ENUM ('USER', 'CUSTOMER');
CREATE TYPE "ConsentPurpose" AS ENUM ('SERVICE_DELIVERY', 'COMMUNICATION', 'ANALYTICS', 'MARKETING');
CREATE TYPE "ConsentStatus" AS ENUM ('GRANTED', 'WITHDRAWN');
CREATE TYPE "BreachStatus" AS ENUM ('DETECTED', 'REPORTED', 'CLOSED');
CREATE TYPE "DsrType" AS ENUM ('ACCESS', 'CORRECTION', 'ERASURE');
CREATE TYPE "DsrStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'COMPLETED');

-- AlterTable: Add grievance officer fields to organizations
ALTER TABLE "organizations" ADD COLUMN "grievance_officer_name" TEXT;
ALTER TABLE "organizations" ADD COLUMN "grievance_officer_email" TEXT;
ALTER TABLE "organizations" ADD COLUMN "grievance_officer_phone" TEXT;

-- CreateTable: consents
CREATE TABLE "consents" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "data_principal_id" UUID NOT NULL,
    "data_principal_type" "DataPrincipalType" NOT NULL,
    "purpose" "ConsentPurpose" NOT NULL,
    "status" "ConsentStatus" NOT NULL DEFAULT 'WITHDRAWN',
    "granted_at" TIMESTAMP(3),
    "withdrawn_at" TIMESTAMP(3),
    "legal_basis" TEXT NOT NULL,
    "evidence" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "consents_pkey" PRIMARY KEY ("id")
);

-- CreateTable: breach_logs
CREATE TABLE "breach_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "detected_at" TIMESTAMP(3) NOT NULL,
    "scope" TEXT NOT NULL,
    "affected_principals" INTEGER NOT NULL DEFAULT 0,
    "status" "BreachStatus" NOT NULL DEFAULT 'DETECTED',
    "reported_to_board_at" TIMESTAMP(3),
    "reported_to_principals_at" TIMESTAMP(3),
    "notes" TEXT,
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "breach_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable: dsr_requests
CREATE TABLE "dsr_requests" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "data_principal_id" UUID NOT NULL,
    "data_principal_type" "DataPrincipalType" NOT NULL,
    "type" "DsrType" NOT NULL,
    "status" "DsrStatus" NOT NULL DEFAULT 'PENDING',
    "details" JSONB NOT NULL DEFAULT '{}',
    "response_notes" TEXT,
    "processed_by_id" UUID,
    "processed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dsr_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: consents
CREATE UNIQUE INDEX "consents_organization_id_data_principal_id_data_principal_ty_key" ON "consents"("organization_id", "data_principal_id", "data_principal_type", "purpose");
CREATE INDEX "consents_organization_id_data_principal_id_data_principal_t_idx" ON "consents"("organization_id", "data_principal_id", "data_principal_type");
CREATE INDEX "consents_organization_id_status_idx" ON "consents"("organization_id", "status");
CREATE INDEX "consents_created_at_idx" ON "consents"("created_at");

-- CreateIndex: breach_logs
CREATE INDEX "breach_logs_organization_id_status_idx" ON "breach_logs"("organization_id", "status");
CREATE INDEX "breach_logs_organization_id_detected_at_idx" ON "breach_logs"("organization_id", "detected_at" DESC);
CREATE INDEX "breach_logs_created_at_idx" ON "breach_logs"("created_at");

-- CreateIndex: dsr_requests
CREATE INDEX "dsr_requests_organization_id_status_idx" ON "dsr_requests"("organization_id", "status");
CREATE INDEX "dsr_requests_organization_id_data_principal_id_data_princip_idx" ON "dsr_requests"("organization_id", "data_principal_id", "data_principal_type");
CREATE INDEX "dsr_requests_created_at_idx" ON "dsr_requests"("created_at");

-- AddForeignKey
ALTER TABLE "consents" ADD CONSTRAINT "consents_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "breach_logs" ADD CONSTRAINT "breach_logs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "breach_logs" ADD CONSTRAINT "breach_logs_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "dsr_requests" ADD CONSTRAINT "dsr_requests_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "dsr_requests" ADD CONSTRAINT "dsr_requests_processed_by_id_fkey" FOREIGN KEY ("processed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
