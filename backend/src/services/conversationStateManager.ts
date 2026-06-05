/**
 * Conversation State Manager - TASK-040 (Section 5)
 * 
 * Manages conversation state across messages using Redis.
 * Tracks conversation context, current step, and user data.
 * 
 * Features:
 * - Redis-based state storage
 * - Session management with TTL (24 hours)
 * - State operations (CRUD)
 * - Conversation history tracking (last 10 turns)
 * - Session timeout handling
 * 
 * @version 1.0
 * @date October 19, 2025
 */

import Redis from 'ioredis';
import { Intent } from './intentRecognitionService';
import logger from '../utils/logger';
import { getRedisConnectionConfig } from '../config/redis';

// Conversation turn (for history)
export interface ConversationTurn {
  timestamp: string;
  userMessage: string;
  botResponse: string;
  intent: Intent;
}

// Complete conversation state
export interface ConversationState {
  sessionId: string;
  organizationId: string;
  phoneNumber: string;
  language: 'en' | 'ur';
  currentIntent: Intent;
  step: string;
  data: Record<string, any>;
  history: ConversationTurn[];
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
  expiresAt: string; // ISO 8601
  version: number;
}

class ConversationStateManager {
  private redis: Redis;
  private readonly STATE_PREFIX = 'conversation:state';
  private readonly SESSION_TTL = 86400; // 24 hours in seconds
  private readonly MAX_HISTORY = 10; // Keep last 10 turns

  constructor() {
    this.redis = new Redis(getRedisConnectionConfig());
    logger.info('[ConversationStateManager] Service initialized');
  }

  /**
   * Create new conversation state
   */
  public async createState(
    organizationId: string,
    phoneNumber: string,
    language: 'en' | 'ur',
    intent: Intent
  ): Promise<ConversationState> {
    const sessionId = this.generateSessionId();
    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + this.SESSION_TTL * 1000).toISOString();

    const state: ConversationState = {
      sessionId,
      organizationId,
      phoneNumber,
      language,
      currentIntent: intent,
      step: 'start',
      data: {},
      history: [],
      createdAt: now,
      updatedAt: now,
      expiresAt,
      version: 1,
    };

    await this.saveState(organizationId, phoneNumber, state);

    logger.info('[ConversationStateManager] Created new state', {
      sessionId,
      organizationId,
      phoneNumber,
      intent,
    });

    return state;
  }

  /**
   * Get conversation state
   */
  public async getState(
    organizationId: string,
    phoneNumber: string
  ): Promise<ConversationState | null> {
    try {
      const key = this.getStateKey(organizationId, phoneNumber);
      const data = await this.redis.get(key);

      if (!data) {
        return null;
      }

      const state: ConversationState = JSON.parse(data);

      // Check if state has expired
      if (new Date(state.expiresAt) < new Date()) {
        logger.info('[ConversationStateManager] State expired, deleting', {
          sessionId: state.sessionId,
          organizationId,
          phoneNumber,
        });
        await this.deleteState(organizationId, phoneNumber);
        return null;
      }

      return state;
    } catch (error: any) {
      logger.error('[ConversationStateManager] Failed to get state', {
        organizationId,
        phoneNumber,
        error: error.message,
      });
      return null;
    }
  }

  /**
   * Update conversation state
   */
  public async updateState(
    organizationId: string,
    phoneNumber: string,
    updates: Partial<ConversationState>
  ): Promise<ConversationState | null> {
    try {
      const currentState = await this.getState(organizationId, phoneNumber);

      if (!currentState) {
        logger.warn('[ConversationStateManager] Cannot update non-existent state', {
          organizationId,
          phoneNumber,
        });
        return null;
      }

      // Merge updates
      const updatedState: ConversationState = {
        ...currentState,
        ...updates,
        updatedAt: new Date().toISOString(),
        version: currentState.version + 1,
      };

      // Merge data if provided
      if (updates.data) {
        updatedState.data = {
          ...currentState.data,
          ...updates.data,
        };
      }

      await this.saveState(organizationId, phoneNumber, updatedState);

      logger.info('[ConversationStateManager] Updated state', {
        sessionId: updatedState.sessionId,
        organizationId,
        phoneNumber,
        version: updatedState.version,
      });

      return updatedState;
    } catch (error: any) {
      logger.error('[ConversationStateManager] Failed to update state', {
        organizationId,
        phoneNumber,
        error: error.message,
      });
      return null;
    }
  }

  /**
   * Save conversation state to Redis
   */
  private async saveState(
    organizationId: string,
    phoneNumber: string,
    state: ConversationState
  ): Promise<void> {
    const key = this.getStateKey(organizationId, phoneNumber);
    const data = JSON.stringify(state);

    await this.redis.setex(key, this.SESSION_TTL, data);
  }

  /**
   * Delete conversation state
   */
  public async deleteState(
    organizationId: string,
    phoneNumber: string
  ): Promise<void> {
    const key = this.getStateKey(organizationId, phoneNumber);
    await this.redis.del(key);

    logger.info('[ConversationStateManager] Deleted state', {
      organizationId,
      phoneNumber,
    });
  }

  /**
   * Reset conversation state (clear data but keep session)
   */
  public async resetState(
    organizationId: string,
    phoneNumber: string,
    intent: Intent
  ): Promise<ConversationState | null> {
    const currentState = await this.getState(organizationId, phoneNumber);

    if (!currentState) {
      return null;
    }

    const resetState: ConversationState = {
      ...currentState,
      currentIntent: intent,
      step: 'start',
      data: {},
      updatedAt: new Date().toISOString(),
      version: currentState.version + 1,
    };

    await this.saveState(organizationId, phoneNumber, resetState);

    logger.info('[ConversationStateManager] Reset state', {
      sessionId: resetState.sessionId,
      organizationId,
      phoneNumber,
    });

    return resetState;
  }

  /**
   * Add turn to conversation history
   */
  public async addTurn(
    organizationId: string,
    phoneNumber: string,
    turn: Omit<ConversationTurn, 'timestamp'>
  ): Promise<void> {
    const state = await this.getState(organizationId, phoneNumber);

    if (!state) {
      logger.warn('[ConversationStateManager] Cannot add turn to non-existent state', {
        organizationId,
        phoneNumber,
      });
      return;
    }

    const completeTurn: ConversationTurn = {
      ...turn,
      timestamp: new Date().toISOString(),
    };

    // Add to history, keep only last MAX_HISTORY turns
    const history = [...state.history, completeTurn].slice(-this.MAX_HISTORY);

    await this.updateState(organizationId, phoneNumber, { history });

    logger.debug('[ConversationStateManager] Added turn to history', {
      organizationId,
      phoneNumber,
      historyLength: history.length,
    });
  }

  /**
   * Get or create state (convenience method)
   */
  public async getOrCreateState(
    organizationId: string,
    phoneNumber: string,
    language: 'en' | 'ur',
    intent: Intent
  ): Promise<ConversationState> {
    const existing = await this.getState(organizationId, phoneNumber);

    if (existing) {
      return existing;
    }

    return await this.createState(organizationId, phoneNumber, language, intent);
  }

  /**
   * Check if active session exists
   */
  public async hasActiveSession(
    organizationId: string,
    phoneNumber: string
  ): Promise<boolean> {
    const state = await this.getState(organizationId, phoneNumber);
    return state !== null;
  }

  /**
   * Get active sessions count for organization
   */
  public async getActiveSessionsCount(organizationId: string): Promise<number> {
    try {
      const pattern = `${this.STATE_PREFIX}:${organizationId}:*`;
      const keys = await this.redis.keys(pattern);
      return keys.length;
    } catch (error: any) {
      logger.error('[ConversationStateManager] Failed to get sessions count', {
        organizationId,
        error: error.message,
      });
      return 0;
    }
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 15);
    return `${timestamp}-${random}`;
  }

  /**
   * Get Redis key for state
   */
  private getStateKey(organizationId: string, phoneNumber: string): string {
    return `${this.STATE_PREFIX}:${organizationId}:${phoneNumber}`;
  }

  /**
   * Get state data by key
   */
  public async getStateData<T = any>(
    organizationId: string,
    phoneNumber: string,
    key: string,
    defaultValue?: T
  ): Promise<T | undefined> {
    const state = await this.getState(organizationId, phoneNumber);
    return state?.data[key] ?? defaultValue;
  }

  /**
   * Update state data by key
   */
  public async updateStateData(
    organizationId: string,
    phoneNumber: string,
    key: string,
    value: any
  ): Promise<void> {
    const state = await this.getState(organizationId, phoneNumber);

    if (!state) {
      logger.warn('[ConversationStateManager] Cannot update data for non-existent state', {
        organizationId,
        phoneNumber,
      });
      return;
    }

    await this.updateState(organizationId, phoneNumber, {
      data: {
        ...state.data,
        [key]: value,
      },
    });
  }

  /**
   * Get conversation history
   */
  public async getHistory(
    organizationId: string,
    phoneNumber: string
  ): Promise<ConversationTurn[]> {
    const state = await this.getState(organizationId, phoneNumber);
    return state?.history || [];
  }

  /**
   * Close Redis connection
   */
  public async close(): Promise<void> {
    this.redis.disconnect();
    logger.info('[ConversationStateManager] Service closed');
  }
}

// Export singleton instance
export const conversationStateManager = new ConversationStateManager();
export default conversationStateManager;
