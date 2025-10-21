/**
 * Message Cost Tracking Service - TASK-040A Phase 2
 * 
 * Tracks WhatsApp message costs, saves, and provides analytics.
 * Integrates with notification settings to provide cost impact data.
 * 
 * Features:
 * - Track messages sent by type
 * - Track messages saved by settings
 * - Calculate estimated costs
 * - Provide monthly analytics
 * - Monitor spending against caps
 * 
 * @version 2.0
 * @date October 20, 2025
 */

import getPrismaClient from './prisma';
import logger from '../utils/logger';
import { Prisma } from '../generated/prisma';

export enum MessageType {
  BOOKING_CONFIRMATION = 'booking_confirmation',
  REMINDER = 'reminder',
  FOLLOWUP = 'followup',
  MEDICATION_REMINDER = 'medication_reminder',
  WELLNESS_CHECK = 'wellness_check',
  PRE_INSTRUCTIONS = 'pre_instructions',
  ARRIVAL_NOTIFICATION = 'arrival_notification',
  COMPLETION = 'completion',
  RESCHEDULING_CONFIRMATION = 'rescheduling_confirmation',
  CANCELLATION_CONFIRMATION = 'cancellation_confirmation',
  NO_SHOW_FOLLOWUP = 'no_show_followup',
  PAYMENT_REMINDER = 'payment_reminder',
}

interface CostBreakdown {
  messageType: string;
  count: number;
  cost: number;
}

interface MonthlyCostSummary {
  periodYear: number;
  periodMonth: number;
  totalMessagesSent: number;
  messagesSavedBySettings: number;
  messagesBundled: number;
  estimatedCost: number;
  costSaved: number;
  breakdown: CostBreakdown[];
}

class MessageCostTrackingService {
  /**
   * Track a message that was sent
   */
  async trackMessageSent(
    organizationId: string,
    messageType: MessageType,
    count: number = 1
  ): Promise<void> {
    try {
      const prisma = getPrismaClient();
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;

      // Get organization settings for cost per message
      const settings = await prisma.notificationSettings.findUnique({
        where: { organizationId },
        select: { costPerMessage: true },
      });

      const costPerMessage = settings?.costPerMessage || new Prisma.Decimal(3.50);
      const messageCost = costPerMessage.mul(count);

      // Get column name for this message type
      const columnName = this.getMessageTypeColumn(messageType);

      await prisma.messageCostTracking.upsert({
        where: {
          organizationId_periodYear_periodMonth: {
            organizationId,
            periodYear: year,
            periodMonth: month,
          },
        },
        update: {
          [columnName]: { increment: count },
          totalMessagesSent: { increment: count },
          estimatedCost: { increment: messageCost },
          updatedAt: new Date(),
        },
        create: {
          organizationId,
          periodYear: year,
          periodMonth: month,
          [columnName]: count,
          totalMessagesSent: count,
          estimatedCost: messageCost,
        },
      });

      // Update current month spend in notification settings
      await prisma.notificationSettings.update({
        where: { organizationId },
        data: {
          currentMonthSpend: { increment: messageCost },
        },
      });

      logger.info('[MessageCostTracking] Message sent tracked', {
        organizationId,
        messageType,
        count,
        cost: messageCost.toString(),
      });
    } catch (error: any) {
      logger.error('[MessageCostTracking] Failed to track message sent', {
        organizationId,
        messageType,
        error: error.message,
      });
      // Don't throw - tracking failures shouldn't block message sending
    }
  }

  /**
   * Track a message that was saved (not sent due to settings)
   */
  async trackMessageSaved(
    organizationId: string,
    messageType: MessageType,
    count: number = 1
  ): Promise<void> {
    try {
      const prisma = getPrismaClient();
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;

      // Get cost per message
      const settings = await prisma.notificationSettings.findUnique({
        where: { organizationId },
        select: { costPerMessage: true },
      });

      const costPerMessage = settings?.costPerMessage || new Prisma.Decimal(3.50);
      const costSaved = costPerMessage.mul(count);

      await prisma.messageCostTracking.upsert({
        where: {
          organizationId_periodYear_periodMonth: {
            organizationId,
            periodYear: year,
            periodMonth: month,
          },
        },
        update: {
          messagesSavedBySettings: { increment: count },
          costSaved: { increment: costSaved },
          updatedAt: new Date(),
        },
        create: {
          organizationId,
          periodYear: year,
          periodMonth: month,
          messagesSavedBySettings: count,
          costSaved,
        },
      });

      logger.debug('[MessageCostTracking] Message saved tracked', {
        organizationId,
        messageType,
        count,
        costSaved: costSaved.toString(),
      });
    } catch (error: any) {
      logger.error('[MessageCostTracking] Failed to track message saved', {
        organizationId,
        messageType,
        error: error.message,
      });
    }
  }

  /**
   * Get monthly cost summary for organization
   */
  async getMonthlySummary(
    organizationId: string,
    year?: number,
    month?: number
  ): Promise<MonthlyCostSummary | null> {
    try {
      const prisma = getPrismaClient();
      const now = new Date();
      const targetYear = year || now.getFullYear();
      const targetMonth = month || now.getMonth() + 1;

      const tracking = await prisma.messageCostTracking.findUnique({
        where: {
          organizationId_periodYear_periodMonth: {
            organizationId,
            periodYear: targetYear,
            periodMonth: targetMonth,
          },
        },
      });

      if (!tracking) {
        return null;
      }

      // Build cost breakdown
      const breakdown: CostBreakdown[] = [];
      const settings = await prisma.notificationSettings.findUnique({
        where: { organizationId },
        select: { costPerMessage: true },
      });
      const costPerMessage = settings?.costPerMessage || new Prisma.Decimal(3.50);

      const messageTypes = [
        { type: 'Booking Confirmations', count: tracking.bookingConfirmationsSent },
        { type: 'Reminders', count: tracking.remindersSent },
        { type: 'Follow-ups', count: tracking.followUpsSent },
        { type: 'Medication Reminders', count: tracking.medicationRemindersSent },
        { type: 'Wellness Checks', count: tracking.wellnessChecksSent },
        { type: 'Pre-Instructions', count: tracking.preInstructionsSent },
        { type: 'Arrival Notifications', count: tracking.arrivalNotificationsSent },
        { type: 'Completion Messages', count: tracking.completionMessagesSent },
        { type: 'Rescheduling Confirmations', count: tracking.reschedulingConfirmationsSent },
        { type: 'Cancellation Confirmations', count: tracking.cancellationConfirmationsSent },
        { type: 'No-show Follow-ups', count: tracking.noShowFollowupsSent },
        { type: 'Payment Reminders', count: tracking.paymentRemindersSent },
      ];

      for (const { type, count } of messageTypes) {
        if (count > 0) {
          breakdown.push({
            messageType: type,
            count,
            cost: parseFloat(costPerMessage.mul(count).toFixed(2)),
          });
        }
      }

      return {
        periodYear: tracking.periodYear,
        periodMonth: tracking.periodMonth,
        totalMessagesSent: tracking.totalMessagesSent,
        messagesSavedBySettings: tracking.messagesSavedBySettings,
        messagesBundled: tracking.messagesBundled,
        estimatedCost: parseFloat(tracking.estimatedCost.toFixed(2)),
        costSaved: parseFloat(tracking.costSaved.toFixed(2)),
        breakdown,
      };
    } catch (error: any) {
      logger.error('[MessageCostTracking] Failed to get monthly summary', {
        organizationId,
        year,
        month,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Check if organization is approaching monthly spending cap
   */
  async checkSpendingCap(organizationId: string): Promise<{
    isNearCap: boolean;
    percentageUsed: number;
    currentSpend: number;
    monthlyCap: number | null;
    alertThreshold: number;
  }> {
    try {
      const prisma = getPrismaClient();
      const settings = await prisma.notificationSettings.findUnique({
        where: { organizationId },
        select: {
          currentMonthSpend: true,
          monthlyCap: true,
          alertThreshold: true,
        },
      });

      if (!settings || !settings.monthlyCap) {
        return {
          isNearCap: false,
          percentageUsed: 0,
          currentSpend: parseFloat(settings?.currentMonthSpend.toFixed(2) || '0'),
          monthlyCap: null,
          alertThreshold: settings?.alertThreshold || 80,
        };
      }

      const currentSpend = parseFloat(settings.currentMonthSpend.toFixed(2));
      const cap = parseFloat(settings.monthlyCap.toFixed(2));
      const percentageUsed = (currentSpend / cap) * 100;
      const isNearCap = percentageUsed >= settings.alertThreshold;

      return {
        isNearCap,
        percentageUsed: parseFloat(percentageUsed.toFixed(2)),
        currentSpend,
        monthlyCap: cap,
        alertThreshold: settings.alertThreshold,
      };
    } catch (error: any) {
      logger.error('[MessageCostTracking] Failed to check spending cap', {
        organizationId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Reset monthly spend counter (called at start of new month)
   */
  async resetMonthlySpend(organizationId: string): Promise<void> {
    try {
      const prisma = getPrismaClient();
      await prisma.notificationSettings.update({
        where: { organizationId },
        data: {
          currentMonthSpend: 0,
        },
      });

      logger.info('[MessageCostTracking] Monthly spend reset', { organizationId });
    } catch (error: any) {
      logger.error('[MessageCostTracking] Failed to reset monthly spend', {
        organizationId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get column name for message type
   */
  private getMessageTypeColumn(messageType: MessageType): string {
    const columnMap: Record<MessageType, string> = {
      [MessageType.BOOKING_CONFIRMATION]: 'bookingConfirmationsSent',
      [MessageType.REMINDER]: 'remindersSent',
      [MessageType.FOLLOWUP]: 'followUpsSent',
      [MessageType.MEDICATION_REMINDER]: 'medicationRemindersSent',
      [MessageType.WELLNESS_CHECK]: 'wellnessChecksSent',
      [MessageType.PRE_INSTRUCTIONS]: 'preInstructionsSent',
      [MessageType.ARRIVAL_NOTIFICATION]: 'arrivalNotificationsSent',
      [MessageType.COMPLETION]: 'completionMessagesSent',
      [MessageType.RESCHEDULING_CONFIRMATION]: 'reschedulingConfirmationsSent',
      [MessageType.CANCELLATION_CONFIRMATION]: 'cancellationConfirmationsSent',
      [MessageType.NO_SHOW_FOLLOWUP]: 'noShowFollowupsSent',
      [MessageType.PAYMENT_REMINDER]: 'paymentRemindersSent',
    };

    return columnMap[messageType];
  }
}

// Export singleton instance
export default new MessageCostTrackingService();
