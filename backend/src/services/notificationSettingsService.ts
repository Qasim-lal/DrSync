/**
 * Notification Settings Service - TASK-040A (Phase 1 Skeleton)
 * 
 * Provides organization-level notification preference management.
 * This is a skeleton implementation with sane defaults to enable integration
 * with TASK-040 (language detection) and TASK-041 (booking confirmations).
 * 
 * Phase 1 Features (Skeleton):
 * - Get/update notification settings with defaults
 * - Simple shouldSendNotification() check
 * - Basic quiet hours validation
 * - Reminder timing calculation
 * 
 * Phase 2 Features (Future):
 * - Complex preference rules
 * - Cost tracking and caps
 * - Patient segmentation
 * - Smart bundling
 * 
 * @version 1.0
 * @date October 20, 2025
 */

import getPrismaClient from './prisma';
import logger from '../utils/logger';
import { NotificationSettings, ReminderTiming } from '../generated/prisma';

// Notification types that can be controlled
export enum NotificationType {
  BOOKING_CONFIRMATION = 'booking_confirmation',
  REMINDER = 'reminder',
  FOLLOWUP = 'followup',
  MEDICATION = 'medication',
  WELLNESS = 'wellness',
}

class NotificationSettingsService {
  /**
   * Get notification settings for organization
   * Creates default settings if none exist (Phase 1 behavior)
   */
  async getSettings(organizationId: string): Promise<NotificationSettings> {
    try {
      const prisma = getPrismaClient();
      
      let settings = await prisma.notificationSettings.findUnique({
        where: { organizationId },
      });

      // Create default settings if not exists
      if (!settings) {
        logger.info('[NotificationSettings] Creating default settings for organization', {
          organizationId,
        });
        
        settings = await prisma.notificationSettings.create({
          data: {
            organizationId,
            language: 'en',
            bookingConfirmationsEnabled: true,
            remindersEnabled: true,
            followUpsEnabled: false,
            medicationRemindersEnabled: false,
            wellnessChecksEnabled: false,
            reminderTiming: ReminderTiming.HOURS_24,
            enabledChannels: ['WHATSAPP'],
            quietHoursEnabled: false,
            alertThreshold: 80,
            currentMonthSpend: 0,
          },
        });
      }

      return settings;
    } catch (error: any) {
      logger.error('[NotificationSettings] Failed to get settings', {
        organizationId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Update notification settings
   */
  async updateSettings(
    organizationId: string,
    data: Partial<NotificationSettings>
  ): Promise<NotificationSettings> {
    try {
      const prisma = getPrismaClient();
      
      const updated = await prisma.notificationSettings.upsert({
        where: { organizationId },
        update: {
          ...data,
          updatedAt: new Date(),
        },
        create: {
          organizationId,
          language: data.language || 'en',
          bookingConfirmationsEnabled: data.bookingConfirmationsEnabled ?? true,
          remindersEnabled: data.remindersEnabled ?? true,
          followUpsEnabled: data.followUpsEnabled ?? false,
          medicationRemindersEnabled: data.medicationRemindersEnabled ?? false,
          wellnessChecksEnabled: data.wellnessChecksEnabled ?? false,
          reminderTiming: data.reminderTiming || ReminderTiming.HOURS_24,
          enabledChannels: data.enabledChannels || ['WHATSAPP'],
          quietHoursEnabled: data.quietHoursEnabled ?? false,
          quietHoursStart: data.quietHoursStart || null,
          quietHoursEnd: data.quietHoursEnd || null,
          alertThreshold: data.alertThreshold || 80,
          currentMonthSpend: 0,
        },
      });

      logger.info('[NotificationSettings] Settings updated', {
        organizationId,
      });

      return updated;
    } catch (error: any) {
      logger.error('[NotificationSettings] Failed to update settings', {
        organizationId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * SKELETON: Check if notification should be sent
   * Phase 1: Returns sane defaults (simple rules)
   * Phase 2: Implement complex business logic (cost caps, patient segmentation, etc.)
   */
  async shouldSendNotification(
    organizationId: string,
    notificationType: NotificationType,
    timestamp: Date = new Date()
  ): Promise<boolean> {
    try {
      const settings = await this.getSettings(organizationId);

      // Phase 1: Simple checks (SKELETON)
      
      // Check if notification type is enabled
      switch (notificationType) {
        case NotificationType.BOOKING_CONFIRMATION:
          if (!settings.bookingConfirmationsEnabled) {
            logger.debug('[NotificationSettings] Booking confirmations disabled', {
              organizationId,
            });
            return false;
          }
          break;
        case NotificationType.REMINDER:
          if (!settings.remindersEnabled) {
            logger.debug('[NotificationSettings] Reminders disabled', {
              organizationId,
            });
            return false;
          }
          break;
        case NotificationType.FOLLOWUP:
          if (!settings.followUpsEnabled) {
            logger.debug('[NotificationSettings] Follow-ups disabled', {
              organizationId,
            });
            return false;
          }
          break;
        case NotificationType.MEDICATION:
          if (!settings.medicationRemindersEnabled) {
            logger.debug('[NotificationSettings] Medication reminders disabled', {
              organizationId,
            });
            return false;
          }
          break;
        case NotificationType.WELLNESS:
          if (!settings.wellnessChecksEnabled) {
            logger.debug('[NotificationSettings] Wellness checks disabled', {
              organizationId,
            });
            return false;
          }
          break;
        default:
          // Unknown type, allow by default
          return true;
      }

      // Check quiet hours (simple check)
      if (settings.quietHoursEnabled && settings.quietHoursStart && settings.quietHoursEnd) {
        const isQuietHours = this.isWithinQuietHours(
          timestamp,
          settings.quietHoursStart,
          settings.quietHoursEnd
        );
        
        if (isQuietHours) {
          logger.debug('[NotificationSettings] Within quiet hours, notification blocked', {
            organizationId,
            timestamp: timestamp.toISOString(),
          });
          return false;
        }
      }

      // Phase 1: No cost check (assume under budget)
      // Phase 2: Implement monthly cap checking
      // if (settings.monthlyCap && settings.currentMonthSpend >= settings.monthlyCap) {
      //   return false;
      // }

      return true; // Default: allow notification
    } catch (error: any) {
      logger.error('[NotificationSettings] Failed to check notification permission', {
        organizationId,
        notificationType,
        error: error.message,
      });
      // Fail open - allow notification on error
      return true;
    }
  }

  /**
   * STUB: Get reminder timing in minutes
   * Phase 1: Returns standard timings
   * Phase 2: Implement custom timing logic
   */
  async getReminderTimingMinutes(organizationId: string): Promise<number> {
    try {
      const settings = await this.getSettings(organizationId);
      
      // Phase 1: Simple mapping (STUB)
      switch (settings.reminderTiming) {
        case ReminderTiming.IMMEDIATELY:
          return 0;
        case ReminderTiming.MINUTES_30:
          return 30;
        case ReminderTiming.HOURS_1:
          return 60;
        case ReminderTiming.HOURS_2:
          return 120;
        case ReminderTiming.HOURS_4:
          return 240;
        case ReminderTiming.HOURS_24:
          return 1440;
        case ReminderTiming.HOURS_48:
          return 2880;
        case ReminderTiming.HOURS_72:
          return 4320;
        case ReminderTiming.CUSTOM:
          return settings.customReminderMinutes || 1440;
        default:
          return 1440; // Default 24 hours
      }
    } catch (error: any) {
      logger.error('[NotificationSettings] Failed to get reminder timing', {
        organizationId,
        error: error.message,
      });
      return 1440; // Default 24 hours on error
    }
  }

  /**
   * Get organization language preference from NotificationSettings
   * This method provides a fallback chain:
   * 1. NotificationSettings.language (if exists)
   * 2. Organization.language (fallback)
   * 3. 'en' (default)
   */
  async getOrganizationLanguage(organizationId: string): Promise<'en' | 'ur'> {
    try {
      // Try NotificationSettings first
      const settings = await this.getSettings(organizationId);
      if (settings && settings.language) {
        return settings.language as 'en' | 'ur';
      }

      // Fallback to Organization.language
      const prisma = getPrismaClient();
      const organization = await prisma.organization.findUnique({
        where: { id: organizationId },
        select: { language: true },
      });

      if (organization && organization.language) {
        return organization.language as 'en' | 'ur';
      }

      // Final fallback
      return 'en';
    } catch (error: any) {
      logger.error('[NotificationSettings] Failed to get organization language', {
        organizationId,
        error: error.message,
      });
      return 'en'; // Safe default
    }
  }

  /**
   * Apply preset mode to notification settings (Phase 2)
   * Presets: BUDGET (minimal), RECOMMENDED (balanced), PREMIUM (all features)
   */
  async applyPreset(
    organizationId: string,
    preset: 'BUDGET' | 'RECOMMENDED' | 'PREMIUM'
  ): Promise<NotificationSettings> {
    try {
      const prisma = getPrismaClient();
      
      // Define preset configurations
      const presets = {
        BUDGET: {
          // Minimal cost - reminders only
          bookingConfirmationsEnabled: false,
          remindersEnabled: true,
          followUpsEnabled: false,
          medicationRemindersEnabled: false,
          wellnessChecksEnabled: false,
          preAppointmentInstructionsEnabled: false,
          arrivalNotificationEnabled: false,
          appointmentCompletionEnabled: false,
          reschedulingConfirmationEnabled: false,
          cancellationConfirmationEnabled: false,
          noShowFollowupEnabled: false,
          paymentReminderEnabled: false,
          presetMode: 'BUDGET' as const,
        },
        RECOMMENDED: {
          // Balanced - essential messages
          bookingConfirmationsEnabled: true,
          remindersEnabled: true,
          followUpsEnabled: false,
          medicationRemindersEnabled: false,
          wellnessChecksEnabled: false,
          preAppointmentInstructionsEnabled: false,
          arrivalNotificationEnabled: false,
          appointmentCompletionEnabled: false,
          reschedulingConfirmationEnabled: true,
          cancellationConfirmationEnabled: true,
          noShowFollowupEnabled: false,
          paymentReminderEnabled: false,
          presetMode: 'RECOMMENDED' as const,
        },
        PREMIUM: {
          // Maximum engagement - all messages except optional wellness
          bookingConfirmationsEnabled: true,
          remindersEnabled: true,
          followUpsEnabled: true,
          medicationRemindersEnabled: false, // Opt-in (can be expensive)
          wellnessChecksEnabled: false,       // Opt-in (can be expensive)
          preAppointmentInstructionsEnabled: true,
          arrivalNotificationEnabled: true,
          appointmentCompletionEnabled: true,
          reschedulingConfirmationEnabled: true,
          cancellationConfirmationEnabled: true,
          noShowFollowupEnabled: true,
          paymentReminderEnabled: true,
          presetMode: 'PREMIUM' as const,
        },
      };
      
      const settings = presets[preset];
      
      // Apply preset
      const updated = await prisma.notificationSettings.upsert({
        where: { organizationId },
        update: {
          ...settings,
          updatedAt: new Date(),
        },
        create: {
          organizationId,
          ...settings,
          language: 'en',
          reminderTiming: ReminderTiming.HOURS_24,
          enabledChannels: ['WHATSAPP'],
          quietHoursEnabled: false,
          alertThreshold: 80,
          currentMonthSpend: 0,
        },
      });
      
      logger.info('[NotificationSettings] Preset mode applied', {
        organizationId,
        preset,
      });
      
      return updated;
    } catch (error: any) {
      logger.error('[NotificationSettings] Failed to apply preset', {
        organizationId,
        preset,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Calculate estimated monthly cost based on current settings (Phase 2)
   */
  async calculateMonthlyCost(
    organizationId: string,
    averageMonthlyAppointments?: number
  ): Promise<{
    estimatedCost: number;
    breakdown: Array<{ type: string; enabled: boolean; count: number; cost: number }>;
    totalMessages: number;
    costPerMessage: number;
  }> {
    try {
      const settings = await this.getSettings(organizationId);
      
      // Use provided appointments or stored average
      const appointments = averageMonthlyAppointments || settings.averageMonthlyAppointments || 0;
      const costPerMessage = parseFloat(settings.costPerMessage?.toString() || '3.50');
      
      // Calculate messages per appointment based on enabled settings
      const messageTypes = [
        { type: 'Booking Confirmations', enabled: settings.bookingConfirmationsEnabled, multiplier: 1 },
        { type: 'Reminders', enabled: settings.remindersEnabled, multiplier: 1 },
        { type: 'Follow-ups', enabled: settings.followUpsEnabled, multiplier: 1 },
        { type: 'Medication Reminders', enabled: settings.medicationRemindersEnabled, multiplier: 3 }, // 3x (daily for week)
        { type: 'Wellness Checks', enabled: settings.wellnessChecksEnabled, multiplier: 0.5 }, // 50% of patients
        { type: 'Pre-Instructions', enabled: settings.preAppointmentInstructionsEnabled, multiplier: 1 },
        { type: 'Arrival Notifications', enabled: settings.arrivalNotificationEnabled, multiplier: 1 },
        { type: 'Completion Messages', enabled: settings.appointmentCompletionEnabled, multiplier: 1 },
        { type: 'Rescheduling Confirmations', enabled: settings.reschedulingConfirmationEnabled, multiplier: 0.2 }, // 20% reschedule
        { type: 'Cancellation Confirmations', enabled: settings.cancellationConfirmationEnabled, multiplier: 0.1 }, // 10% cancel
        { type: 'No-show Follow-ups', enabled: settings.noShowFollowupEnabled, multiplier: 0.15 }, // 15% no-show
        { type: 'Payment Reminders', enabled: settings.paymentReminderEnabled, multiplier: 0.3 }, // 30% need reminder
      ];
      
      let totalMessages = 0;
      const breakdown = messageTypes.map(({ type, enabled, multiplier }) => {
        const count = enabled ? Math.round(appointments * multiplier) : 0;
        const cost = parseFloat((count * costPerMessage).toFixed(2));
        totalMessages += count;
        return { type, enabled, count, cost };
      });
      
      const estimatedCost = parseFloat((totalMessages * costPerMessage).toFixed(2));
      
      return {
        estimatedCost,
        breakdown,
        totalMessages,
        costPerMessage,
      };
    } catch (error: any) {
      logger.error('[NotificationSettings] Failed to calculate monthly cost', {
        organizationId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Compare current settings cost with all preset modes (Phase 2)
   */
  async comparePresets(
    organizationId: string,
    averageMonthlyAppointments?: number
  ): Promise<{
    current: { cost: number; mode: string };
    budget: { cost: number; savings: number };
    recommended: { cost: number; savings: number };
    premium: { cost: number; additionalCost: number };
  }> {
    try {
      // Get current cost
      const currentCalc = await this.calculateMonthlyCost(organizationId, averageMonthlyAppointments);
      const settings = await this.getSettings(organizationId);
      
      // Calculate each preset cost
      const appointments = averageMonthlyAppointments || settings.averageMonthlyAppointments || 800;
      const costPerMessage = parseFloat(settings.costPerMessage?.toString() || '3.50');
      
      // Budget: 1 message per appointment (reminders only)
      const budgetCost = appointments * costPerMessage;
      
      // Recommended: 2 messages per appointment (booking + reminder)
      const recommendedCost = appointments * 2 * costPerMessage;
      
      // Premium: 4 messages per appointment (booking + reminder + followup + others)
      const premiumCost = appointments * 4 * costPerMessage;
      
      return {
        current: {
          cost: currentCalc.estimatedCost,
          mode: settings.presetMode || 'CUSTOM',
        },
        budget: {
          cost: parseFloat(budgetCost.toFixed(2)),
          savings: parseFloat((currentCalc.estimatedCost - budgetCost).toFixed(2)),
        },
        recommended: {
          cost: parseFloat(recommendedCost.toFixed(2)),
          savings: parseFloat((currentCalc.estimatedCost - recommendedCost).toFixed(2)),
        },
        premium: {
          cost: parseFloat(premiumCost.toFixed(2)),
          additionalCost: parseFloat((premiumCost - currentCalc.estimatedCost).toFixed(2)),
        },
      };
    } catch (error: any) {
      logger.error('[NotificationSettings] Failed to compare presets', {
        organizationId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Helper: Check if timestamp is within quiet hours
   * Handles cross-day ranges (e.g., 22:00 to 08:00)
   */
  private isWithinQuietHours(
    timestamp: Date,
    startTime: string,
    endTime: string
  ): boolean {
    const hour = timestamp.getHours();
    const minute = timestamp.getMinutes();
    const currentMinutes = hour * 60 + minute;

    const [startHourStr = '0', startMinuteStr = '0'] = startTime.split(':');
    const [endHourStr = '0', endMinuteStr = '0'] = endTime.split(':');
    const startHour = parseInt(startHourStr, 10);
    const startMinute = parseInt(startMinuteStr, 10);
    const endHour = parseInt(endHourStr, 10);
    const endMinute = parseInt(endMinuteStr, 10);
    const startMinutes = startHour * 60 + startMinute;
    const endMinutes = endHour * 60 + endMinute;

    // Normal range (e.g., 09:00 to 17:00)
    if (startMinutes < endMinutes) {
      return currentMinutes >= startMinutes && currentMinutes < endMinutes;
    }
    
    // Cross-day range (e.g., 22:00 to 08:00)
    return currentMinutes >= startMinutes || currentMinutes < endMinutes;
  }
}

// Export singleton instance
export default new NotificationSettingsService();
