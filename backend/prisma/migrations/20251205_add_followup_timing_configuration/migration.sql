-- AlterTable
ALTER TABLE "notification_settings" 
ADD COLUMN IF NOT EXISTS "same_day_follow_up_hours" INTEGER NOT NULL DEFAULT 2,
ADD COLUMN IF NOT EXISTS "next_day_follow_up_hours" INTEGER NOT NULL DEFAULT 24,
ADD COLUMN IF NOT EXISTS "no_show_follow_up_hours" INTEGER NOT NULL DEFAULT 1;
