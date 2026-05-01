-- Add branding and invoice configuration fields to organizations
ALTER TABLE "organizations" ADD COLUMN "signature_url" TEXT;
ALTER TABLE "organizations" ADD COLUMN "pan" TEXT;
ALTER TABLE "organizations" ADD COLUMN "bank_name" TEXT;
ALTER TABLE "organizations" ADD COLUMN "bank_account_number" TEXT;
ALTER TABLE "organizations" ADD COLUMN "bank_ifsc" TEXT;
ALTER TABLE "organizations" ADD COLUMN "bank_branch" TEXT;
ALTER TABLE "organizations" ADD COLUMN "upi_id" TEXT;
ALTER TABLE "organizations" ADD COLUMN "invoice_terms" TEXT;
