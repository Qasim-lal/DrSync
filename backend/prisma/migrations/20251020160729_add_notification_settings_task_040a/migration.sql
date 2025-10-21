-- CreateEnum
CREATE TYPE "public"."ReminderTrigger" AS ENUM ('AUTOMATIC', 'MANUAL');

-- CreateEnum
CREATE TYPE "public"."ReminderTiming" AS ENUM ('IMMEDIATELY', 'MINUTES_30', 'HOURS_1', 'HOURS_2', 'HOURS_4', 'HOURS_24', 'HOURS_48', 'HOURS_72', 'CUSTOM');

-- AlterTable
ALTER TABLE "public"."appointment_reminders" ADD COLUMN     "sentBy" TEXT,
ADD COLUMN     "trigger" "public"."ReminderTrigger" NOT NULL DEFAULT 'AUTOMATIC';

-- CreateTable
CREATE TABLE "public"."notification_settings" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'en',
    "bookingConfirmationsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "remindersEnabled" BOOLEAN NOT NULL DEFAULT true,
    "followUpsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "medicationRemindersEnabled" BOOLEAN NOT NULL DEFAULT false,
    "wellnessChecksEnabled" BOOLEAN NOT NULL DEFAULT false,
    "reminderTiming" "public"."ReminderTiming" NOT NULL DEFAULT 'HOURS_24',
    "customReminderMinutes" INTEGER,
    "enabledChannels" TEXT[] DEFAULT ARRAY['WHATSAPP']::TEXT[],
    "quietHoursEnabled" BOOLEAN NOT NULL DEFAULT false,
    "quietHoursStart" TEXT,
    "quietHoursEnd" TEXT,
    "monthlyCap" DECIMAL(10,2),
    "currentMonthSpend" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "alertThreshold" INTEGER NOT NULL DEFAULT 80,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "notification_settings_organizationId_key" ON "public"."notification_settings"("organizationId");

-- CreateIndex
CREATE INDEX "notification_settings_organizationId_idx" ON "public"."notification_settings"("organizationId");

-- CreateIndex
CREATE INDEX "appointment_reminders_trigger_idx" ON "public"."appointment_reminders"("trigger");

-- AddForeignKey
ALTER TABLE "public"."notification_settings" ADD CONSTRAINT "notification_settings_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
