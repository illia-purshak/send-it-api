-- CreateEnum
CREATE TYPE "DiscountType" AS ENUM ('ONE_TIME', 'PERMANENT');

-- AlterTable
ALTER TABLE "UserSubscription" ADD COLUMN     "customAmount" DECIMAL(10,2),
ADD COLUMN     "discountType" "DiscountType";

-- CreateTable
CREATE TABLE "ShipmentDraft" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "postalServiceId" INTEGER,
    "draftData" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShipmentDraft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MockPaymentCard" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "lastFour" TEXT NOT NULL,
    "expiryMonth" INTEGER NOT NULL,
    "expiryYear" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MockPaymentCard_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ShipmentDraft_userId_idx" ON "ShipmentDraft"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "MockPaymentCard_userId_key" ON "MockPaymentCard"("userId");

-- AddForeignKey
ALTER TABLE "UserSubscription" ADD CONSTRAINT "UserSubscription_nextPlanId_fkey" FOREIGN KEY ("nextPlanId") REFERENCES "SubscriptionPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShipmentDraft" ADD CONSTRAINT "ShipmentDraft_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShipmentDraft" ADD CONSTRAINT "ShipmentDraft_postalServiceId_fkey" FOREIGN KEY ("postalServiceId") REFERENCES "PostalService"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MockPaymentCard" ADD CONSTRAINT "MockPaymentCard_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
