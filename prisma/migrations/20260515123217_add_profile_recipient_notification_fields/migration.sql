/*
  Warnings:

  - The `address` column on the `Recipient` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "RecipientType" AS ENUM ('INDIVIDUAL', 'ORGANIZATION');

-- CreateEnum
CREATE TYPE "ShipmentType" AS ENUM ('DOCUMENT', 'PACKAGE', 'BOX', 'CARGO', 'PALLET', 'UNKNOWN');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'POSTAL_CONNECTION';
ALTER TYPE "NotificationType" ADD VALUE 'ACCOUNT';

-- AlterTable
ALTER TABLE "Admin" ADD COLUMN     "avatarUrl" TEXT,
ADD COLUMN     "dateFormat" TEXT NOT NULL DEFAULT 'DD.MM.YYYY',
ADD COLUMN     "language" TEXT NOT NULL DEFAULT 'uk',
ADD COLUMN     "timezone" TEXT NOT NULL DEFAULT 'Europe/Kyiv';

-- AlterTable
ALTER TABLE "Recipient" ADD COLUMN     "companyName" TEXT,
ADD COLUMN     "edrpou" TEXT,
ADD COLUMN     "ownershipForm" TEXT,
ADD COLUMN     "patronymic" TEXT,
ADD COLUMN     "type" "RecipientType" NOT NULL DEFAULT 'INDIVIDUAL',
DROP COLUMN "address",
ADD COLUMN     "address" JSONB;

-- AlterTable
ALTER TABLE "ShipmentTemplate" ADD COLUMN     "description" TEXT,
ADD COLUMN     "shipmentType" "ShipmentType" NOT NULL DEFAULT 'UNKNOWN',
ADD COLUMN     "usageCount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "avatarUrl" TEXT,
ADD COLUMN     "dateFormat" TEXT NOT NULL DEFAULT 'DD.MM.YYYY',
ADD COLUMN     "language" TEXT NOT NULL DEFAULT 'uk',
ADD COLUMN     "notifAccount" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notifEmail" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "notifPostalConnection" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notifSubscription" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notifSystem" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "scheduledDeletionAt" TIMESTAMP(3),
ADD COLUMN     "timezone" TEXT NOT NULL DEFAULT 'Europe/Kyiv';

-- AlterTable
ALTER TABLE "UserProfile" ADD COLUMN     "ownershipForm" TEXT;
