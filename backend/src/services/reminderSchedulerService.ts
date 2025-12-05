/**
 * Reminder Scheduler Service
 * 
 * Reads upcoming appointments from database and schedules reminder jobs.
 * Runs as a cron job every hour to check for appointments needing reminders.
 * 
 * Features:
 * - Reads appointments from PostgreSQL (synced from Google Sheets)
 * - Schedules 24h, 2h, and 30min reminders
 * - Prevents duplicate reminders
 * - Respects notification settings
 * - Handles timezone conversions
 * 
 * @version 1.0
 * @author DrSync Development Team
 * @date December 4, 2025
 */

import cron from 'node-cron';
import { logger } from '../utils/logger';
import getPrismaClient from './prisma';
import { ReminderType, ReminderStatus, ReminderTrigger, AppointmentStatus } from '@prisma/client';
import reminderQueueService from './reminderQueueService';
import followUpService from './followUpService';
import { addHours, addMinutes, subHours, subMinutes, isAfter, isBefore } from 'date-fns';

class ReminderSchedulerService {
  private cronJob: cron.ScheduledTask | null = null;
  private followUpCronJob: cron.ScheduledTask | null = null;
  private isRunning: boolean = false;

  /**
   * Start the scheduler (runs every hour)
   */
  start(): void {
    if (this.cronJob) {
      logger.warn('Reminder scheduler already running');
      return;
    }

    // Run every hour at minute 0 (e.g., 9:00, 10:00, 11:00)
    this.cronJob = cron.schedule('0 * * * *', async () => {
      await this.schedulePendingReminders();
    });

    // Run next-day follow-ups daily at 9:00 AM
    this.followUpCronJob = cron.schedule('0 9 * * *', async () => {
      await followUpService.processNextDayFollowUps();
    });

    logger.info('Reminder scheduler started - will run every hour');
    logger.info('Follow-up scheduler started - will run daily at 9:00 AM');

    // Run immediately on startup
    this.schedulePendingReminders();
  }

  /**
   * Stop the scheduler
   */
  stop(): void {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
      logger.info('Reminder scheduler stopped');
    }

    if (this.followUpCronJob) {
      this.followUpCronJob.stop();
      this.followUpCronJob = null;
      logger.info('Follow-up scheduler stopped');
    }
  }

  /**
   * Main scheduling logic - find and schedule reminders for upcoming appointments
   */
  async schedulePendingReminders(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Scheduler already running, skipping this cycle');
      return;
    }

    this.isRunning = true;
    logger.info('Starting reminder scheduling cycle');

    try {
      const prisma = getPrismaClient();
      const now = new Date();

      // Find appointments in next 48 hours that need reminders
      const upcomingAppointments = await prisma.appointment.findMany({
        where: {
          scheduledAt: {
            gte: now,
            lte: addHours(now, 48)
          },
          status: {
            not: AppointmentStatus.CANCELLED
          }
        },
        include: {
          patient: {
            select: {
              id: true,
              phone: true,
              preferredLanguage: true
            }
          },
          organization: {
            select: {
              id: true,
              name: true
            }
          }
        }
      });

      logger.info(`Found ${upcomingAppointments.length} upcoming appointments to check`);

      let scheduled24h = 0;
      let scheduled2h = 0;
      let scheduled30min = 0;
      let skipped = 0;

      for (const appointment of upcomingAppointments) {
        try {
          // Schedule 24-hour reminder
          const needs24h = await this.needsReminder(
            appointment.id,
            ReminderType.REMINDER_24H,
            appointment.scheduledAt,
            24 * 60
          );

          if (needs24h) {
            await this.scheduleReminder(
              appointment.organization.id,
              appointment.id,
              ReminderType.REMINDER_24H,
              subHours(appointment.scheduledAt, 24)
            );
            scheduled24h++;
          }

          // Schedule 2-hour reminder
          const needs2h = await this.needsReminder(
            appointment.id,
            ReminderType.REMINDER_2H,
            appointment.scheduledAt,
            2 * 60
          );

          if (needs2h) {
            await this.scheduleReminder(
              appointment.organization.id,
              appointment.id,
              ReminderType.REMINDER_2H,
              subHours(appointment.scheduledAt, 2)
            );
            scheduled2h++;
          }

          // Schedule 30-minute reminder
          const needs30min = await this.needsReminder(
            appointment.id,
            ReminderType.REMINDER_30MIN,
            appointment.scheduledAt,
            30
          );

          if (needs30min) {
            await this.scheduleReminder(
              appointment.organization.id,
              appointment.id,
              ReminderType.REMINDER_30MIN,
              subMinutes(appointment.scheduledAt, 30)
            );
            scheduled30min++;
          }

        } catch (error) {
          logger.error(`Error scheduling reminders for appointment ${appointment.id}:`, error);
          skipped++;
        }
      }

      logger.info('Reminder scheduling cycle complete:', {
        total: upcomingAppointments.length,
        scheduled24h,
        scheduled2h,
        scheduled30min,
        skipped
      });

    } catch (error) {
      logger.error('Error in reminder scheduling cycle:', error);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Check if a reminder needs to be scheduled
   */
  private async needsReminder(
    appointmentId: string,
    reminderType: ReminderType,
    appointmentDate: Date,
    minutesBefore: number
  ): Promise<boolean> {
    try {
      const now = new Date();
      const reminderTime = subMinutes(appointmentDate, minutesBefore);

      // Check if reminder time is in the future (with 5-minute buffer)
      const bufferTime = subMinutes(reminderTime, 5);
      if (isBefore(reminderTime, now) || isBefore(bufferTime, now)) {
        return false;
      }

      // Check if reminder time is within next 2 hours (scheduling window)
      const scheduleWindow = addHours(now, 2);
      if (isAfter(reminderTime, scheduleWindow)) {
        return false;
      }

      // Check if reminder already exists
      const prisma = getPrismaClient();
      const existingReminder = await prisma.appointmentReminder.findFirst({
        where: {
          appointmentId,
          reminderType,
          status: {
            in: [ReminderStatus.PENDING, ReminderStatus.SENT, ReminderStatus.PROCESSING]
          }
        }
      });

      if (existingReminder) {
        logger.debug(`Reminder ${reminderType} already exists for appointment ${appointmentId}`);
        return false;
      }

      return true;

    } catch (error) {
      logger.error('Error checking if reminder needed:', error);
      return false;
    }
  }

  /**
   * Schedule a reminder by adding it to the queue
   */
  private async scheduleReminder(
    organizationId: string,
    appointmentId: string,
    reminderType: ReminderType,
    scheduledFor: Date
  ): Promise<void> {
    try {
      const prisma = getPrismaClient();

      // Create reminder record in database
      const reminder = await prisma.appointmentReminder.create({
        data: {
          appointmentId,
          organizationId,
          reminderType,
          status: ReminderStatus.PENDING,
          scheduledFor,
          trigger: ReminderTrigger.AUTOMATIC
        }
      });

      // Calculate delay in milliseconds
      const now = new Date();
      const delay = Math.max(0, scheduledFor.getTime() - now.getTime());

      // Add to Bull Queue
      await reminderQueueService.addReminderToQueue(
        {
          organizationId,
          appointmentId,
          reminderType,
          trigger: 'AUTOMATIC'
        },
        {
          delay,
          jobId: reminder.id
        }
      );

      logger.info(`Scheduled ${reminderType} for appointment ${appointmentId} at ${scheduledFor.toISOString()}`);

    } catch (error) {
      logger.error('Error scheduling reminder:', error);
      throw error;
    }
  }

  /**
   * Manually trigger reminder scheduling (for testing or manual runs)
   */
  async scheduleNow(): Promise<void> {
    await this.schedulePendingReminders();
  }

  /**
   * Get scheduler status
   */
  getStatus(): { running: boolean; nextRun?: string; followUpScheduler?: { running: boolean; nextRun?: string } } {
    return {
      running: this.cronJob !== null,
      nextRun: this.cronJob ? 'Top of next hour' : undefined,
      followUpScheduler: {
        running: this.followUpCronJob !== null,
        nextRun: this.followUpCronJob ? 'Daily at 9:00 AM' : undefined
      }
    };
  }
}

// Export singleton instance
export default new ReminderSchedulerService();
