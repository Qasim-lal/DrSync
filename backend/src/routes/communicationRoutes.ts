/**
 * Communication Routes - TASK-038D
 * 
 * API endpoints for:
 * - Email template management (SUBTASK-038D-002)
 * - Broadcast communications (SUBTASK-038D-004)
 * - Communication history and statistics
 */

import express from 'express';
import { communicationController } from '../controllers/communicationController';

const router = express.Router();

// ============================================================================
// EMAIL TEMPLATES (SUBTASK-038D-002)
// ============================================================================

/**
 * SUBTASK-038D-002-1: Create email template
 */
router.post(
  '/templates',
  communicationController.createEmailTemplate.bind(communicationController)
);

/**
 * SUBTASK-038D-002-4: List email templates
 */
router.get(
  '/templates',
  communicationController.listEmailTemplates.bind(communicationController)
);

/**
 * SUBTASK-038D-002-3: Get email template by ID
 */
router.get(
  '/templates/:templateId',
  communicationController.getEmailTemplate.bind(communicationController)
);

/**
 * SUBTASK-038D-002-2: Update email template
 */
router.put(
  '/templates/:templateId',
  communicationController.updateEmailTemplate.bind(communicationController)
);

/**
 * SUBTASK-038D-002-5: Delete email template
 */
router.delete(
  '/templates/:templateId',
  communicationController.deleteEmailTemplate.bind(communicationController)
);

// ============================================================================
// BROADCAST COMMUNICATIONS (SUBTASK-038D-004)
// ============================================================================

/**
 * SUBTASK-038D-004-1: Send broadcast communication
 */
router.post(
  '/broadcast',
  communicationController.sendBroadcast.bind(communicationController)
);

/**
 * SUBTASK-038D-004-2: Send notification to specific organization
 */
router.post(
  '/notify',
  communicationController.sendNotification.bind(communicationController)
);

/**
 * SUBTASK-038D-004-3: Get communication history
 */
router.get(
  '/history',
  communicationController.getCommunicationHistory.bind(communicationController)
);

/**
 * SUBTASK-038D-004-4: Get communication statistics
 */
router.get(
  '/stats',
  communicationController.getCommunicationStats.bind(communicationController)
);

export default router;
