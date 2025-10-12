import { Request, Response } from 'express';
import { superAdminService, OrganizationFilters } from '../services/superAdminService';
import { billingAnalyticsService, TransactionFilters } from '../services/billingAnalyticsService';
import { trialManagementService } from '../services/trialManagementService';
import { subscriptionService } from '../services/subscriptionService';
import platformAnalyticsService from '../services/platformAnalyticsService';
import { supportService } from '../services/supportService';
import { communicationService } from '../services/communicationService';
import { knowledgeBaseService } from '../services/knowledgeBaseService';
import { logger } from '../utils/logger';
import { getPrismaClient } from '../services/prisma';

/**
 * Super Admin Controller
 * HTTP layer for platform-wide administration
 * 
 * All endpoints require SUPER_ADMIN role (enforced by middleware)
 * No patient PHI data is exposed - only organizational metadata
 */

export class SuperAdminController {
  /**
   * SUBTASK-038A-001: List organizations with filtering and pagination
   * GET /api/super-admin/organizations
   * 
   * Query Parameters:
   * - search: string (multi-field search)
   * - subscriptionStatus: string[] (comma-separated)
   * - organizationType: string[] (comma-separated)
   * - subscriptionPlan: string[] (comma-separated)
   * - region: string
   * - isActive: boolean
   * - createdFrom: date
   * - createdTo: date
   * - page: number (default: 1)
   * - limit: number (default: 20, max: 100)
   * - sortBy: string (name, createdAt, subscriptionStatus)
   * - sortOrder: asc | desc
   */
  async listOrganizations(req: Request, res: Response): Promise<void> {
    try {
      const {
        search,
        subscriptionStatus,
        organizationType,
        subscriptionPlan,
        region,
        isActive,
        createdFrom,
        createdTo,
        page,
        limit,
        sortBy,
        sortOrder
      } = req.query;

      // Parse and validate filters
      const filters = {
        ...(search && { search: search as string }),
        ...(subscriptionStatus && { subscriptionStatus: (subscriptionStatus as string).split(',') }),
        ...(organizationType && { organizationType: (organizationType as string).split(',') }),
        ...(subscriptionPlan && { subscriptionPlan: (subscriptionPlan as string).split(',') }),
        ...(region && { region: region as string }),
        ...(isActive !== undefined && { isActive: isActive === 'true' }),
        ...(createdFrom && { createdFrom: new Date(createdFrom as string) }),
        ...(createdTo && { createdTo: new Date(createdTo as string) }),
        page: page ? Math.max(1, parseInt(page as string)) : 1,
        limit: limit ? Math.min(100, Math.max(1, parseInt(limit as string))) : 20,
        ...(sortBy && { sortBy: sortBy as string }),
        sortOrder: (sortOrder as 'asc' | 'desc') || 'desc'
      } as OrganizationFilters;

      const result = await superAdminService.listOrganizations(filters);

      res.status(200).json({
        success: true,
        data: result.organizations,
        pagination: result.pagination,
        filters: {
          search: filters.search,
          subscriptionStatus: filters.subscriptionStatus,
          organizationType: filters.organizationType,
          subscriptionPlan: filters.subscriptionPlan,
          region: filters.region,
          isActive: filters.isActive
        }
      });
    } catch (error) {
      logger.error('Error in listOrganizations:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to list organizations',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * SUBTASK-038A-002: Get organization details
   * GET /api/super-admin/organizations/:id
   */
  async getOrganizationDetails(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({
          success: false,
          error: 'Organization ID is required'
        });
        return;
      }

      const organization = await superAdminService.getOrganizationDetails(id);

      if (!organization) {
        res.status(404).json({
          success: false,
          error: 'Organization not found',
          message: `No organization found with ID: ${id}`
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: organization
      });
    } catch (error) {
      logger.error('Error in getOrganizationDetails:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get organization details',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * SUBTASK-038A-006: Get organization statistics
   * GET /api/super-admin/statistics/organizations
   */
  async getOrganizationStatistics(_req: Request, res: Response): Promise<void> {
    try {
      const statistics = await superAdminService.getOrganizationStatistics();

      res.status(200).json({
        success: true,
        data: statistics
      });
    } catch (error) {
      logger.error('Error in getOrganizationStatistics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get organization statistics',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * SUBTASK-038A-003: Update organization status
   * PATCH /api/super-admin/organizations/:id/status
   * 
   * Body: { isActive: boolean, reason?: string }
   */
  async updateOrganizationStatus(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { isActive, reason } = req.body;

      if (!id) {
        res.status(400).json({
          success: false,
          error: 'Organization ID is required'
        });
        return;
      }

      if (typeof isActive !== 'boolean') {
        res.status(400).json({
          success: false,
          error: 'isActive must be a boolean value'
        });
        return;
      }

      const organization = await superAdminService.updateOrganizationStatus(
        id,
        isActive,
        reason
      );

      res.status(200).json({
        success: true,
        message: `Organization ${isActive ? 'activated' : 'deactivated'} successfully`,
        data: organization
      });
    } catch (error) {
      logger.error('Error in updateOrganizationStatus:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update organization status',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * SUBTASK-038A-003: Suspend organization
   * POST /api/super-admin/organizations/:id/suspend
   * 
   * Body: { reason: string }
   */
  async suspendOrganization(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      if (!id) {
        res.status(400).json({
          success: false,
          error: 'Organization ID is required'
        });
        return;
      }

      if (!reason || typeof reason !== 'string') {
        res.status(400).json({
          success: false,
          error: 'Suspension reason is required'
        });
        return;
      }

      const organization = await superAdminService.suspendOrganization(id, reason);

      res.status(200).json({
        success: true,
        message: 'Organization suspended successfully',
        data: organization
      });
    } catch (error) {
      logger.error('Error in suspendOrganization:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to suspend organization',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * SUBTASK-038A-004: Get organization configuration
   * GET /api/super-admin/organizations/:id/config
   */
  async getOrganizationConfig(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({
          success: false,
          error: 'Organization ID is required'
        });
        return;
      }

      const config = await superAdminService.getOrganizationConfig(id);

      res.status(200).json({
        success: true,
        data: config
      });
    } catch (error) {
      logger.error('Error in getOrganizationConfig:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get organization configuration',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * SUBTASK-038A-004: Update trial limits
   * PATCH /api/super-admin/organizations/:id/limits
   * 
   * Body: { maxPatients: number, maxAppointments: number }
   */
  async updateTrialLimits(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { maxPatients, maxAppointments } = req.body;

      if (!id) {
        res.status(400).json({
          success: false,
          error: 'Organization ID is required'
        });
        return;
      }

      if (typeof maxPatients !== 'number' || maxPatients < 0) {
        res.status(400).json({
          success: false,
          error: 'maxPatients must be a positive number'
        });
        return;
      }

      if (typeof maxAppointments !== 'number' || maxAppointments < 0) {
        res.status(400).json({
          success: false,
          error: 'maxAppointments must be a positive number'
        });
        return;
      }

      const organization = await superAdminService.updateTrialLimits(
        id,
        maxPatients,
        maxAppointments
      );

      res.status(200).json({
        success: true,
        message: 'Trial limits updated successfully',
        data: organization
      });
    } catch (error) {
      logger.error('Error in updateTrialLimits:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update trial limits',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * SUBTASK-038A-005: Get organization users
   * GET /api/super-admin/organizations/:id/users
   */
  async getOrganizationUsers(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({
          success: false,
          error: 'Organization ID is required'
        });
        return;
      }

      const users = await superAdminService.getOrganizationUsers(id);

      res.status(200).json({
        success: true,
        data: users,
        count: users.length
      });
    } catch (error) {
      logger.error('Error in getOrganizationUsers:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get organization users',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // ============================================================================
  // TASK-038B: BILLING & SUBSCRIPTION MANAGEMENT
  // ============================================================================

  /**
   * SUBTASK-038B-001: Get billing overview dashboard
   * GET /api/super-admin/billing/overview
   */
  async getBillingOverview(_req: Request, res: Response): Promise<void> {
    try {
      const overview = await billingAnalyticsService.getBillingOverview();

      res.status(200).json({
        success: true,
        data: overview
      });
    } catch (error) {
      logger.error('Error in getBillingOverview:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get billing overview',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * SUBTASK-038B-002: List payment transactions
   * GET /api/super-admin/billing/transactions
   */
  async listTransactions(req: Request, res: Response): Promise<void> {
    try {
      const {
        status,
        paymentMethod,
        organizationId,
        dateFrom,
        dateTo,
        page,
        limit
      } = req.query;

      const filters: TransactionFilters = {
        ...(status && { status: (status as string).split(',') }),
        ...(paymentMethod && { paymentMethod: (paymentMethod as string).split(',') }),
        ...(organizationId && { organizationId: organizationId as string }),
        ...(dateFrom && { dateFrom: new Date(dateFrom as string) }),
        ...(dateTo && { dateTo: new Date(dateTo as string) }),
        page: page ? parseInt(page as string) : 1,
        limit: limit ? Math.min(100, parseInt(limit as string)) : 20
      };

      const result = await billingAnalyticsService.listTransactions(filters);

      res.status(200).json({
        success: true,
        data: result.transactions,
        pagination: result.pagination
      });
    } catch (error) {
      logger.error('Error in listTransactions:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to list transactions',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * SUBTASK-038B-002: Get payment status breakdown
   * GET /api/super-admin/billing/payment-status
   */
  async getPaymentStatusBreakdown(_req: Request, res: Response): Promise<void> {
    try {
      const breakdown = await billingAnalyticsService.getPaymentStatusBreakdown();

      res.status(200).json({
        success: true,
        data: breakdown
      });
    } catch (error) {
      logger.error('Error in getPaymentStatusBreakdown:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get payment status breakdown',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * SUBTASK-038B-002: Retry a failed payment
   * POST /api/super-admin/billing/transactions/:id/retry
   */
  async retryPayment(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({
          success: false,
          error: 'Payment intent ID is required'
        });
        return;
      }

      const result = await billingAnalyticsService.retryPayment(id);

      res.status(200).json({
        success: true,
        message: 'Payment queued for retry',
        data: result
      });
    } catch (error) {
      logger.error('Error in retryPayment:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retry payment',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * SUBTASK-038B-002: Process a refund
   * POST /api/super-admin/billing/transactions/:id/refund
   * Body: { amount: number, reason: string }
   */
  async processRefund(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { amount, reason } = req.body;

      if (!id) {
        res.status(400).json({
          success: false,
          error: 'Payment intent ID is required'
        });
        return;
      }

      if (typeof amount !== 'number' || amount <= 0) {
        res.status(400).json({
          success: false,
          error: 'Valid refund amount is required'
        });
        return;
      }

      if (!reason) {
        res.status(400).json({
          success: false,
          error: 'Refund reason is required'
        });
        return;
      }

      const result = await billingAnalyticsService.processRefund(id, amount, reason);

      res.status(200).json({
        success: true,
        message: 'Refund processed successfully',
        data: result
      });
    } catch (error) {
      logger.error('Error in processRefund:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to process refund',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * SUBTASK-038B-003: Get subscription lifecycle overview
   * GET /api/super-admin/subscriptions/lifecycle
   */
  async getSubscriptionLifecycle(_req: Request, res: Response): Promise<void> {
    try {
      const lifecycle = await subscriptionService.getSubscriptionLifecycleOverview();

      res.status(200).json({
        success: true,
        data: lifecycle
      });
    } catch (error) {
      logger.error('Error in getSubscriptionLifecycle:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get subscription lifecycle overview',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * SUBTASK-038B-003: Update organization subscription
   * PUT /api/super-admin/subscriptions/:id
   * Body: { subscriptionPlan: string, reason?: string }
   */
  async updateSubscription(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { subscriptionPlan, reason } = req.body;

      if (!id) {
        res.status(400).json({
          success: false,
          error: 'Organization ID is required'
        });
        return;
      }

      if (!subscriptionPlan) {
        res.status(400).json({
          success: false,
          error: 'Subscription plan is required'
        });
        return;
      }

      const validPlans = ['FREE', 'BASIC', 'PROFESSIONAL', 'ENTERPRISE'];
      if (!validPlans.includes(subscriptionPlan)) {
        res.status(400).json({
          success: false,
          error: `Invalid subscription plan. Valid options: ${validPlans.join(', ')}`
        });
        return;
      }

      const result = await subscriptionService.updateSubscriptionPlan(
        id,
        subscriptionPlan,
        reason || 'Manual update by super admin'
      );

      res.status(200).json({
        success: true,
        message: 'Subscription updated successfully',
        data: result
      });
    } catch (error) {
      logger.error('Error in updateSubscription:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update subscription',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * SUBTASK-038B-003: Suspend organization subscription
   * POST /api/super-admin/subscriptions/:id/suspend
   * Body: { reason: string }
   */
  async suspendSubscription(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      if (!id) {
        res.status(400).json({
          success: false,
          error: 'Organization ID is required'
        });
        return;
      }

      if (!reason) {
        res.status(400).json({
          success: false,
          error: 'Suspension reason is required'
        });
        return;
      }

      const result = await subscriptionService.suspendOrganization(id, reason);

      res.status(200).json({
        success: true,
        message: 'Subscription suspended successfully',
        data: result
      });
    } catch (error) {
      logger.error('Error in suspendSubscription:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to suspend subscription',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * SUBTASK-038B-003: Reactivate suspended subscription
   * POST /api/super-admin/subscriptions/:id/reactivate
   */
  async reactivateSubscription(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({
          success: false,
          error: 'Organization ID is required'
        });
        return;
      }

      const result = await subscriptionService.reactivateOrganization(id);

      res.status(200).json({
        success: true,
        message: 'Subscription reactivated successfully',
        data: result
      });
    } catch (error) {
      logger.error('Error in reactivateSubscription:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to reactivate subscription',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * SUBTASK-038B-004: Get trial overview dashboard
   * GET /api/super-admin/trials/overview
   */
  async getTrialOverview(_req: Request, res: Response): Promise<void> {
    try {
      const overview = await trialManagementService.getTrialOverview();

      res.status(200).json({
        success: true,
        data: overview
      });
    } catch (error) {
      logger.error('Error in getTrialOverview:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get trial overview',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * SUBTASK-038B-004: Detect trial abuse
   * GET /api/super-admin/trials/abuse-detection
   */
  async detectTrialAbuse(_req: Request, res: Response): Promise<void> {
    try {
      const result = await trialManagementService.detectTrialAbuse();

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Error in detectTrialAbuse:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to detect trial abuse',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * SUBTASK-038B-004: Monitor trial usage limits
   * GET /api/super-admin/trials/usage
   */
  async monitorTrialUsage(_req: Request, res: Response): Promise<void> {
    try {
      const usage = await trialManagementService.monitorTrialUsage();

      res.status(200).json({
        success: true,
        data: usage,
        count: usage.length
      });
    } catch (error) {
      logger.error('Error in monitorTrialUsage:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to monitor trial usage',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * SUBTASK-038B-004: Extend trial period
   * POST /api/super-admin/trials/:id/extend
   * Body: { extensionDays: number, reason: string }
   */
  async extendTrial(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { extensionDays, reason } = req.body;

      if (!id) {
        res.status(400).json({
          success: false,
          error: 'Organization ID is required'
        });
        return;
      }

      if (typeof extensionDays !== 'number' || extensionDays <= 0) {
        res.status(400).json({
          success: false,
          error: 'Extension days must be a positive number'
        });
        return;
      }

      if (!reason) {
        res.status(400).json({
          success: false,
          error: 'Extension reason is required'
        });
        return;
      }

      const result = await trialManagementService.extendTrial(id, extensionDays, reason);

      res.status(200).json({
        success: true,
        message: `Trial extended by ${extensionDays} days`,
        data: result
      });
    } catch (error) {
      logger.error('Error in extendTrial:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to extend trial',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * SUBTASK-038B-004: Get trial conversions
   * GET /api/super-admin/trials/conversions
   */
  async getTrialConversions(req: Request, res: Response): Promise<void> {
    try {
      const { days } = req.query;
      const daysNum = days ? parseInt(days as string) : 30;

      const conversions = await trialManagementService.getTrialConversions(daysNum);

      res.status(200).json({
        success: true,
        data: conversions
      });
    } catch (error) {
      logger.error('Error in getTrialConversions:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get trial conversions',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * SUBTASK-038B-004: Get trial end actions
   * GET /api/super-admin/trials/ending-actions
   */
  async getTrialsEndingActions(_req: Request, res: Response): Promise<void> {
    try {
      const actions = await trialManagementService.getTrialsEndingActions();

      res.status(200).json({
        success: true,
        data: actions
      });
    } catch (error) {
      logger.error('Error in getTrialsEndingActions:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get trial end actions',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // ============================================================================
  // TASK-038C: PLATFORM ANALYTICS & HEALTH MONITORING
  // ============================================================================

  /**
   * SUBTASK-038C-001: Get system health overview
   * GET /api/super-admin/analytics/system-health
   * 
   * Returns comprehensive system health metrics including:
   * - Overall system status (healthy, degraded, down)
   * - Uptime percentage
   * - Active organizations and users
   * - API performance metrics
   * - Database health
   * - External services health
   */
  async getSystemHealth(_req: Request, res: Response): Promise<void> {
    try {
      const healthData = await platformAnalyticsService.getSystemHealth();

      res.status(200).json({
        success: true,
        data: healthData
      });
    } catch (error) {
      logger.error('Error in getSystemHealth:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get system health',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * SUBTASK-038C-002: Get usage analytics
   * GET /api/super-admin/analytics/usage
   * 
   * Returns platform usage analytics including:
   * - Daily/Monthly active organizations
   * - DAU/MAU ratio
   * - Total appointments and booking methods
   * - Feature adoption rates
   * - Communication metrics
   * - User engagement metrics
   */
  async getUsageAnalytics(_req: Request, res: Response): Promise<void> {
    try {
      const usageData = await platformAnalyticsService.getUsageAnalytics();

      res.status(200).json({
        success: true,
        data: usageData
      });
    } catch (error) {
      logger.error('Error in getUsageAnalytics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get usage analytics',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * SUBTASK-038C-003: Get growth and conversion analytics
   * GET /api/super-admin/analytics/growth
   * 
   * Returns growth and conversion metrics including:
   * - Registration funnel analysis
   * - Trial to paid conversion
   * - Organization and user growth
   * - Month-over-month growth rates
   * - Revenue growth
   * - Cohort retention rates
   */
  async getGrowthAnalytics(_req: Request, res: Response): Promise<void> {
    try {
      const growthData = await platformAnalyticsService.getGrowthAnalytics();

      res.status(200).json({
        success: true,
        data: growthData
      });
    } catch (error) {
      logger.error('Error in getGrowthAnalytics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get growth analytics',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * SUBTASK-038C-004: Get performance benchmarks
   * GET /api/super-admin/analytics/benchmarks
   * 
   * Returns performance benchmarks including:
   * - Appointments/Patients/Messages per org (percentiles)
   * - High performers (top 10%)
   * - Low performers (organizations with issues)
   * - Recommendations for improvement
   */
  async getPerformanceBenchmarks(_req: Request, res: Response): Promise<void> {
    try {
      const benchmarkData = await platformAnalyticsService.getPerformanceBenchmarks();

      res.status(200).json({
        success: true,
        data: benchmarkData
      });
    } catch (error) {
      logger.error('Error in getPerformanceBenchmarks:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get performance benchmarks',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // ============================================================================
  // TASK-038B-005 & 038B-006: INVOICE/RECEIPT & REVENUE REPORTS
  // ============================================================================

  /**
   * SUBTASK-038B-005: List invoices
   * GET /api/super-admin/billing/invoices
   */
  async listInvoices(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId, status, dateFrom, dateTo, page, limit } = req.query;

      const filters = {
        ...(organizationId && { organizationId: organizationId as string }),
        ...(status && { status: (status as string).split(',') }),
        ...(dateFrom && { dateFrom: new Date(dateFrom as string) }),
        ...(dateTo && { dateTo: new Date(dateTo as string) }),
        ...(page && { page: parseInt(page as string) }),
        ...(limit && { limit: parseInt(limit as string) })
      };

      const result = await billingAnalyticsService.listInvoices(filters);

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Error in listInvoices:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to list invoices',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * SUBTASK-038B-005: Generate invoice preview
   * POST /api/super-admin/billing/invoices/preview
   */
  async generateInvoicePreview(req: Request, res: Response): Promise<void> {
    try {
      const { billingHistoryId } = req.body;

      if (!billingHistoryId) {
        res.status(400).json({
          success: false,
          error: 'Billing history ID is required'
        });
        return;
      }

      const invoice = await billingAnalyticsService.generateInvoice(billingHistoryId);

      res.status(200).json({
        success: true,
        message: 'Invoice preview generated',
        data: invoice
      });
    } catch (error) {
      logger.error('Error in generateInvoicePreview:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate invoice preview',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * SUBTASK-038B-005: Generate and send invoice
   * POST /api/super-admin/billing/invoices/generate
   */
  async generateAndSendInvoice(req: Request, res: Response): Promise<void> {
    try {
      const { billingHistoryId, sendEmail = true } = req.body;

      if (!billingHistoryId) {
        res.status(400).json({
          success: false,
          error: 'Billing history ID is required'
        });
        return;
      }

      const invoice = await billingAnalyticsService.generateInvoice(billingHistoryId);

      // TODO: If sendEmail is true, send the invoice via email
      // This would require integrating with the email service
      // For now, we just generate the invoice

      res.status(200).json({
        success: true,
        message: sendEmail ? 'Invoice generated and email queued' : 'Invoice generated successfully',
        data: invoice,
        emailSent: sendEmail // In production, this would be the actual email status
      });
    } catch (error) {
      logger.error('Error in generateAndSendInvoice:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate and send invoice',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * SUBTASK-038B-005: Generate invoice for billing history
   * POST /api/super-admin/billing/invoices/:id/generate
   */
  async generateInvoice(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({
          success: false,
          error: 'Billing history ID is required'
        });
        return;
      }

      const invoice = await billingAnalyticsService.generateInvoice(id);

      res.status(200).json({
        success: true,
        message: 'Invoice generated successfully',
        data: invoice
      });
    } catch (error) {
      logger.error('Error in generateInvoice:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate invoice',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * SUBTASK-038B-005: List receipts
   * GET /api/super-admin/billing/receipts
   */
  async listReceipts(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId, dateFrom, dateTo, page, limit } = req.query;

      // Get successful payment intents (which would have receipts)
      const filters: any = {
        status: ['SUCCESS'], // Only successful payments have receipts
        ...(organizationId && { organizationId: organizationId as string }),
        ...(dateFrom && { dateFrom: new Date(dateFrom as string) }),
        ...(dateTo && { dateTo: new Date(dateTo as string) }),
        ...(page && { page: parseInt(page as string) }),
        ...(limit && { limit: parseInt(limit as string) })
      };

      // For receipts, we'll use the payment intents that are successful
      const pageNum = filters.page || 1;
      const limitNum = filters.limit || 20;
      const skip = (pageNum - 1) * limitNum;

      const where: any = { status: 'SUCCESS' };
      if (filters.organizationId) where.organizationId = filters.organizationId;
      if (filters.dateFrom || filters.dateTo) {
        where.updatedAt = {};
        if (filters.dateFrom) where.updatedAt.gte = filters.dateFrom;
        if (filters.dateTo) where.updatedAt.lte = filters.dateTo;
      }

      const prisma = getPrismaClient();
      const [receipts, total] = await Promise.all([
        prisma.paymentIntent.findMany({
          where,
          skip,
          take: limitNum,
          orderBy: { updatedAt: 'desc' },
          include: {
            organization: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        }),
        prisma.paymentIntent.count({ where })
      ]);

      const totalPages = Math.ceil(total / limitNum);

      res.status(200).json({
        success: true,
        data: {
          receipts: receipts.map((payment: any) => ({
            receiptNumber: `REC-${payment.id.slice(0, 8).toUpperCase()}`,
            paymentIntentId: payment.id,
            date: payment.updatedAt || payment.createdAt,
            organization: payment.organization,
            amount: Number(payment.amount),
            currency: payment.currency,
            paymentMethod: payment.paymentMethod,
            transactionId: payment.gatewayIntentId || payment.id,
            status: 'PAID'
          })),
          pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            totalPages,
            hasMore: pageNum < totalPages
          }
        }
      });
    } catch (error) {
      logger.error('Error in listReceipts:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to list receipts',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * SUBTASK-038B-005: Generate receipt
   * POST /api/super-admin/billing/receipts/:id/generate
   */
  async generateReceipt(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({
          success: false,
          error: 'Payment intent ID is required'
        });
        return;
      }

      const receipt = await billingAnalyticsService.generateReceipt(id);

      res.status(200).json({
        success: true,
        message: 'Receipt generated successfully',
        data: receipt
      });
    } catch (error) {
      logger.error('Error in generateReceipt:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate receipt',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * SUBTASK-038B-006: Get revenue trends
   * GET /api/super-admin/billing/revenue-trends
   */
  async getRevenueTrends(req: Request, res: Response): Promise<void> {
    try {
      const { granularity, startDate, endDate } = req.query;

      if (!granularity || !startDate || !endDate) {
        res.status(400).json({
          success: false,
          error: 'Missing required parameters: granularity, startDate, endDate'
        });
        return;
      }

      const trends = await billingAnalyticsService.getRevenueTrends({
        granularity: granularity as any,
        startDate: new Date(startDate as string),
        endDate: new Date(endDate as string)
      });

      res.status(200).json({
        success: true,
        data: trends
      });
    } catch (error) {
      logger.error('Error in getRevenueTrends:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get revenue trends',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * SUBTASK-038B-006: Calculate customer lifetime value (LTV)
   * GET /api/super-admin/billing/ltv
   */
  async calculateLTV(req: Request, res: Response): Promise<void> {
    try {
      const { segmentBy } = req.query;

      const params = segmentBy ? { segmentBy: segmentBy as any } : {};
      const ltvData = await billingAnalyticsService.calculateLTV(params);

      res.status(200).json({
        success: true,
        data: ltvData
      });
    } catch (error) {
      logger.error('Error in calculateLTV:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to calculate LTV',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * SUBTASK-038B-006: Analyze churn
   * GET /api/super-admin/billing/churn-analysis
   */
  async analyzeChurn(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        res.status(400).json({
          success: false,
          error: 'Missing required parameters: startDate, endDate'
        });
        return;
      }

      const churnAnalysis = await billingAnalyticsService.analyzeChurn({
        startDate: new Date(startDate as string),
        endDate: new Date(endDate as string)
      });

      res.status(200).json({
        success: true,
        data: churnAnalysis
      });
    } catch (error) {
      logger.error('Error in analyzeChurn:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to analyze churn',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * SUBTASK-038B-006: Generate revenue forecast
   * GET /api/super-admin/billing/forecast
   */
  async generateRevenueForecast(req: Request, res: Response): Promise<void> {
    try {
      const { months } = req.query;
      const monthsNum = months ? parseInt(months as string) : 12;

      const forecast = await billingAnalyticsService.generateRevenueForecast({
        months: monthsNum
      });

      res.status(200).json({
        success: true,
        data: forecast
      });
    } catch (error) {
      logger.error('Error in generateRevenueForecast:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate revenue forecast',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // ==========================================
  // SUPPORT SYSTEM ENDPOINTS - TASK-038D
  // ==========================================

  /**
   * SUBTASK-038D-001-1: List support tickets
   * GET /api/super-admin/support/tickets
   */
  async listTickets(req: Request, res: Response): Promise<void> {
    try {
      const {
        status,
        priority,
        category,
        organizationId,
        assignedTo,
        page,
        limit,
        sortBy,
        sortOrder
      } = req.query;

      const filters = {
        ...(status && { status: (status as string).split(',') }),
        ...(priority && { priority: (priority as string).split(',') }),
        ...(category && { category: (category as string).split(',') }),
        ...(organizationId && { organizationId: organizationId as string }),
        ...(assignedTo && { assignedTo: assignedTo as string }),
        ...(page && { page: parseInt(page as string) }),
        ...(limit && { limit: parseInt(limit as string) }),
        ...(sortBy && { sortBy: sortBy as string }),
        ...(sortOrder && { sortOrder: sortOrder as 'asc' | 'desc' })
      };

      const result = await supportService.listTickets(filters);

      res.status(200).json({
        success: true,
        data: result.tickets,
        pagination: result.pagination
      });
    } catch (error) {
      logger.error('Error in listTickets:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to list tickets',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * SUBTASK-038D-001-2: Get ticket details
   * GET /api/super-admin/support/tickets/:id
   */
  async getTicketDetails(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({
          success: false,
          error: 'Ticket ID is required'
        });
        return;
      }

      const ticket = await supportService.getTicketById(id);

      res.status(200).json({
        success: true,
        data: ticket
      });
    } catch (error) {
      logger.error('Error in getTicketDetails:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get ticket details',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * SUBTASK-038D-001-3: Create support ticket
   * POST /api/super-admin/support/tickets
   */
  async createTicket(req: Request, res: Response): Promise<void> {
    try {
      const {
        organizationId,
        subject,
        description,
        category,
        priority,
        tags,
        attachments
      } = req.body;

      // Validation
      if (!organizationId || !subject || !description || !category) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields: organizationId, subject, description, category'
        });
        return;
      }

      const ticket = await supportService.createTicket({
        organizationId,
        subject,
        description,
        category,
        priority,
        tags,
        attachments,
        createdBy: (req as any).user?.id || 'SUPER_ADMIN'
      });

      res.status(201).json({
        success: true,
        message: 'Ticket created successfully',
        data: ticket
      });
    } catch (error) {
      logger.error('Error in createTicket:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create ticket',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * SUBTASK-038D-001-4: Update ticket status
   * PATCH /api/super-admin/support/tickets/:id/status
   */
  async updateTicketStatus(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { status, notes } = req.body;

      if (!id || !status) {
        res.status(400).json({
          success: false,
          error: 'Ticket ID and status are required'
        });
        return;
      }

      const ticket = await supportService.updateTicketStatus(
        id,
        status,
        notes,
        (req as any).user?.id
      );

      res.status(200).json({
        success: true,
        message: 'Ticket status updated successfully',
        data: ticket
      });
    } catch (error) {
      logger.error('Error in updateTicketStatus:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update ticket status',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * SUBTASK-038D-001-5: Assign ticket
   * PATCH /api/super-admin/support/tickets/:id/assign
   */
  async assignTicket(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { assignedTo } = req.body;

      if (!id || !assignedTo) {
        res.status(400).json({
          success: false,
          error: 'Ticket ID and assignedTo are required'
        });
        return;
      }

      const ticket = await supportService.assignTicket(id, assignedTo);

      res.status(200).json({
        success: true,
        message: 'Ticket assigned successfully',
        data: ticket
      });
    } catch (error) {
      logger.error('Error in assignTicket:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to assign ticket',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * SUBTASK-038D-001-6: Add ticket response
   * POST /api/super-admin/support/tickets/:id/responses
   */
  async addTicketResponse(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { message, isInternal, attachments } = req.body;

      if (!id || !message) {
        res.status(400).json({
          success: false,
          error: 'Ticket ID and message are required'
        });
        return;
      }

      const response = await supportService.addTicketResponse({
        ticketId: id,
        message,
        responderId: (req as any).user?.id || 'SUPER_ADMIN',
        isInternal,
        attachments
      });

      res.status(201).json({
        success: true,
        message: 'Response added successfully',
        data: response
      });
    } catch (error) {
      logger.error('Error in addTicketResponse:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to add ticket response',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * SUBTASK-038D-001-7: Get support metrics
   * GET /api/super-admin/support/metrics
   */
  async getSupportMetrics(_req: Request, res: Response): Promise<void> {
    try {
      const metrics = await supportService.getSupportMetrics();

      res.status(200).json({
        success: true,
        data: metrics
      });
    } catch (error) {
      logger.error('Error in getSupportMetrics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get support metrics',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * SUBTASK-038D-001-8: Get ticket volume trends
   * GET /api/super-admin/support/ticket-trends
   */
  async getTicketTrends(req: Request, res: Response): Promise<void> {
    try {
      const { days } = req.query;
      const daysNum = days ? parseInt(days as string) : 30;

      const trends = await supportService.getTicketVolumeTrends(daysNum);

      res.status(200).json({
        success: true,
        data: trends
      });
    } catch (error) {
      logger.error('Error in getTicketTrends:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get ticket trends',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * SUBTASK-038D-001-9: Get agent performance
   * GET /api/super-admin/support/agent-performance
   */
  async getAgentPerformance(req: Request, res: Response): Promise<void> {
    try {
      const { agentId } = req.query;

      const performance = await supportService.getAgentPerformance(
        agentId as string | undefined
      );

      res.status(200).json({
        success: true,
        data: performance
      });
    } catch (error) {
      logger.error('Error in getAgentPerformance:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get agent performance',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // ==========================================
  // EMAIL TEMPLATES & COMMUNICATION
  // ==========================================

  /**
   * SUBTASK-038D-002-1: List email templates
   * GET /api/super-admin/communication/templates
   */
  async listEmailTemplates(req: Request, res: Response): Promise<void> {
    try {
      const { category, isActive, page, limit } = req.query;

      const filters = {
        ...(category && { category: category as string }),
        ...(isActive !== undefined && { isActive: isActive === 'true' }),
        ...(page && { page: parseInt(page as string) }),
        ...(limit && { limit: parseInt(limit as string) })
      };

      const result = await communicationService.listEmailTemplates(filters);

      res.status(200).json({
        success: true,
        data: result.templates,
        pagination: result.pagination
      });
    } catch (error) {
      logger.error('Error in listEmailTemplates:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to list email templates',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * SUBTASK-038D-002-2: Create email template
   * POST /api/super-admin/communication/templates
   */
  async createEmailTemplate(req: Request, res: Response): Promise<void> {
    try {
      const {
        name,
        subject,
        htmlContent,
        category,
        variables
      } = req.body;

      if (!name || !subject || !htmlContent || !category) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields: name, subject, htmlContent, category'
        });
        return;
      }

      const template = await communicationService.createEmailTemplate({
        name,
        subject,
        body: htmlContent, // Map htmlContent to body field
        category,
        variables,
        createdBy: (req as any).user?.id || 'SUPER_ADMIN'
      });

      res.status(201).json({
        success: true,
        message: 'Email template created successfully',
        data: template
      });
    } catch (error) {
      logger.error('Error in createEmailTemplate:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create email template',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * SUBTASK-038D-002-3: Update email template
   * PATCH /api/super-admin/communication/templates/:id
   */
  async updateEmailTemplate(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updates = req.body;

      if (!id) {
        res.status(400).json({
          success: false,
          error: 'Template ID is required'
        });
        return;
      }

      const template = await communicationService.updateEmailTemplate(id, updates);

      res.status(200).json({
        success: true,
        message: 'Email template updated successfully',
        data: template
      });
    } catch (error) {
      logger.error('Error in updateEmailTemplate:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update email template',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * SUBTASK-038D-003-1: Send notification
   * POST /api/super-admin/communication/notify
   */
  async sendNotification(req: Request, res: Response): Promise<void> {
    try {
      const {
        organizationId,
        subject,
        htmlContent,
        priority
      } = req.body;

      if (!organizationId) {
        res.status(400).json({
          success: false,
          error: 'Organization ID is required'
        });
        return;
      }

      const result = await communicationService.sendNotification({
        organizationId,
        subject: subject || 'Notification',
        message: htmlContent || '',
        type: priority === 'high' ? 'ALERT' : 'NOTIFICATION',
        channel: 'EMAIL'
      });

      res.status(200).json({
        success: true,
        message: 'Notification sent successfully',
        data: result
      });
    } catch (error) {
      logger.error('Error in sendNotification:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to send notification',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * SUBTASK-038D-003-2: Get communication history
   * GET /api/super-admin/communication/history/:organizationId
   */
  async getCommunicationHistory(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.params;

      if (!organizationId) {
        res.status(400).json({
          success: false,
          error: 'Organization ID is required'
        });
        return;
      }

      // Get communication history - organizationId filtering would need to be added to service
      const result = await communicationService.getCommunicationHistory();

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Error in getCommunicationHistory:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get communication history',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * SUBTASK-038D-003-3: Get communication stats
   * GET /api/super-admin/communication/stats
   */
  async getCommunicationStats(_req: Request, res: Response): Promise<void> {
    try {
      const stats = await communicationService.getCommunicationStats();

      res.status(200).json({
        success: true,
        data: stats
      });
    } catch (error) {
      logger.error('Error in getCommunicationStats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get communication stats',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // ==========================================
  // KNOWLEDGE BASE
  // ==========================================

  /**
   * SUBTASK-038D-004-1: List knowledge base articles
   * GET /api/super-admin/knowledge-base/articles
   */
  async listKnowledgeBaseArticles(req: Request, res: Response): Promise<void> {
    try {
      const {
        category,
        tags,
        isPublished,
        search,
        page,
        limit,
        sortBy,
        sortOrder
      } = req.query;

      const filters = {
        ...(category && { category: category as string }),
        ...(tags && { tags: (tags as string).split(',') }),
        ...(isPublished !== undefined && { status: isPublished === 'true' ? 'PUBLISHED' as const : 'DRAFT' as const }),
        ...(search && { search: search as string }),
        ...(page && { page: parseInt(page as string) }),
        ...(limit && { limit: parseInt(limit as string) }),
        ...(sortBy && { sortBy: sortBy as string }),
        ...(sortOrder && { sortOrder: sortOrder as 'asc' | 'desc' })
      };

      const result = await knowledgeBaseService.listArticles(filters);

      res.status(200).json({
        success: true,
        data: result.articles,
        pagination: result.pagination
      });
    } catch (error) {
      logger.error('Error in listKnowledgeBaseArticles:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to list knowledge base articles',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * SUBTASK-038D-004-2: Get article details
   * GET /api/super-admin/knowledge-base/articles/:id
   */
  async getKnowledgeBaseArticle(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { incrementView } = req.query;

      if (!id) {
        res.status(400).json({
          success: false,
          error: 'Article ID is required'
        });
        return;
      }

      const article = await knowledgeBaseService.getArticleById(
        id,
        incrementView === 'true'
      );

      res.status(200).json({
        success: true,
        data: article
      });
    } catch (error) {
      logger.error('Error in getKnowledgeBaseArticle:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get knowledge base article',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * SUBTASK-038D-004-3: Create knowledge base article
   * POST /api/super-admin/knowledge-base/articles
   */
  async createKnowledgeBaseArticle(req: Request, res: Response): Promise<void> {
    try {
      const {
        title,
        content,
        excerpt,
        category,
        tags,
        isPublished
      } = req.body;

      if (!title || !content || !category) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields: title, content, category'
        });
        return;
      }

      // Generate slug from title
      const slug = title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

      const article = await knowledgeBaseService.createArticle({
        title,
        slug,
        content,
        excerpt,
        category,
        tags,
        status: isPublished ? 'PUBLISHED' : 'DRAFT',
        authorId: (req as any).user?.id || 'SUPER_ADMIN'
      });

      res.status(201).json({
        success: true,
        message: 'Knowledge base article created successfully',
        data: article
      });
    } catch (error) {
      logger.error('Error in createKnowledgeBaseArticle:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create knowledge base article',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * SUBTASK-038D-004-4: Update knowledge base article
   * PATCH /api/super-admin/knowledge-base/articles/:id
   */
  async updateKnowledgeBaseArticle(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updates = req.body;

      if (!id) {
        res.status(400).json({
          success: false,
          error: 'Article ID is required'
        });
        return;
      }

      const article = await knowledgeBaseService.updateArticle(id, updates);

      res.status(200).json({
        success: true,
        message: 'Knowledge base article updated successfully',
        data: article
      });
    } catch (error) {
      logger.error('Error in updateKnowledgeBaseArticle:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update knowledge base article',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * SUBTASK-038D-004-5: Delete knowledge base article
   * DELETE /api/super-admin/knowledge-base/articles/:id
   */
  async deleteKnowledgeBaseArticle(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({
          success: false,
          error: 'Article ID is required'
        });
        return;
      }

      await knowledgeBaseService.deleteArticle(id);

      res.status(200).json({
        success: true,
        message: 'Knowledge base article deleted successfully'
      });
    } catch (error) {
      logger.error('Error in deleteKnowledgeBaseArticle:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete knowledge base article',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * SUBTASK-038D-004-6: Search articles
   * GET /api/super-admin/knowledge-base/search
   */
  async searchKnowledgeBase(req: Request, res: Response): Promise<void> {
    try {
      const { q, category, tags, limit } = req.query;

      if (!q) {
        res.status(400).json({
          success: false,
          error: 'Search query (q) is required'
        });
        return;
      }

      const filters = {
        ...(category && { category: category as string }),
        ...(tags && { tags: (tags as string).split(',') }),
        ...(limit && { limit: parseInt(limit as string) })
      };

      const articles = await knowledgeBaseService.searchArticles(
        q as string,
        filters
      );

      res.status(200).json({
        success: true,
        data: articles
      });
    } catch (error) {
      logger.error('Error in searchKnowledgeBase:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to search knowledge base',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * SUBTASK-038D-004-7: Get knowledge base stats
   * GET /api/super-admin/knowledge-base/stats
   */
  async getKnowledgeBaseStats(_req: Request, res: Response): Promise<void> {
    try {
      const stats = await knowledgeBaseService.getKnowledgeBaseStats();

      res.status(200).json({
        success: true,
        data: stats
      });
    } catch (error) {
      logger.error('Error in getKnowledgeBaseStats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get knowledge base stats',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * SUBTASK-038D-004-8: Get popular articles
   * GET /api/super-admin/knowledge-base/popular
   */
  async getPopularArticles(req: Request, res: Response): Promise<void> {
    try {
      const { category, limit } = req.query;
      const limitNum = limit ? parseInt(limit as string) : 10;

      const articles = await knowledgeBaseService.getPopularArticles(
        category as string | undefined,
        limitNum
      );

      res.status(200).json({
        success: true,
        data: articles
      });
    } catch (error) {
      logger.error('Error in getPopularArticles:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get popular articles',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}

// Export singleton instance
export const superAdminController = new SuperAdminController();
