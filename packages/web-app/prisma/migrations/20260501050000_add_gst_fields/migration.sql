-- 1. Organization: rename gst -> gstin, add state/legal name
ALTER TABLE "organizations" RENAME COLUMN "gst" TO "gstin";
ALTER TABLE "organizations" ADD COLUMN "place_of_business_state" TEXT;
ALTER TABLE "organizations" ADD COLUMN "legal_name" TEXT;

-- 2. Customer: rename gst -> gstin, add billing/shipping state
ALTER TABLE "customers" RENAME COLUMN "gst" TO "gstin";
ALTER TABLE "customers" ADD COLUMN "billing_state" TEXT;
ALTER TABLE "customers" ADD COLUMN "shipping_state" TEXT;

-- 3. Plan: add GST fields (nullable first for backfill)
ALTER TABLE "plans" ADD COLUMN "hsn_sac" TEXT;
ALTER TABLE "plans" ADD COLUMN "gst_rate_percent" DECIMAL(5,2);
ALTER TABLE "plans" ADD COLUMN "gst_applicable" BOOLEAN NOT NULL DEFAULT true;

-- Backfill existing plans with defaults
UPDATE "plans" SET "hsn_sac" = '', "gst_rate_percent" = 18.00 WHERE "hsn_sac" IS NULL;

-- Apply NOT NULL after backfill
ALTER TABLE "plans" ALTER COLUMN "hsn_sac" SET NOT NULL;
ALTER TABLE "plans" ALTER COLUMN "gst_rate_percent" SET NOT NULL;

-- 4. Invoice: add tax breakup fields (all nullable for backward compat)
ALTER TABLE "invoices" ADD COLUMN "place_of_supply" TEXT;
ALTER TABLE "invoices" ADD COLUMN "is_inter_state" BOOLEAN;
ALTER TABLE "invoices" ADD COLUMN "subtotal_amount" INTEGER;
ALTER TABLE "invoices" ADD COLUMN "cgst_amount" INTEGER;
ALTER TABLE "invoices" ADD COLUMN "sgst_amount" INTEGER;
ALTER TABLE "invoices" ADD COLUMN "igst_amount" INTEGER;
ALTER TABLE "invoices" ADD COLUMN "total_tax_amount" INTEGER;

-- 5. InvoiceItem: add tax fields (all nullable for backward compat)
ALTER TABLE "invoice_items" ADD COLUMN "hsn_sac" TEXT;
ALTER TABLE "invoice_items" ADD COLUMN "gst_rate_percent" DECIMAL(5,2);
ALTER TABLE "invoice_items" ADD COLUMN "taxable_amount" INTEGER;
ALTER TABLE "invoice_items" ADD COLUMN "cgst_amount" INTEGER;
ALTER TABLE "invoice_items" ADD COLUMN "sgst_amount" INTEGER;
ALTER TABLE "invoice_items" ADD COLUMN "igst_amount" INTEGER;
