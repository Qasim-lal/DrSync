/**
 * Notification Settings Routes - TASK-040A
 * 
 * Express routes for notification preference management API.
 * All routes require authentication.
 * 
 * @version 1.0
 * @date October 20, 2025
 */

import { Router } from 'express';
import notificationSettingsController from '../controllers/notificationSettingsController';
import { authenticate } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/notification-settings/:organizationId
 * Get notification settings for organization
 */
router.get(
  '/:organizationId',
  (req, res) => notificationSettingsController.getSettings(req, res)
);

/**
 * PUT /api/notification-settings/:organizationId
 * Update notification settings
 * Requires: ORG_ADMIN or ADMIN role
 */
router.put(
  '/:organizationId',
  (req, res) => notificationSettingsController.updateSettings(req, res)
);

/**
 * GET /api/notification-settings/:organizationId/should-send
 * Check if notification should be sent
 * Query params: type (required), timestamp (optional)
 */
router.get(
  '/:organizationId/should-send',
  (req, res) => notificationSettingsController.shouldSendNotification(req, res)
);

/**
 * GET /api/notification-settings/:organizationId/language
 * Get organization language preference
 */
router.get(
  '/:organizationId/language',
  (req, res) => notificationSettingsController.getLanguagePreference(req, res)
);

/**
 * POST /api/notification-settings/:organizationId/preset
 * Apply a preset mode (BUDGET, RECOMMENDED, PREMIUM)
 * Requires: ORG_ADMIN or ADMIN role
 * Body: { preset: 'BUDGET' | 'RECOMMENDED' | 'PREMIUM' }
 */
router.post(
  '/:organizationId/preset',
  (req, res) => notificationSettingsController.applyPreset(req, res)
);

/**
 * GET /api/notification-settings/:organizationId/calculate-cost
 * Calculate estimated monthly cost
 * Query params: appointments (optional)
 */
router.get(
  '/:organizationId/calculate-cost',
  (req, res) => notificationSettingsController.calculateCost(req, res)
);

/**
 * GET /api/notification-settings/:organizationId/compare-presets
 * Compare costs across all preset modes
 * Query params: appointments (optional)
 */
router.get(
  '/:organizationId/compare-presets',
  (req, res) => notificationSettingsController.comparePresets(req, res)
);

export default router;
