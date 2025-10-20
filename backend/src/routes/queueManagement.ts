/**
 * Queue Management API Routes - TASK-040
 * 
 * API endpoints for monitoring and managing the message queue.
 * 
 * Endpoints:
 * - GET /api/queue/stats - Queue statistics
 * - GET /api/queue/job/:jobId - Job status check
 * - POST /api/queue/retry-failed - Retry failed jobs (admin)
 * - POST /api/queue/pause - Pause queue (admin)
 * - POST /api/queue/resume - Resume queue (admin)
 * 
 * @version 1.0
 * @date October 19, 2025
 */

import express, { Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import messageQueueService from '../services/messageQueueService';
import logger from '../utils/logger';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

/**
 * GET /api/queue/stats
 * Get queue statistics
 */
router.get('/stats', async (_req: Request, res: Response): Promise<void> => {
  try {
    const stats = await messageQueueService.getStats();

    res.json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    logger.error('[QueueAPI] Failed to get stats', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to get queue statistics',
    });
  }
});

/**
 * GET /api/queue/job/:jobId
 * Get job status by ID
 */
router.get('/job/:jobId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { jobId } = req.params;
    if (!jobId) {
      res.status(400).json({
        success: false,
        error: 'Job ID is required',
      });
      return;
    }
    const jobStatus = await messageQueueService.getJobStatus(jobId);

    if (!jobStatus.found) {
      res.status(404).json({
        success: false,
        error: 'Job not found',
      });
      return;
    }

    res.json({
      success: true,
      data: jobStatus,
    });
  } catch (error: any) {
    logger.error('[QueueAPI] Failed to get job status', {
      jobId: req.params.jobId,
      error: error.message,
    });
    res.status(500).json({
      success: false,
      error: 'Failed to get job status',
    });
  }
});

/**
 * POST /api/queue/retry-failed
 * Retry all failed jobs (admin only)
 */
router.post('/retry-failed', requireRole(['ADMIN', 'SUPER_ADMIN']), async (_req: Request, res: Response): Promise<void> => {
  try {
    const retriedCount = await messageQueueService.retryFailedJobs();

    res.json({
      success: true,
      data: {
        retriedCount,
        message: `Retried ${retriedCount} failed jobs`,
      },
    });
  } catch (error: any) {
    logger.error('[QueueAPI] Failed to retry jobs', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to retry failed jobs',
    });
  }
});

/**
 * POST /api/queue/pause
 * Pause the queue (admin only)
 */
router.post('/pause', requireRole(['ADMIN', 'SUPER_ADMIN']), async (_req: Request, res: Response): Promise<void> => {
  try {
    await messageQueueService.pause();

    res.json({
      success: true,
      message: 'Queue paused successfully',
    });
  } catch (error: any) {
    logger.error('[QueueAPI] Failed to pause queue', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to pause queue',
    });
  }
});

/**
 * POST /api/queue/resume
 * Resume the queue (admin only)
 */
router.post('/resume', requireRole(['ADMIN', 'SUPER_ADMIN']), async (_req: Request, res: Response): Promise<void> => {
  try {
    await messageQueueService.resume();

    res.json({
      success: true,
      message: 'Queue resumed successfully',
    });
  } catch (error: any) {
    logger.error('[QueueAPI] Failed to resume queue', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to resume queue',
    });
  }
});

export default router;
