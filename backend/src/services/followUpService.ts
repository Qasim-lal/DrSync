/**
 * Follow-Up Service
 * 
 * Handles post-appointment follow-up reminders:
 * - Same-day follow-ups (after appointment completion)
 * - Next-day follow-ups (24 hours after appointment)
 * - No-show follow-ups (for missed appointments)
 * 
 * Features:
 * - Automatic trigger based on appointment status
 * - Manual follow-up scheduling
 * - Follow-up history tracking
 * - Integration with notification settings
 * 
 * @version 1.0
 * @author DrSync Development Team
 * @date December 4, 2025
 */

import { logger } from '../utils/logger';
import getPrismaClient from './prisma';
import { ReminderType, ReminderStatus, ReminderTrigger, AppointmentStatus } from '@prisma/client';
import reminderQueueService from './reminderQueueService';
import { addHours, addMinutes, isAfter } from 'date-fns';

interface FollowUpScheduleOptions {
  organizationId: string;
  appointmentId: string;
  followUpType: ReminderType;
  scheduledFor?: Date;
  trigger?: ReminderTrigger;
  sentBy?: string;
  customMessage?: string;
}

class FollowUpService {
  /**
   * Schedule a follow-up reminder
   */
  async scheduleFollowUp(options: FollowUpScheduleOptions): Promise<string> {
    try {
      const {
        organizationId,
        appointmentId,
        followUpType,
        scheduledFor,
        trigger = ReminderTrigger.AUTOMATIC,
        sentBy,
        customMessage
      } = options;

      logger.info(`Scheduling follow-up for appointment ${appointmentId}`, {
        type: followUpType,
        trigger
      });

      const prisma = getPrismaClient();

      // Check if follow-up already exists
      const existingFollowUp = await prisma.appointmentReminder.findFirst({
        where: {
          appointmentId,
          reminderType: followUpType,
          status: {
            in: [ReminderStatus.PENDING, ReminderStatus.SENT]
          }
        }
      });

      if (existingFollowUp) {
        logger.info(`Follow-up ${followUpType} already exists for appointment ${appointmentId}`);
        return existingFollowUp.id;
      }

      // Calculate scheduled time if not provided
      const followUpTime = scheduledFor || await this.calculateFollowUpTime(followUpType, organizationId);

      // Create follow-up reminder record
      const followUp = await prisma.appointmentReminder.create({
        data: {
          appointmentId,
          organizationId,
          reminderType: followUpType,
          status: ReminderStatus.PENDING,
          scheduledFor: followUpTime,
          trigger,
          ...(sentBy && { sentBy })
        }
      });

      // Calculate delay in milliseconds
      const now = new Date();
      const delay = Math.max(0, followUpTime.getTime() - now.getTime());

      // Add to queue
      await reminderQueueService.addReminderToQueue(
        {
          organizationId,
          appointmentId,
          reminderType: followUpType,
          trigger: trigger === ReminderTrigger.MANUAL ? 'MANUAL' : 'AUTOMATIC',
          ...(customMessage && { customMessage })
        },
        {
          delay,
          jobId: followUp.id,
          priority: this.getPriority(followUpType)
        }
      );

      logger.info(`Follow-up scheduled successfully`, {
        followUpId: followUp.id,
        type: followUpType,
        scheduledFor: followUpTime.toISOString()
      });

      return followUp.id;

    } catch (error) {
      logger.error('Error scheduling follow-up:', error);
      throw error;
    }
  }

  /**
   * Handle appointment completion - trigger same-day follow-up
   */
  async handleAppointmentCompletion(appointmentId: string): Promise<void> {
    try {
      logger.info(`Handling appointment completion: ${appointmentId}`);

      const prisma = getPrismaClient();

      // Get appointment details
      const appointment = await prisma.appointment.findUnique({
        where: { id: appointmentId },
        select: {
          id: true,
          organizationId: true,
          status: true,
          scheduledAt: true,
          followUpSent: true
        }
      });

      if (!appointment) {
        logger.warn(`Appointment ${appointmentId} not found`);
        return;
      }

      // Only process if status is completed
      if (appointment.status !== AppointmentStatus.COMPLETED) {
        logger.debug(`Appointment ${appointmentId} status is ${appointment.status}, skipping follow-up`);
        return;
      }

      // Check if follow-up already sent
      if (appointment.followUpSent) {
        logger.debug(`Follow-up already sent for appointment ${appointmentId}`);
        return;
      }

      // Schedule same-day follow-up (configurable hours after completion)
      const followUpTime = await this.calculateFollowUpTime(
        ReminderType.FOLLOWUP_SAME_DAY,
        appointment.organizationId
      );

      await this.scheduleFollowUp({
        organizationId: appointment.organizationId,
        appointmentId: appointment.id,
        followUpType: ReminderType.FOLLOWUP_SAME_DAY,
        scheduledFor: followUpTime,
        trigger: ReminderTrigger.AUTOMATIC
      });

      logger.info(`Same-day follow-up scheduled for completed appointment ${appointmentId}`);

    } catch (error) {
      logger.error(`Error handling appointment completion for ${appointmentId}:`, error);
    }
  }

  /**
   * Handle appointment no-show - trigger no-show follow-up
   */
  async handleAppointmentNoShow(appointmentId: string): Promise<void> {
    try {
      logger.info(`Handling appointment no-show: ${appointmentId}`);

      const prisma = getPrismaClient();

      // Get appointment details
      const appointment = await prisma.appointment.findUnique({
        where: { id: appointmentId },
        select: {
          id: true,
          organizationId: true,
          status: true,
          scheduledAt: true
        }
      });

      if (!appointment) {
        logger.warn(`Appointment ${appointmentId} not found`);
        return;
      }

      // Only process if status is cancelled or no-show
      if (appointment.status !== AppointmentStatus.CANCELLED && appointment.status !== AppointmentStatus.NO_SHOW) {
        logger.debug(`Appointment ${appointmentId} status is ${appointment.status}, skipping no-show follow-up`);
        return;
      }

      // Schedule no-show follow-up (configurable hours after detection)
      const followUpTime = await this.calculateFollowUpTime(
        ReminderType.NO_SHOW_FOLLOWUP,
        appointment.organizationId
      );

      await this.scheduleFollowUp({
        organizationId: appointment.organizationId,
        appointmentId: appointment.id,
        followUpType: ReminderType.NO_SHOW_FOLLOWUP,
        scheduledFor: followUpTime,
        trigger: ReminderTrigger.AUTOMATIC
      });

      logger.info(`No-show follow-up scheduled for appointment ${appointmentId}`);

    } catch (error) {
      logger.error(`Error handling appointment no-show for ${appointmentId}:`, error);
    }
  }

  /**
   * Process next-day follow-ups for completed appointments
   * Run this daily via cron job
   */
  async processNextDayFollowUps(): Promise<void> {
    try {
      logger.info('Processing next-day follow-ups');

      const prisma = getPrismaClient();
      const now = new Date();
      const oneDayAgo = addHours(now, -24);
      const twoDaysAgo = addHours(now, -48);

      // Find completed appointments from yesterday that haven't had next-day follow-up
      const appointments = await prisma.appointment.findMany({
        where: {
          status: AppointmentStatus.COMPLETED,
          scheduledAt: {
            gte: twoDaysAgo,
            lte: oneDayAgo
          },
          followUpSent: true, // Same-day follow-up was sent
          // Check if next-day follow-up already exists
          appointmentReminders: {
            none: {
              reminderType: ReminderType.FOLLOWUP_NEXT_DAY,
              status: {
                in: [ReminderStatus.PENDING, ReminderStatus.SENT]
              }
            }
          }
        },
        select: {
          id: true,
          organizationId: true,
          scheduledAt: true
        }
      });

      logger.info(`Found ${appointments.length} appointments for next-day follow-up`);

      let scheduled = 0;
      let skipped = 0;

      for (const appointment of appointments) {
        try {
          // Calculate next-day follow-up time (24 hours after appointment)
          const followUpTime = addHours(appointment.scheduledAt, 24);

          // Skip if follow-up time is in the future
          if (isAfter(followUpTime, now)) {
            skipped++;
            continue;
          }

          await this.scheduleFollowUp({
            organizationId: appointment.organizationId,
            appointmentId: appointment.id,
            followUpType: ReminderType.FOLLOWUP_NEXT_DAY,
            scheduledFor: addMinutes(now, 5), // Send in 5 minutes
            trigger: ReminderTrigger.AUTOMATIC
          });

          scheduled++;

        } catch (error) {
          logger.error(`Error scheduling next-day follow-up for ${appointment.id}:`, error);
          skipped++;
        }
      }

      logger.info(`Next-day follow-up processing complete`, {
        total: appointments.length,
        scheduled,
        skipped
      });

    } catch (error) {
      logger.error('Error processing next-day follow-ups:', error);
    }
  }

  /**
   * Calculate follow-up time based on type and organization settings
   */
  private async calculateFollowUpTime(followUpType: ReminderType, organizationId: string): Promise<Date> {
    const now = new Date();
    const prisma = getPrismaClient();

    try {
      // Fetch organization's notification settings
      const settings = await prisma.notificationSettings.findUnique({
        where: { organizationId },
        select: {
          sameDayFollowUpHours: true,
          nextDayFollowUpHours: true,
          noShowFollowUpHours: true
        }
      });

      switch (followUpType) {
        case ReminderType.FOLLOWUP_SAME_DAY:
          // Use configured hours (default: 2 hours after completion)
          const sameDayHours = settings?.sameDayFollowUpHours || 2;
          return addHours(now, sameDayHours);

        case ReminderType.FOLLOWUP_NEXT_DAY:
          // Use configured hours (default: 24 hours after appointment)
          const nextDayHours = settings?.nextDayFollowUpHours || 24;
          return addHours(now, nextDayHours);

        case ReminderType.NO_SHOW_FOLLOWUP:
          // Use configured hours (default: 1 hour after no-show detection)
          const noShowHours = settings?.noShowFollowUpHours || 1;
          return addHours(now, noShowHours);

        default:
          // Default to 1 hour from now
          return addHours(now, 1);
      }
    } catch (error) {
      logger.error('Error fetching follow-up timing settings, using defaults:', error);
      // Fallback to hardcoded defaults if settings fetch fails
      switch (followUpType) {
        case ReminderType.FOLLOWUP_SAME_DAY:
          return addHours(now, 2);
        case ReminderType.FOLLOWUP_NEXT_DAY:
          return addHours(now, 24);
        case ReminderType.NO_SHOW_FOLLOWUP:
          return addHours(now, 1);
        default:
          return addHours(now, 1);
      }
    }
  }

  /**
   * Get priority for follow-up type
   */
  private getPriority(followUpType: ReminderType): number {
    const priorityMap: Record<ReminderType, number> = {
      [ReminderType.FOLLOWUP_SAME_DAY]: 4,
      [ReminderType.FOLLOWUP_NEXT_DAY]: 5,
      [ReminderType.NO_SHOW_FOLLOWUP]: 6,
      // Regular reminders
      [ReminderType.REMINDER_30MIN]: 1,
      [ReminderType.REMINDER_2H]: 2,
      [ReminderType.REMINDER_24H]: 3
    };

    return priorityMap[followUpType] || 5;
  }

  /**
   * Get follow-up history for an appointment
   */
  async getFollowUpHistory(appointmentId: string): Promise<any[]> {
    try {
      const prisma = getPrismaClient();

      const followUps = await prisma.appointmentReminder.findMany({
        where: {
          appointmentId,
          reminderType: {
            in: [
              ReminderType.FOLLOWUP_SAME_DAY,
              ReminderType.FOLLOWUP_NEXT_DAY,
              ReminderType.NO_SHOW_FOLLOWUP
            ]
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      return followUps;

    } catch (error) {
      logger.error('Error getting follow-up history:', error);
      return [];
    }
  }

  /**
   * Cancel a scheduled follow-up
   */
  async cancelFollowUp(followUpId: string): Promise<boolean> {
    try {
      const prisma = getPrismaClient();

      // Update status to cancelled
      await prisma.appointmentReminder.update({
        where: { id: followUpId },
        data: {
          status: ReminderStatus.CANCELLED,
          updatedAt: new Date()
        }
      });

      // Try to remove from queue (may already be processed)
      await reminderQueueService.cancelReminder(followUpId);

      logger.info(`Follow-up ${followUpId} cancelled successfully`);
      return true;

    } catch (error) {
      logger.error(`Error cancelling follow-up ${followUpId}:`, error);
      return false;
    }
  }

  /**
   * Get statistics for follow-ups
   */
  async getFollowUpStats(organizationId?: string): Promise<any> {
    try {
      const prisma = getPrismaClient();

      const where: any = {
        reminderType: {
          in: [
            ReminderType.FOLLOWUP_SAME_DAY,
            ReminderType.FOLLOWUP_NEXT_DAY,
            ReminderType.NO_SHOW_FOLLOWUP
          ]
        }
      };

      if (organizationId) {
        where.organizationId = organizationId;
      }

      const [total, pending, sent, failed, skipped] = await Promise.all([
        prisma.appointmentReminder.count({ where }),
        prisma.appointmentReminder.count({ where: { ...where, status: ReminderStatus.PENDING } }),
        prisma.appointmentReminder.count({ where: { ...where, status: ReminderStatus.SENT } }),
        prisma.appointmentReminder.count({ where: { ...where, status: ReminderStatus.FAILED } }),
        prisma.appointmentReminder.count({ where: { ...where, status: ReminderStatus.SKIPPED } })
      ]);

      // Get breakdown by type
      const byType = await prisma.appointmentReminder.groupBy({
        by: ['reminderType'],
        where,
        _count: true
      });

      return {
        summary: {
          total,
          pending,
          sent,
          failed,
          skipped,
          successRate: total > 0 ? `${((sent / total) * 100).toFixed(2)}%` : '0%'
        },
        byType: byType.reduce((acc, item) => {
          acc[item.reminderType] = item._count;
          return acc;
        }, {} as Record<string, number>)
      };

    } catch (error) {
      logger.error('Error getting follow-up stats:', error);
      return { error: 'Failed to fetch statistics' };
    }
  }
}

// Export singleton instance
export default new FollowUpService();
