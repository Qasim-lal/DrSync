/**
 * Intent Handlers Index - TASK-040 (Section 4)
 * 
 * Exports all intent handlers and registry.
 * 
 * @version 1.0
 * @date October 19, 2025
 */

export * from './BaseIntentHandler';
export * from './IntentHandlerRegistry';
export * from './HelpMenuHandler';
export * from './LanguageSwitchHandler';
export * from './GetClinicInfoHandler';

// Export default registry instance
export { default as intentHandlerRegistry } from './IntentHandlerRegistry';
