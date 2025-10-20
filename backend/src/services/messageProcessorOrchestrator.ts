/**
 * Message Processing Orchestrator - TASK-040 (Section 7)
 * 
 * Main orchestrator that coordinates all message processing components.
 * Implements the 7-step pipeline from TDD 7.1.2.
 * 
 * Pipeline Steps:
 * 1. Receive Webhook (TASK-039)
 * 2. Parse Message (TASK-039)
 * 3. Language Detection (TASK-040)
 * 4. Intent Recognition (TASK-040)
 * 5. Business Logic (TASK-040)
 * 6. Response Generation (TASK-040)
 * 7. Send Message (TASK-039)
 * 
 * Features:
 * - 7-step processing pipeline
 * - Error handling & retry
 * - Performance monitoring (<1s target)
 * - Component-level timing
 * - Circuit breaker pattern
 * 
 * @version 1.0
 * @date October 19, 2025
 */

import { Job } from 'bull';
import { MessageJobData, MessageJobResult } from './messageQueueService';
import languageDetectionService from './languageDetectionService';
import intentRecognitionService from './intentRecognitionService';
import conversationStateManager from './conversationStateManager';
import intentHandlerRegistry from './intentHandlers/IntentHandlerRegistry';
import getPrismaClient from './prisma';
import logger from '../utils/logger';

// Processing metrics
interface ProcessingMetrics {
  totalTimeMs: number;
  languageDetectionMs: number;
  intentClassificationMs: number;
  handlerExecutionMs: number;
  responseGenerationMs: number;
  stateManagementMs: number;
}

class MessageProcessorOrchestrator {
  private failureCount: number = 0;
  private readonly CIRCUIT_BREAKER_THRESHOLD = 5; // Open circuit after 5 failures
  private circuitOpen: boolean = false;

  /**
   * Process a message through the complete pipeline
   * 
   * This is called by the Bull Queue worker for each message
   */
  public async processMessage(job: Job<MessageJobData>): Promise<MessageJobResult> {
    const startTime = Date.now();
    const { messageId, organizationId, phoneNumber, messageText } = job.data;

    // Initialize metrics
    const metrics: Partial<ProcessingMetrics> = {};

    try {
      // Check circuit breaker
      if (this.circuitOpen) {
        throw new Error('Circuit breaker is open - too many failures');
      }

      logger.info('[MessageProcessor] Starting message processing', {
        messageId,
        organizationId,
        phoneNumber,
      });

      // ===== STEP 1 & 2: Webhook & Parse (handled by TASK-039) =====
      // Message already parsed and in queue

      // ===== STEP 3: Language Detection =====
      const langStart = Date.now();
      const languageResult = await languageDetectionService.detectLanguage(
        messageText,
        organizationId,
        phoneNumber
      );
      metrics.languageDetectionMs = Date.now() - langStart;

      const language = languageResult.language;
      logger.debug('[MessageProcessor] Language detected', {
        messageId,
        language,
        confidence: languageResult.confidence,
        method: languageResult.method,
      });

      // ===== STEP 4: Intent Recognition =====
      const intentStart = Date.now();
      
      // Get conversation state for context
      const stateStart = Date.now();
      const conversationState = await conversationStateManager.getState(
        organizationId,
        phoneNumber
      );
      const stateLoadTime = Date.now() - stateStart;

      // Classify intent with context
      const intentResult = intentRecognitionService.classifyIntent(
        messageText,
        language,
        conversationState ? {
          currentStep: conversationState.step,
          awaitingConfirmation: conversationState.step.includes('confirmation'),
          lastIntent: conversationState.currentIntent,
        } : undefined
      );
      metrics.intentClassificationMs = Date.now() - intentStart;

      logger.info('[MessageProcessor] Intent classified', {
        messageId,
        intent: intentResult.intent,
        confidence: intentResult.confidence,
        matchedKeywords: intentResult.matchedKeywords,
      });

      // ===== STEP 5: Business Logic (Handler Execution) =====
      const handlerStart = Date.now();

      // Get organization and patient data
      const prisma = getPrismaClient();
      const [organization, patient] = await Promise.all([
        prisma.organization.findUnique({ where: { id: organizationId } }),
        prisma.patient.findFirst({
          where: { organizationId, phone: phoneNumber },
        }),
      ]);

      if (!organization) {
        throw new Error('Organization not found');
      }

      // Build handler context
      const handlerContext: any = {
        messageId,
        organizationId,
        organization,
        phoneNumber,
        messageText,
        language,
        intent: intentResult.intent,
        entities: intentResult.entities,
      };
      if (patient) handlerContext.patient = patient;
      if (conversationState) handlerContext.conversationState = conversationState;

      // Execute handler
      const handlerResult = await intentHandlerRegistry.execute(handlerContext);
      metrics.handlerExecutionMs = Date.now() - handlerStart;

      logger.info('[MessageProcessor] Handler executed', {
        messageId,
        intent: intentResult.intent,
        success: handlerResult.success,
      });

      // ===== STEP 6: Response Generation =====
      // Response message generated by handler
      const responseMessage = handlerResult.message;
      metrics.responseGenerationMs = 0; // Included in handler time

      // ===== Update Conversation State =====
      const stateUpdateStart = Date.now();
      
      if (handlerResult.success) {
        // Create or update state
        if (conversationState) {
          const stateUpdates: any = {
            language,
            currentIntent: intentResult.intent,
            step: handlerResult.nextStep || conversationState.step,
          };
          
          // Merge conversation state if provided
          if (handlerResult.conversationState) {
            Object.assign(stateUpdates, handlerResult.conversationState);
          }
          
          await conversationStateManager.updateState(organizationId, phoneNumber, stateUpdates);
        } else if (handlerResult.requiresInput) {
          // Create new state for multi-step conversations
          await conversationStateManager.createState(
            organizationId,
            phoneNumber,
            language,
            intentResult.intent
          );
        }

        // Add turn to history
        await conversationStateManager.addTurn(organizationId, phoneNumber, {
          userMessage: messageText,
          botResponse: responseMessage,
          intent: intentResult.intent,
        });
      }

      metrics.stateManagementMs = Date.now() - stateUpdateStart + stateLoadTime;

      // ===== STEP 7: Send Message (will be handled by caller) =====
      // Return response to be sent via WhatsApp API

      // Calculate total time
      const totalTime = Date.now() - startTime;
      metrics.totalTimeMs = totalTime;

      // Log performance metrics
      this.logMetrics(messageId, metrics as ProcessingMetrics);

      // Check performance target (<1 second for TASK-040)
      if (totalTime > 1000) {
        logger.warn('[MessageProcessor] Slow processing (target: <1s)', {
          messageId,
          totalTimeMs: totalTime,
          target: '1000ms',
          metrics,
        });
      }

      // Reset failure count on success
      this.failureCount = 0;
      if (this.circuitOpen) {
        logger.info('[MessageProcessor] Circuit breaker closed - system recovered');
        this.circuitOpen = false;
      }

      return {
        success: true,
        messageId,
        processingTimeMs: totalTime,
        intent: intentResult.intent,
        language,
        response: responseMessage,
      };

    } catch (error: any) {
      const totalTime = Date.now() - startTime;
      metrics.totalTimeMs = totalTime;

      logger.error('[MessageProcessor] Processing failed', {
        messageId,
        organizationId,
        phoneNumber,
        error: error.message,
        stack: error.stack,
        metrics,
      });

      // Increment failure count
      this.failureCount++;
      if (this.failureCount >= this.CIRCUIT_BREAKER_THRESHOLD) {
        this.circuitOpen = true;
        logger.error('[MessageProcessor] Circuit breaker opened - too many failures', {
          failureCount: this.failureCount,
          threshold: this.CIRCUIT_BREAKER_THRESHOLD,
        });
      }

      // Determine if error is retryable
      const isRetryable = this.isRetryableError(error);

      return {
        success: false,
        messageId,
        processingTimeMs: totalTime,
        error: error.message,
        retryable: isRetryable,
      };
    }
  }

  /**
   * Log performance metrics with component breakdown
   */
  private logMetrics(messageId: string, metrics: ProcessingMetrics): void {
    logger.info('[MessageProcessor] Processing metrics', {
      messageId,
      totalTimeMs: metrics.totalTimeMs,
      breakdown: {
        languageDetection: `${metrics.languageDetectionMs}ms`,
        intentClassification: `${metrics.intentClassificationMs}ms`,
        handlerExecution: `${metrics.handlerExecutionMs}ms`,
        stateManagement: `${metrics.stateManagementMs}ms`,
        responseGeneration: `${metrics.responseGenerationMs}ms`,
      },
    });

    // Component-level warnings
    if (metrics.languageDetectionMs > 100) {
      logger.warn('[MessageProcessor] Slow language detection', {
        messageId,
        timeMs: metrics.languageDetectionMs,
        target: '100ms',
      });
    }

    if (metrics.intentClassificationMs > 200) {
      logger.warn('[MessageProcessor] Slow intent classification', {
        messageId,
        timeMs: metrics.intentClassificationMs,
        target: '200ms',
      });
    }

    if (metrics.handlerExecutionMs > 500) {
      logger.warn('[MessageProcessor] Slow handler execution', {
        messageId,
        timeMs: metrics.handlerExecutionMs,
        target: '500ms',
      });
    }
  }

  /**
   * Determine if error is retryable
   */
  private isRetryableError(error: any): boolean {
    // Network errors are retryable
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      return true;
    }

    // Database connection errors are retryable
    if (error.message?.includes('connection') || error.message?.includes('timeout')) {
      return true;
    }

    // Redis errors are retryable
    if (error.message?.includes('Redis')) {
      return true;
    }

    // Business logic errors are not retryable
    return false;
  }

  /**
   * Get circuit breaker status
   */
  public getCircuitBreakerStatus(): {
    open: boolean;
    failureCount: number;
    threshold: number;
  } {
    return {
      open: this.circuitOpen,
      failureCount: this.failureCount,
      threshold: this.CIRCUIT_BREAKER_THRESHOLD,
    };
  }

  /**
   * Reset circuit breaker manually
   */
  public resetCircuitBreaker(): void {
    this.circuitOpen = false;
    this.failureCount = 0;
    logger.info('[MessageProcessor] Circuit breaker manually reset');
  }

  /**
   * Health check
   */
  public async healthCheck(): Promise<{
    healthy: boolean;
    components: {
      languageDetection: boolean;
      intentRecognition: boolean;
      conversationState: boolean;
      intentHandlers: boolean;
    };
    circuitBreaker: {
      open: boolean;
      failureCount: number;
    };
  }> {
    const components = {
      languageDetection: true, // Simple service, always available
      intentRecognition: true, // Simple service, always available
      conversationState: true, // Will be checked below
      intentHandlers: intentHandlerRegistry.getStats().totalHandlers > 0,
    };

    // Check Redis connection (conversation state)
    try {
      await conversationStateManager.hasActiveSession('health-check', 'test');
      components.conversationState = true;
    } catch {
      components.conversationState = false;
    }

    const healthy = Object.values(components).every(v => v) && !this.circuitOpen;

    return {
      healthy,
      components,
      circuitBreaker: {
        open: this.circuitOpen,
        failureCount: this.failureCount,
      },
    };
  }
}

// Export singleton instance
export const messageProcessorOrchestrator = new MessageProcessorOrchestrator();
export default messageProcessorOrchestrator;
