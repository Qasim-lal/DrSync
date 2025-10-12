import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { AuthUser } from '../services/auth';

/**
 * Middleware to enforce SUPER_ADMIN role requirement
 * Must be used after authenticate middleware
 * 
 * Security Layer 2: Authorization for super admin endpoints
 * - Verifies user has SUPER_ADMIN role
 * - Logs all access attempts (successful and failed)
 * - Returns 403 Forbidden for non-super-admin users
 * 
 * Usage:
 * router.get('/api/super-admin/organizations', authenticate, requireSuperAdmin, controller.listOrganizations);
 */
export const requireSuperAdmin = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Ensure user is authenticated
  if (!req.user) {
    logger.warn('Super admin access attempted without authentication');
    res.status(401).json({
      success: false,
      error: 'Authentication required',
      message: 'You must be logged in to access super admin features',
      code: 'SUPER_ADMIN_AUTH_REQUIRED'
    });
    return;
  }

  const user = req.user as AuthUser;

  // Check if user has SUPER_ADMIN role
  if (user.role !== 'SUPER_ADMIN') {
    logger.warn(
      `Super admin access denied for user ${user.email} (${user.id}) with role ${user.role}. ` +
      `Attempted to access: ${req.method} ${req.originalUrl}`
    );
    
    res.status(403).json({
      success: false,
      error: 'Insufficient permissions',
      message: 'Only super administrators can access this resource',
      code: 'SUPER_ADMIN_REQUIRED',
      requiredRole: 'SUPER_ADMIN',
      userRole: user.role
    });
    return;
  }

  // Log successful super admin access
  logger.info(
    `Super admin access granted: ${user.email} (${user.id}) accessing ${req.method} ${req.originalUrl}`
  );

  next();
};

/**
 * Combined middleware: authenticate + requireSuperAdmin
 * Convenience middleware that combines both authentication and super admin check
 * 
 * Usage:
 * router.get('/api/super-admin/organizations', authenticateSuperAdmin, controller.listOrganizations);
 */
export const authenticateSuperAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Import authenticate middleware inline to avoid circular dependencies
  const { authenticate } = await import('./auth');
  
  // Chain authenticate -> requireSuperAdmin
  authenticate(req, res, (err?: any) => {
    if (err) {
      next(err);
      return;
    }
    requireSuperAdmin(req, res, next);
  });
};
