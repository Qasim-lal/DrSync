/**
 * Validation Routes - Data Integrity Management
 * 
 * Exposes REST API endpoints for managing data validation, conflict detection,
 * and synchronization monitoring between Google Sheets and PostgreSQL.
 * 
 * Endpoints:
 * - POST /api/validation/sync - Run sync validation
 * - GET /api/validation/status/:orgId - Get validation status
 * - GET /api/validation/conflicts/:orgId - Get conflicts requiring resolution
 * - POST /api/validation/resolve-conflict - Manually resolve conflict
 * - GET /api/validation/stats/:orgId - Get validation statistics
 * - GET /api/validation/history/:orgId - Get validation history
 * 
 * @version 1.0
 * @author DrSync Development Team
 * @date September 12, 2025
 */

import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { authorize } from '../utils/roleUtils';
import { validationController } from '../controllers/validationController';

const router = Router();

// All validation routes require authentication
router.use(authenticate);

/**
 * POST /api/validation/sync - Run comprehensive sync validation
 * Roles: ORG_ADMIN+, SUPER_ADMIN
 */
router.post('/sync', 
  authorize(['ORG_ADMIN', 'SUPER_ADMIN']),
  (req: Request, res: Response, next: NextFunction) => {
    validationController.runSyncValidation(req as AuthRequest, res).catch(next);
  }
);

/**
 * GET /api/validation/status/:orgId - Get current validation status
 * Roles: ORG_ADMIN+, SUPER_ADMIN
 */
router.get('/status/:orgId', 
  authorize(['ORG_ADMIN', 'SUPER_ADMIN']),
  (req: Request, res: Response, next: NextFunction) => {
    validationController.getValidationStatus(req as AuthRequest, res).catch(next);
  }
);

/**
 * GET /api/validation/conflicts/:orgId - Get conflicts requiring resolution
 * Roles: ORG_ADMIN+, SUPER_ADMIN
 */
router.get('/conflicts/:orgId', 
  authorize(['ORG_ADMIN', 'SUPER_ADMIN']),
  (req: Request, res: Response, next: NextFunction) => {
    validationController.getConflicts(req as AuthRequest, res).catch(next);
  }
);

/**
 * POST /api/validation/resolve-conflict - Manually resolve a conflict
 * Roles: ORG_ADMIN+, SUPER_ADMIN
 */
router.post('/resolve-conflict', 
  authorize(['ORG_ADMIN', 'SUPER_ADMIN']),
  (req: Request, res: Response, next: NextFunction) => {
    validationController.resolveConflict(req as AuthRequest, res).catch(next);
  }
);

/**
 * GET /api/validation/stats/:orgId - Get validation statistics
 * Roles: ORG_ADMIN+, SUPER_ADMIN
 */
router.get('/stats/:orgId', 
  authorize(['ORG_ADMIN', 'SUPER_ADMIN']),
  (req: Request, res: Response, next: NextFunction) => {
    validationController.getValidationStats(req as AuthRequest, res).catch(next);
  }
);

/**
 * GET /api/validation/history/:orgId - Get validation history
 * Roles: ORG_ADMIN+, SUPER_ADMIN
 */
router.get('/history/:orgId', 
  authorize(['ORG_ADMIN', 'SUPER_ADMIN']),
  (req: Request, res: Response, next: NextFunction) => {
    validationController.getValidationHistory(req as AuthRequest, res).catch(next);
  }
);

export default router;