/**
 * Intent Handler Registry - TASK-040 (Section 4)
 * 
 * Registry pattern for managing intent handlers.
 * Routes intents to appropriate handlers and manages handler lifecycle.
 * 
 * @version 1.0
 * @date October 19, 2025
 */

import { Intent } from '../intentRecognitionService';
import { BaseIntentHandler, IntentHandlerContext, IntentHandlerResult } from './BaseIntentHandler';
import logger from '../../utils/logger';

// Import handlers (will be implemented)
import { HelpMenuHandler } from './HelpMenuHandler';
import { LanguageSwitchHandler } from './LanguageSwitchHandler';
import { GetClinicInfoHandler } from './GetClinicInfoHandler';

class IntentHandlerRegistry {
  private handlers: Map<Intent, BaseIntentHandler>;

  constructor() {
    this.handlers = new Map();
    this.registerDefaultHandlers();
  }

  /**
   * Register default handlers
   */
  private registerDefaultHandlers(): void {
    // Information handlers
    this.register(new HelpMenuHandler());
    this.register(new LanguageSwitchHandler());
    this.register(new GetClinicInfoHandler());

    // More handlers will be added here:
    // this.register(new BookAppointmentHandler());
    // this.register(new ViewAppointmentsHandler());
    // etc.

    logger.info('[IntentHandlerRegistry] Registered default handlers', {
      count: this.handlers.size,
    });
  }

  /**
   * Register a handler
   */
  public register(handler: BaseIntentHandler): void {
    const intent = handler.getIntent();
    
    if (this.handlers.has(intent)) {
      logger.warn('[IntentHandlerRegistry] Overwriting existing handler', { intent });
    }

    this.handlers.set(intent, handler);
    logger.debug('[IntentHandlerRegistry] Registered handler', { intent });
  }

  /**
   * Get handler for intent
   */
  public getHandler(intent: Intent): BaseIntentHandler | undefined {
    return this.handlers.get(intent);
  }

  /**
   * Check if handler exists for intent
   */
  public hasHandler(intent: Intent): boolean {
    return this.handlers.has(intent);
  }

  /**
   * Execute handler for intent
   */
  public async execute(context: IntentHandlerContext): Promise<IntentHandlerResult> {
    const handler = this.getHandler(context.intent);

    if (!handler) {
      logger.warn('[IntentHandlerRegistry] No handler found for intent', {
        intent: context.intent,
        organizationId: context.organizationId,
      });

      return {
        success: false,
        message: context.language === 'en'
          ? "I'm sorry, I don't understand that command yet."
          : 'معذرت، میں ابھی یہ کمانڈ نہیں سمجھتا۔',
        error: 'No handler registered for intent',
      };
    }

    try {
      const startTime = Date.now();
      
      logger.info('[IntentHandlerRegistry] Executing handler', {
        intent: context.intent,
        organizationId: context.organizationId,
        phoneNumber: context.phoneNumber,
      });

      const result = await handler.handle(context);

      const duration = Date.now() - startTime;
      logger.info('[IntentHandlerRegistry] Handler executed', {
        intent: context.intent,
        success: result.success,
        durationMs: duration,
      });

      // Performance warning if handler takes >500ms
      if (duration > 500) {
        logger.warn('[IntentHandlerRegistry] Slow handler execution', {
          intent: context.intent,
          durationMs: duration,
          target: '500ms',
        });
      }

      return result;
    } catch (error: any) {
      logger.error('[IntentHandlerRegistry] Handler execution failed', {
        intent: context.intent,
        error: error.message,
        stack: error.stack,
      });

      return {
        success: false,
        message: context.language === 'en'
          ? 'An error occurred while processing your request. Please try again.'
          : 'آپ کی درخواست پر کارروائی کرتے وقت ایک خرابی پیش آئی۔ براہ کرم دوبارہ کوشش کریں۔',
        error: error.message,
      };
    }
  }

  /**
   * Get all registered intents
   */
  public getRegisteredIntents(): Intent[] {
    return Array.from(this.handlers.keys());
  }

  /**
   * Get registry statistics
   */
  public getStats(): {
    totalHandlers: number;
    registeredIntents: Intent[];
  } {
    return {
      totalHandlers: this.handlers.size,
      registeredIntents: this.getRegisteredIntents(),
    };
  }
}

// Export singleton instance
export const intentHandlerRegistry = new IntentHandlerRegistry();
export default intentHandlerRegistry;
