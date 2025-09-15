-- CreateEnum
CREATE TYPE "public"."OrganizationType" AS ENUM ('CLINIC', 'DOCTOR', 'HOSPITAL', 'SPECIALIST', 'PHARMACY', 'DIAGNOSTIC');

-- AlterTable
ALTER TABLE "public"."billing_history" ADD COLUMN     "paymentIntentId" TEXT;

-- AlterTable
ALTER TABLE "public"."organizations" ADD COLUMN     "organizationType" "public"."OrganizationType" NOT NULL DEFAULT 'CLINIC';

-- CreateTable
CREATE TABLE "public"."payment_intents" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "gatewayIntentId" TEXT,
    "gatewayResponse" JSONB,
    "failureReason" TEXT,
    "billingPeriod" TEXT NOT NULL,
    "subscriptionType" TEXT NOT NULL,
    "doctorCount" INTEGER NOT NULL,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "nextRetryAt" TIMESTAMP(3),
    "maxRetries" INTEGER NOT NULL DEFAULT 3,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_intents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "payment_intents_organizationId_status_idx" ON "public"."payment_intents"("organizationId", "status");

-- CreateIndex
CREATE INDEX "payment_intents_status_nextRetryAt_idx" ON "public"."payment_intents"("status", "nextRetryAt");

-- CreateIndex
CREATE INDEX "billing_history_paymentIntentId_idx" ON "public"."billing_history"("paymentIntentId");

-- AddForeignKey
ALTER TABLE "public"."payment_intents" ADD CONSTRAINT "payment_intents_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
