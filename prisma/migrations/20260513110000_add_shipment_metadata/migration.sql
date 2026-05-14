-- CreateEnum
CREATE TYPE "ShipmentStatus" AS ENUM (
    'DRAFT',
    'CREATED',
    'PREPARING',
    'IN_TRANSIT',
    'DELIVERED',
    'CANCELLED',
    'RETURNED',
    'UNKNOWN'
);

-- CreateTable
CREATE TABLE "Shipment" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "postalServiceId" INTEGER NOT NULL,
    "operatorRef" TEXT NOT NULL,
    "rawStatus" TEXT,
    "normalizedStatus" "ShipmentStatus" NOT NULL DEFAULT 'UNKNOWN',
    "recipientName" TEXT,
    "declaredValue" DECIMAL(10,2),
    "operatorCreatedAt" TIMESTAMP(3),
    "lastSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Shipment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Shipment_userId_postalServiceId_operatorRef_key" ON "Shipment"("userId", "postalServiceId", "operatorRef");

-- CreateIndex
CREATE INDEX "Shipment_userId_normalizedStatus_idx" ON "Shipment"("userId", "normalizedStatus");

-- CreateIndex
CREATE INDEX "Shipment_userId_operatorCreatedAt_idx" ON "Shipment"("userId", "operatorCreatedAt");

-- AddForeignKey
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_postalServiceId_fkey" FOREIGN KEY ("postalServiceId") REFERENCES "PostalService"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
