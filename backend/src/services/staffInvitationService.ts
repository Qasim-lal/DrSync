/**
 * Staff Invitation Service
 * Handles staff invitation creation, token generation, and account setup
 * TASK-036C: Staff Invitation and Management System
 */

import jwt from 'jsonwebtoken';
import { getPrismaClient } from './prisma';
import { UserRole } from '@prisma/client';

const prisma = getPrismaClient();

interface InvitationData {
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  organizationId: string;
  invitedBy: string;
  permissions?: string[];
}

interface InvitationToken {
  token: string;
  invitationId: string;
  expiresAt: Date;
}

interface AcceptInvitationData {
  token: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

/**
 * Generate secure invitation token
 */
export const generateInvitationToken = (
  invitationId: string,
  email: string,
  organizationId: string
): string => {
  const payload = {
    invitationId,
    email,
    organizationId,
    type: 'staff_invitation',
  };

  // Token expires in 7 days
  const token = jwt.sign(payload, process.env.JWT_SECRET || 'default-secret', {
    expiresIn: '7d',
    issuer: 'drsync-platform',
    audience: 'staff-invitation',
  });

  return token;
};

/**
 * Verify invitation token
 */
export const verifyInvitationToken = (token: string): any => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default-secret', {
      issuer: 'drsync-platform',
      audience: 'staff-invitation',
    });
    return decoded;
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Invitation token has expired');
    }
    throw new Error('Invalid invitation token');
  }
};

/**
 * Create staff invitation
 */
export const createInvitation = async (data: InvitationData): Promise<InvitationToken> => {
  const { email, firstName, lastName, role, organizationId, invitedBy, permissions } = data;

  // Check if user already exists
  const existingUser = await prisma.user.findFirst({
    where: {
      email,
      organizationId,
    },
  });

  if (existingUser) {
    throw new Error('User with this email already exists in the organization');
  }

  // Check if pending invitation exists
  const existingInvitation = await prisma.staffInvitation.findFirst({
    where: {
      email,
      organizationId,
      status: 'PENDING',
    },
  });

  if (existingInvitation) {
    throw new Error('Pending invitation already exists for this email');
  }

  // Create invitation
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

  const invitation = await prisma.staffInvitation.create({
    data: {
      email,
      firstName,
      lastName,
      role,
      organizationId,
      invitedBy,
      permissions: permissions || [],
      status: 'PENDING',
      expiresAt,
    },
  });

  // Generate token
  const token = generateInvitationToken(invitation.id, email, organizationId);

  // Update invitation with token
  await prisma.staffInvitation.update({
    where: { id: invitation.id },
    data: { token },
  });

  return {
    token,
    invitationId: invitation.id,
    expiresAt,
  };
};

/**
 * Get all invitations for organization with optional status filter
 */
export const getAllInvitations = async (organizationId: string, status?: string) => {
  const whereClause: any = {
    organizationId,
  };

  // Add status filter if provided
  if (status && status !== 'ALL') {
    whereClause.status = status;
  }

  const invitations = await prisma.staffInvitation.findMany({
    where: whereClause,
    include: {
      invitedByUser: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return invitations;
};

/**
 * Get pending invitations for organization (backward compatibility)
 */
export const getPendingInvitations = async (organizationId: string) => {
  return getAllInvitations(organizationId, 'PENDING');
};

/**
 * Validate invitation token and get details
 */
export const validateToken = async (token: string) => {
  // Verify JWT token
  const decoded = verifyInvitationToken(token);

  // Get invitation from database
  const invitation = await prisma.staffInvitation.findUnique({
    where: { id: decoded.invitationId },
    include: {
      organization: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  if (!invitation) {
    throw new Error('Invitation not found');
  }

  if (invitation.status !== 'PENDING') {
    throw new Error(`Invitation is ${invitation.status.toLowerCase()}`);
  }

  if (new Date() > invitation.expiresAt) {
    await prisma.staffInvitation.update({
      where: { id: invitation.id },
      data: { status: 'EXPIRED' },
    });
    throw new Error('Invitation has expired');
  }

  return {
    invitationId: invitation.id,
    email: invitation.email,
    firstName: invitation.firstName,
    lastName: invitation.lastName,
    role: invitation.role,
    organization: invitation.organization,
    expiresAt: invitation.expiresAt,
  };
};

/**
 * Accept invitation and create user account
 */
export const acceptInvitation = async (data: AcceptInvitationData) => {
  const { token, password, firstName, lastName, phone } = data;

  // Validate token
  const invitationDetails = await validateToken(token);

  // Hash password
  const bcrypt = require('bcryptjs');
  const hashedPassword = await bcrypt.hash(password, 10);

  // Create user account
  const userData: any = {
    email: invitationDetails.email,
    password: hashedPassword,
    firstName,
    lastName,
    role: invitationDetails.role as UserRole,
    organizationId: invitationDetails.organization.id,
    emailVerified: true, // Auto-verify since they came from invitation
    isActive: true,
  };
  
  // Only add phone if it's provided
  if (phone) {
    userData.phone = phone;
  }

  const user = await prisma.user.create({
    data: userData,
  });

  // Update invitation status
  await prisma.staffInvitation.update({
    where: { id: invitationDetails.invitationId },
    data: {
      status: 'ACCEPTED',
      acceptedAt: new Date(),
    },
  });

  return {
    userId: user.id,
    email: user.email,
    role: user.role,
    organization: invitationDetails.organization,
  };
};

/**
 * Resend invitation
 */
export const resendInvitation = async (invitationId: string) => {
  const invitation = await prisma.staffInvitation.findUnique({
    where: { id: invitationId },
  });

  if (!invitation) {
    throw new Error('Invitation not found');
  }

  if (invitation.status !== 'PENDING') {
    throw new Error('Cannot resend non-pending invitation');
  }

  // Extend expiry by 7 days from now
  const newExpiresAt = new Date();
  newExpiresAt.setDate(newExpiresAt.getDate() + 7);

  // Generate new token
  const newToken = generateInvitationToken(
    invitation.id,
    invitation.email,
    invitation.organizationId
  );

  // Update invitation
  await prisma.staffInvitation.update({
    where: { id: invitationId },
    data: {
      token: newToken,
      expiresAt: newExpiresAt,
    },
  });

  return {
    token: newToken,
    expiresAt: newExpiresAt,
  };
};

/**
 * Cancel invitation
 */
export const cancelInvitation = async (invitationId: string) => {
  const invitation = await prisma.staffInvitation.findUnique({
    where: { id: invitationId },
  });

  if (!invitation) {
    throw new Error('Invitation not found');
  }

  if (invitation.status !== 'PENDING') {
    throw new Error('Can only cancel pending invitations');
  }

  await prisma.staffInvitation.update({
    where: { id: invitationId },
    data: {
      status: 'CANCELLED',
    },
  });

  return { message: 'Invitation cancelled successfully' };
};

/**
 * Delete invitation permanently (hard delete)
 */
export const deleteInvitation = async (invitationId: string) => {
  const invitation = await prisma.staffInvitation.findUnique({
    where: { id: invitationId },
  });

  if (!invitation) {
    throw new Error('Invitation not found');
  }

  // Cannot delete ACCEPTED invitations (user already created)
  if (invitation.status === 'ACCEPTED') {
    throw new Error('Cannot delete accepted invitations. User account already created.');
  }

  // Permanently delete from database
  await prisma.staffInvitation.delete({
    where: { id: invitationId },
  });

  return { message: 'Invitation deleted permanently' };
};

/**
 * Re-invite: Create new invitation from cancelled/expired one
 */
export const reInvite = async (invitationId: string, invitedBy: string): Promise<InvitationToken> => {
  // Get the old invitation
  const oldInvitation = await prisma.staffInvitation.findUnique({
    where: { id: invitationId },
  });

  if (!oldInvitation) {
    throw new Error('Invitation not found');
  }

  // Can only re-invite CANCELLED or EXPIRED invitations
  if (oldInvitation.status !== 'CANCELLED' && oldInvitation.status !== 'EXPIRED') {
    throw new Error('Can only re-invite cancelled or expired invitations');
  }

  // Create new invitation with same details
  return createInvitation({
    email: oldInvitation.email,
    firstName: oldInvitation.firstName,
    lastName: oldInvitation.lastName,
    role: oldInvitation.role,
    organizationId: oldInvitation.organizationId,
    invitedBy,
    permissions: oldInvitation.permissions,
  });
};

/**
 * Get invitation details by ID
 */
export const getInvitationById = async (invitationId: string) => {
  const invitation = await prisma.staffInvitation.findUnique({
    where: { id: invitationId },
    include: {
      organization: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      invitedByUser: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  });

  if (!invitation) {
    throw new Error('Invitation not found');
  }

  return invitation;
};

/**
 * Generate invitation email content (for now, just return structured data)
 */
export const generateInvitationEmail = (
  email: string,
  organizationName: string,
  invitedByName: string,
  token: string
): any => {
  const invitationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/accept-invitation?token=${token}`;

  return {
    to: email,
    subject: `You've been invited to join ${organizationName} on DrSync`,
    html: `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #2563eb;">You've been invited to DrSync</h2>
            <p>Hello,</p>
            <p><strong>${invitedByName}</strong> has invited you to join <strong>${organizationName}</strong> on DrSync.</p>
            <p>DrSync is a healthcare appointment management system that helps organizations streamline their operations.</p>
            <div style="margin: 30px 0;">
              <a href="${invitationUrl}" 
                 style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                Accept Invitation
              </a>
            </div>
            <p style="color: #666; font-size: 14px;">
              This invitation will expire in 7 days. If the button doesn't work, copy and paste this link into your browser:
            </p>
            <p style="color: #666; font-size: 14px; word-break: break-all;">
              ${invitationUrl}
            </p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="color: #999; font-size: 12px;">
              If you didn't expect this invitation, you can safely ignore this email.
            </p>
          </div>
        </body>
      </html>
    `,
    text: `
      You've been invited to join ${organizationName} on DrSync
      
      ${invitedByName} has invited you to join their organization.
      
      Accept your invitation by visiting: ${invitationUrl}
      
      This invitation expires in 7 days.
    `,
  };
};
