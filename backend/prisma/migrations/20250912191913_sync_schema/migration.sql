-- DropIndex
DROP INDEX "public"."patients_phone_key";

-- AlterTable
ALTER TABLE "public"."appointments" ADD COLUMN     "lockToken" TEXT,
ADD COLUMN     "lockedAt" TIMESTAMP(3),
ADD COLUMN     "lockedBy" TEXT;

-- AlterTable
ALTER TABLE "public"."organizations" ADD COLUMN     "doctorCount" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "googleSheetsStructure" TEXT NOT NULL DEFAULT 'TABS',
ADD COLUMN     "lastBilledAt" TIMESTAMP(3),
ADD COLUMN     "nextBillingDate" TIMESTAMP(3),
ADD COLUMN     "paymentMethod" TEXT,
ADD COLUMN     "region" TEXT NOT NULL DEFAULT 'PAKISTAN',
ADD COLUMN     "subscriptionType" TEXT,
ADD COLUMN     "whatsappWebhookUrl" TEXT;

-- AlterTable
ALTER TABLE "public"."patients" ADD COLUMN     "primaryContact" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "relationToPrimaryContact" TEXT;

-- CreateTable
CREATE TABLE "public"."trial_history" (
    "id" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "organizationName" TEXT NOT NULL,
    "phoneVerified" BOOLEAN NOT NULL DEFAULT false,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trial_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."system_metrics" (
    "id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "organizationId" TEXT NOT NULL,
    "metric" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "tags" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."billing_records" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "subscriptionTier" TEXT NOT NULL,
    "billingCycle" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "billing_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."billing_history" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "paymentStatus" TEXT NOT NULL,
    "transactionId" TEXT,
    "billingPeriod" TEXT NOT NULL,
    "doctorCount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "billing_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "trial_history_email_idx" ON "public"."trial_history"("email");

-- CreateIndex
CREATE INDEX "trial_history_organizationName_idx" ON "public"."trial_history"("organizationName");

-- CreateIndex
CREATE UNIQUE INDEX "trial_history_phoneNumber_key" ON "public"."trial_history"("phoneNumber");

-- CreateIndex
CREATE INDEX "system_metrics_organizationId_metric_timestamp_idx" ON "public"."system_metrics"("organizationId", "metric", "timestamp");

-- CreateIndex
CREATE INDEX "billing_records_organizationId_status_idx" ON "public"."billing_records"("organizationId", "status");

-- CreateIndex
CREATE INDEX "billing_history_organizationId_billingPeriod_idx" ON "public"."billing_history"("organizationId", "billingPeriod");

-- AddForeignKey
ALTER TABLE "public"."sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."system_metrics" ADD CONSTRAINT "system_metrics_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."billing_records" ADD CONSTRAINT "billing_records_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."billing_history" ADD CONSTRAINT "billing_history_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
