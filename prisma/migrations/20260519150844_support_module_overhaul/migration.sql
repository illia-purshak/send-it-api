/*
  Warnings:

  - The `status` column on the `SupportTicket` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Added the required column `category` to the `SupportTicket` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('WAITING', 'IN_PROGRESS', 'CLOSED');

-- CreateEnum
CREATE TYPE "TicketCategory" AS ENUM ('QUESTION', 'TECHNICAL', 'BILLING', 'SUGGESTION', 'OTHER');

-- DropIndex
DROP INDEX "SupportMessage_ticketId_idx";

-- AlterTable
ALTER TABLE "SupportMessage" ADD COLUMN     "isSystem" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "SupportTicket" ADD COLUMN     "assignedToId" INTEGER,
ADD COLUMN     "category" "TicketCategory" NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" "TicketStatus" NOT NULL DEFAULT 'WAITING';

-- DropEnum
DROP TYPE "SupportTicketStatus";

-- CreateTable
CREATE TABLE "TicketReadStatus" (
    "id" SERIAL NOT NULL,
    "ticketId" INTEGER NOT NULL,
    "userId" INTEGER,
    "adminId" INTEGER,
    "lastReadAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TicketReadStatus_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TicketReadStatus_ticketId_idx" ON "TicketReadStatus"("ticketId");

-- CreateIndex
CREATE UNIQUE INDEX "TicketReadStatus_ticketId_userId_key" ON "TicketReadStatus"("ticketId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "TicketReadStatus_ticketId_adminId_key" ON "TicketReadStatus"("ticketId", "adminId");

-- CreateIndex
CREATE INDEX "SupportMessage_ticketId_createdAt_idx" ON "SupportMessage"("ticketId", "createdAt");

-- CreateIndex
CREATE INDEX "SupportTicket_userId_status_idx" ON "SupportTicket"("userId", "status");

-- CreateIndex
CREATE INDEX "SupportTicket_assignedToId_status_idx" ON "SupportTicket"("assignedToId", "status");

-- CreateIndex
CREATE INDEX "SupportTicket_status_createdAt_idx" ON "SupportTicket"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "Admin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketReadStatus" ADD CONSTRAINT "TicketReadStatus_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "SupportTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
