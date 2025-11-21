/**
 * Configuration Routes
 * API routes for organization configuration wizards
 */

import express from 'express';
import * as configController from '../controllers/configurationController';
import { authenticate } from '../middleware/auth';
import { authorize } from '../utils/roleUtils';
import { UserRole } from '@prisma/client';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * WhatsApp Configuration Routes
 */

// Validate credentials
router.post(
  '/whatsapp/validate-credentials',
  authorize([UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN]),
  configController.validateWhatsAppCredentials
);

// Generate webhook URL
router.get(
  '/whatsapp/generate-webhook',
  authorize([UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN]),
  configController.generateWebhookUrl
);

// Configure webhook
router.post(
  '/whatsapp/configure-webhook',
  authorize([UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN]),
  configController.configureWhatsAppWebhook
);

// Test webhook endpoint
router.post(
  '/whatsapp/test-webhook',
  authorize([UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN]),
  configController.testWebhookEndpoint
);

// Register phone number
router.post(
  '/whatsapp/register-phone',
  authorize([UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN]),
  configController.registerWhatsAppPhone
);

// Verify phone number
router.post(
  '/whatsapp/verify-phone',
  authorize([UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN]),
  configController.verifyWhatsAppPhone
);

// Send test message
router.post(
  '/whatsapp/test-message',
  authorize([UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN]),
  configController.sendWhatsAppTestMessage
);

// Save configuration
router.post(
  '/whatsapp/save',
  authorize([UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN]),
  configController.saveWhatsAppConfiguration
);

// Validate setup
router.get(
  '/whatsapp/validate',
  authorize([UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN, UserRole.STAFF]),
  configController.validateWhatsAppSetup
);

/**
 * Google Sheets Configuration Routes
 */

// Generate OAuth URL
router.get(
  '/google-sheets/auth-url',
  authorize([UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN]),
  configController.generateGoogleAuthUrl
);

// OAuth callback
router.get(
  '/google-sheets/oauth-callback',
  configController.handleGoogleOAuthCallback
);

// List available sheets
router.get(
  '/google-sheets/list',
  authorize([UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN]),
  configController.listGoogleSheets
);

// Create new sheet
router.post(
  '/google-sheets/create',
  authorize([UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN]),
  configController.createGoogleSheet
);

// Select existing sheet
router.post(
  '/google-sheets/select',
  authorize([UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN]),
  configController.selectGoogleSheet
);

// Setup sheet structure
router.post(
  '/google-sheets/setup-structure',
  authorize([UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN]),
  configController.setupSheetStructure
);

// Verify permissions
router.post(
  '/google-sheets/verify-permissions',
  authorize([UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN]),
  configController.verifySheetPermissions
);

// Test data operations
router.post(
  '/google-sheets/test-operations',
  authorize([UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN]),
  configController.testSheetDataOperations
);

// Activate sync service
router.post(
  '/google-sheets/activate-sync',
  authorize([UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN]),
  configController.activateSyncService
);

// Validate setup
router.get(
  '/google-sheets/validate',
  authorize([UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN, UserRole.STAFF]),
  configController.validateGoogleSheetsSetup
);

/**
 * General Configuration Routes
 */

// Get overall configuration status
router.get(
  '/status',
  authorize([UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN, UserRole.STAFF]),
  configController.getConfigurationStatus
);

export default router;
