/**
 * Validation Task - Scheduled Data Integrity Monitoring
 * 
 * Automated task for running periodic data validation checks between
 * Google Sheets and PostgreSQL to ensure data integrity and catch
 * issues early.
 * 
 * Features:
 * 1. Scheduled validation runs (daily, weekly)
 * 2. Organization-specific validation
 * 3. Automatic alerting for critical issues
 * 4. Performance monitoring
 * 5. Automatic conflict resolution where possible
 * 6. Health check reporting
 * 
 * @version 1.0
 * @author DrSync Development Team
 * @date September 12, 2025
 */

import cron from 'node-cron';
import logger from '../utils/logger';
import getPrismaClient from '../services/prisma';
import dataValidationService from '../services/dataValidationService';

interface ValidationTaskConfig {
  enabled: boolean;
  schedule: string;
  autoResolve: boolean;
  alertOnCritical: boolean;
  alertOnHighErrors: boolean;
  maxCriticalErrors: number;
  maxHighErrors: number;
}

interface ValidationAlert {
  organizationId: string;
  organizationName: string;
  alertType: 'CRITICAL_ERRORS' | 'HIGH_ERRORS' | 'SYNC_FAILURE' | 'CONFLICTS_PENDING';
  errorCount: number;
  conflictCount: number;
  lastValidation: Date;
  recommendedAction: string;
}

class ValidationTask {
  private config: ValidationTaskConfig;
  private dailyTaskJob: any = null;
  private weeklyTaskJob: any = null;
  private isRunning: boolean = false;

  constructor() {
    this.config = {
      enabled: process.env.VALIDATION_TASK_ENABLED === 'true',
      schedule: process.env.VALIDATION_SCHEDULE || '0 2 * * *', // 2 AM daily
      autoResolve: process.env.VALIDATION_AUTO_RESOLVE === 'true',
      alertOnCritical: true,
      alertOnHighErrors: true,
      maxCriticalErrors: 0, // Alert on any critical errors
      maxHighErrors: 5 // Alert if more than 5 high errors
    };

    this.initializeScheduledTasks();
  }

  /**
   * Initialize scheduled validation tasks
   */
  private initializeScheduledTasks(): void {
    if (!this.config.enabled) {
      logger.info('Validation task is disabled via configuration');
      return;
    }

    // Daily validation task (comprehensive)
    this.dailyTaskJob = cron.schedule('0 2 * * *', async () => {
      logger.info('Starting scheduled daily validation task');
      await this.runDailyValidation();
    }, {
      scheduled: true,
      timezone: 'UTC'
    });

    // Weekly validation task (deep analysis)
    this.weeklyTaskJob = cron.schedule('0 1 * * 0', async () => {
      logger.info('Starting scheduled weekly validation task');
      await this.runWeeklyValidation();
    }, {
      scheduled: true,
      timezone: 'UTC'
    });

    logger.info('Validation tasks initialized with schedule:', {
      daily: '0 2 * * *',
      weekly: '0 1 * * 0',
      autoResolve: this.config.autoResolve
    });
  }

  /**
   * Run daily validation for all active organizations
   */
  async runDailyValidation(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Validation task already running, skipping this execution');
      return;
    }

    this.isRunning = true;
    const startTime = new Date();

    try {
      logger.info('Starting daily validation task for all organizations');

      // Get all active organizations with Google Sheets integration
      const prisma = getPrismaClient();
      const organizations = await prisma.organization.findMany({
        where: {
          isActive: true,
          googleSheetsId: { not: null }
        },
        select: {
          id: true,
          name: true,
          googleSheetsId: true,
          timezone: true
        }
      });

      logger.info(`Found ${organizations.length} organizations for validation`);

      const results: Array<{
        organizationId: string;
        organizationName: string;
        success: boolean;
        errors: number;
        conflicts: number;
        duration: number;
      }> = [];

      const alerts: ValidationAlert[] = [];

      // Run validation for each organization
      for (const org of organizations) {
        try {
          logger.debug(`Running validation for organization: ${org.name} (${org.id})`);

          const validationResult = await dataValidationService.validateSync({
            organizationId: org.id,
            validateSchema: true,
            validateData: true,
            detectConflicts: true,
            autoResolve: this.config.autoResolve,
            includePerformanceMetrics: true
          });

          const result = {
            organizationId: org.id,
            organizationName: org.name,
            success: validationResult.isValid,
            errors: validationResult.errors.length,
            conflicts: validationResult.conflicts.length,
            duration: validationResult.performance.duration
          };

          results.push(result);

          // Check if alerts are needed
          const alert = this.checkForAlerts(org, validationResult);
          if (alert) {
            alerts.push(alert);
          }

          logger.debug(`Validation completed for ${org.name}: ${result.success ? 'PASSED' : 'FAILED'} (${result.errors} errors, ${result.conflicts} conflicts)`);

        } catch (error) {
          logger.error(`Validation failed for organization ${org.name}:`, error);
          
          results.push({
            organizationId: org.id,
            organizationName: org.name,
            success: false,
            errors: -1,
            conflicts: -1,
            duration: 0
          });

          // Create sync failure alert
          alerts.push({
            organizationId: org.id,
            organizationName: org.name,
            alertType: 'SYNC_FAILURE',
            errorCount: 0,
            conflictCount: 0,
            lastValidation: new Date(),
            recommendedAction: 'Check system logs and Google Sheets connectivity'
          });
        }
      }

      // Process alerts
      if (alerts.length > 0) {
        await this.processAlerts(alerts);
      }

      // Log summary
      const successCount = results.filter(r => r.success).length;
      const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);
      const totalErrors = results.reduce((sum, r) => sum + (r.errors > 0 ? r.errors : 0), 0);
      const totalConflicts = results.reduce((sum, r) => sum + (r.conflicts > 0 ? r.conflicts : 0), 0);

      logger.info(`Daily validation completed: ${successCount}/${organizations.length} organizations passed, ` +
        `${totalErrors} total errors, ${totalConflicts} total conflicts, ` +
        `${alerts.length} alerts generated, ${totalDuration}ms total duration`);

      // Store validation task summary
      await this.storeValidationSummary('DAILY', startTime, results, alerts);

    } catch (error) {
      logger.error('Error in daily validation task:', error);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Run weekly validation with deeper analysis
   */
  async runWeeklyValidation(): Promise<void> {
    try {
      logger.info('Starting weekly validation task with trend analysis');

      // Get all organizations
      const prisma = getPrismaClient();
      const organizations = await prisma.organization.findMany({
        where: {
          isActive: true,
          googleSheetsId: { not: null }
        },
        select: { id: true, name: true }
      });

      const weeklyReport: any = {
        totalOrganizations: organizations.length,
        validationTrends: {},
        systemHealth: 'UNKNOWN'
      };

      for (const org of organizations) {
        try {
          // Get validation history for trend analysis
          const history = dataValidationService.getValidationHistory(org.id);
          const stats = dataValidationService.getValidationStats(org.id);

          // Calculate weekly trends
          const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
          const recentValidations = history.filter(v => 
            v.performance.validationStartTime >= weekAgo
          );

          weeklyReport.validationTrends[org.id] = {
            organizationName: org.name,
            validationsThisWeek: recentValidations.length,
            averageErrors: recentValidations.length > 0 
              ? recentValidations.reduce((sum, v) => sum + v.errors.length, 0) / recentValidations.length 
              : 0,
            averageConflicts: recentValidations.length > 0 
              ? recentValidations.reduce((sum, v) => sum + v.conflicts.length, 0) / recentValidations.length 
              : 0,
            successRate: stats.successRate,
            lastValidation: stats.lastValidation,
            trend: this.calculateTrend(recentValidations)
          };

        } catch (error) {
          logger.error(`Error analyzing weekly trends for ${org.name}:`, error);
          weeklyReport.validationTrends[org.id] = {
            organizationName: org.name,
            error: 'Failed to analyze trends'
          };
        }
      }

      // Determine overall system health
      const healthScores = Object.values(weeklyReport.validationTrends)
        .filter((trend: any) => !trend.error)
        .map((trend: any) => trend.successRate || 0);
      
      const averageHealth = healthScores.length > 0 
        ? healthScores.reduce((sum: number, score: number) => sum + score, 0) / healthScores.length 
        : 0;

      weeklyReport.systemHealth = averageHealth >= 0.9 ? 'EXCELLENT' :
                                 averageHealth >= 0.8 ? 'GOOD' :
                                 averageHealth >= 0.6 ? 'FAIR' : 'POOR';

      weeklyReport.averageSuccessRate = averageHealth;
      weeklyReport.recommendedActions = this.generateWeeklyRecommendations(weeklyReport);

      logger.info(`Weekly validation completed: System health ${weeklyReport.systemHealth} (${Math.round(averageHealth * 100)}% success rate)`);

      // Store weekly report
      await this.storeWeeklyReport(weeklyReport);

    } catch (error) {
      logger.error('Error in weekly validation task:', error);
    }
  }

  /**
   * Check if alerts need to be generated based on validation results
   */
  private checkForAlerts(organization: any, validationResult: any): ValidationAlert | null {
    const criticalErrors = validationResult.errors.filter((e: any) => e.severity === 'CRITICAL').length;
    const highErrors = validationResult.errors.filter((e: any) => e.severity === 'HIGH').length;
    const pendingConflicts = validationResult.conflicts.filter((c: any) => !c.resolvedAt).length;

    // Critical errors alert
    if (criticalErrors > this.config.maxCriticalErrors && this.config.alertOnCritical) {
      return {
        organizationId: organization.id,
        organizationName: organization.name,
        alertType: 'CRITICAL_ERRORS',
        errorCount: criticalErrors,
        conflictCount: pendingConflicts,
        lastValidation: new Date(),
        recommendedAction: 'Immediate attention required - critical data integrity issues detected'
      };
    }

    // High errors alert
    if (highErrors > this.config.maxHighErrors && this.config.alertOnHighErrors) {
      return {
        organizationId: organization.id,
        organizationName: organization.name,
        alertType: 'HIGH_ERRORS',
        errorCount: highErrors,
        conflictCount: pendingConflicts,
        lastValidation: new Date(),
        recommendedAction: 'Review and resolve high priority validation errors'
      };
    }

    // Pending conflicts alert
    if (pendingConflicts > 10) {
      return {
        organizationId: organization.id,
        organizationName: organization.name,
        alertType: 'CONFLICTS_PENDING',
        errorCount: validationResult.errors.length,
        conflictCount: pendingConflicts,
        lastValidation: new Date(),
        recommendedAction: `${pendingConflicts} conflicts require manual resolution`
      };
    }

    return null;
  }

  /**
   * Process generated alerts
   */
  private async processAlerts(alerts: ValidationAlert[]): Promise<void> {
    for (const alert of alerts) {
      try {
        // Log alert
        logger.warn(`Data validation alert for ${alert.organizationName}: ${alert.alertType}`, {
          organizationId: alert.organizationId,
          errorCount: alert.errorCount,
          conflictCount: alert.conflictCount,
          recommendedAction: alert.recommendedAction
        });

        // In a real implementation, this would:
        // 1. Send email notifications to organization admins
        // 2. Create in-app notifications
        // 3. Send webhook notifications if configured
        // 4. Update monitoring dashboards
        // 5. Escalate critical issues

        // For now, just store in database for tracking
        await this.storeAlert(alert);

      } catch (error) {
        logger.error(`Error processing alert for ${alert.organizationName}:`, error);
      }
    }
  }

  /**
   * Calculate trend direction for validation results
   */
  private calculateTrend(validations: any[]): 'IMPROVING' | 'STABLE' | 'DEGRADING' {
    if (validations.length < 2) return 'STABLE';

    const recent = validations.slice(-3); // Last 3 validations
    const older = validations.slice(-6, -3); // Previous 3 validations

    if (recent.length === 0 || older.length === 0) return 'STABLE';

    const recentAvgErrors = recent.reduce((sum, v) => sum + v.errors.length, 0) / recent.length;
    const olderAvgErrors = older.reduce((sum, v) => sum + v.errors.length, 0) / older.length;

    if (recentAvgErrors < olderAvgErrors * 0.8) return 'IMPROVING';
    if (recentAvgErrors > olderAvgErrors * 1.2) return 'DEGRADING';
    return 'STABLE';
  }

  /**
   * Generate weekly recommendations
   */
  private generateWeeklyRecommendations(report: any): string[] {
    const recommendations: string[] = [];

    if (report.averageSuccessRate < 0.8) {
      recommendations.push('System-wide validation issues detected - review Google Sheets connectivity and data quality');
    }

    const degradingOrgs = Object.values(report.validationTrends)
      .filter((trend: any) => trend.trend === 'DEGRADING').length;

    if (degradingOrgs > 0) {
      recommendations.push(`${degradingOrgs} organizations showing degrading data quality trends - investigate root causes`);
    }

    if (report.averageSuccessRate >= 0.9) {
      recommendations.push('Excellent data integrity - continue current monitoring practices');
    }

    return recommendations;
  }

  /**
   * Store validation task summary
   */
  private async storeValidationSummary(
    taskType: 'DAILY' | 'WEEKLY',
    startTime: Date,
    results: any[],
    alerts: ValidationAlert[]
  ): Promise<void> {
    try {
      // This would normally store in a validation_task_logs table
      logger.debug(`Storing ${taskType} validation summary:`, {
        startTime,
        organizationsProcessed: results.length,
        successfulValidations: results.filter(r => r.success).length,
        totalAlerts: alerts.length,
        duration: Date.now() - startTime.getTime()
      });
    } catch (error) {
      logger.error('Error storing validation summary:', error);
    }
  }

  /**
   * Store weekly validation report
   */
  private async storeWeeklyReport(report: any): Promise<void> {
    try {
      // This would normally store in a weekly_validation_reports table
      logger.debug('Storing weekly validation report:', {
        systemHealth: report.systemHealth,
        averageSuccessRate: report.averageSuccessRate,
        recommendationsCount: report.recommendedActions.length
      });
    } catch (error) {
      logger.error('Error storing weekly report:', error);
    }
  }

  /**
   * Store alert in database
   */
  private async storeAlert(alert: ValidationAlert): Promise<void> {
    try {
      // This would normally store in a validation_alerts table
      logger.debug('Storing validation alert:', {
        organizationId: alert.organizationId,
        alertType: alert.alertType,
        errorCount: alert.errorCount,
        conflictCount: alert.conflictCount
      });
    } catch (error) {
      logger.error('Error storing alert:', error);
    }
  }

  /**
   * Manual trigger for validation tasks
   */
  async triggerManualValidation(organizationId?: string): Promise<any> {
    try {
      if (organizationId) {
        // Run validation for specific organization
        const prisma = getPrismaClient();
        const org = await prisma.organization.findUnique({
          where: { id: organizationId },
          select: { id: true, name: true }
        });

        if (!org) {
          throw new Error('Organization not found');
        }

        logger.info(`Manual validation triggered for organization: ${org.name}`);
        
        const result = await dataValidationService.validateSync({
          organizationId: org.id,
          validateSchema: true,
          validateData: true,
          detectConflicts: true,
          autoResolve: true,
          includePerformanceMetrics: true
        });

        return {
          organization: org.name,
          result: {
            isValid: result.isValid,
            errors: result.errors.length,
            warnings: result.warnings.length,
            conflicts: result.conflicts.length,
            duration: result.performance.duration
          }
        };
      } else {
        // Run daily validation manually
        logger.info('Manual daily validation triggered');
        await this.runDailyValidation();
        return { message: 'Manual daily validation completed - check logs for details' };
      }
    } catch (error) {
      logger.error('Error in manual validation trigger:', error);
      throw error;
    }
  }

  /**
   * Get validation task status
   */
  getTaskStatus(): any {
    return {
      enabled: this.config.enabled,
      running: this.isRunning,
      schedule: this.config.schedule,
      autoResolve: this.config.autoResolve,
      alerting: {
        criticalErrors: this.config.alertOnCritical,
        highErrors: this.config.alertOnHighErrors,
        thresholds: {
          maxCritical: this.config.maxCriticalErrors,
          maxHigh: this.config.maxHighErrors
        }
      },
      jobs: {
        daily: {
          scheduled: !!this.dailyTaskJob,
          running: this.dailyTaskJob?.running || false
        },
        weekly: {
          scheduled: !!this.weeklyTaskJob,
          running: this.weeklyTaskJob?.running || false
        }
      }
    };
  }

  /**
   * Start scheduled tasks
   */
  startTasks(): void {
    if (this.dailyTaskJob) {
      this.dailyTaskJob.start();
    }
    if (this.weeklyTaskJob) {
      this.weeklyTaskJob.start();
    }
    logger.info('Validation tasks started');
  }

  /**
   * Stop scheduled tasks
   */
  stopTasks(): void {
    if (this.dailyTaskJob) {
      this.dailyTaskJob.stop();
    }
    if (this.weeklyTaskJob) {
      this.weeklyTaskJob.stop();
    }
    logger.info('Validation tasks stopped');
  }
}

export const validationTask = new ValidationTask();
export default validationTask;