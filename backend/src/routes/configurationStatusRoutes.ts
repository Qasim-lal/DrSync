/**
 * Configuration Status Routes
 * API routes for configuration status management
 */

import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  getConfigurationStatus,
  updateWhatsAppStatus,
  updateGoogleSheetsStatus,
  checkSetupComplete,
  getNextSetupStep,
} from '../controllers/configurationStatusController';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/configuration/status
 * Get complete configuration status for the organization
 */
router.get('/status', getConfigurationStatus);

/**
 * POST /api/configuration/whatsapp/status
 * Update WhatsApp configuration status
 */
router.post('/whatsapp/status', updateWhatsAppStatus);

/**
 * POST /api/configuration/googlesheets/status
 * Update Google Sheets configuration status
 */
router.post('/googlesheets/status', updateGoogleSheetsStatus);

/**
 * GET /api/configuration/setup-complete
 * Check if organization setup is complete
 */
router.get('/setup-complete', checkSetupComplete);

/**
 * GET /api/configuration/next-step
 * Get next recommended setup step
 */
router.get('/next-step', getNextSetupStep);

export default router;
