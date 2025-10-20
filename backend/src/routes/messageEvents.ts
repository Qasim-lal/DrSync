/**
 * Message Events API Routes - TASK-040 (Section 8)
 * 
 * Server-Sent Events (SSE) endpoints for real-time message updates.
 * 
 * Endpoints:
 * - GET /api/events/messages/:organizationId/stream - SSE stream
 * - GET /api/events/messages/:organizationId/history - Event history
 * - GET /api/events/stats - Event statistics
 * 
 * @version 1.0
 * @date October 19, 2025
 */

import express, { Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import messageEventsService from '../services/messageEventsService';
import logger from '../utils/logger';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

/**
 * GET /api/events/messages/all/stream
 * SSE stream for ALL organizations (Super Admin only)
 */
router.get('/messages/all/stream', (req: Request, res: Response): void => {
  const user = (req as any).user;

  // Only super admins can view all organizations
  if (user.role !== 'SUPER_ADMIN') {
    res.status(403).json({
      success: false,
      error: 'Super Admin access required',
    });
    return;
  }

  logger.info('[MessageEventsAPI] SSE connection opened (ALL ORGS)', {
    userId: user.id,
  });

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

  // Send initial connection event
  res.write(`data: ${JSON.stringify({ type: 'connected', scope: 'all' })}\n\n`);

  // Subscribe to ALL events (no organization filter)
  const listener = (event: any) => {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  };
  messageEventsService.on('message:*', listener);

  // Send heartbeat every 30 seconds
  const heartbeatInterval = setInterval(() => {
    res.write(`: heartbeat\n\n`);
  }, 30000);

  // Clean up on connection close
  req.on('close', () => {
    clearInterval(heartbeatInterval);
    messageEventsService.off('message:*', listener);
    logger.info('[MessageEventsAPI] SSE connection closed (ALL ORGS)', {
      userId: user.id,
    });
  });
});

/**
 * GET /api/events/messages/multi/stream?orgIds=id1,id2,id3
 * SSE stream for multiple selected organizations (Super Admin only)
 */
router.get('/messages/multi/stream', (req: Request, res: Response): void => {
  const user = (req as any).user;
  const orgIdsParam = req.query.orgIds as string;

  // Only super admins can view multiple organizations
  if (user.role !== 'SUPER_ADMIN') {
    res.status(403).json({
      success: false,
      error: 'Super Admin access required',
    });
    return;
  }

  if (!orgIdsParam) {
    res.status(400).json({
      success: false,
      error: 'orgIds query parameter required (comma-separated)',
    });
    return;
  }

  const selectedOrgIds = orgIdsParam.split(',').map(id => id.trim());

  logger.info('[MessageEventsAPI] SSE connection opened (MULTI-ORG)', {
    userId: user.id,
    organizationCount: selectedOrgIds.length,
    organizationIds: selectedOrgIds,
  });

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  // Send initial connection event
  res.write(`data: ${JSON.stringify({ 
    type: 'connected', 
    scope: 'multi', 
    organizationIds: selectedOrgIds 
  })}\n\n`);

  // Subscribe with filter for selected organizations
  const listener = (event: any) => {
    if (selectedOrgIds.includes(event.organizationId)) {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    }
  };
  messageEventsService.on('message:*', listener);

  // Send heartbeat every 30 seconds
  const heartbeatInterval = setInterval(() => {
    res.write(`: heartbeat\n\n`);
  }, 30000);

  // Clean up on connection close
  req.on('close', () => {
    clearInterval(heartbeatInterval);
    messageEventsService.off('message:*', listener);
    logger.info('[MessageEventsAPI] SSE connection closed (MULTI-ORG)', {
      userId: user.id,
      organizationCount: selectedOrgIds.length,
    });
  });
});

/**
 * GET /api/events/messages/:organizationId/stream
 * SSE stream for real-time message events (single organization)
 */
router.get('/messages/:organizationId/stream', (req: Request, res: Response): void => {
  const { organizationId } = req.params;
  const user = (req as any).user;

  // Verify user has access to this organization
  if (user.organizationId !== organizationId && user.role !== 'SUPER_ADMIN') {
    res.status(403).json({
      success: false,
      error: 'Access denied to this organization',
    });
    return;
  }

  logger.info('[MessageEventsAPI] SSE connection opened', {
    organizationId,
    userId: user.id,
  });

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

  // Send initial connection event
  res.write(`data: ${JSON.stringify({ type: 'connected', organizationId })}\n\n`);

  // Subscribe to events
  if (!organizationId) {
    res.status(400).json({ success: false, error: 'Organization ID required' });
    return;
  }

  const unsubscribe = messageEventsService.subscribeToOrganization(
    organizationId,
    (event) => {
      // Send event to client
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    }
  );

  // Send heartbeat every 30 seconds to keep connection alive
  const heartbeatInterval = setInterval(() => {
    res.write(`: heartbeat\n\n`);
  }, 30000);

  // Clean up on connection close
  req.on('close', () => {
    clearInterval(heartbeatInterval);
    unsubscribe();
    logger.info('[MessageEventsAPI] SSE connection closed', {
      organizationId,
      userId: user.id,
    });
  });
});

/**
 * GET /api/events/messages/:organizationId/history
 * Get event history for organization
 */
router.get('/messages/:organizationId/history', (req: Request, res: Response): void => {
  const { organizationId } = req.params;
  const user = (req as any).user;
  const limit = parseInt(req.query.limit as string) || 50;

  // Verify user has access to this organization
  if (user.organizationId !== organizationId && user.role !== 'SUPER_ADMIN') {
    res.status(403).json({
      success: false,
      error: 'Access denied to this organization',
    });
    return;
  }

  if (!organizationId) {
    res.status(400).json({ success: false, error: 'Organization ID required' });
    return;
  }

  try {
    const history = messageEventsService.getEventHistory(organizationId, limit);

    res.json({
      success: true,
      data: {
        organizationId,
        events: history,
        count: history.length,
      },
    });
  } catch (error: any) {
    logger.error('[MessageEventsAPI] Failed to get history', {
      organizationId,
      error: error.message,
    });

    res.status(500).json({
      success: false,
      error: 'Failed to retrieve event history',
    });
  }
});

/**
 * GET /api/events/stats
 * Get event service statistics
 */
router.get('/stats', (_req: Request, res: Response): void => {
  try {
    const stats = messageEventsService.getStats();

    res.json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    logger.error('[MessageEventsAPI] Failed to get stats', {
      error: error.message,
    });

    res.status(500).json({
      success: false,
      error: 'Failed to retrieve statistics',
    });
  }
});

/**
 * DELETE /api/events/messages/:organizationId/history
 * Clear event history for organization (admin only)
 */
router.delete('/messages/:organizationId/history', (req: Request, res: Response): void => {
  const { organizationId } = req.params;
  const user = (req as any).user;

  // Only admins can clear history
  if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
    res.status(403).json({
      success: false,
      error: 'Admin access required',
    });
    return;
  }

  // Verify user has access to this organization
  if (user.organizationId !== organizationId && user.role !== 'SUPER_ADMIN') {
    res.status(403).json({
      success: false,
      error: 'Access denied to this organization',
    });
    return;
  }

  if (!organizationId) {
    res.status(400).json({ success: false, error: 'Organization ID required' });
    return;
  }

  try {
    messageEventsService.clearHistory(organizationId);

    res.json({
      success: true,
      message: 'Event history cleared',
    });
  } catch (error: any) {
    logger.error('[MessageEventsAPI] Failed to clear history', {
      organizationId,
      error: error.message,
    });

    res.status(500).json({
      success: false,
      error: 'Failed to clear event history',
    });
  }
});

export default router;
