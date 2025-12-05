/**
 * Reminder API Routes
 * 
 * Endpoints for managing reminders:
 * - POST /api/reminders/send-manual - Send manual reminders
 * - GET /api/reminders/statistics - Get reminder statistics
 * - POST /api/reminders/test - Test reminder sending
 * - GET /api/reminders/history/:appointmentId - Get reminder history
 * 
 * @version 1.0
 * @author DrSync Development Team
 * @date December 4, 2025
 */

import express, { Request, Response } from 'express';
import { logger } from '../utils/logger';
import getPrismaClient from '../services/prisma';
import { ReminderType, ReminderStatus, ReminderTrigger } from '@prisma/client';
import reminderQueueService from '../services/reminderQueueService';
import reminderProcessorService from '../services/reminderProcessorService';
import reminderSchedulerService from '../services/reminderSchedulerService';
import followUpService from '../services/followUpService';
import { authenticate } from '../middleware/auth';

const router = express.Router();

/**
 * POST /api/reminders/send-manual
 * Send manual reminders for one or more appointments
 * 
 * Body:
 * {
 *   organizationId: string,
 *   appointmentIds: string[],  // Max 100 appointments
 *   reminderType: ReminderType,
 *   customMessage?: string,    // Optional custom message
 *   language?: 'en' | 'ur'     // Optional language override
 * }
 */
router.post('/send-manual', authenticate, async (req: Request, res: Response) => {
  try {
    const { organizationId, appointmentIds, reminderType, customMessage, language } = req.body;

    // Validation
    if (!organizationId) {
      return res.status(400).json({
        success: false,
        error: 'organizationId is required'
      });
    }

    if (!appointmentIds || !Array.isArray(appointmentIds) || appointmentIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'appointmentIds must be a non-empty array'
      });
    }

    if (appointmentIds.length > 100) {
      return res.status(400).json({
        success: false,
        error: 'Cannot send more than 100 reminders at once'
      });
    }

    if (!reminderType || !Object.values(ReminderType).includes(reminderType)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid reminderType'
      });
    }

    logger.info(`Manual reminder request for ${appointmentIds.length} appointments`);

    const prisma = getPrismaClient();

    // Fetch appointments
    const appointments = await prisma.appointment.findMany({
      where: {
        id: { in: appointmentIds },
        organizationId,
        status: { not: 'cancelled' }
      },
      include: {
        patient: {
          select: {
            phone: true,
            language: true
          }
        }
      }
    });

    if (appointments.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No valid appointments found'
      });
    }

    // Estimate cost (PKR 0.50 per message)
    const costPerMessage = 0.50;
    const estimatedCost = appointments.length * costPerMessage;

    const results = [];
    let successCount = 0;
    let failCount = 0;

    // Create and queue reminders
    for (const appointment of appointments) {
      try {
        // Create reminder record
        const reminder = await prisma.appointmentReminder.create({
          data: {
            appointmentId: appointment.id,
            organizationId,
            reminderType,
            status: ReminderStatus.PENDING,
            scheduledFor: new Date(),
            trigger: ReminderTrigger.MANUAL,
            sentBy: req.user?.userId || null
          }
        });

        // Add to queue (immediate processing)
        await reminderQueueService.addReminderToQueue(
          {
            organizationId,
            appointmentId: appointment.id,
            reminderType,
            trigger: 'MANUAL',
            customMessage,
            language: language || appointment.patient.language || 'en'
          },
          {
            jobId: reminder.id,
            priority: 1 // High priority for manual reminders
          }
        );

        results.push({
          appointmentId: appointment.id,
          reminderId: reminder.id,
          status: 'queued',
          phone: appointment.patient.phone
        });
        successCount++;

      } catch (error: any) {
        logger.error(`Failed to queue reminder for appointment ${appointment.id}:`, error);
        results.push({
          appointmentId: appointment.id,
          status: 'failed',
          error: error.message
        });
        failCount++;
      }
    }

    res.json({
      success: true,
      message: `Queued ${successCount} reminders for processing`,
      data: {
        requested: appointmentIds.length,
        queued: successCount,
        failed: failCount,
        estimatedCost,
        results
      }
    });

  } catch (error: any) {
    logger.error('Error sending manual reminders:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/reminders/statistics
 * Get reminder statistics
 * Query params: organizationId (optional)
 */
router.get('/statistics', authenticate, async (req: Request, res: Response) => {
  try {
    const { organizationId } = req.query;

    const prisma = getPrismaClient();

    // Build where clause
    const where: any = {};
    if (organizationId) {
      where.organizationId = organizationId as string;
    }

    // Get counts by status
    const [total, pending, sent, failed, skipped] = await Promise.all([
      prisma.appointmentReminder.count({ where }),
      prisma.appointmentReminder.count({ where: { ...where, status: ReminderStatus.PENDING } }),
      prisma.appointmentReminder.count({ where: { ...where, status: ReminderStatus.SENT } }),
      prisma.appointmentReminder.count({ where: { ...where, status: ReminderStatus.FAILED } }),
      prisma.appointmentReminder.count({ where: { ...where, status: ReminderStatus.SKIPPED } })
    ]);

    // Get counts by type
    const byType = await prisma.appointmentReminder.groupBy({
      by: ['reminderType'],
      where,
      _count: true
    });

    // Get counts by trigger
    const byTrigger = await prisma.appointmentReminder.groupBy({
      by: ['trigger'],
      where,
      _count: true
    });

    // Get recent reminders
    const recentReminders = await prisma.appointmentReminder.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        appointment: {
          select: {
            appointmentDate: true,
            patient: {
              select: {
                firstName: true,
                lastName: true
              }
            }
          }
        }
      }
    });

    // Get queue statistics
    const queueStats = await reminderQueueService.getQueueStats();

    // Calculate success rate
    const successRate = total > 0 ? ((sent / total) * 100).toFixed(2) : '0';

    res.json({
      success: true,
      data: {
        summary: {
          total,
          pending,
          sent,
          failed,
          skipped,
          successRate: `${successRate}%`
        },
        byType: byType.reduce((acc, item) => {
          acc[item.reminderType] = item._count;
          return acc;
        }, {} as Record<string, number>),
        byTrigger: byTrigger.reduce((acc, item) => {
          acc[item.trigger] = item._count;
          return acc;
        }, {} as Record<string, number>),
        queues: queueStats,
        recentReminders: recentReminders.map(r => ({
          id: r.id,
          type: r.reminderType,
          status: r.status,
          scheduledFor: r.scheduledFor,
          sentAt: r.sentAt,
          trigger: r.trigger,
          patient: `${r.appointment.patient.firstName} ${r.appointment.patient.lastName}`,
          appointmentDate: r.appointment.appointmentDate
        }))
      }
    });

  } catch (error: any) {
    logger.error('Error fetching reminder statistics:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/reminders/history/:appointmentId
 * Get reminder history for an appointment
 */
router.get('/history/:appointmentId', authenticate, async (req: Request, res: Response) => {
  try {
    const { appointmentId } = req.params;

    const prisma = getPrismaClient();

    const reminders = await prisma.appointmentReminder.findMany({
      where: { appointmentId },
      orderBy: { createdAt: 'desc' },
      include: {
        appointment: {
          select: {
            appointmentDate: true,
            appointmentTime: true,
            status: true
          }
        }
      }
    });

    res.json({
      success: true,
      data: {
        appointmentId,
        totalReminders: reminders.length,
        reminders: reminders.map(r => ({
          id: r.id,
          type: r.reminderType,
          status: r.status,
          trigger: r.trigger,
          scheduledFor: r.scheduledFor,
          sentAt: r.sentAt,
          messageId: r.messageId,
          attempts: r.attempts,
          errorMessage: r.errorMessage,
          skipReason: r.skipReason,
          createdAt: r.createdAt
        }))
      }
    });

  } catch (error: any) {
    logger.error('Error fetching reminder history:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/reminders/test
 * Send a test reminder to verify configuration
 * 
 * Body:
 * {
 *   organizationId: string,
 *   phoneNumber: string,
 *   reminderType: ReminderType,
 *   language?: 'en' | 'ur'
 * }
 */
router.post('/test', authenticate, async (req: Request, res: Response) => {
  try {
    const { organizationId, phoneNumber, reminderType, language } = req.body;

    if (!organizationId || !phoneNumber || !reminderType) {
      return res.status(400).json({
        success: false,
        error: 'organizationId, phoneNumber, and reminderType are required'
      });
    }

    logger.info(`Test reminder request for ${phoneNumber}`);

    // Import dependencies here to avoid circular imports
    const reminderTemplateService = (await import('../services/reminderTemplateService')).default;
    const whatsappService = (await import('../services/whatsappService')).default;

    // Generate test message
    const testVariables = {
      patientName: 'Test Patient',
      doctorName: 'Dr. Test',
      doctorTitle: 'Dr.',
      clinicName: 'Test Clinic',
      clinicAddress: '123 Test Street',
      clinicPhone: '+92-300-1234567',
      appointmentDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
      appointmentTime: '10:00 AM',
      appointmentDuration: 30
    };

    const message = reminderTemplateService.generateMessage(
      reminderType as ReminderType,
      language || 'en',
      testVariables
    );

    // Send via WhatsApp
    const result = await whatsappService.sendMessage(organizationId, {
      to: phoneNumber,
      type: 'text',
      text: { body: `[TEST] ${message}` }
    });

    if (result.success) {
      res.json({
        success: true,
        message: 'Test reminder sent successfully',
        data: {
          messageId: result.messageId,
          phoneNumber,
          reminderType,
          language: language || 'en'
        }
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error || 'Failed to send test reminder'
      });
    }

  } catch (error: any) {
    logger.error('Error sending test reminder:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/reminders/scheduler/status
 * Get scheduler status
 */
router.get('/scheduler/status', authenticate, async (req: Request, res: Response) => {
  try {
    const status = reminderSchedulerService.getStatus();
    res.json({
      success: true,
      data: status
    });
  } catch (error: any) {
    logger.error('Error fetching scheduler status:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/reminders/scheduler/run-now
 * Manually trigger scheduler (for testing)
 */
router.post('/scheduler/run-now', authenticate, async (req: Request, res: Response) => {
  try {
    // Run scheduler
    reminderSchedulerService.scheduleNow();

    res.json({
      success: true,
      message: 'Scheduler triggered successfully'
    });
  } catch (error: any) {
    logger.error('Error triggering scheduler:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/reminders/follow-up/manual
 * Manually schedule a follow-up for an appointment
 * 
 * Body:
 * {
 *   organizationId: string,
 *   appointmentId: string,
 *   followUpType: 'FOLLOWUP_SAME_DAY' | 'FOLLOWUP_NEXT_DAY' | 'NO_SHOW_FOLLOWUP',
 *   scheduledFor?: Date,  // Optional - defaults based on type
 *   customMessage?: string
 * }
 */
router.post('/follow-up/manual', authenticate, async (req: Request, res: Response) => {
  try {
    const { organizationId, appointmentId, followUpType, scheduledFor, customMessage } = req.body;

    if (!organizationId || !appointmentId || !followUpType) {
      return res.status(400).json({
        success: false,
        error: 'organizationId, appointmentId, and followUpType are required'
      });
    }

    const followUpId = await followUpService.scheduleFollowUp({
      organizationId,
      appointmentId,
      followUpType: followUpType as ReminderType,
      scheduledFor: scheduledFor ? new Date(scheduledFor) : undefined,
      trigger: ReminderTrigger.MANUAL,
      sentBy: req.user?.userId,
      customMessage
    });

    res.json({
      success: true,
      message: 'Follow-up scheduled successfully',
      data: {
        followUpId,
        followUpType,
        scheduledFor
      }
    });

  } catch (error: any) {
    logger.error('Error scheduling manual follow-up:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/reminders/follow-up/history/:appointmentId
 * Get follow-up history for an appointment
 */
router.get('/follow-up/history/:appointmentId', authenticate, async (req: Request, res: Response) => {
  try {
    const { appointmentId } = req.params;

    const history = await followUpService.getFollowUpHistory(appointmentId);

    res.json({
      success: true,
      data: {
        appointmentId,
        totalFollowUps: history.length,
        followUps: history
      }
    });

  } catch (error: any) {
    logger.error('Error fetching follow-up history:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/reminders/follow-up/statistics
 * Get follow-up statistics
 * Query params: organizationId (optional)
 */
router.get('/follow-up/statistics', authenticate, async (req: Request, res: Response) => {
  try {
    const { organizationId } = req.query;

    const stats = await followUpService.getFollowUpStats(organizationId as string);

    res.json({
      success: true,
      data: stats
    });

  } catch (error: any) {
    logger.error('Error fetching follow-up statistics:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /api/reminders/follow-up/:followUpId
 * Cancel a scheduled follow-up
 */
router.delete('/follow-up/:followUpId', authenticate, async (req: Request, res: Response) => {
  try {
    const { followUpId } = req.params;

    const cancelled = await followUpService.cancelFollowUp(followUpId);

    if (cancelled) {
      res.json({
        success: true,
        message: 'Follow-up cancelled successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to cancel follow-up'
      });
    }

  } catch (error: any) {
    logger.error('Error cancelling follow-up:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/reminders/follow-up/process-next-day
 * Manually trigger next-day follow-up processing
 */
router.post('/follow-up/process-next-day', authenticate, async (req: Request, res: Response) => {
  try {
    followUpService.processNextDayFollowUps();

    res.json({
      success: true,
      message: 'Next-day follow-up processing triggered'
    });

  } catch (error: any) {
    logger.error('Error triggering next-day follow-up processing:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
