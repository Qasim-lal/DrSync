/**
 * Notification Settings Controller - TASK-040A
 * 
 * REST API endpoints for managing organization notification preferences.
 * 
 * Endpoints:
 * - GET    /api/notification-settings/:organizationId - Get settings
 * - PUT    /api/notification-settings/:organizationId - Update settings
 * - GET    /api/notification-settings/:organizationId/should-send - Check if notification allowed
 * 
 * Authorization: All endpoints require authentication and organization membership
 * 
 * @version 1.0
 * @date October 20, 2025
 */

import { Request, Response } from 'express';
import notificationSettingsService, { NotificationType } from '../services/notificationSettingsService';
import messageCostTrackingService, { MessageType } from '../services/messageCostTrackingService';
import patientSegmentationService from '../services/patientSegmentationService';
import smartMessageBundlingService, { BundleCandidate } from '../services/smartMessageBundlingService';
import whatsappCostTrackingIntegration from '../services/whatsappCostTrackingIntegration';
import logger from '../utils/logger';

export class NotificationSettingsController {
  private getOrganizationId(req: Request): string {
    const { organizationId } = req.params;
    if (!organizationId) {
      throw new Error('Missing organizationId parameter');
    }

    return organizationId;
  }

  private canAccessOrganization(req: Request, organizationId: string): boolean {
    const userOrganizationId = req.user
      ? ((req.user as any).organizationId || req.user.organization_id)
      : undefined;

    return !!req.user && (
      userOrganizationId === organizationId ||
      req.user.role === 'SUPER_ADMIN'
    );
  }

  private isSettingsAdmin(req: Request): boolean {
    return req.user?.role === 'ORG_ADMIN' || req.user?.role === 'SUPER_ADMIN';
  }

  /**
   * GET /api/notification-settings/:organizationId
   * Get notification settings for organization
   */
  async getSettings(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = this.getOrganizationId(req);
      
      // Authorization check (user belongs to org)
      if (!this.canAccessOrganization(req, organizationId)) {
        res.status(403).json({ 
          success: false,
          error: 'Forbidden - You do not have access to this organization' 
        });
        return;
      }
      
      logger.info('[NotificationSettingsController] Fetching settings', {
        organizationId,
        userId: req.user!.id,
      });
      
      const settings = await notificationSettingsService.getSettings(organizationId);
      
      res.json({
        success: true,
        data: settings,
      });
    } catch (error: any) {
      logger.error('[NotificationSettingsController] Get settings error', {
        organizationId: req.params.organizationId,
        error: error.message,
        stack: error.stack,
      });
      
      res.status(500).json({ 
        success: false,
        error: 'Failed to fetch notification settings' 
      });
    }
  }

  /**
   * PUT /api/notification-settings/:organizationId
   * Update notification settings
   */
  async updateSettings(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = this.getOrganizationId(req);
      
      // Authorization check
      if (!this.canAccessOrganization(req, organizationId)) {
        res.status(403).json({ 
          success: false,
          error: 'Forbidden - You do not have access to this organization' 
        });
        return;
      }
      
      // Only organization or super admins can update settings
      if (!this.isSettingsAdmin(req)) {
        res.status(403).json({ 
          success: false,
          error: 'Forbidden - Only administrators can update notification settings' 
        });
        return;
      }
      
      logger.info('[NotificationSettingsController] Updating settings', {
        organizationId,
        userId: req.user!.id,
        updates: Object.keys(req.body),
      });
      
      const updated = await notificationSettingsService.updateSettings(organizationId, req.body);
      
      res.json({
        success: true,
        data: updated,
        message: 'Notification settings updated successfully',
      });
    } catch (error: any) {
      logger.error('[NotificationSettingsController] Update settings error', {
        organizationId: req.params.organizationId,
        error: error.message,
        stack: error.stack,
      });
      
      res.status(500).json({ 
        success: false,
        error: 'Failed to update notification settings' 
      });
    }
  }

  /**
   * GET /api/notification-settings/:organizationId/should-send
   * Check if notification should be sent (integration point for TASK-040, 041, 042)
   * 
   * Query params:
   * - type: NotificationType (booking_confirmation, reminder, followup, medication, wellness)
   * - timestamp: ISO 8601 timestamp (optional, defaults to now)
   */
  async shouldSendNotification(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = this.getOrganizationId(req);
      const { type, timestamp } = req.query;
      
      // Authorization check
      if (!this.canAccessOrganization(req, organizationId)) {
        res.status(403).json({ 
          success: false,
          error: 'Forbidden - You do not have access to this organization' 
        });
        return;
      }
      
      // Validate notification type
      if (!type || typeof type !== 'string') {
        res.status(400).json({ 
          success: false,
          error: 'Missing or invalid notification type parameter' 
        });
        return;
      }
      
      // Validate type is a valid NotificationType
      const validTypes = Object.values(NotificationType);
      if (!validTypes.includes(type as NotificationType)) {
        res.status(400).json({ 
          success: false,
          error: `Invalid notification type. Must be one of: ${validTypes.join(', ')}` 
        });
        return;
      }
      
      const checkTimestamp = timestamp ? new Date(timestamp as string) : new Date();
      
      logger.debug('[NotificationSettingsController] Checking notification permission', {
        organizationId,
        type,
        timestamp: checkTimestamp.toISOString(),
      });
      
      const shouldSend = await notificationSettingsService.shouldSendNotification(
        organizationId,
        type as NotificationType,
        checkTimestamp
      );
      
      res.json({
        success: true,
        data: {
          shouldSend,
          notificationType: type,
          timestamp: checkTimestamp.toISOString(),
        },
      });
    } catch (error: any) {
      logger.error('[NotificationSettingsController] Should send check error', {
        organizationId: req.params.organizationId,
        type: req.query.type,
        error: error.message,
        stack: error.stack,
      });
      
      // Fail open - allow notification on error
      res.json({
        success: true,
        data: {
          shouldSend: true,
          notificationType: req.query.type,
          timestamp: new Date().toISOString(),
          warning: 'Check failed, defaulting to allow',
        },
      });
    }
  }

  /**
   * GET /api/notification-settings/:organizationId/language
   * Get organization language preference (convenience endpoint for TASK-040)
   */
  async getLanguagePreference(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = this.getOrganizationId(req);
      
      // Authorization check
      if (!this.canAccessOrganization(req, organizationId)) {
        res.status(403).json({ 
          success: false,
          error: 'Forbidden - You do not have access to this organization' 
        });
        return;
      }
      
      const language = await notificationSettingsService.getOrganizationLanguage(organizationId);
      
      res.json({
        success: true,
        data: {
          language,
          organizationId,
        },
      });
    } catch (error: any) {
      logger.error('[NotificationSettingsController] Get language error', {
        organizationId: req.params.organizationId,
        error: error.message,
      });
      
      res.json({
        success: true,
        data: {
          language: 'en', // Safe default
          organizationId: req.params.organizationId,
        },
      });
    }
  }

  /**
   * POST /api/notification-settings/:organizationId/preset
   * Apply a preset mode (BUDGET, RECOMMENDED, PREMIUM) - Phase 2
   */
  async applyPreset(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = this.getOrganizationId(req);
      const { preset } = req.body;
      
      // Authorization check
      if (!this.canAccessOrganization(req, organizationId)) {
        res.status(403).json({ 
          success: false,
          error: 'Forbidden - You do not have access to this organization' 
        });
        return;
      }
      
      // Only organization or super admins can apply presets
      if (!this.isSettingsAdmin(req)) {
        res.status(403).json({ 
          success: false,
          error: 'Forbidden - Only administrators can apply presets' 
        });
        return;
      }
      
      // Validate preset
      if (!preset || !['BUDGET', 'RECOMMENDED', 'PREMIUM'].includes(preset)) {
        res.status(400).json({ 
          success: false,
          error: 'Invalid preset. Must be BUDGET, RECOMMENDED, or PREMIUM' 
        });
        return;
      }
      
      logger.info('[NotificationSettingsController] Applying preset', {
        organizationId,
        preset,
        userId: req.user!.id,
      });
      
      const updated = await notificationSettingsService.applyPreset(organizationId, preset);
      
      res.json({
        success: true,
        data: updated,
        message: `${preset} preset applied successfully`,
      });
    } catch (error: any) {
      logger.error('[NotificationSettingsController] Apply preset error', {
        organizationId: req.params.organizationId,
        preset: req.body.preset,
        error: error.message,
      });
      
      res.status(500).json({ 
        success: false,
        error: 'Failed to apply preset' 
      });
    }
  }

  /**
   * GET /api/notification-settings/:organizationId/calculate-cost
   * Calculate estimated monthly cost based on current settings - Phase 2
   * Query params: appointments (optional - monthly appointment count)
   */
  async calculateCost(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = this.getOrganizationId(req);
      const { appointments } = req.query;
      
      // Authorization check
      if (!this.canAccessOrganization(req, organizationId)) {
        res.status(403).json({ 
          success: false,
          error: 'Forbidden - You do not have access to this organization' 
        });
        return;
      }
      
      const appointmentCount = appointments ? parseInt(appointments as string, 10) : undefined;
      
      const costData = await notificationSettingsService.calculateMonthlyCost(
        organizationId,
        appointmentCount
      );
      
      res.json({
        success: true,
        data: costData,
      });
    } catch (error: any) {
      logger.error('[NotificationSettingsController] Calculate cost error', {
        organizationId: req.params.organizationId,
        error: error.message,
      });
      
      res.status(500).json({ 
        success: false,
        error: 'Failed to calculate cost' 
      });
    }
  }

  /**
   * GET /api/notification-settings/:organizationId/compare-presets
   * Compare costs across all preset modes - Phase 2
   * Query params: appointments (optional - monthly appointment count)
   */
  async comparePresets(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = this.getOrganizationId(req);
      const { appointments } = req.query;
      
      // Authorization check
      if (!this.canAccessOrganization(req, organizationId)) {
        res.status(403).json({ 
          success: false,
          error: 'Forbidden - You do not have access to this organization' 
        });
        return;
      }
      
      const appointmentCount = appointments ? parseInt(appointments as string, 10) : undefined;
      
      const comparison = await notificationSettingsService.comparePresets(
        organizationId,
        appointmentCount
      );
      
      res.json({
        success: true,
        data: comparison,
      });
    } catch (error: any) {
      logger.error('[NotificationSettingsController] Compare presets error', {
        organizationId: req.params.organizationId,
        error: error.message,
      });
      
      res.status(500).json({ 
        success: false,
        error: 'Failed to compare presets' 
      });
    }
  }

  /**
   * POST /api/notification-settings/:organizationId/estimate-message-cost
   * Estimate one-off or bulk send cost before executing a message send.
   */
  async estimateMessageCost(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = this.getOrganizationId(req);
      const { recipientCount, messageType } = req.body;

      if (!this.canAccessOrganization(req, organizationId)) {
        res.status(403).json({
          success: false,
          error: 'Forbidden - You do not have access to this organization',
        });
        return;
      }

      const parsedRecipientCount = Number(recipientCount);
      if (!Number.isInteger(parsedRecipientCount) || parsedRecipientCount <= 0) {
        res.status(400).json({
          success: false,
          error: 'recipientCount must be a positive integer',
        });
        return;
      }

      let normalizedMessageType: MessageType | undefined;
      if (messageType !== undefined) {
        if (typeof messageType !== 'string') {
          res.status(400).json({
            success: false,
            error: 'messageType must be a string when provided',
          });
          return;
        }

        const candidate = messageType.toLowerCase() as MessageType;
        if (!Object.values(MessageType).includes(candidate)) {
          res.status(400).json({
            success: false,
            error: `Invalid messageType. Must be one of: ${Object.values(MessageType).join(', ')}`,
          });
          return;
        }

        normalizedMessageType = candidate;
      }

      const estimate = await whatsappCostTrackingIntegration.estimateBulkCost(
        organizationId,
        parsedRecipientCount,
        normalizedMessageType
      );
      const capStatus = await messageCostTrackingService.checkSpendingCap(organizationId);
      const totalCost = estimate.estimatedCost;
      const projectedSpend = capStatus.currentSpend + totalCost;
      const percentageUsed = capStatus.monthlyCap
        ? (projectedSpend / capStatus.monthlyCap) * 100
        : 0;

      res.json({
        success: true,
        data: {
          costPerMessage: estimate.costPerMessage,
          totalCost,
          currentSpend: capStatus.currentSpend,
          monthlyCap: capStatus.monthlyCap,
          percentageUsed: Number(percentageUsed.toFixed(2)),
          willExceedCap: estimate.willExceedCap,
          remainingBudget: estimate.remainingBudget,
        },
      });
    } catch (error: any) {
      logger.error('[NotificationSettingsController] Estimate message cost error', {
        organizationId: req.params.organizationId,
        error: error.message,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to estimate message cost',
      });
    }
  }

  /**
   * GET /api/notification-settings/:organizationId/cost-summary
   * Get tracked monthly cost analytics for the organization.
   */
  async getCostSummary(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = this.getOrganizationId(req);
      const { year, month } = req.query;

      if (!this.canAccessOrganization(req, organizationId)) {
        res.status(403).json({
          success: false,
          error: 'Forbidden - You do not have access to this organization',
        });
        return;
      }

      const parsedYear = year ? Number(year) : undefined;
      const parsedMonth = month ? Number(month) : undefined;

      if (
        (parsedYear !== undefined && (!Number.isInteger(parsedYear) || parsedYear < 2000)) ||
        (parsedMonth !== undefined && (!Number.isInteger(parsedMonth) || parsedMonth < 1 || parsedMonth > 12))
      ) {
        res.status(400).json({
          success: false,
          error: 'Invalid year or month query parameter',
        });
        return;
      }

      const summary = await messageCostTrackingService.getMonthlySummary(
        organizationId,
        parsedYear,
        parsedMonth
      );

      res.json({
        success: true,
        data: summary,
      });
    } catch (error: any) {
      logger.error('[NotificationSettingsController] Cost summary error', {
        organizationId: req.params.organizationId,
        error: error.message,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to fetch cost summary',
      });
    }
  }

  /**
   * GET /api/notification-settings/:organizationId/patient-segments
   * Get deterministic patient segmentation summary.
   */
  async getPatientSegments(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = this.getOrganizationId(req);

      if (!this.canAccessOrganization(req, organizationId)) {
        res.status(403).json({
          success: false,
          error: 'Forbidden - You do not have access to this organization',
        });
        return;
      }

      const summary = await patientSegmentationService.getSegmentationSummary(organizationId);

      res.json({
        success: true,
        data: summary,
      });
    } catch (error: any) {
      logger.error('[NotificationSettingsController] Patient segments error', {
        organizationId: req.params.organizationId,
        error: error.message,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to fetch patient segments',
      });
    }
  }

  /**
   * POST /api/notification-settings/:organizationId/bundle-plan
   * Create a safe smart-bundling plan for candidate messages.
   */
  async createBundlePlan(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = this.getOrganizationId(req);
      const { candidates, trackSavings } = req.body;

      if (!this.canAccessOrganization(req, organizationId)) {
        res.status(403).json({
          success: false,
          error: 'Forbidden - You do not have access to this organization',
        });
        return;
      }

      if (!Array.isArray(candidates)) {
        res.status(400).json({
          success: false,
          error: 'candidates must be an array',
        });
        return;
      }

      const normalizedCandidates = this.normalizeBundleCandidates(candidates);
      const plan = await smartMessageBundlingService.createBundlePlan(
        organizationId,
        normalizedCandidates,
        { trackSavings: trackSavings === true }
      );

      res.json({
        success: true,
        data: plan,
      });
    } catch (error: any) {
      logger.error('[NotificationSettingsController] Bundle plan error', {
        organizationId: req.params.organizationId,
        error: error.message,
      });

      res.status(500).json({
        success: false,
        error: error.message || 'Failed to create bundle plan',
      });
    }
  }

  private normalizeBundleCandidates(candidates: Array<Record<string, unknown>>): BundleCandidate[] {
    return candidates.map((candidate, index) => {
      const messageType = String(candidate.messageType || '').toLowerCase() as MessageType;
      if (!Object.values(MessageType).includes(messageType)) {
        throw new Error(`Invalid messageType for candidate ${index + 1}`);
      }

      if (!candidate.patientId || !candidate.phone || !candidate.body) {
        throw new Error(`candidate ${index + 1} requires patientId, phone, and body`);
      }

      return {
        patientId: String(candidate.patientId),
        ...(candidate.appointmentId ? { appointmentId: String(candidate.appointmentId) } : {}),
        phone: String(candidate.phone),
        messageType,
        body: String(candidate.body),
        ...(candidate.scheduledFor ? { scheduledFor: String(candidate.scheduledFor) } : {}),
      };
    });
  }
}

// Export singleton instance
export default new NotificationSettingsController();
