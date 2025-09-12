import { Response } from 'express';
import { z } from 'zod';
import { PrismaClient } from '../generated/prisma';
import { AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';
import { AppointmentService } from '../services/appointmentService';

const prisma = new PrismaClient();
const appointmentService = new AppointmentService();

// Validation schemas
const createAppointmentSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200).optional(),
  description: z.string().max(1000).optional(),
  scheduledAt: z.string().refine((val) => !isNaN(Date.parse(val)), 'Invalid scheduled date format'),
  duration: z.number().int().min(15, 'Duration must be at least 15 minutes').max(480, 'Duration cannot exceed 8 hours').optional().default(30),
  patientId: z.string().cuid('Invalid patient ID'),
  providerId: z.string().cuid('Invalid provider ID'),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'EMERGENCY']).optional().default('NORMAL'),
  bookingSource: z.enum(['WHATSAPP', 'DASHBOARD', 'PHONE', 'WALK_IN', 'GOOGLE_SHEETS']).optional().default('DASHBOARD')
});

const updateAppointmentSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200).optional(),
  description: z.string().max(1000).optional(),
  scheduledAt: z.string().refine((val) => !isNaN(Date.parse(val)), 'Invalid scheduled date format').optional(),
  duration: z.number().int().min(15, 'Duration must be at least 15 minutes').max(480, 'Duration cannot exceed 8 hours').optional(),
  patientId: z.string().cuid('Invalid patient ID').optional(),
  providerId: z.string().cuid('Invalid provider ID').optional(),
  status: z.enum(['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW', 'RESCHEDULED']).optional(),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'EMERGENCY']).optional(),
  consultationNotes: z.string().max(2000).optional(),
  prescriptions: z.string().max(2000).optional(),
  nextAppointmentDate: z.string().refine((val) => !isNaN(Date.parse(val)), 'Invalid next appointment date format').optional()
});

const querySchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).optional().default('1'),
  limit: z.string().regex(/^\d+$/).transform(Number).optional().default('20'),
  search: z.string().optional(),
  status: z.enum(['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW', 'RESCHEDULED']).optional(),
  providerId: z.string().cuid().optional(),
  patientId: z.string().cuid().optional(),
  startDate: z.string().refine((val) => !isNaN(Date.parse(val)), 'Invalid start date format').optional(),
  endDate: z.string().refine((val) => !isNaN(Date.parse(val)), 'Invalid end date format').optional(),
  sortBy: z.enum(['scheduledAt', 'createdAt', 'status', 'priority']).optional().default('scheduledAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('asc')
});

export class AppointmentController {
  /**
   * GET /api/appointments - Get appointments list with pagination, search, and filtering
   * Roles: STAFF+, NURSE+, DOCTOR+, ORG_ADMIN+, SUPER_ADMIN
   */
  async getAppointments(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { page, limit, search, status, providerId, patientId, startDate, endDate, sortBy, sortOrder } = querySchema.parse(req.query);
      const skip = (page - 1) * limit;

      // Build where clause for filtering and organization scoping
      const where: any = {
        organizationId: req.user!.organizationId // Organization-scoped
      };

      // Status filtering
      if (status) {
        where.status = status;
      }

      // Provider filtering
      if (providerId) {
        where.providerId = providerId;
      }

      // Patient filtering
      if (patientId) {
        where.patientId = patientId;
      }

      // Date range filtering
      if (startDate || endDate) {
        where.scheduledAt = {};
        if (startDate) {
          where.scheduledAt.gte = new Date(startDate);
        }
        if (endDate) {
          where.scheduledAt.lte = new Date(endDate);
        }
      }

      // Search functionality
      if (search) {
        where.OR = [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          {
            patient: {
              OR: [
                { firstName: { contains: search, mode: 'insensitive' } },
                { lastName: { contains: search, mode: 'insensitive' } },
                { phone: { contains: search } }
              ]
            }
          },
          {
            provider: {
              OR: [
                { firstName: { contains: search, mode: 'insensitive' } },
                { lastName: { contains: search, mode: 'insensitive' } }
              ]
            }
          }
        ];
      }

      // Execute queries in parallel
      const [appointments, total] = await Promise.all([
        prisma.appointment.findMany({
          where,
          skip,
          take: limit,
          orderBy: { [sortBy]: sortOrder },
          include: {
            patient: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                phone: true,
                email: true
              }
            },
            provider: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                title: true,
                specialization: true
              }
            }
          }
        }),
        prisma.appointment.count({ where })
      ]);

      const totalPages = Math.ceil(total / limit);

      res.json({
        success: true,
        data: {
          appointments,
          pagination: {
            page,
            limit,
            total,
            totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1
          }
        }
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          message: 'Invalid query parameters',
          errors: error.errors
        });
        return;
      }

      logger.error('Error fetching appointments:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * GET /api/appointments/:id - Get single appointment
   * Roles: STAFF+, NURSE+, DOCTOR+, ORG_ADMIN+, SUPER_ADMIN
   */
  async getAppointment(req: AuthRequest, res: Response): Promise<void> {
    try {
      const appointmentId = req.params.id;

      if (!appointmentId) {
        res.status(400).json({
          success: false,
          message: 'Appointment ID is required'
        });
        return;
      }

      const appointment = await prisma.appointment.findFirst({
        where: {
          id: appointmentId,
          organizationId: req.user!.organizationId // Organization-scoped
        },
        include: {
          patient: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true,
              email: true,
              dateOfBirth: true,
              gender: true,
              // Medical info only for DOCTOR+ roles
              ...(req.user!.role === 'DOCTOR' || req.user!.role === 'ORG_ADMIN' || req.user!.role === 'SUPER_ADMIN' ? {
                medicalHistory: true,
                allergies: true,
                bloodGroup: true
              } : {})
            }
          },
          provider: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              title: true,
              specialization: true,
              consultationDuration: true,
              consultationFee: true
            }
          }
        }
      });

      if (!appointment) {
        res.status(404).json({
          success: false,
          message: 'Appointment not found'
        });
        return;
      }

      res.json({
        success: true,
        data: { appointment }
      });
    } catch (error) {
      logger.error('Error fetching appointment:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * POST /api/appointments - Create new appointment
   * Roles: STAFF+, NURSE+, DOCTOR+, ORG_ADMIN+, SUPER_ADMIN
   */
  async createAppointment(req: AuthRequest, res: Response): Promise<void> {
    try {
      const validatedData = createAppointmentSchema.parse(req.body);

      // Check if patient and provider belong to the same organization
      const [patient, provider] = await Promise.all([
        prisma.patient.findFirst({
          where: {
            id: validatedData.patientId,
            organizationId: req.user!.organizationId
          }
        }),
        prisma.provider.findFirst({
          where: {
            id: validatedData.providerId,
            organizationId: req.user!.organizationId,
            isActive: true
          }
        })
      ]);

      if (!patient) {
        res.status(400).json({
          success: false,
          message: 'Patient not found or does not belong to your organization'
        });
        return;
      }

      if (!provider) {
        res.status(400).json({
          success: false,
          message: 'Provider not found, inactive, or does not belong to your organization'
        });
        return;
      }

      const scheduledAt = new Date(validatedData.scheduledAt);
      const duration = validatedData.duration || provider.consultationDuration || 30;
      const endTime = new Date(scheduledAt.getTime() + duration * 60000);

      // Check for appointment conflicts
      const conflictCheck = await this.checkAppointmentConflict(
        validatedData.providerId,
        scheduledAt,
        endTime,
        req.user!.organizationId
      );

      if (conflictCheck.hasConflict) {
        res.status(409).json({
          success: false,
          message: 'Appointment conflict detected',
          details: conflictCheck.conflictingAppointments
        });
        return;
      }

      // Create the appointment
      const appointment = await prisma.appointment.create({
        data: {
          title: validatedData.title || null,
          description: validatedData.description || null,
          scheduledAt,
          duration,
          endTime,
          patientId: validatedData.patientId,
          providerId: validatedData.providerId,
          priority: validatedData.priority,
          bookingSource: validatedData.bookingSource,
          organizationId: req.user!.organizationId
        },
        include: {
          patient: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true,
              email: true
            }
          },
          provider: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              title: true,
              specialization: true
            }
          }
        }
      });

      logger.info(`Appointment created: ${appointment.id} for patient ${patient.firstName} ${patient.lastName} with ${provider.firstName} ${provider.lastName}`);

      res.status(201).json({
        success: true,
        message: 'Appointment created successfully',
        data: { appointment }
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          message: 'Invalid appointment data',
          errors: error.errors
        });
        return;
      }

      logger.error('Error creating appointment:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * PUT /api/appointments/:id - Update appointment
   * Roles: STAFF+, NURSE+, DOCTOR+, ORG_ADMIN+, SUPER_ADMIN
   */
  async updateAppointment(req: AuthRequest, res: Response): Promise<void> {
    try {
      const appointmentId = req.params.id;
      const validatedData = updateAppointmentSchema.parse(req.body);

      if (!appointmentId) {
        res.status(400).json({
          success: false,
          message: 'Appointment ID is required'
        });
        return;
      }

      // Check if appointment exists and belongs to organization
      const existingAppointment = await prisma.appointment.findFirst({
        where: {
          id: appointmentId,
          organizationId: req.user!.organizationId
        }
      });

      if (!existingAppointment) {
        res.status(404).json({
          success: false,
          message: 'Appointment not found'
        });
        return;
      }

      // If updating patient or provider, verify they belong to the organization
      if (validatedData.patientId || validatedData.providerId) {
        const checks = [];
        
        if (validatedData.patientId) {
          checks.push(
            prisma.patient.findFirst({
              where: {
                id: validatedData.patientId,
                organizationId: req.user!.organizationId
              }
            })
          );
        }

        if (validatedData.providerId) {
          checks.push(
            prisma.provider.findFirst({
              where: {
                id: validatedData.providerId,
                organizationId: req.user!.organizationId,
                isActive: true
              }
            })
          );
        }

        const results = await Promise.all(checks);
        
        if (validatedData.patientId && !results[0]) {
          res.status(400).json({
            success: false,
            message: 'Patient not found or does not belong to your organization'
          });
          return;
        }

        if (validatedData.providerId && !results[validatedData.patientId ? 1 : 0]) {
          res.status(400).json({
            success: false,
            message: 'Provider not found, inactive, or does not belong to your organization'
          });
          return;
        }
      }

      // Check for conflicts if rescheduling
      if (validatedData.scheduledAt || validatedData.duration) {
        const scheduledAt = validatedData.scheduledAt ? new Date(validatedData.scheduledAt) : existingAppointment.scheduledAt;
        const duration = validatedData.duration || existingAppointment.duration;
        const endTime = new Date(scheduledAt.getTime() + duration * 60000);
        const providerId = validatedData.providerId || existingAppointment.providerId;

        const conflictCheck = await this.checkAppointmentConflict(
          providerId,
          scheduledAt,
          endTime,
          req.user!.organizationId,
          appointmentId // Exclude current appointment from conflict check
        );

        if (conflictCheck.hasConflict) {
          res.status(409).json({
            success: false,
            message: 'Appointment conflict detected',
            details: conflictCheck.conflictingAppointments
          });
          return;
        }
      }

      // Prepare update data
      const updateData: any = {};
      
      if (validatedData.title !== undefined) updateData.title = validatedData.title || null;
      if (validatedData.description !== undefined) updateData.description = validatedData.description || null;
      if (validatedData.patientId) updateData.patientId = validatedData.patientId;
      if (validatedData.providerId) updateData.providerId = validatedData.providerId;
      if (validatedData.status) updateData.status = validatedData.status;
      if (validatedData.priority) updateData.priority = validatedData.priority;
      if (validatedData.consultationNotes !== undefined) updateData.consultationNotes = validatedData.consultationNotes;
      if (validatedData.prescriptions !== undefined) updateData.prescriptions = validatedData.prescriptions;
      if (validatedData.nextAppointmentDate) updateData.nextAppointmentDate = new Date(validatedData.nextAppointmentDate);

      if (validatedData.scheduledAt) {
        updateData.scheduledAt = new Date(validatedData.scheduledAt);
        const duration = validatedData.duration || existingAppointment.duration;
        updateData.endTime = new Date(updateData.scheduledAt.getTime() + duration * 60000);
      }

      if (validatedData.duration) {
        updateData.duration = validatedData.duration;
        const scheduledAt = updateData.scheduledAt || existingAppointment.scheduledAt;
        updateData.endTime = new Date(scheduledAt.getTime() + validatedData.duration * 60000);
      }

      // Update appointment
      const appointment = await prisma.appointment.update({
        where: { id: appointmentId },
        data: updateData,
        include: {
          patient: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true,
              email: true
            }
          },
          provider: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              title: true,
              specialization: true
            }
          }
        }
      });

      logger.info(`Appointment updated: ${appointment.id}`);

      res.json({
        success: true,
        message: 'Appointment updated successfully',
        data: { appointment }
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          message: 'Invalid appointment data',
          errors: error.errors
        });
        return;
      }

      logger.error('Error updating appointment:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * DELETE /api/appointments/:id - Cancel appointment
   * Roles: STAFF+, NURSE+, DOCTOR+, ORG_ADMIN+, SUPER_ADMIN
   */
  async deleteAppointment(req: AuthRequest, res: Response): Promise<void> {
    try {
      const appointmentId = req.params.id;

      if (!appointmentId) {
        res.status(400).json({
          success: false,
          message: 'Appointment ID is required'
        });
        return;
      }

      // Check if appointment exists and belongs to organization
      const existingAppointment = await prisma.appointment.findFirst({
        where: {
          id: appointmentId,
          organizationId: req.user!.organizationId
        }
      });

      if (!existingAppointment) {
        res.status(404).json({
          success: false,
          message: 'Appointment not found'
        });
        return;
      }

      // Soft delete by updating status to CANCELLED instead of hard delete
      const appointment = await prisma.appointment.update({
        where: { id: appointmentId },
        data: { 
          status: 'CANCELLED',
          updatedAt: new Date()
        }
      });

      logger.info(`Appointment cancelled: ${appointment.id}`);

      res.json({
        success: true,
        message: 'Appointment cancelled successfully',
        data: { appointment }
      });
    } catch (error) {
      logger.error('Error cancelling appointment:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * POST /api/appointments/:id/confirm - Confirm appointment
   * Roles: STAFF+, NURSE+, DOCTOR+, ORG_ADMIN+, SUPER_ADMIN
   */
  async confirmAppointment(req: AuthRequest, res: Response): Promise<void> {
    try {
      const appointmentId = req.params.id;

      if (!appointmentId) {
        res.status(400).json({
          success: false,
          message: 'Appointment ID is required'
        });
        return;
      }

      const appointment = await prisma.appointment.findFirst({
        where: {
          id: appointmentId,
          organizationId: req.user!.organizationId
        }
      });

      if (!appointment) {
        res.status(404).json({
          success: false,
          message: 'Appointment not found'
        });
        return;
      }

      if (appointment.status !== 'SCHEDULED') {
        res.status(400).json({
          success: false,
          message: 'Only scheduled appointments can be confirmed'
        });
        return;
      }

      const updatedAppointment = await prisma.appointment.update({
        where: { id: appointmentId },
        data: { status: 'CONFIRMED' }
      });

      logger.info(`Appointment confirmed: ${appointment.id}`);

      res.json({
        success: true,
        message: 'Appointment confirmed successfully',
        data: { appointment: updatedAppointment }
      });
    } catch (error) {
      logger.error('Error confirming appointment:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * GET /api/appointments/availability/:providerId - Get available time slots for a provider
   * Roles: STAFF+, NURSE+, DOCTOR+, ORG_ADMIN+, SUPER_ADMIN
   */
  async getAvailableSlots(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { providerId } = req.params;
      const { date, duration } = req.query;

      if (!providerId) {
        res.status(400).json({
          success: false,
          message: 'Provider ID is required'
        });
        return;
      }

      if (!date) {
        res.status(400).json({
          success: false,
          message: 'Date is required'
        });
        return;
      }

      const requestDate = new Date(date as string);
      const appointmentDuration = duration ? parseInt(duration as string, 10) : 30;

      if (isNaN(requestDate.getTime())) {
        res.status(400).json({
          success: false,
          message: 'Invalid date format'
        });
        return;
      }

      const slots = await appointmentService.getAvailableSlots({
        providerId,
        organizationId: req.user!.organizationId,
        date: requestDate,
        duration: appointmentDuration
      });

      res.json({
        success: true,
        data: {
          providerId,
          date: requestDate,
          duration: appointmentDuration,
          slots
        }
      });
    } catch (error) {
      logger.error('Error getting available slots:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * GET /api/appointments/next-available/:providerId - Find next available slot for a provider
   * Roles: STAFF+, NURSE+, DOCTOR+, ORG_ADMIN+, SUPER_ADMIN
   */
  async getNextAvailableSlot(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { providerId } = req.params;
      const { duration, searchDays } = req.query;

      if (!providerId) {
        res.status(400).json({
          success: false,
          message: 'Provider ID is required'
        });
        return;
      }

      const appointmentDuration = duration ? parseInt(duration as string, 10) : 30;
      const daysToSearch = searchDays ? parseInt(searchDays as string, 10) : 30;

      const slot = await appointmentService.findNextAvailableSlot(
        providerId,
        req.user!.organizationId,
        appointmentDuration,
        daysToSearch
      );

      if (!slot) {
        res.status(404).json({
          success: false,
          message: `No available slots found within ${daysToSearch} days`
        });
        return;
      }

      res.json({
        success: true,
        data: {
          providerId,
          nextAvailableSlot: slot
        }
      });
    } catch (error) {
      logger.error('Error finding next available slot:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * GET /api/appointments/schedule/:providerId - Get provider's schedule for date range
   * Roles: STAFF+, NURSE+, DOCTOR+, ORG_ADMIN+, SUPER_ADMIN
   */
  async getProviderSchedule(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { providerId } = req.params;
      const { startDate, endDate } = req.query;

      if (!providerId) {
        res.status(400).json({
          success: false,
          message: 'Provider ID is required'
        });
        return;
      }

      if (!startDate || !endDate) {
        res.status(400).json({
          success: false,
          message: 'Start date and end date are required'
        });
        return;
      }

      const start = new Date(startDate as string);
      const end = new Date(endDate as string);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        res.status(400).json({
          success: false,
          message: 'Invalid date format'
        });
        return;
      }

      const schedule = await appointmentService.getProviderSchedule(
        providerId,
        req.user!.organizationId,
        start,
        end
      );

      res.json({
        success: true,
        data: {
          providerId,
          startDate: start,
          endDate: end,
          appointments: schedule
        }
      });
    } catch (error) {
      logger.error('Error getting provider schedule:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * GET /api/appointments/stats/:providerId - Get appointment statistics for a provider
   * Roles: DOCTOR+, ORG_ADMIN+, SUPER_ADMIN
   */
  async getAppointmentStats(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { providerId } = req.params;
      const { startDate, endDate } = req.query;

      if (!providerId) {
        res.status(400).json({
          success: false,
          message: 'Provider ID is required'
        });
        return;
      }

      // Default to current month if dates not provided
      const now = new Date();
      const start = startDate ? new Date(startDate as string) : new Date(now.getFullYear(), now.getMonth(), 1);
      const end = endDate ? new Date(endDate as string) : new Date(now.getFullYear(), now.getMonth() + 1, 0);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        res.status(400).json({
          success: false,
          message: 'Invalid date format'
        });
        return;
      }

      const stats = await appointmentService.getAppointmentStats(
        providerId,
        req.user!.organizationId,
        start,
        end
      );

      res.json({
        success: true,
        data: {
          providerId,
          period: { startDate: start, endDate: end },
          ...stats
        }
      });
    } catch (error) {
      logger.error('Error getting appointment stats:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * GET /api/appointments/suggestions/:providerId - Get suggested appointment times
   * Roles: STAFF+, NURSE+, DOCTOR+, ORG_ADMIN+, SUPER_ADMIN
   */
  async getSuggestedTimes(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { providerId } = req.params;
      const { preferredDate, duration, maxSuggestions } = req.query;

      if (!providerId) {
        res.status(400).json({
          success: false,
          message: 'Provider ID is required'
        });
        return;
      }

      const preferred = preferredDate ? new Date(preferredDate as string) : undefined;
      const appointmentDuration = duration ? parseInt(duration as string, 10) : 30;
      const maxSuggest = maxSuggestions ? parseInt(maxSuggestions as string, 10) : 5;

      if (preferred && isNaN(preferred.getTime())) {
        res.status(400).json({
          success: false,
          message: 'Invalid preferred date format'
        });
        return;
      }

      const suggestions = await appointmentService.suggestAppointmentTimes(
        providerId,
        req.user!.organizationId,
        preferred,
        appointmentDuration,
        maxSuggest
      );

      res.json({
        success: true,
        data: {
          providerId,
          preferredDate: preferred,
          duration: appointmentDuration,
          maxSuggestions: maxSuggest,
          suggestions
        }
      });
    } catch (error) {
      logger.error('Error getting suggested times:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Helper method to check appointment conflicts
   */
  private async checkAppointmentConflict(
    providerId: string,
    startTime: Date,
    endTime: Date,
    organizationId: string,
    excludeAppointmentId?: string
  ): Promise<{ hasConflict: boolean; conflictingAppointments: any[] }> {
    const where: any = {
      providerId,
      organizationId,
      status: {
        in: ['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS']
      },
      OR: [
        {
          AND: [
            { scheduledAt: { lte: startTime } },
            { endTime: { gt: startTime } }
          ]
        },
        {
          AND: [
            { scheduledAt: { lt: endTime } },
            { endTime: { gte: endTime } }
          ]
        },
        {
          AND: [
            { scheduledAt: { gte: startTime } },
            { scheduledAt: { lt: endTime } }
          ]
        }
      ]
    };

    if (excludeAppointmentId) {
      where.id = { not: excludeAppointmentId };
    }

    const conflictingAppointments = await prisma.appointment.findMany({
      where,
      include: {
        patient: {
          select: {
            firstName: true,
            lastName: true,
            phone: true
          }
        }
      }
    });

    return {
      hasConflict: conflictingAppointments.length > 0,
      conflictingAppointments
    };
  }
}
