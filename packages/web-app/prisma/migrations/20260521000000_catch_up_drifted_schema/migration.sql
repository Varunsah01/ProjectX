-- CreateEnum
CREATE TYPE "CronRunStatus" AS ENUM ('RUNNING', 'DONE', 'FAILED');

-- CreateEnum
CREATE TYPE "ContractReminderStage" AS ENUM ('T_30', 'T_7', 'T_1');

-- CreateEnum
CREATE TYPE "InvoiceReminderStage" AS ENUM ('D_3', 'D_7', 'D_15');

-- CreateEnum
CREATE TYPE "PreferredChannel" AS ENUM ('EMAIL', 'SMS', 'WHATSAPP');

-- CreateEnum
CREATE TYPE "MessageStatus" AS ENUM ('QUEUED', 'SENT', 'DELIVERED', 'FAILED');

-- DropForeignKey
ALTER TABLE "ticket_timelines" DROP CONSTRAINT "ticket_timelines_by_user_id_fkey";

-- DropIndex
DROP INDEX "audit_logs_organization_id_idx";

-- DropIndex
DROP INDEX "invoices_customer_id_idx";

-- DropIndex
DROP INDEX "invoices_organization_id_idx";

-- DropIndex
DROP INDEX "jobs_customer_id_idx";

-- DropIndex
DROP INDEX "jobs_organization_id_idx";

-- DropIndex
DROP INDEX "tickets_organization_id_idx";

-- AlterTable
ALTER TABLE "assets" ADD COLUMN     "deleted_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "audit_logs" ADD COLUMN     "ip" TEXT,
ADD COLUMN     "user_agent" TEXT;

-- AlterTable
ALTER TABLE "breach_logs" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "consents" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "contracts" ADD COLUMN     "deleted_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "preferred_channel" "PreferredChannel" NOT NULL DEFAULT 'EMAIL',
ADD COLUMN     "whatsapp_opt_out" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "device_tokens" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "dsr_requests" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "email_verification_tokens" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "impersonation_sessions" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "import_jobs" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "invoices" ADD COLUMN     "deleted_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "jobs" ADD COLUMN     "deleted_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "leads" ADD COLUMN     "company_size" TEXT,
ADD COLUMN     "industry" TEXT,
ADD COLUMN     "preferred_contact" TEXT,
ADD COLUMN     "role" TEXT,
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "phone" DROP NOT NULL;

-- AlterTable
ALTER TABLE "org_invitations" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "organizations" ADD COLUMN     "notification_settings" JSONB DEFAULT '{}',
ALTER COLUMN "last_export_sent_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "otp_challenges" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "password_reset_tokens" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "refunds" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "ticket_timelines" ALTER COLUMN "by_user_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "tickets" ADD COLUMN     "deleted_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "onboarding_dismissed_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "webhook_events" ALTER COLUMN "id" DROP DEFAULT;

-- CreateTable
CREATE TABLE "customer_notes" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cron_runs" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "run_date" DATE NOT NULL,
    "status" "CronRunStatus" NOT NULL DEFAULT 'RUNNING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cron_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contract_reminders" (
    "id" UUID NOT NULL,
    "contract_id" UUID NOT NULL,
    "stage" "ContractReminderStage" NOT NULL,
    "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contract_reminders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_reminders" (
    "id" UUID NOT NULL,
    "invoice_id" UUID NOT NULL,
    "stage" "InvoiceReminderStage" NOT NULL,
    "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoice_reminders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message_logs" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "channel" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "provider_message_id" TEXT,
    "status" "MessageStatus" NOT NULL DEFAULT 'QUEUED',
    "error" TEXT,
    "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "message_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_magic_links" (
    "id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_magic_links_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "customer_notes_organization_id_idx" ON "customer_notes"("organization_id");

-- CreateIndex
CREATE INDEX "customer_notes_customer_id_idx" ON "customer_notes"("customer_id");

-- CreateIndex
CREATE INDEX "customer_notes_created_at_idx" ON "customer_notes"("created_at");

-- CreateIndex
CREATE INDEX "cron_runs_created_at_idx" ON "cron_runs"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "cron_runs_name_run_date_key" ON "cron_runs"("name", "run_date");

-- CreateIndex
CREATE INDEX "contract_reminders_contract_id_idx" ON "contract_reminders"("contract_id");

-- CreateIndex
CREATE UNIQUE INDEX "contract_reminders_contract_id_stage_key" ON "contract_reminders"("contract_id", "stage");

-- CreateIndex
CREATE INDEX "invoice_reminders_invoice_id_idx" ON "invoice_reminders"("invoice_id");

-- CreateIndex
CREATE UNIQUE INDEX "invoice_reminders_invoice_id_stage_key" ON "invoice_reminders"("invoice_id", "stage");

-- CreateIndex
CREATE INDEX "message_logs_customer_id_sent_at_idx" ON "message_logs"("customer_id", "sent_at" DESC);

-- CreateIndex
CREATE INDEX "message_logs_organization_id_sent_at_idx" ON "message_logs"("organization_id", "sent_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "customer_magic_links_token_key" ON "customer_magic_links"("token");

-- CreateIndex
CREATE INDEX "customer_magic_links_customer_id_idx" ON "customer_magic_links"("customer_id");

-- CreateIndex
CREATE INDEX "customer_magic_links_expires_at_idx" ON "customer_magic_links"("expires_at");

-- CreateIndex
CREATE INDEX "assets_organization_id_deleted_at_idx" ON "assets"("organization_id", "deleted_at");

-- CreateIndex
CREATE INDEX "audit_logs_organization_id_entity_entity_id_created_at_idx" ON "audit_logs"("organization_id", "entity", "entity_id", "created_at");

-- CreateIndex
CREATE INDEX "contracts_organization_id_deleted_at_idx" ON "contracts"("organization_id", "deleted_at");

-- CreateIndex
CREATE INDEX "customers_organization_id_deleted_at_idx" ON "customers"("organization_id", "deleted_at");

-- CreateIndex
CREATE INDEX "invoices_organization_id_status_due_date_idx" ON "invoices"("organization_id", "status", "due_date");

-- CreateIndex
CREATE INDEX "invoices_organization_id_customer_id_created_at_idx" ON "invoices"("organization_id", "customer_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "invoices_organization_id_deleted_at_idx" ON "invoices"("organization_id", "deleted_at");

-- CreateIndex
CREATE INDEX "jobs_organization_id_technician_id_status_scheduled_date_idx" ON "jobs"("organization_id", "technician_id", "status", "scheduled_date");

-- CreateIndex
CREATE INDEX "jobs_organization_id_customer_id_created_at_idx" ON "jobs"("organization_id", "customer_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "jobs_organization_id_deleted_at_idx" ON "jobs"("organization_id", "deleted_at");

-- CreateIndex
CREATE INDEX "tickets_organization_id_status_created_at_idx" ON "tickets"("organization_id", "status", "created_at" DESC);

-- CreateIndex
CREATE INDEX "tickets_organization_id_deleted_at_idx" ON "tickets"("organization_id", "deleted_at");

-- AddForeignKey
ALTER TABLE "ticket_timelines" ADD CONSTRAINT "ticket_timelines_by_user_id_fkey" FOREIGN KEY ("by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_notes" ADD CONSTRAINT "customer_notes_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_notes" ADD CONSTRAINT "customer_notes_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_notes" ADD CONSTRAINT "customer_notes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_reminders" ADD CONSTRAINT "contract_reminders_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_reminders" ADD CONSTRAINT "invoice_reminders_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_logs" ADD CONSTRAINT "message_logs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_logs" ADD CONSTRAINT "message_logs_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_magic_links" ADD CONSTRAINT "customer_magic_links_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "consents_organization_id_data_principal_id_data_principal_ty_ke" RENAME TO "consents_organization_id_data_principal_id_data_principal_t_key";

