/**
 * Migration Routes - API routes for data migration operations
 * 
 * Defines REST API routes for managing data migration from PostgreSQL
 * to Google Sheets for existing organizations.
 * 
 * Routes:
 * - POST /api/migration/start - Start data migration
 * - GET /api/migration/status/:organizationId - Get migration status
 * - POST /api/migration/cancel/:organizationId - Cancel active migration
 * - GET /api/migration/validate/:organizationId - Validate migration readiness
 * - GET /api/migration/history/:organizationId - Get migration history
 * 
 * @version 1.0
 * @author DrSync Development Team
 * @date September 14, 2025
 */

import express from 'express';
import { body, param } from 'express-validator';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { migrationController } from '../controllers/migrationController';
import { rateLimiter } from '../middleware/rateLimiter';

const router = express.Router();

// Apply authentication to all migration routes
router.use(authenticate);

/**
 * @route POST /api/migration/start
 * @desc Start data migration for organization
 * @access Organization Admin, Super Admin
 */
router.post('/start',
  // Rate limiting - allow 1 migration start per hour per IP
  rateLimiter(1, 60 * 60 * 1000), // 1 request per hour
  
  // Input validation
  [
    body('organizationId')
      .optional()
      .isLength({ min: 1 })
      .withMessage('Organization ID must not be empty'),
    body('batchSize')
      .optional()
      .isInt({ min: 10, max: 1000 })
      .withMessage('Batch size must be between 10 and 1000'),
    body('validateIntegrity')
      .optional()
      .isBoolean()
      .withMessage('validateIntegrity must be a boolean'),
    body('createBackup')
      .optional()
      .isBoolean()
      .withMessage('createBackup must be a boolean'),
    body('dryRun')
      .optional()
      .isBoolean()
      .withMessage('dryRun must be a boolean')
  ],
  
  // Authorization - org admins and super admins only
  requireRole(['ORG_ADMIN', 'SUPER_ADMIN']),
  
  migrationController.startMigration
);

/**
 * @route GET /api/migration/status/:organizationId
 * @desc Get migration status for organization
 * @access Organization Admin, Super Admin
 */
router.get('/status/:organizationId',
  // Rate limiting - allow 10 status checks per minute
  rateLimiter(10, 60 * 1000), // 10 requests per minute
  
  // Input validation
  [
    param('organizationId')
      .isLength({ min: 1 })
      .withMessage('Organization ID is required')
  ],
  
  // Authorization - org admins and super admins only
  requireRole(['ORG_ADMIN', 'SUPER_ADMIN']),
  
  migrationController.getMigrationStatus
);

/**
 * @route POST /api/migration/cancel/:organizationId
 * @desc Cancel active migration for organization
 * @access Organization Admin, Super Admin
 */
router.post('/cancel/:organizationId',
  // Rate limiting - allow 5 cancellations per hour
  rateLimiter(5, 60 * 60 * 1000), // 5 requests per hour
  
  // Input validation
  [
    param('organizationId')
      .isLength({ min: 1 })
      .withMessage('Organization ID is required')
  ],
  
  // Authorization - org admins and super admins only
  requireRole(['ORG_ADMIN', 'SUPER_ADMIN']),
  
  migrationController.cancelMigration
);

/**
 * @route GET /api/migration/validate/:organizationId
 * @desc Validate migration readiness for organization
 * @access Organization Admin, Super Admin
 */
router.get('/validate/:organizationId',
  // Rate limiting - allow 5 validations per hour
  rateLimiter(5, 60 * 60 * 1000), // 5 requests per hour
  
  // Input validation
  [
    param('organizationId')
      .isLength({ min: 1 })
      .withMessage('Organization ID is required')
  ],
  
  // Authorization - org admins and super admins only
  requireRole(['ORG_ADMIN', 'SUPER_ADMIN']),
  
  migrationController.validateMigrationReadiness
);

/**
 * @route GET /api/migration/history/:organizationId
 * @desc Get migration history for organization
 * @access Organization Admin, Super Admin
 */
router.get('/history/:organizationId',
  // Rate limiting - allow 20 history requests per hour
  rateLimiter(20, 60 * 60 * 1000), // 20 requests per hour
  
  // Input validation
  [
    param('organizationId')
      .isLength({ min: 1 })
      .withMessage('Organization ID is required')
  ],
  
  // Authorization - org admins and super admins only
  requireRole(['ORG_ADMIN', 'SUPER_ADMIN']),
  
  migrationController.getMigrationHistory
);

/**
 * @route POST /api/migration/rollback
 * @desc Execute emergency rollback for organization
 * @access Organization Admin, Super Admin
 */
router.post('/rollback',
  // Rate limiting - allow 1 rollback per hour (emergency procedure)
  rateLimiter(1, 60 * 60 * 1000), // 1 request per hour
  
  // Input validation
  [
    body('organizationId')
      .optional()
      .isLength({ min: 1 })
      .withMessage('Organization ID must not be empty'),
    body('reason')
      .optional()
      .isIn(['GOOGLE_SHEETS_OUTAGE', 'DATA_CORRUPTION', 'API_RATE_LIMIT_EXCEEDED', 'SYNC_FAILURE', 'USER_REQUESTED', 'SYSTEM_MAINTENANCE', 'EMERGENCY_PROTOCOL'])
      .withMessage('Invalid rollback reason'),
    body('emergencyMode')
      .optional()
      .isBoolean()
      .withMessage('emergencyMode must be a boolean'),
    body('preserveData')
      .optional()
      .isBoolean()
      .withMessage('preserveData must be a boolean'),
    body('notifyUsers')
      .optional()
      .isBoolean()
      .withMessage('notifyUsers must be a boolean')
  ],
  
  // Authorization - org admins and super admins only
  requireRole(['ORG_ADMIN', 'SUPER_ADMIN']),
  
  migrationController.executeRollback
);

/**
 * @route GET /api/migration/emergency-status/:organizationId
 * @desc Check emergency mode status for organization
 * @access Organization Admin, Super Admin
 */
router.get('/emergency-status/:organizationId',
  // Rate limiting - allow 10 status checks per minute
  rateLimiter(10, 60 * 1000), // 10 requests per minute
  
  // Input validation
  [
    param('organizationId')
      .isLength({ min: 1 })
      .withMessage('Organization ID is required')
  ],
  
  // Authorization - org admins and super admins only
  requireRole(['ORG_ADMIN', 'SUPER_ADMIN']),
  
  migrationController.getEmergencyStatus
);

export default router;
