CREATE TYPE "UserRole" AS ENUM ('CLIENT');
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'BANNED', 'DELETED');
CREATE TYPE "AdminRole" AS ENUM ('ADMIN', 'SUPER_ADMIN');
CREATE TYPE "AdminStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'DELETED');
CREATE TYPE "SubscriptionLevel" AS ENUM ('FREE', 'PRO', 'BUSINESS');
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'CANCELLED', 'PENDING_UPGRADE', 'PENDING_DOWNGRADE', 'EXPIRED');
CREATE TYPE "BillingStatus" AS ENUM ('PAID', 'FAILED', 'REFUNDED');
CREATE TYPE "NotificationType" AS ENUM ('SHIPMENT_STATUS', 'SUBSCRIPTION', 'SYSTEM');
CREATE TYPE "SupportTicketStatus" AS ENUM ('OPEN', 'CLOSED');
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "email" TEXT,
    "phoneNumber" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'CLIENT',
    "status" "UserStatus" NOT NULL DEFAULT 'INACTIVE',
    "profileCompleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "UserProfile" (
    "userId" INTEGER NOT NULL,
    "companyName" TEXT NOT NULL,
    "companyNameLat" TEXT,
    "edrpou" TEXT NOT NULL,
    "taxNumber" TEXT,
    "legalAddress" TEXT NOT NULL,
    "contactPersonName" TEXT,

    CONSTRAINT "UserProfile_pkey" PRIMARY KEY ("userId")
);
CREATE TABLE "UserCredentials" (
    "userId" INTEGER NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserCredentials_pkey" PRIMARY KEY ("userId")
);
CREATE TABLE "RefreshToken" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "ResetPasswordToken" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "tokenLookupHash" TEXT NOT NULL,
    "usedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResetPasswordToken_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "TwoFactorAuth" (
    "userId" INTEGER NOT NULL,
    "secret" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TwoFactorAuth_pkey" PRIMARY KEY ("userId")
);
CREATE TABLE "Admin" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "role" "AdminRole" NOT NULL DEFAULT 'ADMIN',
    "status" "AdminStatus" NOT NULL DEFAULT 'INACTIVE',
    "invitedById" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Admin_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "AdminCredentials" (
    "adminId" INTEGER NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminCredentials_pkey" PRIMARY KEY ("adminId")
);
CREATE TABLE "AdminRefreshToken" (
    "id" SERIAL NOT NULL,
    "adminId" INTEGER NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminRefreshToken_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "AdminTwoFactorAuth" (
    "adminId" INTEGER NOT NULL,
    "secret" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminTwoFactorAuth_pkey" PRIMARY KEY ("adminId")
);
CREATE TABLE "AdminInvite" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "invitedById" INTEGER NOT NULL,
    "usedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminInvite_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "PostalService" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logoUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PostalService_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "UserPostalConnection" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "postalServiceId" INTEGER NOT NULL,
    "apiKey" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserPostalConnection_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "SubscriptionPlan" (
    "id" SERIAL NOT NULL,
    "level" "SubscriptionLevel" NOT NULL,
    "name" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "maxOperators" INTEGER NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubscriptionPlan_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "UserSubscription" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "planId" INTEGER NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "currentPeriodStart" TIMESTAMP(3) NOT NULL,
    "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
    "nextPlanId" INTEGER,
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserSubscription_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "BillingHistory" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "planId" INTEGER NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "status" "BillingStatus" NOT NULL DEFAULT 'PAID',
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BillingHistory_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "ShipmentTemplate" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "postalServiceId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "templateData" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShipmentTemplate_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Recipient" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "address" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Recipient_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Notification" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "SupportTicket" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "subject" TEXT NOT NULL,
    "status" "SupportTicketStatus" NOT NULL DEFAULT 'OPEN',
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupportTicket_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "SupportMessage" (
    "id" SERIAL NOT NULL,
    "ticketId" INTEGER NOT NULL,
    "userId" INTEGER,
    "adminId" INTEGER,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupportMessage_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_phoneNumber_key" ON "User"("phoneNumber");
CREATE UNIQUE INDEX "UserProfile_edrpou_key" ON "UserProfile"("edrpou");
CREATE INDEX "RefreshToken_userId_revokedAt_idx" ON "RefreshToken"("userId", "revokedAt");
CREATE UNIQUE INDEX "ResetPasswordToken_tokenLookupHash_key" ON "ResetPasswordToken"("tokenLookupHash");
CREATE UNIQUE INDEX "Admin_email_key" ON "Admin"("email");
CREATE INDEX "Admin_email_idx" ON "Admin"("email");
CREATE INDEX "AdminRefreshToken_adminId_revokedAt_idx" ON "AdminRefreshToken"("adminId", "revokedAt");
CREATE UNIQUE INDEX "AdminInvite_token_key" ON "AdminInvite"("token");
CREATE INDEX "AdminInvite_email_idx" ON "AdminInvite"("email");
CREATE UNIQUE INDEX "PostalService_name_key" ON "PostalService"("name");
CREATE UNIQUE INDEX "PostalService_slug_key" ON "PostalService"("slug");
CREATE INDEX "UserPostalConnection_userId_idx" ON "UserPostalConnection"("userId");
CREATE UNIQUE INDEX "UserPostalConnection_userId_postalServiceId_key" ON "UserPostalConnection"("userId", "postalServiceId");
CREATE UNIQUE INDEX "SubscriptionPlan_level_key" ON "SubscriptionPlan"("level");
CREATE UNIQUE INDEX "UserSubscription_userId_key" ON "UserSubscription"("userId");
CREATE INDEX "UserSubscription_userId_idx" ON "UserSubscription"("userId");
CREATE INDEX "BillingHistory_userId_idx" ON "BillingHistory"("userId");
CREATE INDEX "ShipmentTemplate_userId_idx" ON "ShipmentTemplate"("userId");
CREATE INDEX "Recipient_userId_idx" ON "Recipient"("userId");
CREATE INDEX "Notification_userId_isRead_idx" ON "Notification"("userId", "isRead");
CREATE INDEX "SupportTicket_userId_status_idx" ON "SupportTicket"("userId", "status");
CREATE INDEX "SupportMessage_ticketId_idx" ON "SupportMessage"("ticketId");
ALTER TABLE "UserProfile" ADD CONSTRAINT "UserProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserCredentials" ADD CONSTRAINT "UserCredentials_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ResetPasswordToken" ADD CONSTRAINT "ResetPasswordToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TwoFactorAuth" ADD CONSTRAINT "TwoFactorAuth_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Admin" ADD CONSTRAINT "Admin_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "Admin"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AdminCredentials" ADD CONSTRAINT "AdminCredentials_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "Admin"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AdminRefreshToken" ADD CONSTRAINT "AdminRefreshToken_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "Admin"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AdminTwoFactorAuth" ADD CONSTRAINT "AdminTwoFactorAuth_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "Admin"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AdminInvite" ADD CONSTRAINT "AdminInvite_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "Admin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "UserPostalConnection" ADD CONSTRAINT "UserPostalConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserPostalConnection" ADD CONSTRAINT "UserPostalConnection_postalServiceId_fkey" FOREIGN KEY ("postalServiceId") REFERENCES "PostalService"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "UserSubscription" ADD CONSTRAINT "UserSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserSubscription" ADD CONSTRAINT "UserSubscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "SubscriptionPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BillingHistory" ADD CONSTRAINT "BillingHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BillingHistory" ADD CONSTRAINT "BillingHistory_planId_fkey" FOREIGN KEY ("planId") REFERENCES "SubscriptionPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ShipmentTemplate" ADD CONSTRAINT "ShipmentTemplate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ShipmentTemplate" ADD CONSTRAINT "ShipmentTemplate_postalServiceId_fkey" FOREIGN KEY ("postalServiceId") REFERENCES "PostalService"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Recipient" ADD CONSTRAINT "Recipient_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SupportMessage" ADD CONSTRAINT "SupportMessage_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "SupportTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SupportMessage" ADD CONSTRAINT "SupportMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SupportMessage" ADD CONSTRAINT "SupportMessage_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "Admin"("id") ON DELETE SET NULL ON UPDATE CASCADE;
