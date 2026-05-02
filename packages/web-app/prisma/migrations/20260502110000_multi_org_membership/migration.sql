-- CreateTable: org_memberships
CREATE TABLE "org_memberships" (
    "user_id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "role" "UserRole" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "org_memberships_pkey" PRIMARY KEY ("user_id","organization_id")
);

-- CreateTable: org_invitations
CREATE TABLE "org_invitations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" TEXT NOT NULL,
    "organization_id" UUID NOT NULL,
    "role" "UserRole" NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "accepted_at" TIMESTAMP(3),
    "invited_by_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "org_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "org_memberships_organization_id_idx" ON "org_memberships"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "org_invitations_token_key" ON "org_invitations"("token");

-- CreateIndex
CREATE INDEX "org_invitations_email_organization_id_idx" ON "org_invitations"("email", "organization_id");

-- CreateIndex
CREATE INDEX "org_invitations_token_idx" ON "org_invitations"("token");

-- AddForeignKey
ALTER TABLE "org_memberships" ADD CONSTRAINT "org_memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "org_memberships" ADD CONSTRAINT "org_memberships_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "org_invitations" ADD CONSTRAINT "org_invitations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "org_invitations" ADD CONSTRAINT "org_invitations_invited_by_id_fkey" FOREIGN KEY ("invited_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Backfill: create one OrgMembership per existing User
INSERT INTO "org_memberships" ("user_id", "organization_id", "role", "created_at")
SELECT "id", "organization_id", "role", "created_at"
FROM "users"
WHERE "organization_id" IS NOT NULL;

-- Make legacy columns nullable
ALTER TABLE "users" ALTER COLUMN "organization_id" DROP NOT NULL;
ALTER TABLE "users" ALTER COLUMN "role" DROP NOT NULL;
