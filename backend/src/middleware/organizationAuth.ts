import { Request, Response, NextFunction } from 'express';
import { AuthUser } from '../services/auth';
import { logger } from '../utils/logger';

/**
 * Enhanced organization authorization utilities
 * Ensures users can only access resources within their organization scope
 */

export interface OrganizationFilterOptions {
  allowSuperAdmin?: boolean;
  requireExactMatch?: boolean;
  paramName?: string;
}

/**
 * Middleware to ensure user belongs to the organization specified in route parameters
 * Enhanced version with more options
 */
export const requireOrganizationAccess = (options: OrganizationFilterOptions = {}) => {
  const {
    allowSuperAdmin = true,
    requireExactMatch = true,
    paramName = 'organizationId'
  } = options;

  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
        message: 'User must be authenticated to access this resource',
        code: 'AUTH_REQUIRED'
      });
      return;
    }

    const orgIdFromParams = req.params[paramName];
    const userOrgId = req.user.organizationId;
    const userRole = req.user.role;

    // Super admin bypass (if allowed)
    if (allowSuperAdmin && userRole === 'SUPER_ADMIN') {
      logger.debug(`Super admin ${req.user.email} granted organization access`);
      next();
      return;
    }

    // Check organization access
    if (requireExactMatch && orgIdFromParams && orgIdFromParams !== userOrgId) {
      logger.warn(
        `Organization access denied - User ${req.user.email} (org: ${userOrgId}) ` +
        `attempted to access org ${orgIdFromParams}`
      );
      res.status(403).json({
        success: false,
        error: 'Organization access denied',
        message: 'You can only access resources within your organization',
        code: 'AUTH_ORG_ACCESS_DENIED'
      });
      return;
    }

    // Attach organization context to request
    req.organizationContext = {
      organizationId: userOrgId,
      isSuperAdmin: userRole === 'SUPER_ADMIN',
      hasFullAccess: userRole === 'SUPER_ADMIN'
    };

    next();
  };
};

/**
 * Get organization filter for database queries
 * Automatically filters by user's organization unless they are super admin
 */
export const getOrganizationFilter = (user: AuthUser): { organizationId?: string } => {
  if (user.role === 'SUPER_ADMIN') {
    return {}; // No filter for super admin
  }
  
  return {
    organizationId: user.organizationId
  };
};

/**
 * Enhanced organization filter with additional options
 */
export const getAdvancedOrganizationFilter = (
  user: AuthUser, 
  targetOrgId?: string,
  options: {
    allowSuperAdminOverride?: boolean;
    forceOrganizationId?: string;
  } = {}
) => {
  const { allowSuperAdminOverride = true, forceOrganizationId } = options;

  // Force specific organization if provided
  if (forceOrganizationId) {
    return { organizationId: forceOrganizationId };
  }

  // Super admin can access any organization
  if (allowSuperAdminOverride && user.role === 'SUPER_ADMIN') {
    return targetOrgId ? { organizationId: targetOrgId } : {};
  }

  // Regular users are restricted to their organization
  return { organizationId: user.organizationId };
};

/**
 * Middleware to validate organization ownership of a resource
 * Ensures the resource belongs to the user's organization
 */
export const validateResourceOrganization = (resourceOrgIdField: string = 'organizationId') => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
      return;
    }

    try {
      // This would be used in route handlers to validate resource ownership
      // The actual resource validation would happen in the route handler
      // This middleware just sets up the organization context
      
      req.organizationValidation = {
        requiredField: resourceOrgIdField,
        userOrganizationId: req.user.organizationId,
        isSuperAdmin: req.user.role === 'SUPER_ADMIN'
      };

      next();
    } catch (error) {
      logger.error('Organization validation error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Organization validation failed',
        code: 'ORG_VALIDATION_ERROR'
      });
    }
  };
};

/**
 * Helper function to check if user can access a specific organization
 */
export const canAccessOrganization = (user: AuthUser, targetOrgId: string): boolean => {
  // Super admin can access any organization
  if (user.role === 'SUPER_ADMIN') {
    return true;
  }

  // Regular users can only access their own organization
  return user.organizationId === targetOrgId;
};

/**
 * Helper function to ensure organization consistency in request data
 */
export const enforceOrganizationInData = (user: AuthUser, data: any): any => {
  if (user.role === 'SUPER_ADMIN') {
    return data; // Super admin can set any organization
  }

  // Force user's organization ID in the data
  return {
    ...data,
    organizationId: user.organizationId
  };
};

/**
 * Middleware for bulk operations that need organization scoping
 */
export const requireBulkOrganizationAccess = () => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
      return;
    }

    // Ensure bulk operations are scoped to user's organization
    const orgFilter = getOrganizationFilter(req.user);
    
    req.bulkOperationContext = {
      organizationFilter: orgFilter,
      maxBulkSize: req.user.role === 'SUPER_ADMIN' ? 10000 : 1000, // Super admin gets higher limits
      isSuperAdmin: req.user.role === 'SUPER_ADMIN'
    };

    next();
  };
};

// Extend Express Request interface to include organization context
declare global {
  namespace Express {
    interface Request {
      organizationContext?: {
        organizationId: string;
        isSuperAdmin: boolean;
        hasFullAccess: boolean;
      };
      organizationValidation?: {
        requiredField: string;
        userOrganizationId: string;
        isSuperAdmin: boolean;
      };
      bulkOperationContext?: {
        organizationFilter: { organizationId?: string };
        maxBulkSize: number;
        isSuperAdmin: boolean;
      };
    }
  }
}
