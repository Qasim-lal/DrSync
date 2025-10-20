/**
 * Base Intent Handler - TASK-040 (Section 4)
 * 
 * Abstract base class for all intent handlers.
 * Defines the interface and common functionality for processing intents.
 * 
 * @version 1.0
 * @date October 19, 2025
 */

import { Intent } from '../intentRecognitionService';
import { Organization, Patient } from '../../generated/prisma';

// Handler execution context
export interface IntentHandlerContext {
  messageId: string;
  organizationId: string;
  organization: Organization;
  phoneNumber: string;
  patient?: Patient;
  messageText: string;
  language: 'en' | 'ur';
  intent: Intent;
  entities: any;
  conversationState?: ConversationState;
}

// Conversation state
export interface ConversationState {
  sessionId: string;
  currentIntent: Intent;
  step: string;
  data: Record<string, any>;
  language: 'en' | 'ur';
  createdAt: Date;
  updatedAt: Date;
}

// Handler execution result
export interface IntentHandlerResult {
  success: boolean;
  message: string; // Response message to send
  nextStep?: string; // Next step in conversation flow
  conversationState?: Partial<ConversationState>; // State updates
  requiresInput?: boolean; // Waiting for user input
  error?: string;
  metadata?: Record<string, any>;
}

/**
 * Abstract base class for intent handlers
 */
export abstract class BaseIntentHandler {
  protected intent: Intent;

  constructor(intent: Intent) {
    this.intent = intent;
  }

  /**
   * Handle the intent
   * Must be implemented by concrete handler classes
   */
  public abstract handle(context: IntentHandlerContext): Promise<IntentHandlerResult>;

  /**
   * Get the intent this handler processes
   */
  public getIntent(): Intent {
    return this.intent;
  }

  /**
   * Validate handler context
   */
  protected validateContext(context: IntentHandlerContext): void {
    if (!context.organizationId) {
      throw new Error('Organization ID is required');
    }
    if (!context.phoneNumber) {
      throw new Error('Phone number is required');
    }
    if (!context.language) {
      throw new Error('Language is required');
    }
  }

  /**
   * Create success result
   */
  protected success(
    message: string,
    options?: {
      nextStep?: string;
      conversationState?: Partial<ConversationState>;
      requiresInput?: boolean;
      metadata?: Record<string, any>;
    }
  ): IntentHandlerResult {
    const result: IntentHandlerResult = {
      success: true,
      message,
      requiresInput: options?.requiresInput ?? false,
    };

    if (options?.nextStep !== undefined) {
      result.nextStep = options.nextStep;
    }
    if (options?.conversationState !== undefined) {
      result.conversationState = options.conversationState;
    }
    if (options?.metadata !== undefined) {
      result.metadata = options.metadata;
    }

    return result;
  }

  /**
   * Create error result
   */
  protected error(message: string, error?: string): IntentHandlerResult {
    const result: IntentHandlerResult = {
      success: false,
      message,
    };

    if (error !== undefined) {
      result.error = error;
    }

    return result;
  }

  /**
   * Get conversation state data
   */
  protected getStateData<T = any>(
    context: IntentHandlerContext,
    key: string,
    defaultValue?: T
  ): T {
    return context.conversationState?.data[key] ?? defaultValue;
  }

  /**
   * Update conversation state data
   */
  protected updateStateData(
    updates: Record<string, any>
  ): Partial<ConversationState> {
    return {
      data: updates,
      updatedAt: new Date(),
    };
  }
}

export default BaseIntentHandler;
