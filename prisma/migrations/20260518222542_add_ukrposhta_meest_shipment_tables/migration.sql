/*
  Warnings:

  - You are about to drop the `Shipment` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Shipment" DROP CONSTRAINT "Shipment_postalServiceId_fkey";

-- DropForeignKey
ALTER TABLE "Shipment" DROP CONSTRAINT "Shipment_userId_fkey";

-- DropForeignKey
ALTER TABLE "UserSubscriptionBalance" DROP CONSTRAINT "UserSubscriptionBalance_planId_fkey";

-- AlterTable
ALTER TABLE "UserSubscriptionBalance" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- DropTable
DROP TABLE "Shipment";

-- CreateTable
CREATE TABLE "UkrposhtaShipment" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "ttn" TEXT NOT NULL,
    "senderName" TEXT NOT NULL,
    "senderPhone" TEXT NOT NULL,
    "recipientName" TEXT NOT NULL,
    "recipientPhone" TEXT NOT NULL,
    "recipientAddress" TEXT NOT NULL,
    "recipientCity" TEXT NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL,
    "declaredValue" DECIMAL(10,2) NOT NULL,
    "description" TEXT,
    "rawStatus" TEXT NOT NULL,
    "normalizedStatus" "ShipmentStatus" NOT NULL DEFAULT 'CREATED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UkrposhtaShipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MeestShipment" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "ttn" TEXT NOT NULL,
    "senderName" TEXT NOT NULL,
    "senderPhone" TEXT NOT NULL,
    "recipientName" TEXT NOT NULL,
    "recipientPhone" TEXT NOT NULL,
    "recipientAddress" TEXT NOT NULL,
    "recipientCity" TEXT NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL,
    "declaredValue" DECIMAL(10,2) NOT NULL,
    "description" TEXT,
    "rawStatus" TEXT NOT NULL,
    "normalizedStatus" "ShipmentStatus" NOT NULL DEFAULT 'CREATED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MeestShipment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UkrposhtaShipment_ttn_key" ON "UkrposhtaShipment"("ttn");

-- CreateIndex
CREATE INDEX "UkrposhtaShipment_userId_idx" ON "UkrposhtaShipment"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "MeestShipment_ttn_key" ON "MeestShipment"("ttn");

-- CreateIndex
CREATE INDEX "MeestShipment_userId_idx" ON "MeestShipment"("userId");

-- AddForeignKey
ALTER TABLE "UserSubscriptionBalance" ADD CONSTRAINT "UserSubscriptionBalance_planId_fkey" FOREIGN KEY ("planId") REFERENCES "SubscriptionPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UkrposhtaShipment" ADD CONSTRAINT "UkrposhtaShipment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeestShipment" ADD CONSTRAINT "MeestShipment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
