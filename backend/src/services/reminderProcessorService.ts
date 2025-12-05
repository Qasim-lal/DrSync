/**
 * Reminder Processor Service - Main Orchestrator
 * 
 * Central service that processes reminder jobs from Bull Queue.
 * Integrates notification settings, templates, WhatsApp sending, and database updates.
 * 
 * Architecture:
 * - Processes jobs from reminderQueueService
 * - Checks TASK-040A notification settings before sending
 * - Generates messages using reminderTemplateService
 * - Sends via WhatsApp Business API
 * - Updates database with status and tracking
 * - Handles errors with retry logic
 * 
 * @version 1.0
 * @author DrSync Development Team
 * @date December 4, 2025
 */

import { Job } from 'bull';
import { logger } from '../utils/logger';
import getPrismaClient from './prisma';
import { ReminderStatus, ReminderType } from '@prisma/client';
import reminderQueueService, { ReminderJobPayload, ReminderJobResult } from './reminderQueueService';
import reminderTemplateService, { TemplateVariables } from './reminderTemplateService';
import notificationSettingsService from './notificationSettingsService';
import whatsappService from './whatsappService';
import googleSheetsService from './googleSheetsService';

class ReminderProcessorService {
  private initialized: boolean = false;

  constructor() {
    logger.info('Reminder processor service created');
  }

  /**
   * Initialize the processor
   * Must be called to set up queue job processing
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      logger.warn('Reminder processor already initialized');
      return;
    }

    // Register processor with queue service
    await reminderQueueService.initialize(this.processReminderJob.bind(this));

    this.initialized = true;
    logger.info('Reminder processor service initialized and connected to queues');
  }

  /**
   * Process a reminder job from the queue
   * This is the main entry point called by Bull Queue
   */
  async processReminderJob(job: Job<ReminderJobPayload>): Promise<ReminderJobResult> {
    const { organizationId, appointmentId, reminderType, trigger, language } = job.data;

    logger.info(`Processing reminder job ${job.id}:`, {
      organizationId,
      appointmentId,
      reminderType,
      trigger,
      attempt: job.attemptsMade + 1
    });

    try {
      // Step 1: Fetch appointment and patient data
      const appointmentData = await this.fetchAppointmentData(organizationId, appointmentId);
      
      if (!appointmentData) {
        logger.warn(`Appointment ${appointmentId} not found, marking reminder as failed`);
        await this.updateReminderStatus(job.id as string, ReminderStatus.FAILED, 'Appointment not found');
        return {
          success: false,
          error: 'Appointment not found',
          reminderId: job.id as string
        };
      }

      // Check if appointment is cancelled or completed
      if (['cancelled', 'completed'].includes(appointmentData.status.toLowerCase())) {
        logger.info(`Appointment ${appointmentId} is ${appointmentData.status}, skipping reminder`);
        await this.updateReminderStatus(job.id as string, ReminderStatus.SKIPPED, `Appointment ${appointmentData.status}`);
        return {
          success: true,
          skipped: true,
          skipReason: `Appointment ${appointmentData.status}`,
          reminderId: job.id as string
        };
      }

      // Step 2: Check notification settings (TASK-040A integration)
      const shouldSend = await this.checkNotificationSettings(
        organizationId,
        reminderType,
        appointmentData.patient.phone
      );

      if (!shouldSend.allowed) {
        logger.info(`Reminder disabled by notification settings: ${shouldSend.reason}`);
        await this.updateReminderStatus(job.id as string, ReminderStatus.SKIPPED, shouldSend.reason);
        
        // Track cost savings
        await this.trackCostSavings(organizationId, reminderType, trigger);

        return {
          success: true,
          skipped: true,
          skipReason: shouldSend.reason,
          reminderId: job.id as string
        };
      }

      // Step 3: Generate message from template
      const messageContent = await this.generateReminderMessage(
        reminderType,
        language || appointmentData.patient.language || 'en',
        appointmentData,
        job.data.customMessage
      );

      // Step 4: Send via WhatsApp
      const sendResult = await this.sendWhatsAppReminder(
        organizationId,
        appointmentData.patient.phone,
        messageContent,
        reminderType
      );

      if (!sendResult.success) {
        logger.error(`Failed to send reminder for appointment ${appointmentId}:`, sendResult.error);
        
        // Update reminder with error
        await this.updateReminderStatus(
          job.id as string,
          ReminderStatus.FAILED,
          sendResult.error,
          job.attemptsMade + 1
        );

        // Track cost
        await this.trackMessageCost(organizationId, reminderType, trigger, false, sendResult.error);

        return {
          success: false,
          error: sendResult.error,
          reminderId: job.id as string
        };
      }

      // Step 5: Update reminder status to SENT
      await this.updateReminderStatus(
        job.id as string,
        ReminderStatus.SENT,
        undefined,
        job.attemptsMade + 1,
        sendResult.messageId
      );

      // Step 6: Update appointment reminder flags
      await this.updateAppointmentReminderFlag(appointmentId, reminderType);

      // Step 7: Track message cost
      await this.trackMessageCost(organizationId, reminderType, trigger, true);

      logger.info(`Successfully sent reminder ${job.id} for appointment ${appointmentId}`);

      return {
        success: true,
        reminderId: job.id as string,
        messageId: sendResult.messageId
      };

    } catch (error: any) {
      logger.error(`Error processing reminder job ${job.id}:`, error);

      // Update reminder with error
      try {
        await this.updateReminderStatus(
          job.id as string,
          ReminderStatus.FAILED,
          error.message,
          job.attemptsMade + 1
        );
      } catch (updateError) {
        logger.error('Failed to update reminder status:', updateError);
      }

      // Track failed message
      await this.trackMessageCost(organizationId, reminderType, trigger, false, error.message);

      return {
        success: false,
        error: error.message,
        reminderId: job.id as string
      };
    }
  }

  /**
   * Fetch appointment data from database (with Google Sheets fallback)
   */
  private async fetchAppointmentData(organizationId: string, appointmentId: string): Promise<any | null> {
    try {
      const prisma = getPrismaClient();
      
      const appointment = await prisma.appointment.findFirst({
        where: {
          id: appointmentId,
          organizationId: organizationId
        },
        include: {
          patient: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true,
              preferredLanguage: true
            }
          },
          provider: {
            select: {
              firstName: true,
              lastName: true,
              specialization: true
            }
          },
          organization: {
            select: {
              name: true,
              address: true,
              phone: true
            }
          }
        }
      });

      if (!appointment) {
        // Fallback: try reading from Google Sheets
        logger.debug(`Appointment ${appointmentId} not in PostgreSQL, trying Google Sheets fallback`);
        // TODO: Implement Google Sheets fallback if needed
        return null;
      }

      // Transform to expected format
      return {
        id: appointment.id,
        status: appointment.status || 'SCHEDULED',
        appointmentDate: appointment.scheduledAt,
        appointmentTime: appointment.scheduledAt,
        duration: appointment.duration || 30,
        patient: {
          id: appointment.patient.id,
          name: `${appointment.patient.firstName} ${appointment.patient.lastName}`,
          firstName: appointment.patient.firstName,
          lastName: appointment.patient.lastName,
          phone: appointment.patient.phone,
          language: appointment.patient.preferredLanguage || 'en'
        },
        provider: {
          name: `${appointment.provider.firstName || ''} ${appointment.provider.lastName || ''}`.trim(),
          specialization: appointment.provider.specialization
        },
        clinic: {
          name: appointment.organization.name,
          address: appointment.organization.address,
          phone: appointment.organization.phone
        }
      };

    } catch (error) {
      logger.error(`Error fetching appointment ${appointmentId}:`, error);
      return null;
    }
  }

  /**
   * Check notification settings (TASK-040A integration)
   */
  private async checkNotificationSettings(
    organizationId: string,
    reminderType: ReminderType,
    patientPhone: string
  ): Promise<{ allowed: boolean; reason?: string }> {
    try {
      // Get notification settings for organization
      const settings = await notificationSettingsService.getSettings(organizationId);

      if (!settings) {
        // No settings = allow by default (fail-open approach)
        logger.debug(`No notification settings found for org ${organizationId}, allowing reminder`);
        return { allowed: true };
      }

      // Map ReminderType to notification setting field
      const settingKey = this.mapReminderTypeToSetting(reminderType);

      // Check if reminder type is enabled
      if (!settings[settingKey]) {
        return {
          allowed: false,
          reason: `${settingKey} disabled in notification settings`
        };
      }

      // Check quiet hours
      if (settings.quietHoursEnabled) {
        const now = new Date();
        const isQuietHour = this.isWithinQuietHours(
          now,
          settings.quietHoursStart,
          settings.quietHoursEnd
        );

        if (isQuietHour) {
          return {
            allowed: false,
            reason: 'Within quiet hours'
          };
        }
      }

      // Check spending cap
      if (settings.monthlyCap && settings.currentMonthSpend) {
        const capReached = Number(settings.currentMonthSpend) >= Number(settings.monthlyCap);
        
        if (capReached) {
          return {
            allowed: false,
            reason: 'Monthly spending cap reached'
          };
        }
      }

      // All checks passed
      return { allowed: true };

    } catch (error) {
      logger.error('Error checking notification settings:', error);
      // Fail-open: allow reminder if settings check fails
      return { allowed: true };
    }
  }

  /**
   * Map ReminderType to notification settings field
   */
  private mapReminderTypeToSetting(reminderType: ReminderType): string {
    const mapping: Record<ReminderType, string> = {
      [ReminderType.REMINDER_24H]: 'remindersEnabled',
      [ReminderType.REMINDER_2H]: 'remindersEnabled',
      [ReminderType.REMINDER_30MIN]: 'remindersEnabled',
      [ReminderType.FOLLOWUP_SAME_DAY]: 'followUpsEnabled',
      [ReminderType.FOLLOWUP_NEXT_DAY]: 'followUpsEnabled',
      [ReminderType.NO_SHOW_FOLLOWUP]: 'followUpsEnabled'
    };

    return mapping[reminderType] || 'remindersEnabled';
  }

  /**
   * Check if current time is within quiet hours
   */
  private isWithinQuietHours(now: Date, startTime?: string | null, endTime?: string | null): boolean {
    if (!startTime || !endTime) return false;

    try {
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      const [startHour, startMin] = startTime.split(':').map(Number);
      const [endHour, endMin] = endTime.split(':').map(Number);
      
      const startMinutes = startHour * 60 + startMin;
      const endMinutes = endHour * 60 + endMin;

      // Handle overnight quiet hours (e.g., 22:00 to 08:00)
      if (startMinutes > endMinutes) {
        return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
      }

      return currentMinutes >= startMinutes && currentMinutes <= endMinutes;

    } catch (error) {
      logger.error('Error checking quiet hours:', error);
      return false;
    }
  }

  /**
   * Generate reminder message using template service
   */
  private async generateReminderMessage(
    reminderType: ReminderType,
    language: 'en' | 'ur',
    appointmentData: any,
    customMessage?: string
  ): Promise<string> {
    try {
      const variables: TemplateVariables = {
        patientName: appointmentData.patient.firstName,
        doctorName: appointmentData.provider.name,
        doctorTitle: 'Dr.',
        clinicName: appointmentData.clinic.name,
        clinicAddress: appointmentData.clinic.address || '',
        clinicPhone: appointmentData.clinic.phone || '',
        appointmentDate: new Date(appointmentData.appointmentDate),
        appointmentTime: this.formatTime(appointmentData.appointmentTime),
        appointmentDuration: appointmentData.duration
      };

      return reminderTemplateService.generateMessage(
        reminderType,
        language,
        variables,
        customMessage
      );

    } catch (error) {
      logger.error('Error generating reminder message:', error);
      // Fallback to simple message
      return `Reminder: Your appointment is scheduled. Please contact ${appointmentData.clinic.name} for details.`;
    }
  }

  /**
   * Format time string
   */
  private formatTime(timeString: any): string {
    try {
      if (timeString instanceof Date) {
        return timeString.toLocaleTimeString('en-US', { 
          hour: 'numeric', 
          minute: '2-digit',
          hour12: true 
        });
      }
      return String(timeString);
    } catch (error) {
      return String(timeString);
    }
  }

  /**
   * Send reminder via WhatsApp
   */
  private async sendWhatsAppReminder(
    organizationId: string,
    phoneNumber: string,
    message: string,
    reminderType: ReminderType
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const result = await whatsappService.sendMessage(organizationId, {
        to: phoneNumber,
        type: 'text',
        text: { body: message }
      });

      if (result.success) {
        return {
          success: true,
          messageId: result.messageId
        };
      } else {
        return {
          success: false,
          error: result.error || 'Unknown WhatsApp error'
        };
      }

    } catch (error: any) {
      logger.error('Error sending WhatsApp reminder:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Update reminder status in database
   */
  private async updateReminderStatus(
    reminderId: string,
    status: ReminderStatus,
    errorMessage?: string,
    attempts?: number,
    messageId?: string
  ): Promise<void> {
    try {
      const prisma = getPrismaClient();
      
      await prisma.appointmentReminder.update({
        where: { id: reminderId },
        data: {
          status,
          sentAt: status === ReminderStatus.SENT ? new Date() : undefined,
          messageId,
          attempts: attempts || 0,
          lastAttemptAt: new Date(),
          errorMessage: errorMessage || null,
          skipReason: status === ReminderStatus.SKIPPED ? errorMessage : null,
          updatedAt: new Date()
        }
      });

    } catch (error) {
      logger.error(`Error updating reminder ${reminderId} status:`, error);
      throw error;
    }
  }

  /**
   * Update appointment reminder flag
   */
  private async updateAppointmentReminderFlag(
    appointmentId: string,
    reminderType: ReminderType
  ): Promise<void> {
    try {
      const prisma = getPrismaClient();

      // Update appropriate flag based on reminder type
      if ([ReminderType.REMINDER_24H, ReminderType.REMINDER_2H, ReminderType.REMINDER_30MIN].includes(reminderType)) {
        await prisma.appointment.update({
          where: { id: appointmentId },
          data: {
            reminderSent: true,
            reminderSentAt: new Date()
          }
        });
      } else if ([ReminderType.FOLLOWUP_SAME_DAY, ReminderType.FOLLOWUP_NEXT_DAY].includes(reminderType)) {
        await prisma.appointment.update({
          where: { id: appointmentId },
          data: {
            followUpSent: true,
            followUpSentAt: new Date()
          }
        });
      }

    } catch (error) {
      logger.error(`Error updating appointment ${appointmentId} flags:`, error);
      // Don't throw - this is not critical
    }
  }

  /**
   * Track message cost (TASK-040A integration)
   */
  private async trackMessageCost(
    organizationId: string,
    reminderType: ReminderType,
    trigger: string,
    sent: boolean,
    errorMessage?: string
  ): Promise<void> {
    try {
      // Cost per message (PKR)
      const costPerMessage = 0.50;

      const prisma = getPrismaClient();

      // Create cost tracking record
      await prisma.$executeRaw`
        INSERT INTO message_cost_tracking (
          id, organization_id, message_type, trigger, sent, 
          skip_reason, cost, sent_at
        ) VALUES (
          gen_random_uuid(), 
          ${organizationId}::uuid, 
          ${reminderType}, 
          ${trigger}, 
          ${sent}, 
          ${errorMessage || null}, 
          ${sent ? costPerMessage : 0}, 
          NOW()
        )
      `;

      // Update notification settings current spend if sent
      if (sent) {
        await prisma.$executeRaw`
          UPDATE notification_settings 
          SET current_month_spend = current_month_spend + ${costPerMessage},
              updated_at = NOW()
          WHERE organization_id = ${organizationId}::uuid
        `;
      }

    } catch (error) {
      logger.error('Error tracking message cost:', error);
      // Don't throw - this is not critical
    }
  }

  /**
   * Track cost savings from skipped messages
   */
  private async trackCostSavings(
    organizationId: string,
    reminderType: ReminderType,
    trigger: string
  ): Promise<void> {
    // Track as not sent with reason
    await this.trackMessageCost(organizationId, reminderType, trigger, false, 'Disabled by settings');
  }

  /**
   * Get processor statistics
   */
  async getStatistics(): Promise<any> {
    try {
      const queueStats = await reminderQueueService.getQueueStats();
      
      const prisma = getPrismaClient();
      
      // Get database statistics
      const [totalReminders, sentReminders, failedReminders, skippedReminders] = await Promise.all([
        prisma.appointmentReminder.count(),
        prisma.appointmentReminder.count({ where: { status: ReminderStatus.SENT } }),
        prisma.appointmentReminder.count({ where: { status: ReminderStatus.FAILED } }),
        prisma.appointmentReminder.count({ where: { status: ReminderStatus.SKIPPED } })
      ]);

      return {
        queues: queueStats,
        database: {
          total: totalReminders,
          sent: sentReminders,
          failed: failedReminders,
          skipped: skippedReminders,
          successRate: totalReminders > 0 ? ((sentReminders / totalReminders) * 100).toFixed(2) + '%' : '0%'
        }
      };

    } catch (error) {
      logger.error('Error getting processor statistics:', error);
      return { error: 'Failed to fetch statistics' };
    }
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down reminder processor service...');
    await reminderQueueService.shutdown();
    logger.info('Reminder processor service shut down successfully');
  }
}

// Export singleton instance
export default new ReminderProcessorService();
