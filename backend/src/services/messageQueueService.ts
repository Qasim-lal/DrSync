/**
 * Message Queue Service - TASK-040
 * 
 * Bull Queue implementation for asynchronous WhatsApp message processing.
 * Ensures webhook responds to Meta within 20 seconds while processing
 * messages in the background.
 * 
 * Features:
 * - Async message processing with Bull Queue
 * - Redis-backed job queue
 * - Retry mechanism (3 attempts, exponential backoff)
 * - Concurrent processing (10 workers)
 * - Performance monitoring (<1s target)
 * - Priority-based queuing
 * 
 * @version 1.1
 * @date October 20, 2025
 */

import Queue, { Job, JobOptions } from 'bull';
import Redis from 'ioredis';
import logger from '../utils/logger';

// Message job data structure
export interface MessageJobData {
  messageId: string;
  organizationId: string;
  phoneNumber: string;
  messageText: string;
  timestamp: string;
  metadata?: {
    phoneNumberId?: string;
    displayName?: string;
    messageType?: string;
  };
  priority?: 'high' | 'normal' | 'low';
}

// Job result structure
export interface MessageJobResult {
  success: boolean;
  messageId: string;
  processingTimeMs: number;
  intent?: string;
  language?: string;
  error?: string;
  response?: string; // WhatsApp response message
  retryable?: boolean; // Whether error is retryable
}

// Queue statistics
export interface QueueStats {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: boolean;
}

class MessageQueueService {
  private queue: Queue.Queue<MessageJobData>;
  private redis: Redis;
  private readonly QUEUE_NAME = 'whatsapp-messages';
  private readonly CONCURRENCY = 10; // Process 10 messages simultaneously (optimized from 5)
  private readonly MAX_ATTEMPTS = 3;
  private readonly BACKOFF_DELAY = 2000; // 2 seconds base delay
  private isProcessing = false;

  constructor() {
    // Build Redis URL with password if available
    const redisPassword = process.env.REDIS_PASSWORD;
    const redisHost = process.env.REDIS_HOST || 'localhost';
    const redisPort = process.env.REDIS_PORT || '6379';
    
    const redisConfig: any = {
      host: redisHost,
      port: parseInt(redisPort),
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    };

    // Add password only if it exists
    if (redisPassword) {
      redisConfig.password = redisPassword;
    }

    // Initialize Redis client
    this.redis = new Redis(redisConfig);

    // Initialize Bull Queue with same config
    this.queue = new Queue<MessageJobData>(this.QUEUE_NAME, {
      redis: redisConfig,
      defaultJobOptions: {
        attempts: this.MAX_ATTEMPTS,
        backoff: {
          type: 'exponential',
          delay: this.BACKOFF_DELAY,
        },
        timeout: 30000, // 30 seconds timeout
        removeOnComplete: {
          age: 3600, // Keep completed jobs for 1 hour
          count: 1000, // Keep last 1000 completed jobs
        },
        removeOnFail: false, // Keep failed jobs for debugging
      },
    });

    this.setupEventHandlers();
    logger.info('[MessageQueue] Service initialized');
  }

  /**
   * Setup queue event handlers for monitoring
   */
  private setupEventHandlers(): void {
    // Job completed successfully
    this.queue.on('completed', (job: Job<MessageJobData>, result: MessageJobResult) => {
      logger.info('[MessageQueue] Job completed', {
        jobId: job.id,
        messageId: result.messageId,
        processingTimeMs: result.processingTimeMs,
        intent: result.intent,
      });
    });

    // Job failed
    this.queue.on('failed', (job: Job<MessageJobData> | undefined, error: Error) => {
      logger.error('[MessageQueue] Job failed', {
        jobId: job?.id,
        messageId: job?.data.messageId,
        attempt: job?.attemptsMade,
        maxAttempts: this.MAX_ATTEMPTS,
        error: error.message,
      });
    });

    // Job progress update
    this.queue.on('progress', (job: Job<MessageJobData>, progress: number) => {
      logger.debug('[MessageQueue] Job progress', {
        jobId: job.id,
        messageId: job.data.messageId,
        progress: `${progress}%`,
      });
    });

    // Job stalled (taking too long)
    this.queue.on('stalled', (job: Job<MessageJobData>) => {
      logger.warn('[MessageQueue] Job stalled', {
        jobId: job.id,
        messageId: job.data.messageId,
      });
    });

    // Queue error
    this.queue.on('error', (error: Error) => {
      logger.error('[MessageQueue] Queue error', { error: error.message });
    });

    logger.info('[MessageQueue] Event handlers configured');
  }

  /**
   * Add a message to the processing queue
   * 
   * @param data Message job data
   * @returns Job ID
   */
  public async enqueue(data: MessageJobData): Promise<string> {
    try {
      const startTime = Date.now();

      // Determine job priority
      const priority = this.getJobPriority(data.priority);

      // Job options
      const jobOptions: JobOptions = {
        priority,
        jobId: data.messageId, // Use message ID as job ID for idempotency
      };

      // Add to queue
      const job = await this.queue.add(data, jobOptions);

      const enqueueTime = Date.now() - startTime;
      logger.info('[MessageQueue] Message enqueued', {
        jobId: job.id,
        messageId: data.messageId,
        organizationId: data.organizationId,
        phoneNumber: data.phoneNumber,
        priority: data.priority || 'normal',
        enqueueTimeMs: enqueueTime,
      });

      return job.id?.toString() || data.messageId;
    } catch (error: any) {
      logger.error('[MessageQueue] Failed to enqueue message', {
        messageId: data.messageId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Start processing messages from the queue
   * 
   * @param processor Message processing function
   */
  public startProcessing(
    processor: (job: Job<MessageJobData>) => Promise<MessageJobResult>
  ): void {
    if (this.isProcessing) {
      logger.warn('[MessageQueue] Already processing messages');
      return;
    }

    this.queue.process(this.CONCURRENCY, async (job: Job<MessageJobData>) => {
      const startTime = Date.now();

      try {
        // Update progress: Started
        await job.progress(10);

        logger.info('[MessageQueue] Processing message', {
          jobId: job.id,
          messageId: job.data.messageId,
          organizationId: job.data.organizationId,
          attempt: job.attemptsMade + 1,
          maxAttempts: this.MAX_ATTEMPTS,
        });

        // Process the message
        const result = await processor(job);

        // Update progress: Completed
        await job.progress(100);

        const processingTime = Date.now() - startTime;
        result.processingTimeMs = processingTime;

        // Performance warning if >1 second (TASK-040 target)
        if (processingTime > 1000) {
          logger.warn('[MessageQueue] Slow message processing', {
            jobId: job.id,
            messageId: job.data.messageId,
            processingTimeMs: processingTime,
            target: '1000ms',
          });
        }

        return result;
      } catch (error: any) {
        const processingTime = Date.now() - startTime;
        logger.error('[MessageQueue] Message processing failed', {
          jobId: job.id,
          messageId: job.data.messageId,
          processingTimeMs: processingTime,
          error: error.message,
          stack: error.stack,
        });

        // Return error result
        return {
          success: false,
          messageId: job.data.messageId,
          processingTimeMs: processingTime,
          error: error.message,
        };
      }
    });

    this.isProcessing = true;
    logger.info('[MessageQueue] Started processing with concurrency:', this.CONCURRENCY);
  }

  /**
   * Get job priority number (lower = higher priority)
   */
  private getJobPriority(priority?: 'high' | 'normal' | 'low'): number {
    switch (priority) {
      case 'high':
        return 1;
      case 'low':
        return 10;
      case 'normal':
      default:
        return 5;
    }
  }

  /**
   * Get queue statistics
   */
  public async getStats(): Promise<QueueStats> {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.queue.getWaitingCount(),
      this.queue.getActiveCount(),
      this.queue.getCompletedCount(),
      this.queue.getFailedCount(),
      this.queue.getDelayedCount(),
    ]);

    const isPaused = await this.queue.isPaused();

    return {
      waiting,
      active,
      completed,
      failed,
      delayed,
      paused: isPaused,
    };
  }

  /**
   * Get job status by ID
   */
  public async getJobStatus(jobId: string): Promise<any> {
    try {
      const job = await this.queue.getJob(jobId);

      if (!job) {
        return { found: false };
      }

      const state = await job.getState();
      const progress = job.progress();

      return {
        found: true,
        id: job.id,
        state,
        progress,
        data: job.data,
        attemptsMade: job.attemptsMade,
        finishedOn: job.finishedOn,
        processedOn: job.processedOn,
        failedReason: job.failedReason,
      };
    } catch (error: any) {
      logger.error('[MessageQueue] Failed to get job status', {
        jobId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Retry all failed jobs
   */
  public async retryFailedJobs(): Promise<number> {
    try {
      const failedJobs = await this.queue.getFailed();
      let retriedCount = 0;

      for (const job of failedJobs) {
        await job.retry();
        retriedCount++;
      }

      logger.info('[MessageQueue] Retried failed jobs', { count: retriedCount });
      return retriedCount;
    } catch (error: any) {
      logger.error('[MessageQueue] Failed to retry jobs', { error: error.message });
      throw error;
    }
  }

  /**
   * Pause the queue
   */
  public async pause(): Promise<void> {
    await this.queue.pause();
    logger.info('[MessageQueue] Queue paused');
  }

  /**
   * Resume the queue
   */
  public async resume(): Promise<void> {
    await this.queue.resume();
    logger.info('[MessageQueue] Queue resumed');
  }

  /**
   * Clean old jobs
   */
  public async clean(olderThan: number = 86400000): Promise<void> {
    // Clean completed jobs older than 24 hours
    await this.queue.clean(olderThan, 'completed');
    logger.info('[MessageQueue] Cleaned old completed jobs');
  }

  /**
   * Graceful shutdown
   */
  public async close(): Promise<void> {
    await this.queue.close();
    this.redis.disconnect();
    logger.info('[MessageQueue] Service closed');
  }
}

// Export singleton instance
export const messageQueueService = new MessageQueueService();
export default messageQueueService;
