/**
 * Role-Based Access Control (RBAC) Middleware
 * 
 * Provides middleware functions for enforcing role-based permissions
 * across API routes. Uses the roleUtils for consistent permission checking.
 */

import { Request, Response, NextFunction } from 'express';
import { authorize as roleAuthorize } from '../utils/roleUtils';

/**
 * Middleware factory to require specific roles
 * @param allowedRoles Array of role strings that are allowed access
 */
export const requireRole = (allowedRoles: string[]) => {
  return roleAuthorize(allowedRoles);
};

/**
 * Convenience middleware for common role requirements
 */
export const requireAdmin = requireRole(['ORG_ADMIN', 'SUPER_ADMIN']);
export const requireSuperAdmin = requireRole(['SUPER_ADMIN']);
export const requireDoctor = requireRole(['DOCTOR', 'ORG_ADMIN', 'SUPER_ADMIN']);
export const requireMedicalStaff = requireRole(['NURSE', 'DOCTOR', 'ORG_ADMIN', 'SUPER_ADMIN']);
export const requireReceptionist = requireRole(['RECEPTIONIST', 'NURSE', 'DOCTOR', 'ORG_ADMIN', 'SUPER_ADMIN']);

/**
 * Middleware to ensure user belongs to the same organization as the resource
 */
export const requireSameOrganization = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: 'Authentication required',
      message: 'User must be authenticated to access this resource',
      code: 'AUTH_REQUIRED'
    });
    return;
  }

  // Get organization ID from route params or request body
  const orgIdFromParams = req.params.organizationId;
  const orgIdFromBody = req.body.organizationId;
  const targetOrgId = orgIdFromParams || orgIdFromBody;

  if (targetOrgId && targetOrgId !== req.user.organizationId) {
    // Allow super admins to access any organization
    if (req.user.role !== 'SUPER_ADMIN') {
      res.status(403).json({
        success: false,
        error: 'Organization access denied',
        message: 'You can only access resources within your organization',
        code: 'AUTH_ORG_ACCESS_DENIED'
      });
      return;
    }
  }

  next();
};

export default {
  requireRole,
  requireAdmin,
  requireSuperAdmin,
  requireDoctor,
  requireMedicalStaff,
  requireReceptionist,
  requireSameOrganization
};