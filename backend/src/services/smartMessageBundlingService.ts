/**
 * Smart Message Bundling Service - TASK-040C
 *
 * Creates safe bundle plans for non-critical messages. It does not send
 * messages; sending services can consume the plan later.
 */

import { MessageType } from './messageCostTrackingService';
import messageCostTrackingService from './messageCostTrackingService';
import notificationSettingsService from './notificationSettingsService';
import logger from '../utils/logger';

export interface BundleCandidate {
  patientId: string;
  appointmentId?: string;
  phone: string;
  messageType: MessageType;
  body: string;
  scheduledFor?: string;
}

export interface MessageBundle {
  patientId: string;
  appointmentId: string | null;
  phone: string;
  messageTypes: MessageType[];
  bodies: string[];
  bundledBody: string;
  originalMessageCount: number;
  bundledMessageCount: number;
  savedMessages: number;
}

export interface BundlePlan {
  enabled: boolean;
  bundles: MessageBundle[];
  unbundled: BundleCandidate[];
  originalMessageCount: number;
  finalMessageCount: number;
  savedMessages: number;
  estimatedSavings: number;
}

const CRITICAL_MESSAGE_TYPES = new Set<MessageType>([
  MessageType.BOOKING_CONFIRMATION,
  MessageType.CANCELLATION_CONFIRMATION,
  MessageType.RESCHEDULING_CONFIRMATION,
]);

class SmartMessageBundlingService {
  async createBundlePlan(
    organizationId: string,
    candidates: BundleCandidate[],
    options: { trackSavings?: boolean } = {}
  ): Promise<BundlePlan> {
    try {
      const settings = await notificationSettingsService.getSettings(organizationId);
      const costPerMessage = settings.costPerMessage.toNumber();

      if (!settings.smartBundlingEnabled || candidates.length <= 1) {
        return this.emptyPlan(settings.smartBundlingEnabled, candidates, costPerMessage);
      }

      const groups = new Map<string, BundleCandidate[]>();
      const unbundled: BundleCandidate[] = [];

      for (const candidate of candidates) {
        if (CRITICAL_MESSAGE_TYPES.has(candidate.messageType)) {
          unbundled.push(candidate);
          continue;
        }

        const groupKey = [
          candidate.patientId,
          candidate.appointmentId || 'general',
          candidate.phone,
          this.getDayKey(candidate.scheduledFor),
        ].join(':');

        const existing = groups.get(groupKey) || [];
        existing.push(candidate);
        groups.set(groupKey, existing);
      }

      const bundles: MessageBundle[] = [];
      for (const group of groups.values()) {
        if (group.length < 2) {
          unbundled.push(...group);
          continue;
        }

        const first = group[0]!;
        bundles.push({
          patientId: first.patientId,
          appointmentId: first.appointmentId || null,
          phone: first.phone,
          messageTypes: group.map((message) => message.messageType),
          bodies: group.map((message) => message.body),
          bundledBody: group.map((message) => message.body.trim()).join('\n\n'),
          originalMessageCount: group.length,
          bundledMessageCount: 1,
          savedMessages: group.length - 1,
        });
      }

      const originalMessageCount = candidates.length;
      const finalMessageCount = bundles.length + unbundled.length;
      const savedMessages = originalMessageCount - finalMessageCount;
      const estimatedSavings = savedMessages * costPerMessage;

      if (options.trackSavings && savedMessages > 0) {
        await messageCostTrackingService.trackMessagesBundled(
          organizationId,
          bundles.length,
          savedMessages
        );
      }

      return {
        enabled: true,
        bundles,
        unbundled,
        originalMessageCount,
        finalMessageCount,
        savedMessages,
        estimatedSavings,
      };
    } catch (error: any) {
      logger.error('[SmartBundling] Failed to create bundle plan', {
        organizationId,
        error: error.message,
      });
      throw error;
    }
  }

  private emptyPlan(
    enabled: boolean,
    candidates: BundleCandidate[],
    costPerMessage: number
  ): BundlePlan {
    return {
      enabled,
      bundles: [],
      unbundled: candidates,
      originalMessageCount: candidates.length,
      finalMessageCount: candidates.length,
      savedMessages: 0,
      estimatedSavings: 0 * costPerMessage,
    };
  }

  private getDayKey(value?: string): string {
    if (!value) {
      return 'unscheduled';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return 'unscheduled';
    }

    return date.toISOString().slice(0, 10);
  }
}

export default new SmartMessageBundlingService();
