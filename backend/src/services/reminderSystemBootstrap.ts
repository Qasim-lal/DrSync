/**
 * Reminder System Bootstrap
 * 
 * Initializes and starts all reminder system components:
 * - Reminder processor service (Bull Queue job processing)
 * - Reminder scheduler service (hourly cron job)
 * 
 * Call initialize() on app startup to activate the reminder system.
 * Call shutdown() on app shutdown for graceful cleanup.
 * 
 * @version 1.0
 * @author DrSync Development Team
 * @date December 4, 2025
 */

import { logger } from '../utils/logger';
import reminderProcessorService from './reminderProcessorService';
import reminderSchedulerService from './reminderSchedulerService';

class ReminderSystemBootstrap {
  private initialized: boolean = false;

  /**
   * Initialize all reminder system components
   * Call this on application startup
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      logger.warn('Reminder system already initialized');
      return;
    }

    try {
      logger.info('Initializing reminder system...');

      // Step 1: Initialize processor (connects to Bull Queue and registers job processor)
      logger.info('Initializing reminder processor...');
      await reminderProcessorService.initialize();
      logger.info('Reminder processor initialized');

      // Step 2: Start scheduler (cron job for automatic reminders)
      logger.info('Starting reminder scheduler...');
      reminderSchedulerService.start();
      logger.info('Reminder scheduler started');

      this.initialized = true;
      logger.info('✓ Reminder system fully initialized and operational');

    } catch (error) {
      logger.error('Failed to initialize reminder system:', error);
      throw error;
    }
  }

  /**
   * Gracefully shutdown all reminder system components
   * Call this on application shutdown
   */
  async shutdown(): Promise<void> {
    if (!this.initialized) {
      logger.warn('Reminder system not initialized, nothing to shutdown');
      return;
    }

    try {
      logger.info('Shutting down reminder system...');

      // Step 1: Stop scheduler (stop accepting new jobs)
      logger.info('Stopping reminder scheduler...');
      reminderSchedulerService.stop();
      logger.info('Reminder scheduler stopped');

      // Step 2: Shutdown processor (gracefully close Bull Queue connections)
      logger.info('Shutting down reminder processor...');
      await reminderProcessorService.shutdown();
      logger.info('Reminder processor shut down');

      this.initialized = false;
      logger.info('✓ Reminder system shut down successfully');

    } catch (error) {
      logger.error('Error during reminder system shutdown:', error);
      throw error;
    }
  }

  /**
   * Check if system is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get system status
   */
  getStatus(): { initialized: boolean; scheduler: any } {
    return {
      initialized: this.initialized,
      scheduler: reminderSchedulerService.getStatus()
    };
  }
}

// Export singleton instance
export default new ReminderSystemBootstrap();
