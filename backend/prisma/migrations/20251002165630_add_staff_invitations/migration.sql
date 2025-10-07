-- CreateEnum
CREATE TYPE "public"."InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED', 'CANCELLED');

-- AlterEnum
ALTER TYPE "public"."UserRole" ADD VALUE 'ADMIN';

-- AlterTable
ALTER TABLE "public"."organizations" ADD COLUMN     "googleSheetsSyncEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "googleSheetsSyncFrequency" INTEGER,
ADD COLUMN     "googleSheetsTokens" JSONB,
ADD COLUMN     "googleSheetsUrl" TEXT,
ADD COLUMN     "setupProgress" JSONB,
ADD COLUMN     "whatsappConfigured" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "whatsappPhoneVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "whatsappVerifyToken" TEXT,
ADD COLUMN     "whatsappWebhookToken" TEXT;

-- CreateTable
CREATE TABLE "public"."staff_invitations" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "public"."UserRole" NOT NULL,
    "permissions" TEXT[],
    "status" "public"."InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "token" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "organizationId" TEXT NOT NULL,
    "invitedBy" TEXT NOT NULL,

    CONSTRAINT "staff_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "staff_invitations_status_expiresAt_idx" ON "public"."staff_invitations"("status", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "staff_invitations_email_organizationId_key" ON "public"."staff_invitations"("email", "organizationId");

-- AddForeignKey
ALTER TABLE "public"."staff_invitations" ADD CONSTRAINT "staff_invitations_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."staff_invitations" ADD CONSTRAINT "staff_invitations_invitedBy_fkey" FOREIGN KEY ("invitedBy") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
