/**
 * Validation Controller - Data Integrity Management
 * 
 * REST API endpoints for managing data validation, conflict detection,
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

import { Response } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';
import dataValidationService, { 
  SyncValidationOptions, 
  ValidationResult, 
  DataConflict 
} from '../services/dataValidationService';

// Validation schemas
const syncValidationSchema = z.object({
  organizationId: z.string().optional(), // If not provided, use user's organization
  entities: z.array(z.enum(['appointments', 'patients', 'providers'])).optional(),
  validateSchema: z.boolean().optional().default(true),
  validateData: z.boolean().optional().default(true),
  detectConflicts: z.boolean().optional().default(true),
  autoResolve: z.boolean().optional().default(false),
  includePerformanceMetrics: z.boolean().optional().default(true)
});

const resolveConflictSchema = z.object({
  conflictId: z.string().cuid('Invalid conflict ID'),
  resolution: z.enum(['GOOGLE_SHEETS_WINS', 'POSTGRES_WINS', 'NEWEST_WINS', 'MERGE_VALUES']),
  reason: z.string().min(1, 'Resolution reason is required').max(500)
});

const querySchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).optional().default('1'),
  limit: z.string().regex(/^\d+$/).transform(Number).optional().default('20'),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  entity: z.enum(['appointments', 'patients', 'providers', 'system']).optional(),
  resolved: z.string().transform(val => val === 'true').optional()
});

export class ValidationController {
  /**
   * POST /api/validation/sync - Run comprehensive sync validation
   * Roles: ORG_ADMIN+, SUPER_ADMIN
   */
  async runSyncValidation(req: AuthRequest, res: Response): Promise<void> {
    try {
      const validatedData = syncValidationSchema.parse(req.body);
      
      // Use user's organization if not specified (only SUPER_ADMIN can validate other orgs)
      const organizationId = validatedData.organizationId || req.user!.organizationId;
      
      // Check permissions for cross-organization validation
      if (validatedData.organizationId && validatedData.organizationId !== req.user!.organizationId) {
        if (req.user!.role !== 'SUPER_ADMIN') {
          res.status(403).json({
            success: false,
            message: 'Only super admins can validate other organizations'
          });
          return;
        }
      }

      const options: SyncValidationOptions = {
        organizationId,
        validateSchema: validatedData.validateSchema,
        validateData: validatedData.validateData,
        detectConflicts: validatedData.detectConflicts,
        autoResolve: validatedData.autoResolve,
        includePerformanceMetrics: validatedData.includePerformanceMetrics,
        ...(validatedData.entities && { entities: validatedData.entities })
      };

      logger.info(`Starting sync validation for organization ${organizationId} by user ${req.user!.id}`);
      const result = await dataValidationService.validateSync(options);

      // Log validation completion
      logger.info(`Sync validation completed for ${organizationId}: ${result.isValid ? 'PASSED' : 'FAILED'}`);

      res.json({
        success: true,
        data: {
          validation: result,
          summary: {
            isValid: result.isValid,
            totalErrors: result.errors.length,
            criticalErrors: result.errors.filter(e => e.severity === 'CRITICAL').length,
            highErrors: result.errors.filter(e => e.severity === 'HIGH').length,
            totalWarnings: result.warnings.length,
            totalConflicts: result.conflicts.length,
            autoResolvedConflicts: result.conflicts.filter(c => c.resolvedAt).length,
            duration: result.performance.duration,
            recordsValidated: result.performance.recordsValidated
          }
        }
      });

    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          message: 'Invalid validation parameters',
          errors: error.errors
        });
        return;
      }

      logger.error('Error running sync validation:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to run sync validation'
      });
    }
  }

  /**
   * GET /api/validation/status/:orgId - Get current validation status
   * Roles: ORG_ADMIN+, SUPER_ADMIN
   */
  async getValidationStatus(req: AuthRequest, res: Response): Promise<void> {
    try {
      const organizationId = req.params.orgId;

      // Check permissions
      if (organizationId !== req.user!.organizationId && req.user!.role !== 'SUPER_ADMIN') {
        res.status(403).json({
          success: false,
          message: 'Access denied'
        });
        return;
      }

      const history = dataValidationService.getValidationHistory(organizationId!);


      const stats = dataValidationService.getValidationStats(organizationId!);

      const lastValidation = history[history.length - 1];

      const status = {
        hasValidationHistory: history.length > 0,
        lastValidationDate: lastValidation?.performance.validationEndTime,
        lastValidationStatus: lastValidation?.isValid ? 'PASSED' : 'FAILED',
        pendingConflicts: lastValidation?.conflicts.filter(c => !c.resolvedAt).length || 0,
        criticalErrors: lastValidation?.errors.filter(e => e.severity === 'CRITICAL').length || 0,
        highErrors: lastValidation?.errors.filter(e => e.severity === 'HIGH').length || 0,
        recommendedAction: this.getRecommendedAction(lastValidation),
        stats
      };

      res.json({
        success: true,
        data: status
      });

    } catch (error) {
      logger.error('Error getting validation status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get validation status'
      });
    }
  }

  /**
   * GET /api/validation/conflicts/:orgId - Get conflicts requiring resolution
   * Roles: ORG_ADMIN+, SUPER_ADMIN
   */
  async getConflicts(req: AuthRequest, res: Response): Promise<void> {
    try {
      const organizationId = req.params.orgId;
      const { page, limit, entity, resolved } = querySchema.parse(req.query);

      // Check permissions
      if (organizationId !== req.user!.organizationId && req.user!.role !== 'SUPER_ADMIN') {
        res.status(403).json({
          success: false,
          message: 'Access denied'
        });
        return;
      }

      const history = dataValidationService.getValidationHistory(organizationId!);
      let allConflicts: DataConflict[] = [];

      // Collect conflicts from all validation history
      for (const validation of history) {
        allConflicts.push(...validation.conflicts);
      }

      // Apply filters
      let filteredConflicts = allConflicts;

      if (entity) {
        filteredConflicts = filteredConflicts.filter(c => c.entity === entity);
      }

      if (resolved !== undefined) {
        filteredConflicts = filteredConflicts.filter(c => !!c.resolvedAt === resolved);
      }

      // Sort by timestamp (newest first)
      filteredConflicts.sort((a, b) => 
        b.googleSheetsTimestamp.getTime() - a.googleSheetsTimestamp.getTime()
      );

      // Pagination
      const total = filteredConflicts.length;
      const skip = (page - 1) * limit;
      const paginatedConflicts = filteredConflicts.slice(skip, skip + limit);
      const totalPages = Math.ceil(total / limit);

      res.json({
        success: true,
        data: {
          conflicts: paginatedConflicts,
          pagination: {
            page,
            limit,
            total,
            totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1
          }
        }
      });

    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          message: 'Invalid query parameters',
          errors: error.errors
        });
        return;
      }

      logger.error('Error getting conflicts:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get conflicts'
      });
    }
  }

  /**
   * POST /api/validation/resolve-conflict - Manually resolve a conflict
   * Roles: ORG_ADMIN+, SUPER_ADMIN
   */
  async resolveConflict(req: AuthRequest, res: Response): Promise<void> {
    try {
      const validatedData = resolveConflictSchema.parse(req.body);

      // Find the conflict in validation history
      const allHistory = Array.from(dataValidationService['validationHistory'].entries());
      let targetConflict: DataConflict | null = null;
      let organizationId: string | null = null;

      for (const [orgId, history] of allHistory) {
        for (const validation of history) {
          const conflict = validation.conflicts.find(c => c.id === validatedData.conflictId);
          if (conflict) {
            targetConflict = conflict;
            organizationId = orgId;
            break;
          }
        }
        if (targetConflict) break;
      }

      if (!targetConflict || !organizationId) {
        res.status(404).json({
          success: false,
          message: 'Conflict not found'
        });
        return;
      }

      // Check permissions
      if (organizationId !== req.user!.organizationId && req.user!.role !== 'SUPER_ADMIN') {
        res.status(403).json({
          success: false,
          message: 'Access denied'
        });
        return;
      }

      // Check if conflict is already resolved
      if (targetConflict.resolvedAt) {
        res.status(400).json({
          success: false,
          message: 'Conflict is already resolved'
        });
        return;
      }

      // Apply manual resolution
      const resolution = {
        strategy: validatedData.resolution,
        reason: validatedData.reason,
        confidence: 1.0, // Manual resolution has full confidence
        automatic: false
      };

      // This would normally apply the resolution
      // For now, just mark it as resolved
      targetConflict.resolution = resolution;
      targetConflict.resolvedAt = new Date();
      targetConflict.resolvedBy = `MANUAL:${req.user!.id}`;

      logger.info(`Conflict ${validatedData.conflictId} manually resolved by user ${req.user!.id} using ${validatedData.resolution}`);

      res.json({
        success: true,
        message: 'Conflict resolved successfully',
        data: {
          conflict: targetConflict,
          resolution
        }
      });

    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          message: 'Invalid conflict resolution data',
          errors: error.errors
        });
        return;
      }

      logger.error('Error resolving conflict:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to resolve conflict'
      });
    }
  }

  /**
   * GET /api/validation/stats/:orgId - Get validation statistics
   * Roles: ORG_ADMIN+, SUPER_ADMIN
   */
  async getValidationStats(req: AuthRequest, res: Response): Promise<void> {
    try {
      const organizationId = req.params.orgId;

      // Check permissions
      if (organizationId !== req.user!.organizationId && req.user!.role !== 'SUPER_ADMIN') {
        res.status(403).json({
          success: false,
          message: 'Access denied'
        });
        return;
      }

      const stats = dataValidationService.getValidationStats(organizationId!);
      const history = dataValidationService.getValidationHistory(organizationId!);

      // Enhanced statistics
      const enhancedStats = {
        ...stats,
        trends: {
          validationsThisWeek: history.filter(v => 
            v.performance.validationStartTime >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          ).length,
          validationsThisMonth: history.filter(v => 
            v.performance.validationStartTime >= new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          ).length,
          averageErrorsThisWeek: this.calculateAverageErrors(history, 7),
          averageErrorsThisMonth: this.calculateAverageErrors(history, 30)
        },
        entityBreakdown: this.calculateEntityBreakdown(history),
        errorCategories: this.calculateErrorCategories(history),
        conflictResolutionStats: this.calculateConflictStats(history)
      };

      res.json({
        success: true,
        data: enhancedStats
      });

    } catch (error) {
      logger.error('Error getting validation stats:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get validation statistics'
      });
    }
  }

  /**
   * GET /api/validation/history/:orgId - Get validation history
   * Roles: ORG_ADMIN+, SUPER_ADMIN
   */
  async getValidationHistory(req: AuthRequest, res: Response): Promise<void> {
    try {
      const organizationId = req.params.orgId;
      const { page, limit } = querySchema.parse(req.query);

      // Check permissions
      if (organizationId !== req.user!.organizationId && req.user!.role !== 'SUPER_ADMIN') {
        res.status(403).json({
          success: false,
          message: 'Access denied'
        });
        return;
      }

      const fullHistory = dataValidationService.getValidationHistory(organizationId!);
      
      // Sort by date (newest first)
      const sortedHistory = fullHistory.sort((a, b) => 
        b.performance.validationStartTime.getTime() - a.performance.validationStartTime.getTime()
      );

      // Pagination
      const total = sortedHistory.length;
      const skip = (page - 1) * limit;
      const paginatedHistory = sortedHistory.slice(skip, skip + limit);
      const totalPages = Math.ceil(total / limit);

      // Create summary view (exclude detailed errors/conflicts for list view)
      const historySummary = paginatedHistory.map(validation => ({
        timestamp: validation.performance.validationStartTime,
        isValid: validation.isValid,
        duration: validation.performance.duration,
        recordsValidated: validation.performance.recordsValidated,
        errorsCount: validation.errors.length,
        warningsCount: validation.warnings.length,
        conflictsCount: validation.conflicts.length,
        resolvedConflictsCount: validation.conflicts.filter(c => c.resolvedAt).length,
        criticalErrors: validation.errors.filter(e => e.severity === 'CRITICAL').length,
        highErrors: validation.errors.filter(e => e.severity === 'HIGH').length
      }));

      res.json({
        success: true,
        data: {
          history: historySummary,
          pagination: {
            page,
            limit,
            total,
            totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1
          }
        }
      });

    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          message: 'Invalid query parameters',
          errors: error.errors
        });
        return;
      }

      logger.error('Error getting validation history:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get validation history'
      });
    }
  }

  /**
   * Helper methods
   */
  private getRecommendedAction(lastValidation?: ValidationResult): string {
    if (!lastValidation) {
      return 'Run initial validation to assess data integrity';
    }

    if (!lastValidation.isValid) {
      const criticalErrors = lastValidation.errors.filter(e => e.severity === 'CRITICAL').length;
      const highErrors = lastValidation.errors.filter(e => e.severity === 'HIGH').length;
      
      if (criticalErrors > 0) {
        return 'Critical errors detected - immediate attention required';
      } else if (highErrors > 0) {
        return 'High priority errors need resolution';
      } else {
        return 'Address validation warnings when convenient';
      }
    }

    const unresolvedConflicts = lastValidation.conflicts.filter(c => !c.resolvedAt).length;
    if (unresolvedConflicts > 0) {
      return `${unresolvedConflicts} conflicts need manual resolution`;
    }

    return 'Data integrity is healthy - continue regular monitoring';
  }

  private calculateAverageErrors(history: ValidationResult[], days: number): number {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const recentHistory = history.filter(v => v.performance.validationStartTime >= cutoff);
    
    if (recentHistory.length === 0) return 0;
    
    const totalErrors = recentHistory.reduce((sum, v) => sum + v.errors.length, 0);
    return totalErrors / recentHistory.length;
  }

  private calculateEntityBreakdown(history: ValidationResult[]): any {
    const breakdown: any = {
      appointments: { errors: 0, warnings: 0, conflicts: 0 },
      patients: { errors: 0, warnings: 0, conflicts: 0 },
      providers: { errors: 0, warnings: 0, conflicts: 0 }
    };

    for (const validation of history) {
      for (const error of validation.errors) {
        if (breakdown[error.entity]) {
          breakdown[error.entity].errors++;
        }
      }
      for (const warning of validation.warnings) {
        if (breakdown[warning.entity]) {
          breakdown[warning.entity].warnings++;
        }
      }
      for (const conflict of validation.conflicts) {
        if (breakdown[conflict.entity]) {
          breakdown[conflict.entity].conflicts++;
        }
      }
    }

    return breakdown;
  }

  private calculateErrorCategories(history: ValidationResult[]): any {
    const categories: any = {
      SCHEMA_MISMATCH: 0,
      DATA_INTEGRITY: 0,
      CONSTRAINT_VIOLATION: 0,
      SYNC_FAILURE: 0
    };

    for (const validation of history) {
      for (const error of validation.errors) {
        categories[error.type]++;
      }
    }

    return categories;
  }

  private calculateConflictStats(history: ValidationResult[]): any {
    let totalConflicts = 0;
    let autoResolved = 0;
    let manualResolved = 0;
    let pending = 0;

    const resolutionStrategies: any = {
      GOOGLE_SHEETS_WINS: 0,
      POSTGRES_WINS: 0,
      NEWEST_WINS: 0,
      MERGE_VALUES: 0,
      MANUAL_REVIEW: 0
    };

    for (const validation of history) {
      for (const conflict of validation.conflicts) {
        totalConflicts++;
        
        if (conflict.resolvedAt) {
          if (conflict.resolvedBy === 'AUTOMATIC') {
            autoResolved++;
          } else {
            manualResolved++;
          }
        } else {
          pending++;
        }

        resolutionStrategies[conflict.resolution.strategy]++;
      }
    }

    return {
      totalConflicts,
      autoResolved,
      manualResolved,
      pending,
      resolutionStrategies,
      autoResolutionRate: totalConflicts > 0 ? autoResolved / totalConflicts : 0
    };
  }
}

export const validationController = new ValidationController();