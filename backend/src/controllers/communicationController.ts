/**
 * Communication Controller - TASK-038D
 * 
 * Handles HTTP requests for:
 * - Email template management (SUBTASK-038D-002)
 * - Broadcast communications (SUBTASK-038D-004)
 * - Communication history and statistics
 */

import { Request, Response } from 'express';
import { communicationService } from '../services/communicationService';
import { logger } from '../utils/logger';

export class CommunicationController {
  
  // ============================================================================
  // EMAIL TEMPLATES (SUBTASK-038D-002)
  // ============================================================================

  /**
   * SUBTASK-038D-002-1: Create email template
   * POST /api/communications/templates
   */
  async createEmailTemplate(req: Request, res: Response) {
    try {
      const { name, subject, body, category, variables } = req.body;
      const createdBy = req.user?.id || 'SUPER_ADMIN';

      if (!name || !subject || !body || !category) {
        return res.status(400).json({
          error: 'Missing required fields: name, subject, body, category'
        });
      }

      const template = await communicationService.createEmailTemplate({
        name,
        subject,
        body,
        category,
        variables: variables || [],
        createdBy
      });

      logger.info(`Email template created: ${template.id}`);

      return res.status(201).json({
        success: true,
        data: template
      });
    } catch (error: any) {
      logger.error('Error creating email template:', error);
      return res.status(500).json({
        error: 'Failed to create email template',
        details: error.message
      });
    }
  }

  /**
   * SUBTASK-038D-002-2: Update email template
   * PUT /api/communications/templates/:templateId
   */
  async updateEmailTemplate(req: Request, res: Response) {
    try {
      const { templateId } = req.params;
      const { name, subject, body, category, variables, isActive } = req.body;

      const template = await communicationService.updateEmailTemplate(templateId as string, {
        name,
        subject,
        body,
        category,
        variables,
        isActive
      });

      logger.info(`Email template updated: ${templateId}`);

      return res.status(200).json({
        success: true,
        data: template
      });
    } catch (error: any) {
      logger.error('Error updating email template:', error);
      return res.status(500).json({
        error: 'Failed to update email template',
        details: error.message
      });
    }
  }

  /**
   * SUBTASK-038D-002-3: Get email template by ID
   * GET /api/communications/templates/:templateId
   */
  async getEmailTemplate(req: Request, res: Response) {
    try {
      const { templateId } = req.params;

      const template = await communicationService.getEmailTemplateById(templateId as string);

      return res.status(200).json({
        success: true,
        data: template
      });
    } catch (error: any) {
      logger.error('Error getting email template:', error);
      return res.status(404).json({
        error: 'Email template not found',
        details: error.message
      });
    }
  }

  /**
   * SUBTASK-038D-002-4: List email templates
   * GET /api/communications/templates
   */
  async listEmailTemplates(req: Request, res: Response) {
    try {
      const { category, isActive, page, limit } = req.query;

      const filters: any = {};
      if (category) filters.category = category as string;
      if (isActive !== undefined) filters.isActive = isActive === 'true';
      if (page) filters.page = parseInt(page as string);
      if (limit) filters.limit = parseInt(limit as string);

      const result = await communicationService.listEmailTemplates(filters);

      return res.status(200).json({
        success: true,
        data: result.templates,
        pagination: result.pagination
      });
    } catch (error: any) {
      logger.error('Error listing email templates:', error);
      return res.status(500).json({
        error: 'Failed to list email templates',
        details: error.message
      });
    }
  }

  /**
   * SUBTASK-038D-002-5: Delete email template
   * DELETE /api/communications/templates/:templateId
   */
  async deleteEmailTemplate(req: Request, res: Response) {
    try {
      const { templateId } = req.params;

      // Note: deleteEmailTemplate method needs to be implemented in CommunicationService
      // For now, using updateEmailTemplate to deactivate
      await communicationService.updateEmailTemplate(templateId as string, { isActive: false });

      logger.info(`Email template deleted: ${templateId}`);

      return res.status(200).json({
        success: true,
        message: 'Email template deleted successfully'
      });
    } catch (error: any) {
      logger.error('Error deleting email template:', error);
      return res.status(500).json({
        error: 'Failed to delete email template',
        details: error.message
      });
    }
  }

  // ============================================================================
  // BROADCAST COMMUNICATIONS (SUBTASK-038D-004)
  // ============================================================================

  /**
   * SUBTASK-038D-004-1: Send broadcast communication
   * POST /api/communications/broadcast
   */
  async sendBroadcast(req: Request, res: Response) {
    try {
      const {
        recipientType,
        recipientIds,
        recipientFilter,
        templateId,
        category,
        subject,
        message,
        type,
        channel,
        scheduledFor
      } = req.body;

      if (!recipientType) {
        return res.status(400).json({
          error: 'Missing required field: recipientType'
        });
      }

      if (!message && !templateId && !category) {
        return res.status(400).json({
          error: 'Must provide either message, templateId, or category'
        });
      }

      const broadcastData: any = {
        recipientType,
        message
      };
      if (recipientIds) broadcastData.recipientIds = recipientIds;
      if (recipientFilter) broadcastData.recipientFilter = recipientFilter;
      if (templateId) broadcastData.templateId = templateId;
      if (category) broadcastData.category = category;
      if (subject) broadcastData.subject = subject;
      if (type) broadcastData.type = type;
      if (channel) broadcastData.channel = channel;
      if (scheduledFor) broadcastData.scheduledFor = new Date(scheduledFor);
      
      const result = await communicationService.sendBroadcast(broadcastData);

      logger.info(`Broadcast sent: ${result.id}`);

      return res.status(201).json({
        success: true,
        data: result
      });
    } catch (error: any) {
      logger.error('Error sending broadcast:', error);
      return res.status(500).json({
        error: 'Failed to send broadcast',
        details: error.message
      });
    }
  }

  /**
   * SUBTASK-038D-004-2: Send notification to specific organization
   * POST /api/communications/notify
   */
  async sendNotification(req: Request, res: Response) {
    try {
      const {
        organizationId,
        subject,
        message,
        type,
        channel
      } = req.body;

      if (!organizationId || !subject || !message) {
        return res.status(400).json({
          error: 'Missing required fields: organizationId, subject, message'
        });
      }

      const result = await communicationService.sendNotification({
        organizationId,
        subject,
        message,
        type,
        channel
      });

      logger.info(`Notification sent to organization: ${organizationId}`);

      return res.status(201).json({
        success: true,
        data: result
      });
    } catch (error: any) {
      logger.error('Error sending notification:', error);
      return res.status(500).json({
        error: 'Failed to send notification',
        details: error.message
      });
    }
  }

  /**
   * SUBTASK-038D-004-3: Get communication history
   * GET /api/communications/history
   */
  async getCommunicationHistory(req: Request, res: Response) {
    try {
      const {
        type,
        status,
        recipientType,
        dateFrom,
        dateTo,
        page,
        limit
      } = req.query;

      const filters: any = {};
      if (type) filters.type = type as string;
      if (status) filters.status = status as string;
      if (recipientType) filters.recipientType = recipientType as string;
      if (dateFrom) filters.dateFrom = new Date(dateFrom as string);
      if (dateTo) filters.dateTo = new Date(dateTo as string);
      if (page) filters.page = parseInt(page as string);
      if (limit) filters.limit = parseInt(limit as string);

      const result = await communicationService.getCommunicationHistory(filters);

      return res.status(200).json({
        success: true,
        data: result.logs,
        pagination: result.pagination
      });
    } catch (error: any) {
      logger.error('Error getting communication history:', error);
      return res.status(500).json({
        error: 'Failed to get communication history',
        details: error.message
      });
    }
  }

  /**
   * SUBTASK-038D-004-4: Get communication statistics
   * GET /api/communications/stats
   */
  async getCommunicationStats(req: Request, res: Response) {
    try {
      const { days } = req.query;
      const daysParam = days ? parseInt(days as string) : 30;

      const stats = await communicationService.getCommunicationStats(daysParam);

      return res.status(200).json({
        success: true,
        data: stats
      });
    } catch (error: any) {
      logger.error('Error getting communication stats:', error);
      return res.status(500).json({
        error: 'Failed to get communication statistics',
        details: error.message
      });
    }
  }
}

export const communicationController = new CommunicationController();
