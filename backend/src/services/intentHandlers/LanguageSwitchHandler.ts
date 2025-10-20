/**
 * Language Switch Handler - TASK-040 (Section 4.4)
 * 
 * Handles language switching (menu option 0/🌐 or text commands).
 * Updates Redis cache and Patient.preferredLanguage.
 * 
 * @version 1.0
 * @date October 19, 2025
 */

import { BaseIntentHandler, IntentHandlerContext, IntentHandlerResult } from './BaseIntentHandler';
import { Intent } from '../intentRecognitionService';
import messageTemplates from '../messageTemplates';
import languageDetectionService from '../languageDetectionService';
import logger from '../../utils/logger';

export class LanguageSwitchHandler extends BaseIntentHandler {
  constructor() {
    super(Intent.LANGUAGE_MENU_SELECT);
  }

  public async handle(context: IntentHandlerContext): Promise<IntentHandlerResult> {
    this.validateContext(context);

    const text = context.messageText.trim();

    // Check if user is selecting a language (1 or 2)
    if (text === '1' || text.toLowerCase() === 'english') {
      return await this.switchLanguage(context, 'en');
    }

    if (text === '2' || text === '٢' || text.includes('اردو')) {
      return await this.switchLanguage(context, 'ur');
    }

    // Show language selection menu
    const languageMenu = messageTemplates.get(
      messageTemplates.LANGUAGE_SELECTION,
      context.language
    );

    return this.success(languageMenu, {
      nextStep: 'awaiting_language_selection',
      requiresInput: true,
    });
  }

  /**
   * Switch to new language
   */
  private async switchLanguage(
    context: IntentHandlerContext,
    newLanguage: 'en' | 'ur'
  ): Promise<IntentHandlerResult> {
    try {
      // Save language preference (Redis + PostgreSQL)
      await languageDetectionService.saveLanguagePreference(
        context.organizationId,
        context.phoneNumber,
        newLanguage,
        1.0 // User-selected = high confidence
      );

      // Get confirmation message in NEW language
      const confirmation = messageTemplates.get(
        messageTemplates.LANGUAGE_CHANGED,
        newLanguage
      );

      // Get main menu in NEW language
      const menu = messageTemplates.get(
        messageTemplates.MAIN_MENU,
        newLanguage
      );

      const message = `${confirmation}\n\n${menu}`;

      logger.info('[LanguageSwitchHandler] Language switched', {
        organizationId: context.organizationId,
        phoneNumber: context.phoneNumber,
        oldLanguage: context.language,
        newLanguage,
      });

      return this.success(message, {
        nextStep: 'awaiting_menu_selection',
        conversationState: {
          language: newLanguage,
        },
        requiresInput: true,
      });
    } catch (error: any) {
      logger.error('[LanguageSwitchHandler] Failed to switch language', {
        error: error.message,
        organizationId: context.organizationId,
      });

      return this.error(
        context.language === 'en'
          ? 'Failed to change language. Please try again.'
          : 'زبان تبدیل کرنے میں ناکام۔ براہ کرم دوبارہ کوشش کریں۔',
        error.message
      );
    }
  }
}
