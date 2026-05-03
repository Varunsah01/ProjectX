-- AlterTable
ALTER TABLE "organizations" ADD COLUMN "accountant_email" TEXT;
ALTER TABLE "organizations" ADD COLUMN "export_format" TEXT;
ALTER TABLE "organizations" ADD COLUMN "last_export_sent_at" TIMESTAMPTZ;
