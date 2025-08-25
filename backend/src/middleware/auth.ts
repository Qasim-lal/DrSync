import { Request, Response, NextFunction } from 'express';
import { authService, JWTPayload, AuthUser } from '../services/auth';
import { logger } from '../utils/logger';

// Extend Express Request interface to include user data
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      token?: string;
    }
  }
}

export interface AuthRequest extends Request {
  user: AuthUser;
  token: string;
}

/**
 * Extract JWT token from request headers
 */
const extractToken = (req: Request): string | null => {
  const authHeader = req.header('Authorization');
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  return null;
};

/**
 * Main authentication middleware
 * Verifies JWT token and attaches user data to request
 */
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = extractToken(req);

    if (!token) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
        message: 'Access token is missing from request headers',
        code: 'AUTH_TOKEN_MISSING'
      });
      return;
    }

    // Verify the JWT token
    let payload: JWTPayload;
    try {
      payload = authService.verifyAccessToken(token);
    } catch (error) {
      logger.warn(`Authentication failed - Invalid token: ${error}`);
      res.status(401).json({
        success: false,
        error: 'Authentication failed',
        message: 'Invalid or expired access token',
        code: 'AUTH_TOKEN_INVALID'
      });
      return;
    }

    // Get user details from database
    const user = await authService.getUserById(payload.userId);
    
    if (!user) {
      logger.warn(`Authentication failed - User not found: ${payload.userId}`);
      res.status(401).json({
        success: false,
        error: 'Authentication failed',
        message: 'User account not found or inactive',
        code: 'AUTH_USER_NOT_FOUND'
      });
      return;
    }

    // Attach user and token to request object
    req.user = user;
    req.token = token;

    logger.debug(`User authenticated: ${user.email} (${user.role})`);
    next();
  } catch (error) {
    logger.error('Authentication middleware error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Authentication process failed',
      code: 'AUTH_INTERNAL_ERROR'
    });
  }
};

/**
 * Optional authentication middleware
 * Attaches user data if token is present, but doesn't fail if missing
 */
export const optionalAuth = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = extractToken(req);

    if (!token) {
      // No token provided, continue without authentication
      next();
      return;
    }

    try {
      const payload = authService.verifyAccessToken(token);
      const user = await authService.getUserById(payload.userId);

      if (user) {
        req.user = user;
        req.token = token;
        logger.debug(`Optional auth - User authenticated: ${user.email}`);
      }
    } catch (error) {
      // Invalid token, but don't fail the request
      logger.debug(`Optional auth - Invalid token ignored: ${error}`);
    }

    next();
  } catch (error) {
    logger.error('Optional authentication middleware error:', error);
    next(); // Continue even if there's an error
  }
};

/**
 * Role-based authorization middleware factory
 * Requires user to have one of the specified roles
 */
export const authorize = (roles: string[]) => {
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

    const hasPermission = authService.hasPermission(req.user.role, roles);
    
    if (!hasPermission) {
      logger.warn(`Authorization failed - User ${req.user.email} (${req.user.role}) attempted to access resource requiring roles: ${roles.join(', ')}`);
      res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
        message: `Access denied. Required roles: ${roles.join(', ')}`,
        code: 'AUTH_INSUFFICIENT_PERMISSIONS'
      });
      return;
    }

    logger.debug(`Authorization successful - User ${req.user.email} has required permissions`);
    next();
  };
};

/**
 * Organization-based authorization middleware
 * Ensures user belongs to the specified organization
 */
export const authorizeOrganization = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: 'Authentication required',
      message: 'User must be authenticated to access this resource',
      code: 'AUTH_REQUIRED'
    });
    return;
  }

  const orgIdFromParams = req.params.organizationId;
  const userOrgId = req.user.organizationId;

  // If organization ID is specified in route params, verify it matches user's org
  if (orgIdFromParams && orgIdFromParams !== userOrgId) {
    logger.warn(`Organization authorization failed - User ${req.user.email} attempted to access org ${orgIdFromParams} but belongs to ${userOrgId}`);
    res.status(403).json({
      success: false,
      error: 'Organization access denied',
      message: 'You can only access resources within your organization',
      code: 'AUTH_ORG_ACCESS_DENIED'
    });
    return;
  }

  next();
};

/**
 * Super admin only middleware
 */
export const requireSuperAdmin = authorize(['SUPER_ADMIN']);

/**
 * Organization admin or higher middleware  
 */
export const requireOrgAdmin = authorize(['ORG_ADMIN', 'SUPER_ADMIN']);

/**
 * Doctor or higher middleware
 */
export const requireDoctor = authorize(['DOCTOR', 'ORG_ADMIN', 'SUPER_ADMIN']);

/**
 * Staff or higher middleware (any authenticated user)
 */
export const requireStaff = authorize(['STAFF', 'RECEPTIONIST', 'NURSE', 'DOCTOR', 'ORG_ADMIN', 'SUPER_ADMIN']);

/**
 * Rate limiting middleware for authentication endpoints
 */
export const authRateLimit = (_req: Request, _res: Response, next: NextFunction): void => {
  // This would integrate with express-rate-limit for login attempts
  // For now, just pass through - rate limiting is handled at app level
  next();
};

/**
 * Middleware to validate that the authenticated user can access a specific resource
 * Used for routes like /api/users/:userId where users should only access their own data
 */
export const authorizeResourceAccess = (resourceIdParam: string = 'id') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
      return;
    }

    const resourceId = req.params[resourceIdParam];
    const userId = req.user.id;
    const userRole = req.user.role;

    // Super admins and org admins can access any resource in their org
    if (['SUPER_ADMIN', 'ORG_ADMIN'].includes(userRole)) {
      next();
      return;
    }

    // Regular users can only access their own resources
    if (resourceId !== userId) {
      logger.warn(`Resource access denied - User ${req.user.email} attempted to access resource ${resourceId}`);
      res.status(403).json({
        success: false,
        error: 'Resource access denied',
        message: 'You can only access your own resources',
        code: 'AUTH_RESOURCE_ACCESS_DENIED'
      });
      return;
    }

    next();
  };
};
