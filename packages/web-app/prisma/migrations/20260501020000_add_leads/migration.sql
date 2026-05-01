-- Persisted demo-request leads from the landing site.

CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'CONTACTED', 'QUALIFIED', 'CLOSED');

CREATE TABLE "leads" (
  "id"         UUID         NOT NULL DEFAULT gen_random_uuid(),
  "name"       TEXT         NOT NULL,
  "email"      TEXT         NOT NULL,
  "phone"      TEXT         NOT NULL,
  "company"    TEXT         NOT NULL,
  "message"    TEXT,
  "source"     TEXT         NOT NULL DEFAULT 'book-demo',
  "status"     "LeadStatus" NOT NULL DEFAULT 'NEW',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "leads_status_created_at_idx"
  ON "leads" ("status", "created_at" DESC);
