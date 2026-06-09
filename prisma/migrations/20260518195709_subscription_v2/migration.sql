-- Subscription v2 migration
-- Replaces UserSubscription (state machine) with UserSubscriptionBalance (pool/queue)
-- Adds feature flags and yearly billing to SubscriptionPlan

-- Step 1: Create new enums
CREATE TYPE "SubscriptionPeriodType" AS ENUM ('MONTHLY', 'YEARLY');
CREATE TYPE "SubscriptionBalanceStatus" AS ENUM ('ACTIVE', 'PAUSED', 'QUEUED', 'EXPIRED');

-- Step 2: Add new columns to SubscriptionPlan (nullable first for migration)
ALTER TABLE "SubscriptionPlan"
  ADD COLUMN "priceYearly"      DECIMAL(10,2),
  ADD COLUMN "hasAnalytics"     BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "hasTemplates"     BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "hasRecipients"    BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "hasSupport"       BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "autoRenewDefault" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "isPublic"         BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "isPersonal"       BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "targetUserId"     INTEGER;

-- Step 3: Add temporary integer level column
ALTER TABLE "SubscriptionPlan" ADD COLUMN "level_int" INTEGER;

-- Step 4: Populate the integer level from the enum
UPDATE "SubscriptionPlan" SET "level_int" = CASE
  WHEN "level"::text = 'FREE'     THEN 0
  WHEN "level"::text = 'PRO'      THEN 1
  WHEN "level"::text = 'BUSINESS' THEN 2
  ELSE 0
END;

-- Step 5: Set level_int NOT NULL
ALTER TABLE "SubscriptionPlan" ALTER COLUMN "level_int" SET NOT NULL;

-- Step 6: Drop the old level column (enum type) and rename level_int
ALTER TABLE "SubscriptionPlan" DROP COLUMN "level";
ALTER TABLE "SubscriptionPlan" RENAME COLUMN "level_int" TO "level";

-- Step 7: Drop old description column
ALTER TABLE "SubscriptionPlan" DROP COLUMN IF EXISTS "description";

-- Step 8: Add targetUser foreign key
ALTER TABLE "SubscriptionPlan"
  ADD CONSTRAINT "SubscriptionPlan_targetUserId_fkey"
  FOREIGN KEY ("targetUserId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Step 9: Create UserSubscriptionBalance table
CREATE TABLE "UserSubscriptionBalance" (
  "id"                SERIAL PRIMARY KEY,
  "userId"            INTEGER NOT NULL,
  "planId"            INTEGER NOT NULL,
  "periodType"        "SubscriptionPeriodType" NOT NULL DEFAULT 'MONTHLY',
  "daysTotal"         INTEGER NOT NULL,
  "periodEnd"         TIMESTAMP(3),
  "pausedAt"          TIMESTAMP(3),
  "status"            "SubscriptionBalanceStatus" NOT NULL DEFAULT 'ACTIVE',
  "autoRenew"         BOOLEAN NOT NULL DEFAULT true,
  "position"          INTEGER NOT NULL DEFAULT 0,
  "scheduledSwitchTo" INTEGER,
  "scheduledSwitchAt" TIMESTAMP(3),
  "customAmount"      DECIMAL(10,2),
  "discountType"      "DiscountType",
  "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserSubscriptionBalance_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "UserSubscriptionBalance_planId_fkey"
    FOREIGN KEY ("planId") REFERENCES "SubscriptionPlan"("id") ON UPDATE CASCADE
);

CREATE INDEX "UserSubscriptionBalance_userId_status_idx"
  ON "UserSubscriptionBalance"("userId", "status");

-- Step 10: Migrate existing UserSubscription data to UserSubscriptionBalance
INSERT INTO "UserSubscriptionBalance" (
  "userId", "planId", "periodType", "daysTotal", "periodEnd",
  "status", "autoRenew", "position", "createdAt", "updatedAt",
  "customAmount", "discountType"
)
SELECT
  us."userId",
  us."planId",
  'MONTHLY'::"SubscriptionPeriodType",
  30,
  us."currentPeriodEnd",
  CASE
    WHEN us."status"::text IN ('ACTIVE', 'PENDING_UPGRADE', 'PENDING_DOWNGRADE') THEN 'ACTIVE'::"SubscriptionBalanceStatus"
    WHEN us."status"::text = 'CANCELLED' THEN 'ACTIVE'::"SubscriptionBalanceStatus"
    ELSE 'EXPIRED'::"SubscriptionBalanceStatus"
  END,
  CASE WHEN us."status"::text = 'CANCELLED' THEN false ELSE true END,
  0,
  us."createdAt",
  us."updatedAt",
  us."customAmount",
  us."discountType"
FROM "UserSubscription" us;

-- Step 11: Add balanceId and periodType columns to BillingHistory
ALTER TABLE "BillingHistory"
  ADD COLUMN "balanceId"  INTEGER,
  ADD COLUMN "periodType" "SubscriptionPeriodType" NOT NULL DEFAULT 'MONTHLY';

-- Step 12: Populate balanceId in BillingHistory by matching userId (best-effort for existing records)
UPDATE "BillingHistory" bh
SET "balanceId" = usb."id"
FROM "UserSubscriptionBalance" usb
WHERE bh."userId" = usb."userId"
  AND bh."balanceId" IS NULL;

-- Step 13: Set balanceId NOT NULL (only if all rows have been populated)
-- If there are orphaned billing records, they will be deleted first
DELETE FROM "BillingHistory" WHERE "balanceId" IS NULL;
ALTER TABLE "BillingHistory" ALTER COLUMN "balanceId" SET NOT NULL;

-- Step 14: Add balanceId foreign key to BillingHistory
ALTER TABLE "BillingHistory"
  ADD CONSTRAINT "BillingHistory_balanceId_fkey"
  FOREIGN KEY ("balanceId") REFERENCES "UserSubscriptionBalance"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Step 15: Drop old SubscriptionPlan relations (handled by dropping UserSubscription)
-- Drop UserSubscription table
DROP TABLE "UserSubscription";

-- Step 16: Drop old enums
DROP TYPE "SubscriptionLevel";
DROP TYPE "SubscriptionStatus";
