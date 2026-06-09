-- Admin model refactor: replace AdminRole enum with isSuperAdmin boolean,
-- make firstName/lastName nullable, add PENDING status, refactor AdminInvite

-- Step 1: Add PENDING to AdminStatus enum
ALTER TYPE "AdminStatus" ADD VALUE IF NOT EXISTS 'PENDING';

-- Step 2: Add isSuperAdmin column (nullable initially for data migration)
ALTER TABLE "Admin" ADD COLUMN "isSuperAdmin" BOOLEAN;

-- Step 3: Migrate role data to isSuperAdmin
UPDATE "Admin" SET "isSuperAdmin" = CASE
  WHEN "role"::text = 'SUPER_ADMIN' THEN true
  ELSE false
END;

-- Step 4: Set isSuperAdmin NOT NULL with default
ALTER TABLE "Admin" ALTER COLUMN "isSuperAdmin" SET NOT NULL;
ALTER TABLE "Admin" ALTER COLUMN "isSuperAdmin" SET DEFAULT false;

-- Step 5: Make firstName and lastName nullable
ALTER TABLE "Admin" ALTER COLUMN "firstName" DROP NOT NULL;
ALTER TABLE "Admin" ALTER COLUMN "lastName" DROP NOT NULL;

-- Step 6: Change status default from INACTIVE to PENDING
ALTER TABLE "Admin" ALTER COLUMN "status" SET DEFAULT 'PENDING';

-- Step 7: Drop role column
ALTER TABLE "Admin" DROP COLUMN "role";

-- Step 8: Drop AdminRole enum
DROP TYPE "AdminRole";

-- Step 9: Refactor AdminInvite — add adminId, drop email
ALTER TABLE "AdminInvite" ADD COLUMN "adminId" INTEGER;

-- Step 10: Attempt to match existing invites to admin by email (best-effort)
UPDATE "AdminInvite" ai
SET "adminId" = a."id"
FROM "Admin" a
WHERE ai."email"::text = a."email"::text
  AND ai."adminId" IS NULL;

-- Step 11: Delete any unmatched invites (orphaned rows with no admin)
DELETE FROM "AdminInvite" WHERE "adminId" IS NULL;

-- Step 12: Set adminId NOT NULL
ALTER TABLE "AdminInvite" ALTER COLUMN "adminId" SET NOT NULL;

-- Step 13: Add FK constraint
ALTER TABLE "AdminInvite"
  ADD CONSTRAINT "AdminInvite_adminId_fkey"
  FOREIGN KEY ("adminId") REFERENCES "Admin"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 14: Drop old email index and column
DROP INDEX IF EXISTS "AdminInvite_email_idx";
ALTER TABLE "AdminInvite" DROP COLUMN IF EXISTS "email";

-- Step 15: Add index on token (if not exists)
CREATE INDEX IF NOT EXISTS "AdminInvite_token_idx" ON "AdminInvite"("token");
