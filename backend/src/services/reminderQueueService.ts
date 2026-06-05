/**
 * Reminder Queue Service - Bull Queue for Reminder Scheduling
 * 
 * Handles scheduling and processing of appointment reminders using Bull Queue.
 * Supports multiple reminder types with configurable timing and retry logic.
 * 
 * Features:
 * - Scheduled reminder jobs (24h, 2h, 30min before appointment)
 * - Follow-up reminders (same-day, 3-day, 7-day)
 * - Medication reminders (recurring)
 * - Duplicate prevention
 * - Retry logic with exponential backoff
 * - Integration with TASK-040A notification settings
 * 
 * @version 1.0
 * @author DrSync Development Team
 * @date December 4, 2025
 */

import Queue from 'bull';
import type { Job, JobOptions, Queue as QueueType } from 'bull';
import { logger } from '../utils/logger';
import getPrismaClient from './prisma';
import { ReminderType, ReminderStatus, ReminderTrigger } from '@prisma/client';
import { getRedisConnectionConfig } from '../config/redis';

// Queue configuration
const QUEUE_OPTIONS = {
  redis: getRedisConnectionConfig(),
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000 // 5 seconds initial delay
    },
    removeOnComplete: {
      age: 7 * 24 * 60 * 60 // Keep completed jobs for 7 days
    },
    removeOnFail: {
      age: 14 * 24 * 60 * 60 // Keep failed jobs for 14 days
    }
  }
};

// Job payload interface
export interface ReminderJobPayload {
  organizationId: string;
  appointmentId: string;
  reminderType: ReminderType;
  trigger: ReminderTrigger;
  sentBy?: string; // User ID for manual reminders
  scheduledFor: Date;
  language?: string;
  customMessage?: string;
}

// Job result interface
export interface ReminderJobResult {
  success: boolean;
  reminderId?: string;
  messageId?: string;
  error?: string;
  skipped?: boolean;
  skipReason?: string;
}

class ReminderQueueService {
  private appointmentReminderQueue: QueueType<ReminderJobPayload>;
  private followUpQueue: QueueType<ReminderJobPayload>;
  private medicationReminderQueue: QueueType<ReminderJobPayload>;
  private initialized: boolean = false;

  constructor() {
    // Initialize queues
    this.appointmentReminderQueue = new Queue<ReminderJobPayload>('appointment-reminders', QUEUE_OPTIONS);
    this.followUpQueue = new Queue<ReminderJobPayload>('follow-ups', QUEUE_OPTIONS);
    this.medicationReminderQueue = new Queue<ReminderJobPayload>('medication-reminders', QUEUE_OPTIONS);
    
    logger.info('Reminder queue service initialized');
  }

  /**
   * Initialize queue processors
   * Must be called after constructor to set up job processors
   */
  async initialize(
    reminderProcessor: (job: Job<ReminderJobPayload>) => Promise<ReminderJobResult>
  ): Promise<void> {
    if (this.initialized) {
      logger.warn('Reminder queue service already initialized');
      return;
    }

    // Process appointment reminders
    this.appointmentReminderQueue.process(10, async (job: Job<ReminderJobPayload>) => {
      logger.info(`Processing appointment reminder job: ${job.id} for appointment ${job.data.appointmentId}`);
      return await reminderProcessor(job);
    });

    // Process follow-ups
    this.followUpQueue.process(10, async (job: Job<ReminderJobPayload>) => {
      logger.info(`Processing follow-up job: ${job.id} for appointment ${job.data.appointmentId}`);
      return await reminderProcessor(job);
    });

    // Process medication reminders
    this.medicationReminderQueue.process(5, async (job: Job<ReminderJobPayload>) => {
      logger.info(`Processing medication reminder job: ${job.id}`);
      return await reminderProcessor(job);
    });

    // Set up event listeners
    this.setupEventListeners();

    this.initialized = true;
    logger.info('Reminder queue processors initialized with concurrency: appointment=10, followup=10, medication=5');
  }

  /**
   * Schedule an appointment reminder
   * 
   * @param payload - Reminder job payload
   * @param delay - Delay in milliseconds before sending reminder
   * @returns Job ID
   */
  async scheduleAppointmentReminder(
    payload: ReminderJobPayload,
    delay: number
  ): Promise<string> {
    try {
      // Check for duplicate reminder
      const duplicate = await this.checkDuplicateReminder(
        payload.organizationId,
        payload.appointmentId,
        payload.reminderType
      );

      if (duplicate) {
        logger.info(`Duplicate reminder found for appointment ${payload.appointmentId}, skipping`);
        return duplicate.id;
      }

      // Create reminder record in database
      const prisma = getPrismaClient();
      const reminder = await prisma.appointmentReminder.create({
        data: {
          organizationId: payload.organizationId,
          appointmentId: payload.appointmentId,
          reminderType: payload.reminderType,
          trigger: payload.trigger || ReminderTrigger.AUTOMATIC,
          ...(payload.sentBy && { sentBy: payload.sentBy }),
          scheduledFor: payload.scheduledFor,
          status: ReminderStatus.PENDING
        }
      });

      // Schedule job in Bull Queue
      const jobOptions: JobOptions = {
        delay,
        jobId: reminder.id,
        priority: this.getPriority(payload.reminderType)
      };

      const job = await this.appointmentReminderQueue.add(payload, jobOptions);

      logger.info(`Scheduled appointment reminder job ${job.id} for appointment ${payload.appointmentId} with delay ${delay}ms`);

      return job.id as string;

    } catch (error) {
      logger.error('Error scheduling appointment reminder:', error);
      throw error;
    }
  }

  /**
   * Schedule a follow-up reminder
   * 
   * @param payload - Reminder job payload
   * @param delay - Delay in milliseconds before sending follow-up
   * @returns Job ID
   */
  async scheduleFollowUp(
    payload: ReminderJobPayload,
    delay: number
  ): Promise<string> {
    try {
      // Create reminder record
      const prisma = getPrismaClient();
      const reminder = await prisma.appointmentReminder.create({
        data: {
          organizationId: payload.organizationId,
          appointmentId: payload.appointmentId,
          reminderType: payload.reminderType,
          trigger: ReminderTrigger.AUTOMATIC,
          scheduledFor: payload.scheduledFor,
          status: ReminderStatus.PENDING
        }
      });

      // Schedule job
      const job = await this.followUpQueue.add(payload, {
        delay,
        jobId: reminder.id,
        priority: 5
      });

      logger.info(`Scheduled follow-up job ${job.id} for appointment ${payload.appointmentId} with delay ${delay}ms`);

      return job.id as string;

    } catch (error) {
      logger.error('Error scheduling follow-up:', error);
      throw error;
    }
  }

  /**
   * Schedule a recurring medication reminder
   * 
   * @param payload - Reminder job payload
   * @param cronExpression - Cron expression for recurring schedule
   * @returns Job ID
   */
  async scheduleMedicationReminder(
    payload: ReminderJobPayload,
    cronExpression: string
  ): Promise<string> {
    try {
      // Schedule recurring job
      const job = await this.medicationReminderQueue.add(payload, {
        repeat: {
          cron: cronExpression
        },
        priority: 3
      });

      logger.info(`Scheduled recurring medication reminder job ${job.id} with cron: ${cronExpression}`);

      return job.id as string;

    } catch (error) {
      logger.error('Error scheduling medication reminder:', error);
      throw error;
    }
  }

  /**
   * Generic method to add reminder to appropriate queue
   * Used by scheduler and manual reminder endpoints
   */
  async addReminderToQueue(
    payload: Omit<ReminderJobPayload, 'scheduledFor'> & { scheduledFor?: Date },
    options?: { delay?: number; jobId?: string; priority?: number }
  ): Promise<string> {
    try {
      // Add scheduledFor if not provided
      const fullPayload: ReminderJobPayload = {
        ...payload,
        scheduledFor: payload.scheduledFor || new Date()
      } as ReminderJobPayload;

      // Determine which queue to use based on reminder type
      const queue = this.getQueueForReminderType(fullPayload.reminderType);

      // Set default priority if not provided
      const priority = options?.priority ?? this.getPriority(fullPayload.reminderType);

      const jobOptions: JobOptions = {
        delay: options?.delay || 0,
        jobId: options?.jobId,
        priority
      };

      const job = await queue.add(fullPayload, jobOptions);

      logger.info(`Added reminder job ${job.id} to queue`, {
        reminderType: fullPayload.reminderType,
        appointmentId: fullPayload.appointmentId,
        delay: options?.delay
      });

      return job.id as string;

    } catch (error) {
      logger.error('Error adding reminder to queue:', error);
      throw error;
    }
  }

  /**
   * Get the appropriate queue for a reminder type
   */
  private getQueueForReminderType(reminderType: ReminderType): QueueType<ReminderJobPayload> {
    // Follow-up reminders go to follow-up queue
    const followUpTypes: ReminderType[] = [
      ReminderType.FOLLOWUP_SAME_DAY,
      ReminderType.FOLLOWUP_NEXT_DAY,
      ReminderType.NO_SHOW_FOLLOWUP
    ];
    
    if (followUpTypes.includes(reminderType)) {
      return this.followUpQueue;
    }

    // All other reminders go to appointment reminder queue
    return this.appointmentReminderQueue;
  }

  /**
   * Cancel a scheduled reminder
   * 
   * @param reminderId - Reminder ID (job ID)
   * @returns Success status
   */
  async cancelReminder(reminderId: string): Promise<boolean> {
    try {
      // Try to find and remove from all queues
      const appointmentJob = await this.appointmentReminderQueue.getJob(reminderId);
      if (appointmentJob) {
        await appointmentJob.remove();
        logger.info(`Cancelled appointment reminder job ${reminderId}`);
      }

      const followUpJob = await this.followUpQueue.getJob(reminderId);
      if (followUpJob) {
        await followUpJob.remove();
        logger.info(`Cancelled follow-up job ${reminderId}`);
      }

      // Update database status
      const prisma = getPrismaClient();
      await prisma.appointmentReminder.update({
        where: { id: reminderId },
        data: {
          status: ReminderStatus.CANCELLED,
          updatedAt: new Date()
        }
      });

      return true;

    } catch (error) {
      logger.error(`Error cancelling reminder ${reminderId}:`, error);
      return false;
    }
  }

  /**
   * Check for duplicate reminder
   */
  private async checkDuplicateReminder(
    organizationId: string,
    appointmentId: string,
    reminderType: ReminderType
  ): Promise<{ id: string } | null> {
    try {
      const prisma = getPrismaClient();
      const existing = await prisma.appointmentReminder.findFirst({
        where: {
          organizationId,
          appointmentId,
          reminderType,
          status: {
            in: [ReminderStatus.PENDING, ReminderStatus.SENT]
          }
        },
        select: { id: true }
      });

      return existing;

    } catch (error) {
      logger.error('Error checking duplicate reminder:', error);
      return null;
    }
  }

  /**
   * Get priority for reminder type
   */
  private getPriority(reminderType: ReminderType): number {
    const priorityMap: Record<ReminderType, number> = {
      [ReminderType.REMINDER_30MIN]: 1, // Highest priority
      [ReminderType.REMINDER_2H]: 2,
      [ReminderType.REMINDER_24H]: 3,
      [ReminderType.FOLLOWUP_SAME_DAY]: 4,
      [ReminderType.FOLLOWUP_NEXT_DAY]: 5,
      [ReminderType.NO_SHOW_FOLLOWUP]: 6
    };

    return priorityMap[reminderType] || 5;
  }

  /**
   * Setup event listeners for job lifecycle
   */
  private setupEventListeners(): void {
    // Appointment reminder events
    this.appointmentReminderQueue.on('completed', (job: Job, result: ReminderJobResult) => {
      logger.info(`Appointment reminder job ${job.id} completed`, {
        success: result.success,
        reminderId: result.reminderId,
        skipped: result.skipped
      });
    });

    this.appointmentReminderQueue.on('failed', (job: Job, error: Error) => {
      logger.error(`Appointment reminder job ${job.id} failed:`, {
        error: error.message,
        appointmentId: job.data.appointmentId,
        attempts: job.attemptsMade
      });
    });

    this.appointmentReminderQueue.on('stalled', (job: Job) => {
      logger.warn(`Appointment reminder job ${job.id} stalled`);
    });

    // Follow-up events
    this.followUpQueue.on('completed', (job: Job, result: ReminderJobResult) => {
      logger.info(`Follow-up job ${job.id} completed`, {
        success: result.success,
        skipped: result.skipped
      });
    });

    this.followUpQueue.on('failed', (job: Job, error: Error) => {
      logger.error(`Follow-up job ${job.id} failed:`, error.message);
    });

    // Medication reminder events
    this.medicationReminderQueue.on('completed', (job: Job) => {
      logger.info(`Medication reminder job ${job.id} completed`);
    });

    this.medicationReminderQueue.on('failed', (job: Job, error: Error) => {
      logger.error(`Medication reminder job ${job.id} failed:`, error.message);
    });

    logger.info('Queue event listeners configured');
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(): Promise<{
    appointmentReminders: { waiting: number; active: number; completed: number; failed: number };
    followUps: { waiting: number; active: number; completed: number; failed: number };
    medicationReminders: { waiting: number; active: number; completed: number; failed: number };
  }> {
    const [appointmentCounts, followUpCounts, medicationCounts] = await Promise.all([
      this.appointmentReminderQueue.getJobCounts(),
      this.followUpQueue.getJobCounts(),
      this.medicationReminderQueue.getJobCounts()
    ]);

    return {
      appointmentReminders: appointmentCounts,
      followUps: followUpCounts,
      medicationReminders: medicationCounts
    };
  }

  /**
   * Clean up old completed jobs
   */
  async cleanOldJobs(olderThanDays: number = 7): Promise<void> {
    try {
      const olderThan = Date.now() - (olderThanDays * 24 * 60 * 60 * 1000);

      await Promise.all([
        this.appointmentReminderQueue.clean(olderThan, 'completed'),
        this.appointmentReminderQueue.clean(olderThan, 'failed'),
        this.followUpQueue.clean(olderThan, 'completed'),
        this.followUpQueue.clean(olderThan, 'failed'),
        this.medicationReminderQueue.clean(olderThan, 'completed'),
        this.medicationReminderQueue.clean(olderThan, 'failed')
      ]);

      logger.info(`Cleaned jobs older than ${olderThanDays} days`);

    } catch (error) {
      logger.error('Error cleaning old jobs:', error);
    }
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down reminder queue service...');

    await Promise.all([
      this.appointmentReminderQueue.close(),
      this.followUpQueue.close(),
      this.medicationReminderQueue.close()
    ]);

    logger.info('Reminder queue service shut down successfully');
  }
}

// Export singleton instance
export default new ReminderQueueService();
