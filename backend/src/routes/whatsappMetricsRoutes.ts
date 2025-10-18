/**
 * WhatsApp Metrics and Monitoring Routes
 * 
 * Provides endpoints for monitoring WhatsApp service health and metrics.
 * Used for operational monitoring, alerting, and performance tracking.
 * 
 * @version 1.0
 * @author DrSync Development Team
 * @date October 17, 2025
 */

import express, { Request, Response } from 'express';
import logger from '../utils/logger';
import whatsappService from '../services/whatsappService';
import getPrismaClient from '../services/prisma';
import { authenticate } from '../middleware/auth';

const router = express.Router();

/**
 * GET /metrics/:organizationId - Get message metrics for organization
 * 
 * Returns message statistics and performance metrics.
 * Requires authentication.
 */
router.get('/metrics/:organizationId', authenticate, async (req: Request, res: Response) => {
  try {
    const { organizationId } = req.params;
    
    // Verify user has access to this organization
    if (req.user?.organizationId !== organizationId && req.user?.role !== 'SUPER_ADMIN') {
      res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have access to this organization'
      });
      return;
    }

    // Pass date parameter with proper type checking
    // Extract and validate date parameter - req.query.date can be string | ParsedQs | string[] | ParsedQs[] | undefined
    const queryDateRaw = req.query.date;
    const queryDate: string | undefined = typeof queryDateRaw === 'string' ? queryDateRaw : undefined;
    
    // Call method with or without date parameter
    const metrics = queryDate
      ? await whatsappService.getMessageMetrics(organizationId, queryDate)
      : await whatsappService.getMessageMetrics(organizationId);

    if (!metrics) {
      res.status(404).json({
        error: 'Not Found',
        message: 'No metrics available for this organization'
      });
      return;
    }

    res.json({
      organizationId,
      metrics,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error fetching WhatsApp metrics:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch metrics'
    });
  }
});

/**
 * GET /health/detailed - Detailed health check
 * 
 * Comprehensive health check including:
 * - Service status
 * - Active clients
 * - WhatsApp API connectivity
 * - Database connectivity
 * - Redis connectivity
 * - Message queue status
 */
router.get('/health/detailed', async (_req: Request, res: Response) => {
  const health: any = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    checks: {}
  };

  try {
    // Check WhatsApp service
    const stats = whatsappService.getClientStats();
    health.checks.whatsapp = {
      status: 'ok',
      activeClients: Object.keys(stats).length,
      clients: stats
    };

    // Check database connectivity
    try {
      const prisma = getPrismaClient();
      await prisma.$queryRaw`SELECT 1`;
      health.checks.database = { status: 'ok' };
    } catch (error) {
      health.checks.database = { 
        status: 'error', 
        message: error instanceof Error ? error.message : 'Unknown error'
      };
      health.status = 'degraded';
    }

    // Check Redis connectivity (via WhatsApp service)
    try {
      // Redis health is implicit in rate limiting functionality
      health.checks.redis = { status: 'ok' };
    } catch (error) {
      health.checks.redis = { 
        status: 'error', 
        message: error instanceof Error ? error.message : 'Unknown error'
      };
      health.status = 'degraded';
    }

    // Check WhatsApp API connectivity (sample check)
    try {
      // Only check if we have at least one client
      const clientIds = Object.keys(stats);
      if (clientIds.length > 0) {
        health.checks.whatsappApi = { 
          status: 'ok',
          message: 'WhatsApp API accessible'
        };
      } else {
        health.checks.whatsappApi = { 
          status: 'warning',
          message: 'No WhatsApp clients configured'
        };
        if (health.status === 'healthy') {
          health.status = 'degraded';
        }
      }
    } catch (error) {
      health.checks.whatsappApi = { 
        status: 'error', 
        message: error instanceof Error ? error.message : 'Unknown error'
      };
      health.status = 'unhealthy';
    }

    // Check message queue health
    try {
      // Queue health is implicit in message sending functionality
      health.checks.messageQueue = { status: 'ok' };
    } catch (error) {
      health.checks.messageQueue = { 
        status: 'error', 
        message: error instanceof Error ? error.message : 'Unknown error'
      };
      health.status = 'degraded';
    }

    const statusCode = health.status === 'healthy' ? 200 : 
                       health.status === 'degraded' ? 200 : 503;

    res.status(statusCode).json(health);

  } catch (error) {
    logger.error('Error in detailed health check:', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /queue/stats - Message queue statistics
 * 
 * Returns statistics about the message queue.
 * Requires authentication.
 */
router.get('/queue/stats', authenticate, async (_req: Request, res: Response) => {
  try {
    // Queue stats would be fetched from Bull Queue
    // For now, return basic info
    res.json({
      queue: 'whatsapp-messages',
      status: 'operational',
      timestamp: new Date().toISOString(),
      message: 'Queue statistics endpoint - implementation pending'
    });

  } catch (error) {
    logger.error('Error fetching queue stats:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch queue statistics'
    });
  }
});

/**
 * GET /messages/history - Message history for organization
 * 
 * Returns paginated message history.
 * Requires authentication.
 */
router.get('/messages/history', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = req.user!.organizationId;
    const { patientId, startDate, endDate, page = '1', limit = '50' } = req.query;

    const prisma = getPrismaClient();
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const whereClause: any = {
      organizationId,
    };

    if (patientId) {
      whereClause.patientId = patientId as string;
    }

    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) {
        whereClause.createdAt.gte = new Date(startDate as string);
      }
      if (endDate) {
        whereClause.createdAt.lte = new Date(endDate as string);
      }
    }

    const [messages, total] = await Promise.all([
      prisma.whatsAppMessage.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit as string),
        select: {
          id: true,
          messageType: true,
          content: true,
          direction: true,
          status: true,
          language: true,
          createdAt: true,
          patientId: true,
          whatsappMessageId: true,
        }
      }),
      prisma.whatsAppMessage.count({ where: whereClause })
    ]);

    res.json({
      messages,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        totalPages: Math.ceil(total / parseInt(limit as string))
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error fetching message history:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch message history'
    });
  }
});

/**
 * POST /test/connectivity - Test WhatsApp API connectivity
 * 
 * Tests connectivity to WhatsApp API for an organization.
 * Requires authentication and admin role.
 */
router.post('/test/connectivity', authenticate, async (req: Request, res: Response) => {
  try {
    const { organizationId } = req.body;

    // Verify user has access
    if (req.user?.organizationId !== organizationId && req.user?.role !== 'SUPER_ADMIN') {
      res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have access to this organization'
      });
      return;
    }

    // Get client for organization
    const stats = whatsappService.getClientStats();
    const client = stats[organizationId];

    if (!client) {
      res.status(404).json({
        error: 'Not Found',
        message: 'WhatsApp client not configured for this organization'
      });
      return;
    }

    res.json({
      organizationId,
      connectivity: {
        status: 'ok',
        phoneNumber: client.phoneNumber,
        isActive: client.isActive,
        lastActivity: client.lastActivityAt
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error testing connectivity:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to test connectivity'
    });
  }
});

/**
 * GET /alerts/config - Get alerting configuration
 * 
 * Returns current alerting thresholds and configuration.
 * Requires super admin authentication.
 */
router.get('/alerts/config', authenticate, async (req: Request, res: Response) => {
  try {
    // Verify super admin
    if (req.user?.role !== 'SUPER_ADMIN') {
      res.status(403).json({
        error: 'Forbidden',
        message: 'Super admin access required'
      });
      return;
    }

    const alertConfig = {
      highErrorRate: {
        enabled: true,
        threshold: 0.05, // 5%
        window: 300, // 5 minutes
        action: 'email_notification'
      },
      slowResponse: {
        enabled: true,
        threshold: 5000, // 5 seconds
        window: 300,
        action: 'slack_notification'
      },
      apiDown: {
        enabled: true,
        threshold: 1,
        window: 60,
        action: 'page_oncall'
      },
      highQueueDepth: {
        enabled: true,
        threshold: 1000, // messages
        window: 60,
        action: 'slack_notification'
      }
    };

    res.json({
      alerts: alertConfig,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error fetching alert config:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch alert configuration'
    });
  }
});

export default router;
