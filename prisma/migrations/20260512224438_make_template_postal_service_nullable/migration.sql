-- DropForeignKey
ALTER TABLE "ShipmentTemplate" DROP CONSTRAINT "ShipmentTemplate_postalServiceId_fkey";

-- AlterTable
ALTER TABLE "ShipmentTemplate" ALTER COLUMN "postalServiceId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "ShipmentTemplate" ADD CONSTRAINT "ShipmentTemplate_postalServiceId_fkey" FOREIGN KEY ("postalServiceId") REFERENCES "PostalService"("id") ON DELETE SET NULL ON UPDATE CASCADE;
