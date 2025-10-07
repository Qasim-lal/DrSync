/**
 * Email Configuration Validator
 * Ensures email service is properly configured before deployment
 */

import { logger } from './logger';

export interface EmailConfigStatus {
  isConfigured: boolean;
  issues: string[];
  warnings: string[];
}

/**
 * Validate email configuration
 */
export function validateEmailConfig(): EmailConfigStatus {
  const issues: string[] = [];
  const warnings: string[] = [];

  const smtpHost = process.env.SMTP_HOST;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpFrom = process.env.SMTP_FROM;

  // Check required fields
  if (!smtpHost || smtpHost === 'localhost') {
    issues.push('SMTP_HOST is not configured or set to localhost');
  }

  if (!smtpUser) {
    issues.push('SMTP_USER is not configured');
  }

  if (!smtpPass) {
    issues.push('SMTP_PASS is not configured');
  }

  // Check optional but recommended fields
  if (!smtpFrom) {
    warnings.push('SMTP_FROM is not configured (using default: noreply@drsync.com)');
  }

  const isConfigured = issues.length === 0;

  return {
    isConfigured,
    issues,
    warnings,
  };
}

/**
 * Check email configuration and handle based on environment
 */
export function checkEmailConfigOnStartup(): void {
  const status = validateEmailConfig();
  const env = process.env.NODE_ENV || 'development';

  if (env === 'production') {
    // PRODUCTION: Email must be configured
    if (!status.isConfigured) {
      logger.error('='.repeat(80));
      logger.error('CRITICAL ERROR: Email service not configured in PRODUCTION');
      logger.error('='.repeat(80));
      logger.error('Missing configuration:');
      status.issues.forEach((issue) => logger.error(`  ❌ ${issue}`));
      logger.error('');
      logger.error('Email functionality is REQUIRED in production for:');
      logger.error('  - Staff invitations');
      logger.error('  - Password resets');
      logger.error('  - System notifications');
      logger.error('  - Appointment reminders');
      logger.error('');
      logger.error('Please set the following environment variables:');
      logger.error('  SMTP_HOST     - Your SMTP server hostname');
      logger.error('  SMTP_USER     - Your SMTP username');
      logger.error('  SMTP_PASS     - Your SMTP password');
      logger.error('  SMTP_FROM     - Sender email address (optional)');
      logger.error('  SMTP_PORT     - SMTP port (optional, default: 587)');
      logger.error('  SMTP_SECURE   - Use TLS (optional, default: false)');
      logger.error('='.repeat(80));
      
      throw new Error('Email service configuration missing in production');
    }

    // Show warnings but don't block startup
    if (status.warnings.length > 0) {
      logger.warn('Email configuration warnings:');
      status.warnings.forEach((warning) => logger.warn(`  ⚠️  ${warning}`));
    }

    logger.info('✅ Email service configured and ready');

  } else if (env === 'test') {
    // TEST: Email is optional, just log status
    if (!status.isConfigured) {
      logger.info('ℹ️  Email service not configured in TEST environment - emails will be skipped');
    } else {
      logger.info('✅ Email service configured for testing');
    }

  } else {
    // DEVELOPMENT: Email is optional, show warnings
    if (!status.isConfigured) {
      logger.warn('⚠️  Email service not configured in DEVELOPMENT');
      logger.warn('   Emails will be logged but not sent');
      logger.warn('   To enable email, configure SMTP environment variables');
    } else {
      logger.info('✅ Email service configured');
      if (status.warnings.length > 0) {
        status.warnings.forEach((warning) => logger.warn(`  ⚠️  ${warning}`));
      }
    }
  }
}

/**
 * Get human-readable configuration status
 */
export function getEmailConfigSummary(): string {
  const status = validateEmailConfig();
  
  if (status.isConfigured) {
    return '✅ Email service is properly configured';
  }
  
  const summary = ['❌ Email service is NOT configured:'];
  summary.push(...status.issues.map(issue => `  - ${issue}`));
  
  if (status.warnings.length > 0) {
    summary.push('\nWarnings:');
    summary.push(...status.warnings.map(warning => `  - ${warning}`));
  }
  
  return summary.join('\n');
}
