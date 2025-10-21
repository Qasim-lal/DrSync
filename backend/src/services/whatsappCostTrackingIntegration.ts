/**
 * WhatsApp Cost Tracking Integration - TASK-040A Phase 2/3
 * 
 * Wrapper service that adds real-time cost tracking and spending cap
 * enforcement to the WhatsApp messaging flow. Tracks every message sent
 * and ensures organizations stay within their configured spending limits.
 * 
 * @version 1.0
 * @date October 20, 2025
 */

import whatsappService from './whatsappService';
import messageCostTrackingService, { MessageType } from './messageCostTrackingService';
import notificationSettingsService from './notificationSettingsService';
import logger from '../utils/logger';

interface OutgoingMessage {
  to: string;
  type: string;
  text?: { body: string };
  template?: {
    name: string;
    language: { code: string };
    components: any[];
  };
  interactive?: any;
}

interface MessageResponse {
  success: boolean;
  messageId?: string;
  error?: string;
  warning?: string;
}

interface SendOptions {
  messageType: MessageType;
  recipientCount?: number;
  skipCostTracking?: boolean;
  skipCapCheck?: boolean;
  priority?: 'low' | 'normal' | 'high';
}

/**
 * Map WhatsApp message types to cost tracking message types
 */
function mapToMessageType(message: OutgoingMessage, options?: SendOptions): MessageType {
  if (options?.messageType) {
    return options.messageType;
  }

  // Try to infer from template name if available
  if (message.template?.name) {
    const templateName = message.template.name.toLowerCase();
    if (templateName.includes('booking') || templateName.includes('confirmation')) {
      return MessageType.BOOKING_CONFIRMATION;
    }
    if (templateName.includes('reminder')) {
      return MessageType.REMINDER;
    }
    if (templateName.includes('followup') || templateName.includes('follow_up')) {
      return MessageType.FOLLOWUP;
    }
    if (templateName.includes('medication')) {
      return MessageType.MEDICATION_REMINDER;
    }
    if (templateName.includes('wellness')) {
      return MessageType.WELLNESS_CHECK;
    }
  }

  // Default to OTHER if cannot determine
  return MessageType.OTHER;
}

class WhatsAppCostTrackingIntegration {
  /**
   * Send a message with cost tracking and spending cap enforcement
   */
  async sendMessageWithTracking(
    organizationId: string,
    message: OutgoingMessage,
    options?: SendOptions
  ): Promise<MessageResponse> {
    try {
      const messageType = mapToMessageType(message, options);
      const recipientCount = options?.recipientCount || 1;
      const skipCapCheck = options?.skipCapCheck || false;
      const skipTracking = options?.skipCostTracking || false;
      const priority = options?.priority || 'normal';

      logger.debug('[WhatsAppCostTracking] Sending message with tracking', {
        organizationId,
        messageType,
        recipientCount,
        skipCapCheck,
        skipTracking,
        priority,
      });

      // Step 1: Check spending cap (unless skipped or high priority)
      if (!skipCapCheck && priority !== 'high') {
        const capCheck = await messageCostTrackingService.checkSpendingCap(organizationId);

        if (capCheck.isOverCap) {
          logger.warn('[WhatsAppCostTracking] Spending cap exceeded, blocking message', {
            organizationId,
            currentSpend: capCheck.currentSpend,
            cap: capCheck.monthlyCap,
            percentageUsed: capCheck.percentageUsed,
          });

          return {
            success: false,
            error: `Monthly spending cap exceeded (${capCheck.percentageUsed.toFixed(1)}% of PKR ${capCheck.monthlyCap} used). Please increase your cap or wait until next month.`,
          };
        }

        if (capCheck.isNearCap) {
          logger.warn('[WhatsAppCostTracking] Approaching spending cap', {
            organizationId,
            currentSpend: capCheck.currentSpend,
            cap: capCheck.monthlyCap,
            percentageUsed: capCheck.percentageUsed,
            threshold: capCheck.alertThreshold,
          });
        }
      }

      // Step 2: Check if notification type is allowed
      const shouldSend = await notificationSettingsService.shouldSendNotification(
        organizationId,
        this.mapToNotificationType(messageType),
        new Date()
      );

      if (!shouldSend) {
        logger.info('[WhatsAppCostTracking] Notification type disabled or blocked by quiet hours', {
          organizationId,
          messageType,
        });

        // Track as saved message (cost avoided)
        if (!skipTracking) {
          await messageCostTrackingService.trackMessageSaved(
            organizationId,
            messageType,
            recipientCount
          );
        }

        return {
          success: false,
          error: 'This notification type is currently disabled or blocked by quiet hours',
        };
      }

      // Step 3: Send the message via WhatsApp service
      const result = await whatsappService.sendMessage(organizationId, message);

      // Step 4: Track the cost (only if message was successfully sent)
      if (result.success && !skipTracking) {
        await messageCostTrackingService.trackMessageSent(
          organizationId,
          messageType,
          recipientCount
        );

        logger.info('[WhatsAppCostTracking] Message sent and cost tracked', {
          organizationId,
          messageType,
          recipientCount,
          messageId: result.messageId,
        });
      }

      // Step 5: Add warning if approaching cap
      if (result.success && !skipCapCheck) {
        const capCheck = await messageCostTrackingService.checkSpendingCap(organizationId);
        if (capCheck.isNearCap && !capCheck.isOverCap) {
          return {
            ...result,
            warning: `Approaching spending cap: ${capCheck.percentageUsed.toFixed(1)}% used (${capCheck.currentSpend} PKR of ${capCheck.monthlyCap} PKR)`,
          };
        }
      }

      return result;
    } catch (error: any) {
      logger.error('[WhatsAppCostTracking] Error sending message with tracking', {
        organizationId,
        error: error.message,
        stack: error.stack,
      });

      return {
        success: false,
        error: error.message || 'Failed to send message',
      };
    }
  }

  /**
   * Send bulk messages with cost tracking
   */
  async sendBulkMessagesWithTracking(
    organizationId: string,
    recipients: string[],
    messageTemplate: OutgoingMessage,
    options?: SendOptions
  ): Promise<{
    success: boolean;
    sent: number;
    failed: number;
    blocked: number;
    results: MessageResponse[];
  }> {
    const results: MessageResponse[] = [];
    let sent = 0;
    let failed = 0;
    let blocked = 0;

    logger.info('[WhatsAppCostTracking] Sending bulk messages', {
      organizationId,
      recipientCount: recipients.length,
      messageType: options?.messageType,
    });

    // Check spending cap before sending bulk
    if (!options?.skipCapCheck && options?.priority !== 'high') {
      const capCheck = await messageCostTrackingService.checkSpendingCap(organizationId);
      
      if (capCheck.isOverCap) {
        logger.warn('[WhatsAppCostTracking] Bulk send blocked: spending cap exceeded', {
          organizationId,
          recipientCount: recipients.length,
        });

        return {
          success: false,
          sent: 0,
          failed: 0,
          blocked: recipients.length,
          results: recipients.map(() => ({
            success: false,
            error: 'Monthly spending cap exceeded',
          })),
        };
      }
    }

    for (const recipient of recipients) {
      const message = {
        ...messageTemplate,
        to: recipient,
      };

      const result = await this.sendMessageWithTracking(
        organizationId,
        message,
        options
      );

      results.push(result);

      if (result.success) {
        sent++;
      } else if (result.error?.includes('spending cap')) {
        blocked++;
      } else {
        failed++;
      }

      // Stop if we hit spending cap
      if (blocked > 0 && !options?.skipCapCheck) {
        logger.warn('[WhatsAppCostTracking] Stopping bulk send due to spending cap', {
          organizationId,
          sent,
          blocked,
          remaining: recipients.length - (sent + failed + blocked),
        });
        
        // Mark remaining as blocked
        const remaining = recipients.length - (sent + failed + blocked);
        for (let i = 0; i < remaining; i++) {
          results.push({
            success: false,
            error: 'Monthly spending cap exceeded',
          });
          blocked++;
        }
        
        break;
      }
    }

    logger.info('[WhatsAppCostTracking] Bulk send completed', {
      organizationId,
      total: recipients.length,
      sent,
      failed,
      blocked,
    });

    return {
      success: sent > 0,
      sent,
      failed,
      blocked,
      results,
    };
  }

  /**
   * Get estimated cost for a bulk send before executing
   */
  async estimateBulkCost(
    organizationId: string,
    recipientCount: number,
    messageType?: MessageType
  ): Promise<{
    estimatedCost: number;
    costPerMessage: number;
    willExceedCap: boolean;
    remainingBudget: number | null;
  }> {
    try {
      const settings = await notificationSettingsService.getSettings(organizationId);
      const costPerMessage = settings.costPerMessage.toNumber();
      const estimatedCost = costPerMessage * recipientCount;

      const capCheck = await messageCostTrackingService.checkSpendingCap(organizationId);
      
      let willExceedCap = false;
      let remainingBudget: number | null = null;

      if (capCheck.monthlyCap !== null) {
        remainingBudget = capCheck.monthlyCap - capCheck.currentSpend;
        willExceedCap = estimatedCost > remainingBudget;
      }

      return {
        estimatedCost,
        costPerMessage,
        willExceedCap,
        remainingBudget,
      };
    } catch (error: any) {
      logger.error('[WhatsAppCostTracking] Error estimating bulk cost', {
        organizationId,
        error: error.message,
      });

      throw error;
    }
  }

  /**
   * Map message type to notification type for settings check
   */
  private mapToNotificationType(messageType: MessageType): string {
    switch (messageType) {
      case MessageType.BOOKING_CONFIRMATION:
        return 'BOOKING_CONFIRMATION';
      case MessageType.REMINDER:
        return 'REMINDER';
      case MessageType.FOLLOWUP:
        return 'FOLLOWUP';
      case MessageType.MEDICATION_REMINDER:
        return 'MEDICATION_REMINDER';
      case MessageType.WELLNESS_CHECK:
        return 'WELLNESS_CHECK';
      case MessageType.OTHER:
      default:
        return 'OTHER';
    }
  }
}

// Export singleton instance
export default new WhatsAppCostTrackingIntegration();
export { SendOptions, MessageResponse };
