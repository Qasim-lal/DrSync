/**
 * Migration Controller - API endpoints for data migration operations
 * 
 * Provides REST API endpoints for managing data migration from PostgreSQL
 * to Google Sheets for existing organizations.
 * 
 * Endpoints:
 * - POST /api/migration/start - Start data migration
 * - GET /api/migration/status/:organizationId - Get migration status
 * - POST /api/migration/cancel/:organizationId - Cancel active migration
 * - GET /api/migration/validate/:organizationId - Validate migration readiness
 * 
 * @version 1.0
 * @author DrSync Development Team
 * @date September 14, 2025
 */

import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import logger from '../utils/logger';
import { dataMigrationService } from '../services/dataMigrationService';
import { rollbackService } from '../services/rollbackService';
import { handleControllerError } from '../utils/errorHandler';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    role: string;
    organizationId: string;
  };
}

class MigrationController {
  
  /**
   * Start data migration for organization
   * POST /api/migration/start
   */
  async startMigration(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
        return;
      }

      const { organizationId, batchSize, validateIntegrity, createBackup, dryRun } = req.body;
      
      // Authorization check - only org admins or super admins can start migration
      if (req.user?.role !== 'ORG_ADMIN' && req.user?.role !== 'SUPER_ADMIN') {
        res.status(403).json({
          success: false,
          error: 'Insufficient permissions to start migration'
        });
        return;
      }

      // For org admins, ensure they can only migrate their own organization
      const targetOrgId = organizationId || req.user.organizationId;
      if (req.user.role === 'ORG_ADMIN' && targetOrgId !== req.user.organizationId) {
        res.status(403).json({
          success: false,
          error: 'Can only migrate your own organization'
        });
        return;
      }

      logger.info(`Migration request started by user ${req.user?.id} for organization ${targetOrgId}`);

      // Start migration
      const migrationResult = await dataMigrationService.migrateOrganizationData({
        organizationId: targetOrgId,
        batchSize: batchSize || 100,
        validateIntegrity: validateIntegrity !== false, // Default to true
        createBackup: createBackup !== false, // Default to true
        dryRun: dryRun === true // Default to false
      });

      // Return result
      res.status(migrationResult.success ? 200 : 206).json({
        success: migrationResult.success,
        migrationId: migrationResult.migrationId,
        summary: migrationResult.summary,
        errors: migrationResult.errors,
        warnings: migrationResult.warnings,
        duration: migrationResult.duration,
        timestamp: migrationResult.timestamp,
        backupLocation: migrationResult.backupLocation
      });

      logger.info(`Migration completed for organization ${targetOrgId}`, {
        success: migrationResult.success,
        migrationId: migrationResult.migrationId,
        userId: req.user?.id
      });

    } catch (error) {
      logger.error('Migration start failed:', error);
      handleControllerError(res, error, 'Failed to start migration');
    }
  }

  /**
   * Get migration status for organization
   * GET /api/migration/status/:organizationId
   */
  async getMigrationStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { organizationId } = req.params;

      // Authorization check
      if (req.user?.role !== 'ORG_ADMIN' && req.user?.role !== 'SUPER_ADMIN') {
        res.status(403).json({
          success: false,
          error: 'Insufficient permissions to view migration status'
        });
        return;
      }

      // For org admins, ensure they can only check their own organization
      if (req.user.role === 'ORG_ADMIN' && organizationId !== req.user.organizationId) {
        res.status(403).json({
          success: false,
          error: 'Can only check migration status for your own organization'
        });
        return;
      }

      const status = await dataMigrationService.getMigrationStatus(organizationId);

      res.status(200).json({
        success: true,
        organizationId,
        migrationInProgress: status.inProgress,
        lastMigration: status.lastMigration
      });

    } catch (error) {
      logger.error('Get migration status failed:', error);
      handleControllerError(res, error, 'Failed to get migration status');
    }
  }

  /**
   * Cancel active migration
   * POST /api/migration/cancel/:organizationId
   */
  async cancelMigration(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { organizationId } = req.params;

      // Authorization check - only org admins or super admins can cancel migration
      if (req.user?.role !== 'ORG_ADMIN' && req.user?.role !== 'SUPER_ADMIN') {
        res.status(403).json({
          success: false,
          error: 'Insufficient permissions to cancel migration'
        });
        return;
      }

      // For org admins, ensure they can only cancel their own organization's migration
      if (req.user.role === 'ORG_ADMIN' && organizationId !== req.user.organizationId) {
        res.status(403).json({
          success: false,
          error: 'Can only cancel migration for your own organization'
        });
        return;
      }

      const wasCancelled = await dataMigrationService.cancelMigration(organizationId);

      res.status(200).json({
        success: true,
        organizationId,
        wasCancelled,
        message: wasCancelled ? 'Migration cancelled successfully' : 'No active migration to cancel'
      });

      logger.info(`Migration cancellation requested by user ${req.user?.id} for organization ${organizationId}`, {
        wasCancelled
      });

    } catch (error) {
      logger.error('Cancel migration failed:', error);
      handleControllerError(res, error, 'Failed to cancel migration');
    }
  }

  /**
   * Validate migration readiness for organization
   * GET /api/migration/validate/:organizationId
   */
  async validateMigrationReadiness(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { organizationId } = req.params;

      // Authorization check
      if (req.user?.role !== 'ORG_ADMIN' && req.user?.role !== 'SUPER_ADMIN') {
        res.status(403).json({
          success: false,
          error: 'Insufficient permissions to validate migration readiness'
        });
        return;
      }

      // For org admins, ensure they can only validate their own organization
      if (req.user.role === 'ORG_ADMIN' && organizationId !== req.user.organizationId) {
        res.status(403).json({
          success: false,
          error: 'Can only validate migration readiness for your own organization'
        });
        return;
      }

      // Check current migration status
      const status = await dataMigrationService.getMigrationStatus(organizationId);
      if (status.inProgress) {
        res.status(409).json({
          success: false,
          error: 'Migration is currently in progress',
          migrationInProgress: true
        });
        return;
      }

      // Perform dry run to validate readiness
      const validationResult = await dataMigrationService.migrateOrganizationData({
        organizationId,
        dryRun: true,
        validateIntegrity: true,
        createBackup: false,
        batchSize: 10 // Small batch for validation
      });

      const isReady = validationResult.success && validationResult.errors.length === 0;

      res.status(200).json({
        success: true,
        organizationId,
        isReady,
        validation: {
          canMigrate: isReady,
          summary: validationResult.summary,
          errors: validationResult.errors,
          warnings: validationResult.warnings,
          duration: validationResult.duration
        }
      });

    } catch (error) {
      logger.error('Validate migration readiness failed:', error);
      handleControllerError(res, error, 'Failed to validate migration readiness');
    }
  }

  /**
   * Get migration history for organization (placeholder for future implementation)
   * GET /api/migration/history/:organizationId
   */
  async getMigrationHistory(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { organizationId } = req.params;

      // Authorization check
      if (req.user?.role !== 'ORG_ADMIN' && req.user?.role !== 'SUPER_ADMIN') {
        res.status(403).json({
          success: false,
          error: 'Insufficient permissions to view migration history'
        });
        return;
      }

      // For org admins, ensure they can only view their own organization's history
      if (req.user.role === 'ORG_ADMIN' && organizationId !== req.user.organizationId) {
        res.status(403).json({
          success: false,
          error: 'Can only view migration history for your own organization'
        });
        return;
      }

      // In a real implementation, this would fetch migration history from database
      res.status(200).json({
        success: true,
        organizationId,
        history: [],
        message: 'Migration history feature not yet implemented'
      });

    } catch (error) {
      logger.error('Get migration history failed:', error);
      handleControllerError(res, error, 'Failed to get migration history');
    }
  }

  /**
   * Execute emergency rollback for organization
   * POST /api/migration/rollback
   */
  async executeRollback(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
        return;
      }

      const { organizationId, reason, emergencyMode, preserveData, notifyUsers } = req.body;
      
      // Authorization check - only org admins or super admins can execute rollback
      if (req.user?.role !== 'ORG_ADMIN' && req.user?.role !== 'SUPER_ADMIN') {
        res.status(403).json({
          success: false,
          error: 'Insufficient permissions to execute rollback'
        });
        return;
      }

      // For org admins, ensure they can only rollback their own organization
      const targetOrgId = organizationId || req.user.organizationId;
      if (req.user.role === 'ORG_ADMIN' && targetOrgId !== req.user.organizationId) {
        res.status(403).json({
          success: false,
          error: 'Can only rollback your own organization'
        });
        return;
      }

      logger.warn(`ROLLBACK REQUEST initiated by user ${req.user?.id} for organization ${targetOrgId}`, {
        reason,
        emergencyMode
      });

      // Execute rollback
      const rollbackResult = await rollbackService.executeRollback({
        organizationId: targetOrgId,
        reason: reason || 'USER_REQUESTED',
        emergencyMode: emergencyMode === true,
        preserveData: preserveData !== false, // Default to true
        notifyUsers: notifyUsers !== false // Default to true
      });

      // Return result
      res.status(rollbackResult.success ? 200 : 206).json({
        success: rollbackResult.success,
        rollbackId: rollbackResult.rollbackId,
        organizationId: rollbackResult.organizationId,
        reason: rollbackResult.reason,
        duration: rollbackResult.duration,
        steps: rollbackResult.steps,
        errors: rollbackResult.errors,
        warnings: rollbackResult.warnings,
        dataIntegrityCheck: rollbackResult.dataIntegrityCheck,
        userNotificationsSent: rollbackResult.userNotificationsSent
      });

      logger.warn(`Rollback ${rollbackResult.success ? 'COMPLETED' : 'FAILED'} for organization ${targetOrgId}`, {
        rollbackId: rollbackResult.rollbackId,
        userId: req.user?.id,
        success: rollbackResult.success
      });

    } catch (error) {
      logger.error('Rollback execution failed:', error);
      handleControllerError(res, error, 'Failed to execute rollback');
    }
  }

  /**
   * Check emergency mode status for organization
   * GET /api/migration/emergency-status/:organizationId
   */
  async getEmergencyStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { organizationId } = req.params;

      // Authorization check
      if (req.user?.role !== 'ORG_ADMIN' && req.user?.role !== 'SUPER_ADMIN') {
        res.status(403).json({
          success: false,
          error: 'Insufficient permissions to check emergency status'
        });
        return;
      }

      // For org admins, ensure they can only check their own organization
      if (req.user.role === 'ORG_ADMIN' && organizationId !== req.user.organizationId) {
        res.status(403).json({
          success: false,
          error: 'Can only check emergency status for your own organization'
        });
        return;
      }

      const isEmergencyMode = await rollbackService.isEmergencyMode(organizationId);

      res.status(200).json({
        success: true,
        organizationId,
        emergencyMode: isEmergencyMode,
        timestamp: new Date()
      });

    } catch (error) {
      logger.error('Get emergency status failed:', error);
      handleControllerError(res, error, 'Failed to get emergency status');
    }
  }
}

// Export controller instance
export const migrationController = new MigrationController();
export default migrationController;