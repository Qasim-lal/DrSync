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
import logger from '../utils/logger';

export class NotificationSettingsController {
  /**
   * GET /api/notification-settings/:organizationId
   * Get notification settings for organization
   */
  async getSettings(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.params;
      
      // Authorization check (user belongs to org)
      if (!req.user || req.user.organizationId !== organizationId) {
        res.status(403).json({ 
          success: false,
          error: 'Forbidden - You do not have access to this organization' 
        });
        return;
      }
      
      logger.info('[NotificationSettingsController] Fetching settings', {
        organizationId,
        userId: req.user.id,
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
      const { organizationId } = req.params;
      
      // Authorization check
      if (!req.user || req.user.organizationId !== organizationId) {
        res.status(403).json({ 
          success: false,
          error: 'Forbidden - You do not have access to this organization' 
        });
        return;
      }
      
      // Only ORG_ADMIN or ADMIN can update settings
      if (req.user.role !== 'ORG_ADMIN' && req.user.role !== 'ADMIN' && req.user.role !== 'SUPER_ADMIN') {
        res.status(403).json({ 
          success: false,
          error: 'Forbidden - Only administrators can update notification settings' 
        });
        return;
      }
      
      logger.info('[NotificationSettingsController] Updating settings', {
        organizationId,
        userId: req.user.id,
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
      const { organizationId } = req.params;
      const { type, timestamp } = req.query;
      
      // Authorization check
      if (!req.user || req.user.organizationId !== organizationId) {
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
      const { organizationId } = req.params;
      
      // Authorization check
      if (!req.user || req.user.organizationId !== organizationId) {
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
      const { organizationId } = req.params;
      const { preset } = req.body;
      
      // Authorization check
      if (!req.user || req.user.organizationId !== organizationId) {
        res.status(403).json({ 
          success: false,
          error: 'Forbidden - You do not have access to this organization' 
        });
        return;
      }
      
      // Only ORG_ADMIN or ADMIN can apply presets
      if (req.user.role !== 'ORG_ADMIN' && req.user.role !== 'ADMIN' && req.user.role !== 'SUPER_ADMIN') {
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
        userId: req.user.id,
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
      const { organizationId } = req.params;
      const { appointments } = req.query;
      
      // Authorization check
      if (!req.user || req.user.organizationId !== organizationId) {
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
      const { organizationId } = req.params;
      const { appointments } = req.query;
      
      // Authorization check
      if (!req.user || req.user.organizationId !== organizationId) {
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
}

// Export singleton instance
export default new NotificationSettingsController();
