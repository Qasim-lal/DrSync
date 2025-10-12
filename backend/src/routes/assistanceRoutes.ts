/**
 * Organization Assistance Routes - SUBTASK-038D-002
 * 
 * API endpoints for super admin assistance tools
 */

import express from 'express';
import { assistanceController } from '../controllers/assistanceController';

const router = express.Router();

// ============================================================================
// SETUP ASSISTANCE (038D-002-1)
// ============================================================================

/**
 * Get organization setup progress
 */
router.get(
  '/setup-assistance/:orgId',
  assistanceController.getSetupProgress.bind(assistanceController)
);

/**
 * Send setup reminder
 */
router.post(
  '/setup-assistance/:orgId/remind',
  assistanceController.sendSetupReminder.bind(assistanceController)
);

// ============================================================================
// CONFIGURATION TROUBLESHOOTING (038D-002-2)
// ============================================================================

/**
 * Test WhatsApp configuration
 */
router.post(
  '/test-whatsapp/:orgId',
  assistanceController.testWhatsAppConfig.bind(assistanceController)
);

/**
 * Test Google Sheets connection
 */
router.post(
  '/test-sheets/:orgId',
  assistanceController.testSheetsConnection.bind(assistanceController)
);

/**
 * Run diagnostics
 */
router.post(
  '/diagnostics/:orgId',
  assistanceController.runDiagnostics.bind(assistanceController)
);

/**
 * Apply common fixes
 */
router.post(
  '/fix/:orgId',
  assistanceController.applyFix.bind(assistanceController)
);

// ============================================================================
// PASSWORD RESET ASSISTANCE (038D-002-4)
// ============================================================================

/**
 * Force password reset
 */
router.post(
  '/users/:userId/force-reset',
  assistanceController.forcePasswordReset.bind(assistanceController)
);

/**
 * Disable MFA
 */
router.post(
  '/users/:userId/disable-mfa',
  assistanceController.disableMFA.bind(assistanceController)
);

/**
 * Verify/update user email
 */
router.post(
  '/users/:userId/verify-email',
  assistanceController.verifyEmail.bind(assistanceController)
);

// ============================================================================
// BILLING ISSUE RESOLUTION (038D-002-3)
// ============================================================================

/**
 * Retry failed payment
 */
router.post(
  '/billing/retry-payment/:orgId',
  assistanceController.retryPayment.bind(assistanceController)
);

/**
 * Apply credit to organization
 */
router.post(
  '/billing/apply-credit/:orgId',
  assistanceController.applyCredit.bind(assistanceController)
);

/**
 * Update payment method
 */
router.post(
  '/billing/update-payment-method/:orgId',
  assistanceController.updatePaymentMethod.bind(assistanceController)
);

// ============================================================================
// DATA CORRECTION TOOLS (038D-002-5)
// ============================================================================

/**
 * Validate organization data
 */
router.post(
  '/data/validate/:orgId',
  assistanceController.validateData.bind(assistanceController)
);

/**
 * Cleanup organization data
 */
router.post(
  '/data/cleanup/:orgId',
  assistanceController.cleanupData.bind(assistanceController)
);

/**
 * Correct organization data
 */
router.post(
  '/data/correct/:orgId',
  assistanceController.correctData.bind(assistanceController)
);

export default router;
