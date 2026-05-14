/*
  Warnings:

  - You are about to drop the column `isActive` on the `UserPostalConnection` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "PostalConnectionStatus" AS ENUM ('ACTIVE', 'BLOCKED', 'INVALID');

-- AlterTable
ALTER TABLE "UserPostalConnection" DROP COLUMN "isActive",
ADD COLUMN     "status" "PostalConnectionStatus" NOT NULL DEFAULT 'ACTIVE';
