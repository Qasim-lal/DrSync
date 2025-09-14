/**
 * Scheduled Billing Service for DrSync
 * 
 * Features:
 * - Daily automatic billing processing
 * - Failed payment retry logic
 * - Overdue payment suspension
 * - Trial expiration monitoring
 * - Billing cycle management
 * 
 * @author DrSync Development Team
 * @version 1.0.0
 */

import cron from 'node-cron';
import { logger } from '../utils/logger';
import SubscriptionService from './subscriptionService';
import PaymentService from './paymentService';

export class ScheduledBillingService {
  private static isRunning = false;

  /**
   * Start all scheduled billing tasks
   */
  static startScheduledTasks(): void {
    logger.info('Starting scheduled billing tasks');

    // Daily automatic billing at 9:00 AM
    cron.schedule('0 9 * * *', async () => {
      await this.runDailyBillingCycle();
    }, {
      scheduled: true,
      timezone: 'UTC',
    });

    // Retry failed payments every 4 hours
    cron.schedule('0 */4 * * *', async () => {
      await this.retryFailedPayments();
    }, {
      scheduled: true,
      timezone: 'UTC',
    });

    // Check for overdue payments daily at 10:00 AM
    cron.schedule('0 10 * * *', async () => {
      await this.checkOverduePayments();
    }, {
      scheduled: true,
      timezone: 'UTC',
    });

    // Weekly billing summary on Mondays at 8:00 AM
    cron.schedule('0 8 * * 1', async () => {
      await this.generateWeeklyBillingSummary();
    }, {
      scheduled: true,
      timezone: 'UTC',
    });

    logger.info('Scheduled billing tasks started successfully');
  }

  /**
   * Run daily automatic billing cycle
   */
  private static async runDailyBillingCycle(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Billing cycle already in progress, skipping');
      return;
    }

    this.isRunning = true;
    const startTime = new Date();

    try {
      logger.info('Starting daily automatic billing cycle');

      const result = await SubscriptionService.processAutomaticBilling();

      const duration = Date.now() - startTime.getTime();
      
      logger.info('Daily billing cycle completed', {
        duration: `${duration}ms`,
        organizationsProcessed: result.organizationsProcessed,
        successfulPayments: result.successfulPayments,
        failedPayments: result.failedPayments,
        errorCount: result.errors.length,
      });

      // Log errors if any
      if (result.errors.length > 0) {
        logger.error('Billing cycle errors', { errors: result.errors });
      }

      // Send notification to admin if significant issues
      if (result.failedPayments > result.successfulPayments * 0.1) {
        await this.notifyAdminOfBillingIssues(result);
      }

    } catch (error) {
      logger.error('Daily billing cycle failed', { 
        error: (error as Error).message,
        duration: `${Date.now() - startTime.getTime()}ms`
      });
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Retry failed payments
   */
  private static async retryFailedPayments(): Promise<void> {
    try {
      logger.info('Starting failed payment retry process');

      await PaymentService.retryFailedPayments();

      logger.info('Failed payment retry process completed');

    } catch (error) {
      logger.error('Failed payment retry process failed', { error: (error as Error).message });
    }
  }

  /**
   * Check for overdue payments and suspend if necessary
   */
  private static async checkOverduePayments(): Promise<void> {
    try {
      logger.info('Checking for overdue payments');

      await SubscriptionService.checkOverduePayments();

      logger.info('Overdue payment check completed');

    } catch (error) {
      logger.error('Overdue payment check failed', { error: (error as Error).message });
    }
  }

  /**
   * Generate weekly billing summary
   */
  private static async generateWeeklyBillingSummary(): Promise<void> {
    try {
      logger.info('Generating weekly billing summary');

      // This would typically send a summary report to administrators
      // For now, we'll just log the completion
      
      logger.info('Weekly billing summary generated');

    } catch (error) {
      logger.error('Weekly billing summary generation failed', { error: (error as Error).message });
    }
  }

  /**
   * Notify admin of significant billing issues
   */
  private static async notifyAdminOfBillingIssues(billingResult: {
    organizationsProcessed: number;
    successfulPayments: number;
    failedPayments: number;
    errors: string[];
  }): Promise<void> {
    try {
      // In production, this would send an email or notification to administrators
      logger.warn('High billing failure rate detected', {
        failureRate: `${Math.round((billingResult.failedPayments / billingResult.organizationsProcessed) * 100)}%`,
        failedPayments: billingResult.failedPayments,
        totalProcessed: billingResult.organizationsProcessed,
        errors: billingResult.errors,
      });

      // TODO: Implement email notification service
      // await emailService.sendAdminAlert({
      //   subject: 'DrSync Billing Alert - High Failure Rate',
      //   content: billingResult,
      // });

    } catch (error) {
      logger.error('Failed to notify admin of billing issues', { error: (error as Error).message });
    }
  }

  /**
   * Stop scheduled tasks (for testing or shutdown)
   */
  static stopScheduledTasks(): void {
    cron.getTasks().forEach(task => task.stop());
    logger.info('Scheduled billing tasks stopped');
  }

  /**
   * Get status of scheduled billing service
   */
  static getStatus(): {
    isRunning: boolean;
    activeTasks: number;
    nextRuns: { name: string; nextRun: Date | null }[];
  } {
    const tasks = cron.getTasks();
    const taskList = Array.from(tasks.entries());

    return {
      isRunning: this.isRunning,
      activeTasks: taskList.length,
      nextRuns: [
        { name: 'Daily Billing Cycle', nextRun: this.getNextRunTime('0 9 * * *') },
        { name: 'Failed Payment Retry', nextRun: this.getNextRunTime('0 */4 * * *') },
        { name: 'Overdue Check', nextRun: this.getNextRunTime('0 10 * * *') },
        { name: 'Weekly Summary', nextRun: this.getNextRunTime('0 8 * * 1') },
      ],
    };
  }

  /**
   * Get next run time for a cron pattern
   */
  private static getNextRunTime(_cronPattern: string): Date | null {
    try {
      // This is a simplified calculation - in production you'd use a proper cron parser
      return new Date(Date.now() + 60000); // Approximate next minute
    } catch (error) {
      return null;
    }
  }

  /**
   * Manual billing cycle trigger (for admin use)
   */
  static async triggerManualBillingCycle(): Promise<{
    success: boolean;
    result?: any;
    error?: string;
  }> {
    try {
      if (this.isRunning) {
        return {
          success: false,
          error: 'Billing cycle already in progress',
        };
      }

      logger.info('Manual billing cycle triggered');
      
      const result = await SubscriptionService.processAutomaticBilling();

      return {
        success: true,
        result,
      };

    } catch (error) {
      logger.error('Manual billing cycle failed', { error: (error as Error).message });
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }
}

export default ScheduledBillingService;