/**
 * Staff Invitation Routes
 * API routes for staff invitation management
 * TASK-036C: Staff Invitation and Management System
 */

import express from 'express';
import * as staffInvitationController from '../controllers/staffInvitationController';
import { authenticate } from '../middleware/auth';
import { authorize } from '../utils/roleUtils';

const router = express.Router();

/**
 * Create a new staff invitation
 * POST /api/invitations
 * Requires: ADMIN or SUPER_ADMIN role
 */
router.post(
  '/',
  authenticate,
  authorize(['ADMIN', 'SUPER_ADMIN']),
  staffInvitationController.createInvitation
);

/**
 * Get all pending invitations for organization
 * GET /api/invitations
 * Requires: ADMIN or SUPER_ADMIN role
 */
router.get(
  '/',
  authenticate,
  authorize(['ADMIN', 'SUPER_ADMIN']),
  staffInvitationController.getPendingInvitations
);

/**
 * Get invitation statistics for organization
 * GET /api/invitations/stats
 * Requires: ADMIN or SUPER_ADMIN role
 */
router.get(
  '/stats',
  authenticate,
  authorize(['ADMIN', 'SUPER_ADMIN']),
  staffInvitationController.getInvitationStats
);

/**
 * Validate invitation token (public endpoint - no auth required)
 * GET /api/invitations/validate/:token
 */
router.get(
  '/validate/:token',
  staffInvitationController.validateInvitationToken
);

/**
 * Accept invitation and create user account (public endpoint - no auth required)
 * POST /api/invitations/accept
 */
router.post(
  '/accept',
  staffInvitationController.acceptInvitation
);

/**
 * Get invitation details by ID
 * GET /api/invitations/:invitationId
 * Requires: ADMIN or SUPER_ADMIN role
 */
router.get(
  '/:invitationId',
  authenticate,
  authorize(['ADMIN', 'SUPER_ADMIN']),
  staffInvitationController.getInvitationById
);

/**
 * Resend invitation
 * POST /api/invitations/:invitationId/resend
 * Requires: ADMIN or SUPER_ADMIN role
 */
router.post(
  '/:invitationId/resend',
  authenticate,
  authorize(['ADMIN', 'SUPER_ADMIN']),
  staffInvitationController.resendInvitation
);

/**
 * Cancel invitation
 * DELETE /api/invitations/:invitationId
 * Requires: ADMIN or SUPER_ADMIN role
 */
router.delete(
  '/:invitationId',
  authenticate,
  authorize(['ADMIN', 'SUPER_ADMIN']),
  staffInvitationController.cancelInvitation
);

export default router;
