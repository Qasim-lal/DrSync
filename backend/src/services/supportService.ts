/**
 * Support Service - TASK-038D
 * 
 * Comprehensive support ticket management system
 * Handles CRUD operations, status management, assignment, and ticket lifecycle
 */

import { getPrismaClient } from './prisma';
import { logger } from '../utils/logger';

const prisma = getPrismaClient();

export class SupportService {
  /**
   * SUBTASK-038D-001-2: List tickets with filtering and pagination
   */
  async listTickets(filters: {
    status?: string[];
    priority?: string[];
    category?: string[];
    organizationId?: string;
    assignedTo?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    try {
      const {
        status,
        priority,
        category,
        organizationId,
        assignedTo,
        page = 1,
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = filters;

      const where: any = {};

      if (status && status.length > 0) {
        where.status = { in: status };
      }

      if (priority && priority.length > 0) {
        where.priority = { in: priority };
      }

      if (category && category.length > 0) {
        where.category = { in: category };
      }

      if (organizationId) {
        where.organizationId = organizationId;
      }

      if (assignedTo) {
        where.assignedTo = assignedTo;
      }

      const skip = (page - 1) * limit;

      const [tickets, total] = await Promise.all([
        prisma.supportTicket.findMany({
          where,
          skip,
          take: limit,
          orderBy: { [sortBy]: sortOrder },
          include: {
            organization: {
              select: {
                id: true,
                name: true,
                email: true
              }
            },
            responses: {
              orderBy: { createdAt: 'desc' },
              take: 1 // Only latest response for listing
            }
          }
        }),
        prisma.supportTicket.count({ where })
      ]);

      const totalPages = Math.ceil(total / limit);

      logger.info(`Listed ${tickets.length} support tickets (page ${page}/${totalPages})`);

      return {
        tickets,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasMore: page < totalPages
        }
      };
    } catch (error) {
      logger.error('Error listing support tickets:', error);
      throw new Error('Failed to list support tickets');
    }
  }

  /**
   * SUBTASK-038D-001-3: Get ticket details
   */
  async getTicketById(ticketId: string) {
    try {
      const ticket = await prisma.supportTicket.findUnique({
        where: { id: ticketId },
        include: {
          organization: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              subscriptionPlan: true,
              subscriptionStatus: true
            }
          },
          responses: {
            orderBy: { createdAt: 'asc' },
            select: {
              id: true,
              message: true,
              isInternal: true,
              attachments: true,
              statusChange: true,
              createdAt: true,
              responderId: true
            }
          }
        }
      });

      if (!ticket) {
        throw new Error('Ticket not found');
      }

      logger.info(`Retrieved ticket details: ${ticket.ticketNumber}`);

      return ticket;
    } catch (error) {
      logger.error(`Error getting ticket ${ticketId}:`, error);
      throw error;
    }
  }

  /**
   * SUBTASK-038D-001-4: Create support ticket
   */
  async createTicket(data: {
    organizationId: string;
    subject: string;
    description: string;
    category: string;
    priority?: string;
    createdBy: string;
    tags?: string[];
    attachments?: any;
  }) {
    try {
      // Generate ticket number
      const ticketCount = await prisma.supportTicket.count();
      const ticketNumber = `TICKET-${new Date().getFullYear()}-${String(ticketCount + 1).padStart(4, '0')}`;

      const ticket = await prisma.supportTicket.create({
        data: {
          ticketNumber,
          subject: data.subject,
          description: data.description,
          category: data.category as any,
          priority: (data.priority || 'MEDIUM') as any,
          createdBy: data.createdBy,
          tags: data.tags || [],
          attachments: data.attachments || null,
          organization: {
            connect: { id: data.organizationId }
          }
        },
        include: {
          organization: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });

      logger.info(`Created support ticket: ${ticket.ticketNumber} for organization ${data.organizationId}`);

      return ticket;
    } catch (error) {
      logger.error('Error creating support ticket:', error);
      throw new Error('Failed to create support ticket');
    }
  }

  /**
   * SUBTASK-038D-001-5: Update ticket status
   */
  async updateTicketStatus(ticketId: string, status: string, notes?: string, userId?: string) {
    try {
      const ticket = await prisma.supportTicket.update({
        where: { id: ticketId },
        data: {
          status: status as any,
          ...(status === 'RESOLVED' && { resolvedAt: new Date() }),
          ...(status === 'CLOSED' && { closedAt: new Date() }),
          ...(notes && { resolutionNotes: notes })
        }
      });

      // Create a response to track the status change
      if (userId) {
        await prisma.ticketResponse.create({
          data: {
            ticketId,
            message: notes || `Status changed to ${status}`,
            responderId: userId,
            statusChange: status as any,
            isInternal: true
          }
        });
      }

      logger.info(`Updated ticket ${ticketId} status to ${status}`);

      return ticket;
    } catch (error) {
      logger.error(`Error updating ticket status for ${ticketId}:`, error);
      throw new Error('Failed to update ticket status');
    }
  }

  /**
   * SUBTASK-038D-001-6: Assign ticket
   */
  async assignTicket(ticketId: string, assignedTo: string) {
    try {
      const ticket = await prisma.supportTicket.update({
        where: { id: ticketId },
        data: {
          assignedTo,
          assignedAt: new Date()
        }
      });

      logger.info(`Assigned ticket ${ticketId} to user ${assignedTo}`);

      return ticket;
    } catch (error) {
      logger.error(`Error assigning ticket ${ticketId}:`, error);
      throw new Error('Failed to assign ticket');
    }
  }

  /**
   * SUBTASK-038D-001-7: Add response to ticket
   */
  async addTicketResponse(data: {
    ticketId: string;
    message: string;
    responderId: string;
    isInternal?: boolean;
    attachments?: any;
  }) {
    try {
      const response = await prisma.ticketResponse.create({
        data: {
          ticketId: data.ticketId,
          message: data.message,
          responderId: data.responderId,
          isInternal: data.isInternal || false,
          attachments: data.attachments || null
        }
      });

      logger.info(`Added response to ticket ${data.ticketId}`);

      return response;
    } catch (error) {
      logger.error(`Error adding response to ticket ${data.ticketId}:`, error);
      throw new Error('Failed to add ticket response');
    }
  }

  /**
   * SUBTASK-038D-005-1: Get support metrics
   */
  async getSupportMetrics() {
    try {
      const [
        totalTickets,
        openTickets,
        inProgressTickets,
        resolvedTickets,
        avgResolutionTime,
        ticketsByPriority,
        ticketsByCategory
      ] = await Promise.all([
        prisma.supportTicket.count(),
        prisma.supportTicket.count({ where: { status: 'OPEN' } }),
        prisma.supportTicket.count({ where: { status: 'IN_PROGRESS' } }),
        prisma.supportTicket.count({ where: { status: 'RESOLVED' } }),
        this.calculateAverageResolutionTime(),
        prisma.supportTicket.groupBy({
          by: ['priority'],
          _count: true
        }),
        prisma.supportTicket.groupBy({
          by: ['category'],
          _count: true
        })
      ]);

      const metrics = {
        totalTickets,
        openTickets,
        inProgressTickets,
        resolvedTickets,
        closedTickets: totalTickets - openTickets - inProgressTickets - resolvedTickets,
        avgResolutionTimeHours: avgResolutionTime,
        ticketsByPriority: ticketsByPriority.reduce((acc: any, item) => {
          acc[item.priority] = item._count;
          return acc;
        }, {}),
        ticketsByCategory: ticketsByCategory.reduce((acc: any, item) => {
          acc[item.category] = item._count;
          return acc;
        }, {})
      };

      logger.info('Generated support metrics');

      return metrics;
    } catch (error) {
      logger.error('Error getting support metrics:', error);
      throw new Error('Failed to get support metrics');
    }
  }

  /**
   * Helper: Calculate average resolution time
   */
  private async calculateAverageResolutionTime(): Promise<number> {
    try {
      const resolvedTickets = await prisma.supportTicket.findMany({
        where: {
          status: { in: ['RESOLVED', 'CLOSED'] },
          resolvedAt: { not: null }
        },
        select: {
          createdAt: true,
          resolvedAt: true
        }
      });

      if (resolvedTickets.length === 0) {
        return 0;
      }

      const totalHours = resolvedTickets.reduce((sum, ticket) => {
        const diffMs = ticket.resolvedAt!.getTime() - ticket.createdAt.getTime();
        const diffHours = diffMs / (1000 * 60 * 60);
        return sum + diffHours;
      }, 0);

      return Math.round(totalHours / resolvedTickets.length);
    } catch (error) {
      logger.error('Error calculating average resolution time:', error);
      return 0;
    }
  }

  /**
   * SUBTASK-038D-005-2: Get ticket volume trends
   */
  async getTicketVolumeTrends(days: number = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const tickets = await prisma.supportTicket.findMany({
        where: {
          createdAt: { gte: startDate }
        },
        select: {
          createdAt: true,
          status: true
        }
      });

      // Group by date
      const trendMap: Record<string, number> = {};
      tickets.forEach(ticket => {
        const dateKey = ticket.createdAt.toISOString().split('T')[0];
        if (dateKey) {
          trendMap[dateKey] = (trendMap[dateKey] || 0) + 1;
        }
      });

      const trends = Object.entries(trendMap).map(([date, count]) => ({
        date,
        count
      })).sort((a, b) => a.date.localeCompare(b.date));

      logger.info(`Generated ${days}-day ticket volume trends`);

      return {
        period: `Last ${days} days`,
        trends,
        totalTickets: tickets.length,
        averagePerDay: Math.round(tickets.length / days)
      };
    } catch (error) {
      logger.error('Error getting ticket volume trends:', error);
      throw new Error('Failed to get ticket volume trends');
    }
  }

  /**
   * Get agent performance metrics
   */
  async getAgentPerformance(agentId?: string) {
    try {
      const where: any = {};
      if (agentId) {
        where.assignedTo = agentId;
      }

      const assignedTickets = await prisma.supportTicket.findMany({
        where: {
          ...where,
          assignedTo: { not: null }
        },
        select: {
          assignedTo: true,
          status: true,
          createdAt: true,
          resolvedAt: true
        }
      });

      // Group by agent
      const agentStats: Record<string, any> = {};
      
      assignedTickets.forEach(ticket => {
        const agentId = ticket.assignedTo!;
        if (!agentStats[agentId]) {
          agentStats[agentId] = {
            totalAssigned: 0,
            resolved: 0,
            inProgress: 0,
            avgResolutionHours: 0,
            resolutionTimes: []
          };
        }

        agentStats[agentId].totalAssigned++;
        
        if (ticket.status === 'RESOLVED' || ticket.status === 'CLOSED') {
          agentStats[agentId].resolved++;
          if (ticket.resolvedAt) {
            const hours = (ticket.resolvedAt.getTime() - ticket.createdAt.getTime()) / (1000 * 60 * 60);
            agentStats[agentId].resolutionTimes.push(hours);
          }
        } else if (ticket.status === 'IN_PROGRESS') {
          agentStats[agentId].inProgress++;
        }
      });

      // Calculate averages
      Object.keys(agentStats).forEach(agentId => {
        const times = agentStats[agentId].resolutionTimes;
        if (times.length > 0) {
          agentStats[agentId].avgResolutionHours = Math.round(
            times.reduce((a: number, b: number) => a + b, 0) / times.length
          );
        }
        delete agentStats[agentId].resolutionTimes;
      });

      logger.info('Generated agent performance metrics');

      return agentStats;
    } catch (error) {
      logger.error('Error getting agent performance:', error);
      throw new Error('Failed to get agent performance');
    }
  }
}

export const supportService = new SupportService();
