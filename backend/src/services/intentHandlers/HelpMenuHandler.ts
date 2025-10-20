/**
 * Help Menu Handler - TASK-040 (Section 4.3)
 * 
 * Shows the main menu to the user.
 * 
 * @version 1.0
 * @date October 19, 2025
 */

import { BaseIntentHandler, IntentHandlerContext, IntentHandlerResult } from './BaseIntentHandler';
import { Intent } from '../intentRecognitionService';
import messageTemplates from '../messageTemplates';

export class HelpMenuHandler extends BaseIntentHandler {
  constructor() {
    super(Intent.HELP_MENU);
  }

  public async handle(context: IntentHandlerContext): Promise<IntentHandlerResult> {
    this.validateContext(context);

    // Get main menu in user's language
    const menu = messageTemplates.get(messageTemplates.MAIN_MENU, context.language);

    return this.success(menu, {
      nextStep: 'awaiting_menu_selection',
      requiresInput: true,
    });
  }
}
