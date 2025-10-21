-- CreateEnum
CREATE TYPE "public"."PresetMode" AS ENUM ('BUDGET', 'RECOMMENDED', 'PREMIUM', 'CUSTOM');

-- CreateEnum
CREATE TYPE "public"."PatientSegment" AS ENUM ('NEW', 'REGULAR', 'VIP', 'AT_RISK', 'INACTIVE');

-- AlterTable
ALTER TABLE "public"."notification_settings" ADD COLUMN     "appointmentCompletionEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "arrivalNotificationEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "averageMonthlyAppointments" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "cancellationConfirmationEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "costPerMessage" DECIMAL(10,2) NOT NULL DEFAULT 3.50,
ADD COLUMN     "noShowFollowupEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "patientSegmentationEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "paymentReminderEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "preAppointmentInstructionsEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "presetMode" "public"."PresetMode" NOT NULL DEFAULT 'RECOMMENDED',
ADD COLUMN     "reschedulingConfirmationEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "smartBundlingEnabled" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "public"."message_cost_tracking" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "periodYear" INTEGER NOT NULL,
    "periodMonth" INTEGER NOT NULL,
    "bookingConfirmationsSent" INTEGER NOT NULL DEFAULT 0,
    "remindersSent" INTEGER NOT NULL DEFAULT 0,
    "followUpsSent" INTEGER NOT NULL DEFAULT 0,
    "medicationRemindersSent" INTEGER NOT NULL DEFAULT 0,
    "wellnessChecksSent" INTEGER NOT NULL DEFAULT 0,
    "preInstructionsSent" INTEGER NOT NULL DEFAULT 0,
    "arrivalNotificationsSent" INTEGER NOT NULL DEFAULT 0,
    "completionMessagesSent" INTEGER NOT NULL DEFAULT 0,
    "reschedulingConfirmationsSent" INTEGER NOT NULL DEFAULT 0,
    "cancellationConfirmationsSent" INTEGER NOT NULL DEFAULT 0,
    "noShowFollowupsSent" INTEGER NOT NULL DEFAULT 0,
    "paymentRemindersSent" INTEGER NOT NULL DEFAULT 0,
    "totalMessagesSent" INTEGER NOT NULL DEFAULT 0,
    "messagesSavedBySettings" INTEGER NOT NULL DEFAULT 0,
    "messagesBundled" INTEGER NOT NULL DEFAULT 0,
    "estimatedCost" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "actualCost" DECIMAL(10,2),
    "costSaved" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "message_cost_tracking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."patient_notification_overrides" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "patientSegment" "public"."PatientSegment" NOT NULL DEFAULT 'REGULAR',
    "bookingConfirmationsEnabled" BOOLEAN,
    "remindersEnabled" BOOLEAN,
    "followUpsEnabled" BOOLEAN,
    "medicationRemindersEnabled" BOOLEAN,
    "wellnessChecksEnabled" BOOLEAN,
    "quietHoursEnabled" BOOLEAN NOT NULL DEFAULT false,
    "quietHoursStart" TEXT,
    "quietHoursEnd" TEXT,
    "language" TEXT,
    "preferredChannel" TEXT,
    "doNotContact" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patient_notification_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "message_cost_tracking_organizationId_periodYear_periodMonth_idx" ON "public"."message_cost_tracking"("organizationId", "periodYear", "periodMonth");

-- CreateIndex
CREATE UNIQUE INDEX "message_cost_tracking_organizationId_periodYear_periodMonth_key" ON "public"."message_cost_tracking"("organizationId", "periodYear", "periodMonth");

-- CreateIndex
CREATE INDEX "patient_notification_overrides_organizationId_patientSegmen_idx" ON "public"."patient_notification_overrides"("organizationId", "patientSegment");

-- CreateIndex
CREATE INDEX "patient_notification_overrides_patientId_idx" ON "public"."patient_notification_overrides"("patientId");

-- CreateIndex
CREATE UNIQUE INDEX "patient_notification_overrides_patientId_organizationId_key" ON "public"."patient_notification_overrides"("patientId", "organizationId");

-- AddForeignKey
ALTER TABLE "public"."message_cost_tracking" ADD CONSTRAINT "message_cost_tracking_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."patient_notification_overrides" ADD CONSTRAINT "patient_notification_overrides_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "public"."patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."patient_notification_overrides" ADD CONSTRAINT "patient_notification_overrides_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
