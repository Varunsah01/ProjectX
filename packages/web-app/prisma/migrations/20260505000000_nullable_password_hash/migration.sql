-- Make password_hash nullable to support OAuth users who have no password
ALTER TABLE "users" ALTER COLUMN "password_hash" DROP NOT NULL;
