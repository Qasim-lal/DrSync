/**
 * Reminder Service - Google Sheets Primary Data Source
 * 
 * Handles appointment reminders, follow-ups, and patient communications by
 * reading appointment data from Google Sheets (primary data source) and
 * coordinating with WhatsApp service for message delivery.
 * 
 * Architecture:
 * - Reads appointment data from Google Sheets first
 * - Falls back to PostgreSQL cache if Google Sheets unavailable
 * - Coordinates with WhatsApp service for message delivery
 * - Updates reminder status in both Google Sheets and PostgreSQL
 * 
 * Features:
 * 1. 24-hour appointment reminders
 * 2. Post-appointment follow-ups
 * 3. Medication reminders (future)
 * 4. Wellness check-ins (future)
 * 5. Multi-language support
 * 6. Template-based messaging
 * 
 * @version 1.0
 * @author DrSync Development Team
 * @date September 12, 2025
 */

import { v4 as uuidv4 } from 'uuid';
import cron from 'node-cron';
import { Prisma } from '../generated/prisma';
import { logger } from '../utils/logger';
import getPrismaClient from './prisma';
import whatsappService from './whatsappService';
import googleSheetsService from './googleSheetsService';

// Types for reminder operations
interface ReminderData {
  id: string;
  organizationId: string;
  patientId: string;
  appointmentId: string;
  reminderType: 'APPOINTMENT_REMINDER' | 'FOLLOW_UP' | 'MEDICATION' | 'WELLNESS_CHECK';
  scheduledFor: Date;
  language: string;
  templateName: string;
  templateParams: any;
  status: 'PENDING' | 'SENT' | 'FAILED' | 'CANCELLED';
  attempts: number;
  maxAttempts: number;
  createdAt: Date;
  updatedAt: Date;
}

interface AppointmentForReminder {
  id: string;
  patientId: string;
  providerId: string;
  organizationId: string;
  scheduledAt: Date;
  duration: number;
  status: string;
  title: string | undefined;
  reminderSent: boolean;
  followUpSent: boolean;
  patient?: {
    firstName: string;
    lastName: string;
    phone: string;
    preferredLanguage: string;
  };
  provider?: {
    firstName: string;
    lastName: string;
    title?: string | undefined;
  };
}

interface ReminderStats {
  totalReminders: number;
  remindersSent: number;
  remindersFailed: number;
  followUpsSent: number;
  processingTime: number;
}

class ReminderService {
  private processingInProgress: boolean = false;
  private reminderCronJob: any = null;
  private followUpCronJob: any = null;

  constructor() {
    this.initializeScheduledJobs();
  }

  /**
   * Initialize scheduled reminder jobs
   */
  private initializeScheduledJobs(): void {
    // Process appointment reminders every hour
    this.reminderCronJob = cron.schedule('0 * * * *', async () => {
      logger.info('Starting scheduled reminder processing job');
      await this.processAppointmentReminders();
    }, {
      scheduled: true,
      timezone: 'UTC'
    });

    // Process follow-ups every 4 hours
    this.followUpCronJob = cron.schedule('0 */4 * * *', async () => {
      logger.info('Starting scheduled follow-up processing job');
      await this.processFollowUps();
    }, {
      scheduled: true,
      timezone: 'UTC'
    });

    logger.info('Reminder service scheduled jobs initialized');
  }

  /**
   * Process appointment reminders (24 hours before)
   */
  async processAppointmentReminders(): Promise<ReminderStats> {
    if (this.processingInProgress) {
      logger.debug('Reminder processing already in progress, skipping');
      return { totalReminders: 0, remindersSent: 0, remindersFailed: 0, followUpsSent: 0, processingTime: 0 };
    }

    this.processingInProgress = true;
    const startTime = Date.now();

    try {
      logger.info('Processing appointment reminders from Google Sheets data');

      const stats: ReminderStats = {
        totalReminders: 0,
        remindersSent: 0,
        remindersFailed: 0,
        followUpsSent: 0,
        processingTime: 0
      };

      // Get all active organizations
      const prisma = getPrismaClient();
      const organizations = await prisma.organization.findMany({
        where: {
          isActive: true,
          googleSheetsId: { not: null },
          whatsappCredentials: { not: Prisma.JsonNull }
        },
        select: { id: true, name: true, timezone: true }
      });

      for (const org of organizations) {
        try {
          const orgStats = await this.processOrganizationReminders(org.id);
          stats.totalReminders += orgStats.totalReminders;
          stats.remindersSent += orgStats.remindersSent;
          stats.remindersFailed += orgStats.remindersFailed;
        } catch (error) {
          logger.error(`Error processing reminders for organization ${org.id}:`, error);
        }
      }

      stats.processingTime = Date.now() - startTime;
      logger.info(`Reminder processing completed: ${stats.remindersSent}/${stats.totalReminders} sent, ${stats.remindersFailed} failed, ${stats.processingTime}ms`);

      return stats;

    } finally {
      this.processingInProgress = false;
    }
  }

  /**
   * Process reminders for specific organization
   */
  private async processOrganizationReminders(organizationId: string): Promise<ReminderStats> {
    const stats: ReminderStats = {
      totalReminders: 0,
      remindersSent: 0,
      remindersFailed: 0,
      followUpsSent: 0,
      processingTime: 0
    };

    try {
      // Calculate reminder window (24 hours from now)
      const now = new Date();
      const reminderStart = new Date(now.getTime() + 23 * 60 * 60 * 1000); // 23 hours from now
      const reminderEnd = new Date(now.getTime() + 25 * 60 * 60 * 1000);   // 25 hours from now

      // Try to read appointments from Google Sheets first
      let appointmentsForReminder: AppointmentForReminder[] = [];

      try {
        appointmentsForReminder = await this.getAppointmentsFromGoogleSheets(
          organizationId,
          reminderStart,
          reminderEnd,
          { needsReminder: true }
        );
        logger.debug(`Read ${appointmentsForReminder.length} appointments from Google Sheets for reminder processing`);
      } catch (error) {
        logger.warn('Failed to read appointments from Google Sheets for reminders, using PostgreSQL fallback:', error);
        
        // Fallback to PostgreSQL
        appointmentsForReminder = await this.getAppointmentsFromPostgreSQL(
          organizationId,
          reminderStart,
          reminderEnd,
          { needsReminder: true }
        );
        logger.debug(`Fallback: Read ${appointmentsForReminder.length} appointments from PostgreSQL for reminder processing`);
      }

      stats.totalReminders = appointmentsForReminder.length;

      // Process each appointment
      for (const appointment of appointmentsForReminder) {
        try {
          const reminderResult = await this.sendAppointmentReminder(appointment);
          if (reminderResult.success) {
            stats.remindersSent++;
          } else {
            stats.remindersFailed++;
          }
        } catch (error) {
          logger.error(`Error sending reminder for appointment ${appointment.id}:`, error);
          stats.remindersFailed++;
        }
      }

      return stats;

    } catch (error) {
      logger.error(`Error processing organization reminders for ${organizationId}:`, error);
      throw error;
    }
  }

  /**
   * Read appointments from Google Sheets for reminder processing
   */
  private async getAppointmentsFromGoogleSheets(
    organizationId: string,
    startTime: Date,
    endTime: Date,
    _options: { needsReminder?: boolean; needsFollowUp?: boolean } = {}
  ): Promise<AppointmentForReminder[]> {
    try {
      // Initialize Google Sheets credentials
      await googleSheetsService.initializeClientCredentials(organizationId);
      
      // This is a placeholder for actual Google Sheets reading implementation
      // In real implementation, this would:
      // 1. Read appointments from Google Sheets within the time range
      // 2. Filter by reminder status based on options
      // 3. Include patient and provider details
      // 4. Parse data into AppointmentForReminder objects
      
      logger.debug(`Reading appointments from Google Sheets for reminders (${startTime.toISOString()} to ${endTime.toISOString()})`);
      
      // For now, throw to use PostgreSQL fallback
      throw new Error('Google Sheets reminder reading not yet implemented - using PostgreSQL fallback');

    } catch (error) {
      logger.debug('Google Sheets appointment reading failed for reminders:', error);
      throw error;
    }
  }

  /**
   * Fallback: Read appointments from PostgreSQL for reminder processing
   */
  private async getAppointmentsFromPostgreSQL(
    organizationId: string,
    startTime: Date,
    endTime: Date,
    options: { needsReminder?: boolean; needsFollowUp?: boolean } = {}
  ): Promise<AppointmentForReminder[]> {
    try {
      const whereConditions: any = {
        organizationId,
        scheduledAt: {
          gte: startTime,
          lte: endTime
        },
        status: {
          in: ['SCHEDULED', 'CONFIRMED']
        }
      };

      if (options.needsReminder) {
        whereConditions.reminderSent = false;
      }

      if (options.needsFollowUp) {
        whereConditions.followUpSent = false;
        whereConditions.status = {
          in: ['COMPLETED']
        };
      }

      const prisma = getPrismaClient();
      const appointments = await prisma.appointment.findMany({
        where: whereConditions,
        include: {
          patient: {
            select: {
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
              title: true
            }
          }
        },
        orderBy: {
          scheduledAt: 'asc'
        }
      });

      return appointments.map(apt => ({
        id: apt.id,
        patientId: apt.patientId,
        providerId: apt.providerId,
        organizationId: apt.organizationId,
        scheduledAt: apt.scheduledAt,
        duration: apt.duration,
        status: apt.status,
        title: apt.title ?? undefined,
        reminderSent: apt.reminderSent,
        followUpSent: apt.followUpSent,
        patient: apt.patient,
        provider: {
          firstName: apt.provider?.firstName || '',
          lastName: apt.provider?.lastName || '',
          title: apt.provider?.title || undefined
        }
      }));

    } catch (error) {
      logger.error('Error reading appointments from PostgreSQL for reminders:', error);
      throw error;
    }
  }

  /**
   * Send appointment reminder via WhatsApp
   */
  private async sendAppointmentReminder(appointment: AppointmentForReminder): Promise<{ success: boolean; error?: string }> {
    try {
      if (!appointment.patient) {
        throw new Error('Patient information not available');
      }

      // Create reminder message content
      const reminderContent = this.generateReminderContent(appointment, 'APPOINTMENT_REMINDER');

      // Send via WhatsApp service
      const messageResult = await whatsappService.sendMessage(appointment.organizationId, {
        to: appointment.patient.phone,
        type: 'text',
        text: { body: reminderContent }
      });

      if (messageResult.success) {
        // Update reminder status in both Google Sheets and PostgreSQL
        await this.updateReminderStatus(appointment.organizationId, appointment.id, true, 'reminderSent');
        
        // Log the reminder
        await this.logReminder({
          id: uuidv4(),
          organizationId: appointment.organizationId,
          patientId: appointment.patientId,
          appointmentId: appointment.id,
          reminderType: 'APPOINTMENT_REMINDER',
          scheduledFor: appointment.scheduledAt,
          language: appointment.patient.preferredLanguage || 'en',
          templateName: 'appointment_reminder',
          templateParams: {
            patientName: `${appointment.patient.firstName} ${appointment.patient.lastName}`,
            providerName: `${appointment.provider?.title || 'Dr.'} ${appointment.provider?.firstName} ${appointment.provider?.lastName}`,
            appointmentTime: appointment.scheduledAt.toLocaleString(),
            appointmentTitle: appointment.title || 'Medical Consultation'
          },
          status: 'SENT',
          attempts: 1,
          maxAttempts: 3,
          createdAt: new Date(),
          updatedAt: new Date()
        });

        logger.info(`Appointment reminder sent successfully for ${appointment.id}`);
        return { success: true };
      } else {
        logger.error(`Failed to send appointment reminder for ${appointment.id}: ${messageResult.error}`);
        return { success: false, ...(messageResult.error && { error: messageResult.error }) };
      }

    } catch (error) {
      logger.error(`Error sending appointment reminder for ${appointment.id}:`, error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Process follow-up messages (post-appointment)
   */
  async processFollowUps(): Promise<ReminderStats> {
    try {
      logger.info('Processing appointment follow-ups');

      const stats: ReminderStats = {
        totalReminders: 0,
        remindersSent: 0,
        remindersFailed: 0,
        followUpsSent: 0,
        processingTime: 0
      };

      const startTime = Date.now();

      // Get completed appointments from last 24 hours that need follow-up
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const now = new Date();

      const prisma = getPrismaClient();
      const organizations = await prisma.organization.findMany({
        where: {
          isActive: true,
          googleSheetsId: { not: null }
        },
        select: { id: true }
      });

      for (const org of organizations) {
        try {
          const appointments = await this.getAppointmentsFromPostgreSQL(
            org.id,
            yesterday,
            now,
            { needsFollowUp: true }
          );

          for (const appointment of appointments) {
            if (appointment.status === 'COMPLETED' && !appointment.followUpSent) {
              const followUpResult = await this.sendFollowUp(appointment);
              if (followUpResult.success) {
                stats.followUpsSent++;
              } else {
                stats.remindersFailed++;
              }
            }
          }
        } catch (error) {
          logger.error(`Error processing follow-ups for organization ${org.id}:`, error);
        }
      }

      stats.processingTime = Date.now() - startTime;
      logger.info(`Follow-up processing completed: ${stats.followUpsSent} sent, ${stats.remindersFailed} failed`);

      return stats;

    } catch (error) {
      logger.error('Error processing follow-ups:', error);
      throw error;
    }
  }

  /**
   * Send follow-up message
   */
  private async sendFollowUp(appointment: AppointmentForReminder): Promise<{ success: boolean; error?: string }> {
    try {
      if (!appointment.patient) {
        throw new Error('Patient information not available');
      }

      const followUpContent = this.generateReminderContent(appointment, 'FOLLOW_UP');

      const messageResult = await whatsappService.sendMessage(appointment.organizationId, {
        to: appointment.patient.phone,
        type: 'text',
        text: { body: followUpContent }
      });

      if (messageResult.success) {
        await this.updateReminderStatus(appointment.organizationId, appointment.id, true, 'followUpSent');
        logger.info(`Follow-up sent successfully for appointment ${appointment.id}`);
        return { success: true };
      } else {
        return { success: false, ...(messageResult.error && { error: messageResult.error }) };
      }

    } catch (error) {
      logger.error(`Error sending follow-up for appointment ${appointment.id}:`, error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Generate reminder content based on type and language
   */
  private generateReminderContent(appointment: AppointmentForReminder, type: 'APPOINTMENT_REMINDER' | 'FOLLOW_UP'): string {
    const language = appointment.patient?.preferredLanguage || 'en';
    const patientName = `${appointment.patient?.firstName} ${appointment.patient?.lastName}`;
    const providerName = `${appointment.provider?.title || 'Dr.'} ${appointment.provider?.firstName} ${appointment.provider?.lastName}`;

    if (type === 'APPOINTMENT_REMINDER') {
      if (language === 'ur') {
        return `یاد دہانی: آپ کا ${appointment.scheduledAt.toLocaleTimeString()} بجے ${providerName} کے ساتھ اپائنٹمنٹ ہے۔\n\nمریض: ${patientName}\nتاریخ: ${appointment.scheduledAt.toDateString()}\nوقت: ${appointment.scheduledAt.toLocaleTimeString()}\n\nاگر آپ کو کینسل کرنا ہو تو براہ کرم پہلے سے بتا دیں۔`;
      } else {
        return `🔔 Appointment Reminder\n\nHi ${patientName},\n\nThis is a reminder that you have an appointment tomorrow:\n\n👨‍⚕️ Doctor: ${providerName}\n📅 Date: ${appointment.scheduledAt.toDateString()}\n⏰ Time: ${appointment.scheduledAt.toLocaleTimeString()}\n📍 Duration: ${appointment.duration} minutes\n\nPlease arrive 15 minutes early. If you need to reschedule, please let us know as soon as possible.\n\nThank you!`;
      }
    } else if (type === 'FOLLOW_UP') {
      if (language === 'ur') {
        return `${patientName} صاحب/صاحبہ،\n\nآپ کا ${providerName} کے ساتھ اپائنٹمنٹ مکمل ہو گیا۔ اگر آپ کے کوئی سوالات ہوں تو براہ کرم رابطہ کریں۔\n\nصحت یاب رہیں!`;
      } else {
        return `Hi ${patientName},\n\nThank you for visiting ${providerName} today. We hope your appointment went well.\n\nIf you have any questions about your treatment or need to schedule a follow-up, please don't hesitate to contact us.\n\nWishing you good health!`;
      }
    }

    return 'Message content not available';
  }

  /**
   * Update reminder status in both Google Sheets and PostgreSQL
   */
  private async updateReminderStatus(
    organizationId: string,
    appointmentId: string,
    sent: boolean,
    field: 'reminderSent' | 'followUpSent'
  ): Promise<void> {
    try {
      // Update Google Sheets first (primary data source)
      const updateData: any = {
        [field]: sent.toString(),
        updatedAt: new Date().toISOString()
      };

      if (field === 'reminderSent') {
        updateData.reminderSentAt = sent ? new Date().toISOString() : '';
      } else if (field === 'followUpSent') {
        updateData.followUpSentAt = sent ? new Date().toISOString() : '';
      }

      await googleSheetsService.updateAppointment(organizationId, appointmentId, updateData);

      // Update PostgreSQL cache
      const pgUpdateData: any = {
        [field]: sent,
        updatedAt: new Date(),
        lastSyncedAt: new Date()
      };

      if (field === 'reminderSent') {
        pgUpdateData.reminderSentAt = sent ? new Date() : null;
      } else if (field === 'followUpSent') {
        pgUpdateData.followUpSentAt = sent ? new Date() : null;
      }

      const prisma = getPrismaClient();
      await prisma.appointment.update({
        where: { id: appointmentId },
        data: pgUpdateData
      });

    } catch (error) {
      logger.error(`Error updating reminder status for appointment ${appointmentId}:`, error);
      // Don't throw - this shouldn't break the reminder flow
    }
  }

  /**
   * Log reminder activity
   */
  private async logReminder(reminderData: ReminderData): Promise<void> {
    try {
      // Log to database for tracking and analytics
      const prisma = getPrismaClient();
      await prisma.whatsAppMessage.create({
        data: {
          id: reminderData.id,
          organizationId: reminderData.organizationId,
          patientId: reminderData.patientId,
          appointmentId: reminderData.appointmentId,
          messageType: 'TEMPLATE',
          direction: 'OUTBOUND',
          status: reminderData.status === 'SENT' ? 'SENT' : 'FAILED',
          content: JSON.stringify(reminderData.templateParams),
          language: reminderData.language,
          templateName: reminderData.templateName,
          templateParams: reminderData.templateParams,
          createdAt: reminderData.createdAt,
          updatedAt: reminderData.updatedAt
        }
      });
    } catch (error) {
      logger.error('Error logging reminder:', error);
      // Don't throw - logging failure shouldn't break reminder flow
    }
  }

  /**
   * Manual trigger for reminder processing
   */
  async triggerManualReminderProcessing(): Promise<ReminderStats> {
    logger.info('Manual reminder processing triggered');
    return await this.processAppointmentReminders();
  }

  /**
   * Get reminder statistics
   */
  async getReminderStats(organizationId?: string): Promise<any> {
    try {
      const whereClause: any = {};
      if (organizationId) {
        whereClause.organizationId = organizationId;
      }

      const prisma = getPrismaClient();
      const stats = await prisma.whatsAppMessage.groupBy({
        by: ['status'],
        where: {
          ...whereClause,
          templateName: {
            in: ['appointment_reminder', 'follow_up']
          }
        },
        _count: {
          id: true
        }
      });

      const result: any = { total: 0 };
      stats.forEach(stat => {
        result[stat.status.toLowerCase()] = stat._count.id;
        result.total += stat._count.id;
      });

      return result;

    } catch (error) {
      logger.error('Error getting reminder stats:', error);
      return { total: 0, sent: 0, failed: 0, pending: 0 };
    }
  }

  /**
   * Stop scheduled jobs
   */
  stopScheduledJobs(): void {
    if (this.reminderCronJob) {
      this.reminderCronJob.stop();
    }
    if (this.followUpCronJob) {
      this.followUpCronJob.stop();
    }
    logger.info('Reminder service scheduled jobs stopped');
  }

  /**
   * Start scheduled jobs
   */
  startScheduledJobs(): void {
    if (this.reminderCronJob && !this.reminderCronJob.running) {
      this.reminderCronJob.start();
    }
    if (this.followUpCronJob && !this.followUpCronJob.running) {
      this.followUpCronJob.start();
    }
    logger.info('Reminder service scheduled jobs started');
  }
}

export const reminderService = new ReminderService();
export default reminderService;