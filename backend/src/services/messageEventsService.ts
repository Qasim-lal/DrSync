/**
 * Message Events Service - TASK-040 (Section 8)
 * 
 * Real-time event emitter for message processing lifecycle.
 * Enables live dashboard updates via Server-Sent Events (SSE).
 * 
 * Events:
 * - message:received - Webhook received message
 * - message:processing - Queue worker started processing
 * - message:responded - Response sent to WhatsApp
 * - message:failed - Processing error occurred
 * 
 * Features:
 * - EventEmitter-based architecture
 * - Organization-scoped filtering
 * - Event payload schemas
 * - SSE streaming support
 * 
 * @version 1.0
 * @date October 19, 2025
 */

import { EventEmitter } from 'events';
import logger from '../utils/logger';
import { Intent } from './intentRecognitionService';

// Event types
export enum MessageEventType {
  RECEIVED = 'message:received',
  PROCESSING = 'message:processing',
  RESPONDED = 'message:responded',
  FAILED = 'message:failed',
}

// Base event payload
interface BaseMessageEvent {
  eventType: MessageEventType;
  organizationId: string;
  phoneNumber: string;
  messageId: string;
  timestamp: string; // ISO 8601
}

// Event-specific data
export interface MessageReceivedEvent extends BaseMessageEvent {
  eventType: MessageEventType.RECEIVED;
  data: {
    messageText: string;
    phoneNumberId?: string;
  };
}

export interface MessageProcessingEvent extends BaseMessageEvent {
  eventType: MessageEventType.PROCESSING;
  data: {
    intent?: Intent;
    language?: 'en' | 'ur';
  };
}

export interface MessageRespondedEvent extends BaseMessageEvent {
  eventType: MessageEventType.RESPONDED;
  data: {
    intent: Intent;
    language: 'en' | 'ur';
    processingTimeMs: number;
    responseText: string;
  };
}

export interface MessageFailedEvent extends BaseMessageEvent {
  eventType: MessageEventType.FAILED;
  data: {
    error: string;
    processingTimeMs?: number;
  };
}

// Union type for all events
export type MessageEvent =
  | MessageReceivedEvent
  | MessageProcessingEvent
  | MessageRespondedEvent
  | MessageFailedEvent;

class MessageEventsService extends EventEmitter {
  private eventHistory: Map<string, MessageEvent[]>; // organizationId -> events[]
  private readonly MAX_HISTORY_PER_ORG = 100; // Keep last 100 events per org

  constructor() {
    super();
    this.eventHistory = new Map();
    this.setMaxListeners(50); // Support up to 50 SSE connections
    logger.info('[MessageEventsService] Service initialized');
  }

  /**
   * Emit message received event
   */
  public emitMessageReceived(
    organizationId: string,
    phoneNumber: string,
    messageId: string,
    messageText: string,
    phoneNumberId?: string
  ): void {
    const event: MessageReceivedEvent = {
      eventType: MessageEventType.RECEIVED,
      organizationId,
      phoneNumber,
      messageId,
      timestamp: new Date().toISOString(),
      data: {
        messageText,
        ...(phoneNumberId !== undefined && { phoneNumberId }),
      },
    };

    this.emitEvent(event);
  }

  /**
   * Emit message processing event
   */
  public emitMessageProcessing(
    organizationId: string,
    phoneNumber: string,
    messageId: string,
    intent?: Intent,
    language?: 'en' | 'ur'
  ): void {
    const event: MessageProcessingEvent = {
      eventType: MessageEventType.PROCESSING,
      organizationId,
      phoneNumber,
      messageId,
      timestamp: new Date().toISOString(),
      data: {
        ...(intent !== undefined && { intent }),
        ...(language !== undefined && { language }),
      },
    };

    this.emitEvent(event);
  }

  /**
   * Emit message responded event
   */
  public emitMessageResponded(
    organizationId: string,
    phoneNumber: string,
    messageId: string,
    intent: Intent,
    language: 'en' | 'ur',
    processingTimeMs: number,
    responseText: string
  ): void {
    const event: MessageRespondedEvent = {
      eventType: MessageEventType.RESPONDED,
      organizationId,
      phoneNumber,
      messageId,
      timestamp: new Date().toISOString(),
      data: {
        intent,
        language,
        processingTimeMs,
        responseText,
      },
    };

    this.emitEvent(event);
  }

  /**
   * Emit message failed event
   */
  public emitMessageFailed(
    organizationId: string,
    phoneNumber: string,
    messageId: string,
    error: string,
    processingTimeMs?: number
  ): void {
    const event: MessageFailedEvent = {
      eventType: MessageEventType.FAILED,
      organizationId,
      phoneNumber,
      messageId,
      timestamp: new Date().toISOString(),
      data: {
        error,
        ...(processingTimeMs !== undefined && { processingTimeMs }),
      },
    };

    this.emitEvent(event);
  }

  /**
   * Emit event to listeners and store in history
   */
  private emitEvent(event: MessageEvent): void {
    // Emit to all listeners
    this.emit(event.eventType, event);
    this.emit('message:*', event); // Wildcard for all events

    // Store in organization's history
    this.addToHistory(event.organizationId, event);

    logger.debug('[MessageEventsService] Event emitted', {
      eventType: event.eventType,
      organizationId: event.organizationId,
      messageId: event.messageId,
    });
  }

  /**
   * Add event to organization's history
   */
  private addToHistory(organizationId: string, event: MessageEvent): void {
    let history = this.eventHistory.get(organizationId);

    if (!history) {
      history = [];
      this.eventHistory.set(organizationId, history);
    }

    // Add event and trim to max size
    history.push(event);
    if (history.length > this.MAX_HISTORY_PER_ORG) {
      history.shift(); // Remove oldest
    }
  }

  /**
   * Get event history for organization
   */
  public getEventHistory(
    organizationId: string,
    limit: number = 50
  ): MessageEvent[] {
    const history = this.eventHistory.get(organizationId) || [];
    return history.slice(-limit); // Return last N events
  }

  /**
   * Subscribe to events for organization
   * Returns unsubscribe function
   */
  public subscribeToOrganization(
    organizationId: string,
    callback: (event: MessageEvent) => void
  ): () => void {
    const listener = (event: MessageEvent) => {
      if (event.organizationId === organizationId) {
        callback(event);
      }
    };

    this.on('message:*', listener);

    // Return unsubscribe function
    return () => {
      this.off('message:*', listener);
    };
  }

  /**
   * Get active listener count
   */
  public getActiveListenerCount(): number {
    return this.listenerCount('message:*');
  }

  /**
   * Clear history for organization
   */
  public clearHistory(organizationId: string): void {
    this.eventHistory.delete(organizationId);
    logger.info('[MessageEventsService] Cleared history', { organizationId });
  }

  /**
   * Get statistics
   */
  public getStats(): {
    activeListeners: number;
    organizationsWithHistory: number;
    totalHistoryEvents: number;
  } {
    let totalEvents = 0;
    for (const history of this.eventHistory.values()) {
      totalEvents += history.length;
    }

    return {
      activeListeners: this.getActiveListenerCount(),
      organizationsWithHistory: this.eventHistory.size,
      totalHistoryEvents: totalEvents,
    };
  }
}

// Export singleton instance
export const messageEventsService = new MessageEventsService();
export default messageEventsService;
