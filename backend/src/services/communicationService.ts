/**
 * Communication Service - TASK-038D
 * 
 * Handles broadcast communications, email templates, and notification system
 * Manages platform-wide announcements and organization communications
 */

import { getPrismaClient } from './prisma';
import { logger } from '../utils/logger';

const prisma = getPrismaClient();

export class CommunicationService {
  /**
   * SUBTASK-038D-002-1: Create email template
   */
  async createEmailTemplate(data: {
    name: string;
    subject: string;
    body: string;
    category: string;
    variables?: string[];
    createdBy: string;
  }) {
    try {
      const template = await prisma.emailTemplate.create({
        data: {
          name: data.name,
          subject: data.subject,
          body: data.body,
          category: data.category as any,
          variables: data.variables || [],
          createdBy: data.createdBy,
          isActive: true
        }
      });

      logger.info(`Created email template: ${template.name}`);

      return template;
    } catch (error) {
      logger.error('Error creating email template:', error);
      throw new Error('Failed to create email template');
    }
  }

  /**
   * SUBTASK-038D-002-2: Update email template
   */
  async updateEmailTemplate(templateId: string, data: {
    name?: string;
    subject?: string;
    body?: string;
    category?: string;
    variables?: string[];
    isActive?: boolean;
  }) {
    try {
      const template = await prisma.emailTemplate.update({
        where: { id: templateId },
        data: {
          ...(data.name && { name: data.name }),
          ...(data.subject && { subject: data.subject }),
          ...(data.body && { body: data.body }),
          ...(data.category && { category: data.category as any }),
          ...(data.variables && { variables: data.variables }),
          ...(data.isActive !== undefined && { isActive: data.isActive })
        }
      });

      logger.info(`Updated email template: ${template.name}`);

      return template;
    } catch (error) {
      logger.error(`Error updating email template ${templateId}:`, error);
      throw new Error('Failed to update email template');
    }
  }

  /**
   * SUBTASK-038D-002-3: List email templates
   */
  async listEmailTemplates(filters: {
    category?: string;
    isActive?: boolean;
    page?: number;
    limit?: number;
  } = {}) {
    try {
      const {
        category,
        isActive,
        page = 1,
        limit = 20
      } = filters;

      const where: any = {};

      if (category) {
        where.category = category;
      }

      if (isActive !== undefined) {
        where.isActive = isActive;
      }

      const skip = (page - 1) * limit;

      const [templates, total] = await Promise.all([
        prisma.emailTemplate.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' }
        }),
        prisma.emailTemplate.count({ where })
      ]);

      logger.info(`Listed ${templates.length} email templates`);

      return {
        templates,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('Error listing email templates:', error);
      throw new Error('Failed to list email templates');
    }
  }

  /**
   * SUBTASK-038D-002-4: Get email template by ID
   */
  async getEmailTemplateById(templateId: string) {
    try {
      const template = await prisma.emailTemplate.findUnique({
        where: { id: templateId }
      });

      if (!template) {
        throw new Error('Email template not found');
      }

      return template;
    } catch (error) {
      logger.error(`Error getting email template ${templateId}:`, error);
      throw error;
    }
  }

  /**
   * SUBTASK-038D-002-5: Get template by category
   */
  async getTemplateByCategory(category: string) {
    try {
      const template = await prisma.emailTemplate.findFirst({
        where: {
          category: category as any,
          isActive: true
        },
        orderBy: { createdAt: 'desc' }
      });

      if (!template) {
        throw new Error(`No active template found for category: ${category}`);
      }

      return template;
    } catch (error) {
      logger.error(`Error getting template for category ${category}:`, error);
      throw error;
    }
  }

  /**
   * SUBTASK-038D-002-6: Render email template with variables
   */
  renderTemplate(template: {
    subject: string;
    body: string;
  }, variables: Record<string, string>): {
    subject: string;
    body: string;
  } {
    try {
      let subject = template.subject;
      let body = template.body;

      // Replace all variables in format {{variableName}}
      Object.entries(variables).forEach(([key, value]) => {
        const regex = new RegExp(`{{${key}}}`, 'g');
        subject = subject.replace(regex, value);
        body = body.replace(regex, value);
      });

      return {
        subject,
        body
      };
    } catch (error) {
      logger.error('Error rendering email template:', error);
      throw new Error('Failed to render email template');
    }
  }

  /**
   * SUBTASK-038D-004-1: Send broadcast communication
   * Broadcast emails/notifications to multiple organizations
   */
  async sendBroadcast(data: {
    recipientType: 'ALL' | 'FILTERED' | 'SPECIFIC';
    recipientIds?: string[]; // Specific organization IDs
    recipientFilter?: any; // Filter criteria for FILTERED type
    templateId?: string;
    category?: string;
    subject?: string;
    message: string;
    type?: 'BROADCAST' | 'ANNOUNCEMENT' | 'NOTIFICATION' | 'ALERT' | 'MAINTENANCE';
    channel?: 'EMAIL' | 'IN_APP' | 'SMS' | 'PUSH';
    scheduledFor?: Date;
  }) {
    try {
      const type = data.type || 'BROADCAST';
      const channel = data.channel || 'EMAIL';

      // Get or use template
      let renderedContent: { subject: string; body: string };
      
      if (data.templateId) {
        const template = await this.getEmailTemplateById(data.templateId);
        renderedContent = this.renderTemplate(template, {});
      } else if (data.category) {
        const template = await this.getTemplateByCategory(data.category);
        renderedContent = this.renderTemplate(template, {});
      } else if (data.subject) {
        renderedContent = {
          subject: data.subject,
          body: data.message
        };
      } else {
        throw new Error('Must provide either templateId, category, or subject');
      }

      // Determine recipient IDs based on type
      let recipientIds: string[] = [];
      let recipientCount = 0;

      if (data.recipientType === 'ALL') {
        const allOrgs = await prisma.organization.findMany({
          where: { isActive: true },
          select: { id: true }
        });
        recipientIds = allOrgs.map(org => org.id);
        recipientCount = recipientIds.length;
      } else if (data.recipientType === 'SPECIFIC' && data.recipientIds) {
        recipientIds = data.recipientIds;
        recipientCount = recipientIds.length;
      } else if (data.recipientType === 'FILTERED' && data.recipientFilter) {
        const filteredOrgs = await prisma.organization.findMany({
          where: data.recipientFilter,
          select: { id: true }
        });
        recipientIds = filteredOrgs.map(org => org.id);
        recipientCount = recipientIds.length;
      }

      // Create communication log
      const log = await prisma.communicationLog.create({
        data: {
          type: type as any,
          subject: renderedContent.subject,
          message: renderedContent.body,
          channel: channel as any,
          recipientType: data.recipientType,
          recipientFilter: data.recipientFilter || null,
          recipientIds,
          recipientCount,
          scheduledFor: data.scheduledFor || null,
          status: data.scheduledFor ? 'SCHEDULED' : 'PENDING',
          createdBy: 'SUPER_ADMIN', // Should be passed from auth context
          templateId: data.templateId || null
        }
      });

      // If not scheduled, send immediately
      if (!data.scheduledFor) {
        // In real implementation, integrate with email service
        await prisma.communicationLog.update({
          where: { id: log.id },
          data: {
            status: 'SENT',
            sentAt: new Date(),
            deliveredCount: recipientCount // Simulate all delivered
          }
        });
      }

      logger.info(`Broadcast ${type} created for ${recipientCount} organizations`);

      return {
        id: log.id,
        recipientCount,
        status: data.scheduledFor ? 'SCHEDULED' : 'SENT',
        scheduledFor: data.scheduledFor
      };
    } catch (error) {
      logger.error('Error sending broadcast:', error);
      throw new Error('Failed to send broadcast');
    }
  }

  /**
   * Send single notification to organization (for ticket updates, etc.)
   * Note: This is NOT for broadcast - use sendBroadcast for that
   */
  async sendNotification(data: {
    organizationId: string;
    subject: string;
    message: string;
    type?: 'NOTIFICATION' | 'ALERT';
    channel?: 'EMAIL' | 'IN_APP';
  }) {
    try {
      const organization = await prisma.organization.findUnique({
        where: { id: data.organizationId },
        select: { email: true, name: true }
      });

      if (!organization) {
        throw new Error('Organization not found');
      }

      // For single notifications, we create a broadcast to specific org
      return await this.sendBroadcast({
        recipientType: 'SPECIFIC',
        recipientIds: [data.organizationId],
        subject: data.subject,
        message: data.message,
        type: data.type || 'NOTIFICATION',
        channel: data.channel || 'EMAIL'
      });
    } catch (error) {
      logger.error('Error sending notification:', error);
      throw new Error('Failed to send notification');
    }
  }

  /**
   * SUBTASK-038D-004-4: Get broadcast communication history
   */
  async getCommunicationHistory(filters: {
    type?: string;
    status?: string;
    recipientType?: string;
    dateFrom?: Date;
    dateTo?: Date;
    page?: number;
    limit?: number;
  } = {}) {
    try {
      const {
        type,
        status,
        recipientType,
        dateFrom,
        dateTo,
        page = 1,
        limit = 20
      } = filters;

      const where: any = {};

      if (type) {
        where.type = type;
      }

      if (status) {
        where.status = status;
      }

      if (recipientType) {
        where.recipientType = recipientType;
      }

      if (dateFrom || dateTo) {
        where.createdAt = {};
        if (dateFrom) where.createdAt.gte = dateFrom;
        if (dateTo) where.createdAt.lte = dateTo;
      }

      const skip = (page - 1) * limit;

      const [logs, total] = await Promise.all([
        prisma.communicationLog.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' }
        }),
        prisma.communicationLog.count({ where })
      ]);

      logger.info(`Retrieved ${logs.length} broadcast communication logs`);

      return {
        logs,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('Error getting communication history:', error);
      throw new Error('Failed to get communication history');
    }
  }


  /**
   * SUBTASK-038D-004-4: Get broadcast communication statistics
   */
  async getCommunicationStats(days: number = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const where: any = {
        createdAt: { gte: startDate }
      };

      const [
        totalBroadcasts,
        byType,
        byStatus,
        byChannel,
        totalRecipients,
        totalDelivered
      ] = await Promise.all([
        prisma.communicationLog.count({ where }),
        prisma.communicationLog.groupBy({
          by: ['type'],
          where,
          _count: true
        }),
        prisma.communicationLog.groupBy({
          by: ['status'],
          where,
          _count: true
        }),
        prisma.communicationLog.groupBy({
          by: ['channel'],
          where,
          _count: true
        }),
        prisma.communicationLog.aggregate({
          where,
          _sum: { recipientCount: true }
        }),
        prisma.communicationLog.aggregate({
          where,
          _sum: { deliveredCount: true }
        })
      ]);

      const stats = {
        totalBroadcasts,
        totalRecipients: totalRecipients._sum.recipientCount || 0,
        totalDelivered: totalDelivered._sum.deliveredCount || 0,
        deliveryRate: (totalRecipients._sum.recipientCount || 0) > 0
          ? Math.round(((totalDelivered._sum.deliveredCount || 0) / (totalRecipients._sum.recipientCount || 0)) * 100)
          : 0,
        byType: byType.reduce((acc: any, item) => {
          acc[item.type] = item._count;
          return acc;
        }, {}),
        byStatus: byStatus.reduce((acc: any, item) => {
          acc[item.status] = item._count;
          return acc;
        }, {}),
        byChannel: byChannel.reduce((acc: any, item) => {
          acc[item.channel] = item._count;
          return acc;
        }, {}),
        period: `Last ${days} days`
      };

      logger.info('Generated broadcast communication statistics');

      return stats;
    } catch (error) {
      logger.error('Error getting communication stats:', error);
      throw new Error('Failed to get communication stats');
    }
  }
}

export const communicationService = new CommunicationService();
