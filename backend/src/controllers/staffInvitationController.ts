/**
 * Staff Invitation Controller
 * REST API endpoints for staff invitation management
 * TASK-036C: Staff Invitation and Management System
 */

import { Request, Response } from 'express';
import * as staffInvitationService from '../services/staffInvitationService';
import { UserRole } from '@prisma/client';
import { emailService } from '../services/emailService';

/**
 * Create a new staff invitation
 * POST /api/invitations
 */
export const createInvitation = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, firstName, lastName, role, permissions } = req.body;
    const user = (req as any).user;

    // Validate required fields
    if (!email || !role || !firstName || !lastName) {
      res.status(400).json({
        success: false,
        message: 'Email, role, first name, and last name are required',
      });
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({
        success: false,
        message: 'Invalid email format',
      });
      return;
    }

    // Validate role
    const validRoles = Object.values(UserRole);
    if (!validRoles.includes(role)) {
      res.status(400).json({
        success: false,
        message: 'Invalid role',
      });
      return;
    }

    // Create invitation
    const invitation = await staffInvitationService.createInvitation({
      email,
      firstName,
      lastName,
      role,
      organizationId: user.organizationId,
      invitedBy: user.id,
      permissions,
    });

    // Get organization and user details for email
    const { getPrismaClient } = require('../services/prisma');
    const prisma = getPrismaClient();
    
    const organization = await prisma.organization.findUnique({
      where: { id: user.organizationId },
    });

    const inviterName = `${user.firstName} ${user.lastName}`.trim() || user.email;

    // Generate and send email
    const emailContent = staffInvitationService.generateInvitationEmail(
      email,
      organization?.name || 'Unknown Organization',
      inviterName,
      invitation.token
    );

    // Send email (non-blocking)
    emailService.sendEmail(emailContent).catch((error: Error) => {
      console.error('Failed to send invitation email:', error);
    });

    res.status(201).json({
      success: true,
      message: 'Invitation created successfully',
      data: {
        invitationId: invitation.invitationId,
        email,
        role,
        expiresAt: invitation.expiresAt,
      },
    });
  } catch (error: any) {
    console.error('Error creating invitation:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to create invitation',
    });
  }
};

/**
 * Get all invitations for organization (with optional status filter)
 * GET /api/invitations?status=PENDING|CANCELLED|EXPIRED|ACCEPTED|ALL
 */
export const getPendingInvitations = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const { status } = req.query;

    const invitations = await staffInvitationService.getAllInvitations(
      user.organizationId,
      status as string
    );

    res.json({
      success: true,
      data: invitations,
    });
  } catch (error: any) {
    console.error('Error fetching invitations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch invitations',
    });
  }
};

/**
 * Validate invitation token
 * GET /api/invitations/validate/:token
 */
export const validateInvitationToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.params;

    if (!token) {
      res.status(400).json({
        success: false,
        message: 'Token is required',
      });
      return;
    }

    const details = await staffInvitationService.validateToken(token);

    res.json({
      success: true,
      data: details,
    });
  } catch (error: any) {
    console.error('Error validating token:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Invalid invitation token',
    });
  }
};

/**
 * Accept invitation and create user account
 * POST /api/invitations/accept
 */
export const acceptInvitation = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token, password, firstName, lastName, phone } = req.body;

    // Validate required fields
    if (!token || !password || !firstName || !lastName) {
      res.status(400).json({
        success: false,
        message: 'Token, password, first name, and last name are required',
      });
      return;
    }

    // Validate password strength
    if (password.length < 8) {
      res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long',
      });
      return;
    }

    const result = await staffInvitationService.acceptInvitation({
      token,
      password,
      firstName,
      lastName,
      phone,
    });

    res.json({
      success: true,
      message: 'Invitation accepted successfully',
      data: result,
    });
  } catch (error: any) {
    console.error('Error accepting invitation:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to accept invitation',
    });
  }
};

/**
 * Resend invitation
 * POST /api/invitations/:invitationId/resend
 */
export const resendInvitation = async (req: Request, res: Response): Promise<void> => {
  try {
    const { invitationId } = req.params;
    const user = (req as any).user;

    if (!invitationId) {
      res.status(400).json({
        success: false,
        message: 'Invitation ID is required',
      });
      return;
    }

    // Verify invitation belongs to user's organization
    const invitation = await staffInvitationService.getInvitationById(invitationId);
    
    if (invitation.organizationId !== user.organizationId) {
      res.status(403).json({
        success: false,
        message: 'Access denied',
      });
      return;
    }

    const result = await staffInvitationService.resendInvitation(invitationId);

    // Get organization details for email
    const { getPrismaClient } = require('../services/prisma');
    const prisma = getPrismaClient();
    
    const organization = await prisma.organization.findUnique({
      where: { id: user.organizationId },
    });

    const inviterName = `${user.firstName} ${user.lastName}`.trim() || user.email;

    // Generate and send email
    const emailContent = staffInvitationService.generateInvitationEmail(
      invitation.email,
      organization?.name || 'Unknown Organization',
      inviterName,
      result.token
    );

    // Send email (non-blocking)
    emailService.sendEmail(emailContent).catch((error: Error) => {
      console.error('Failed to send invitation email:', error);
    });

    res.json({
      success: true,
      message: 'Invitation resent successfully',
      data: {
        expiresAt: result.expiresAt,
      },
    });
  } catch (error: any) {
    console.error('Error resending invitation:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to resend invitation',
    });
  }
};

/**
 * Cancel invitation
 * DELETE /api/invitations/:invitationId
 */
export const cancelInvitation = async (req: Request, res: Response): Promise<void> => {
  try {
    const { invitationId } = req.params;
    const user = (req as any).user;

    if (!invitationId) {
      res.status(400).json({
        success: false,
        message: 'Invitation ID is required',
      });
      return;
    }

    // Verify invitation belongs to user's organization
    const invitation = await staffInvitationService.getInvitationById(invitationId);
    
    if (invitation.organizationId !== user.organizationId) {
      res.status(403).json({
        success: false,
        message: 'Access denied',
      });
      return;
    }

    await staffInvitationService.cancelInvitation(invitationId);

    res.json({
      success: true,
      message: 'Invitation cancelled successfully',
    });
  } catch (error: any) {
    console.error('Error cancelling invitation:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to cancel invitation',
    });
  }
};

/**
 * Delete invitation permanently
 * DELETE /api/invitations/:invitationId/permanent
 */
export const deleteInvitation = async (req: Request, res: Response): Promise<void> => {
  try {
    const { invitationId } = req.params;
    const user = (req as any).user;

    if (!invitationId) {
      res.status(400).json({
        success: false,
        message: 'Invitation ID is required',
      });
      return;
    }

    // Verify invitation belongs to user's organization
    const invitation = await staffInvitationService.getInvitationById(invitationId);
    
    if (invitation.organizationId !== user.organizationId) {
      res.status(403).json({
        success: false,
        message: 'Access denied',
      });
      return;
    }

    await staffInvitationService.deleteInvitation(invitationId);

    res.json({
      success: true,
      message: 'Invitation deleted permanently',
    });
  } catch (error: any) {
    console.error('Error deleting invitation:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to delete invitation',
    });
  }
};

/**
 * Re-invite: Create new invitation from cancelled/expired one
 * POST /api/invitations/:invitationId/reinvite
 */
export const reInviteStaff = async (req: Request, res: Response): Promise<void> => {
  try {
    const { invitationId } = req.params;
    const user = (req as any).user;

    if (!invitationId) {
      res.status(400).json({
        success: false,
        message: 'Invitation ID is required',
      });
      return;
    }

    // Verify invitation belongs to user's organization
    const oldInvitation = await staffInvitationService.getInvitationById(invitationId);
    
    if (oldInvitation.organizationId !== user.organizationId) {
      res.status(403).json({
        success: false,
        message: 'Access denied',
      });
      return;
    }

    // Create new invitation
    const result = await staffInvitationService.reInvite(invitationId, user.id);

    // Get organization details for email
    const { getPrismaClient } = require('../services/prisma');
    const prisma = getPrismaClient();
    
    const organization = await prisma.organization.findUnique({
      where: { id: user.organizationId },
    });

    const inviterName = `${user.firstName} ${user.lastName}`.trim() || user.email;

    // Generate and send email
    const emailContent = staffInvitationService.generateInvitationEmail(
      oldInvitation.email,
      organization?.name || 'Unknown Organization',
      inviterName,
      result.token
    );

    // Send email (non-blocking)
    emailService.sendEmail(emailContent).catch((error: Error) => {
      console.error('Failed to send invitation email:', error);
    });

    res.status(201).json({
      success: true,
      message: 'Invitation re-sent successfully',
      data: {
        invitationId: result.invitationId,
        expiresAt: result.expiresAt,
      },
    });
  } catch (error: any) {
    console.error('Error re-inviting:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to re-invite',
    });
  }
};

/**
 * Get invitation details by ID
 * GET /api/invitations/:invitationId
 */
export const getInvitationById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { invitationId } = req.params;
    const user = (req as any).user;

    if (!invitationId) {
      res.status(400).json({
        success: false,
        message: 'Invitation ID is required',
      });
      return;
    }

    const invitation = await staffInvitationService.getInvitationById(invitationId);

    // Verify invitation belongs to user's organization
    if (invitation.organizationId !== user.organizationId) {
      res.status(403).json({
        success: false,
        message: 'Access denied',
      });
      return;
    }

    res.json({
      success: true,
      data: invitation,
    });
  } catch (error: any) {
    console.error('Error fetching invitation:', error);
    res.status(404).json({
      success: false,
      message: error.message || 'Invitation not found',
    });
  }
};

/**
 * Get invitation statistics for organization
 * GET /api/invitations/stats
 */
export const getInvitationStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;

    const { getPrismaClient } = require('../services/prisma');
    const prisma = getPrismaClient();

    const [pending, accepted, expired, cancelled] = await Promise.all([
      prisma.staffInvitation.count({
        where: { organizationId: user.organizationId, status: 'PENDING' },
      }),
      prisma.staffInvitation.count({
        where: { organizationId: user.organizationId, status: 'ACCEPTED' },
      }),
      prisma.staffInvitation.count({
        where: { organizationId: user.organizationId, status: 'EXPIRED' },
      }),
      prisma.staffInvitation.count({
        where: { organizationId: user.organizationId, status: 'CANCELLED' },
      }),
    ]);

    res.json({
      success: true,
      data: {
        pending,
        accepted,
        expired,
        cancelled,
        total: pending + accepted + expired + cancelled,
      },
    });
  } catch (error: any) {
    console.error('Error fetching invitation stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch invitation statistics',
    });
  }
};
