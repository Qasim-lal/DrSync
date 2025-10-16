-- CreateEnum
CREATE TYPE "public"."ReminderType" AS ENUM ('REMINDER_24H', 'REMINDER_2H', 'REMINDER_30MIN', 'FOLLOWUP_SAME_DAY', 'FOLLOWUP_NEXT_DAY', 'NO_SHOW_FOLLOWUP');

-- CreateEnum
CREATE TYPE "public"."ReminderStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'SKIPPED', 'CANCELLED');

-- CreateTable
CREATE TABLE "public"."appointment_reminders" (
    "id" TEXT NOT NULL,
    "reminderType" "public"."ReminderType" NOT NULL,
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3),
    "status" "public"."ReminderStatus" NOT NULL DEFAULT 'PENDING',
    "messageId" TEXT,
    "skipReason" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastAttemptAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "organizationId" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,

    CONSTRAINT "appointment_reminders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "appointment_reminders_organizationId_scheduledFor_idx" ON "public"."appointment_reminders"("organizationId", "scheduledFor");

-- CreateIndex
CREATE INDEX "appointment_reminders_status_scheduledFor_idx" ON "public"."appointment_reminders"("status", "scheduledFor");

-- CreateIndex
CREATE INDEX "appointment_reminders_appointmentId_reminderType_idx" ON "public"."appointment_reminders"("appointmentId", "reminderType");

-- AddForeignKey
ALTER TABLE "public"."appointment_reminders" ADD CONSTRAINT "appointment_reminders_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."appointment_reminders" ADD CONSTRAINT "appointment_reminders_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "public"."appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
