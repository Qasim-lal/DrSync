import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import googleSheetsService from './googleSheetsService';
// import sheetsSyncService from './sheetsSyncService';

const prisma = new PrismaClient();

export interface TimeSlot {
  start: Date;
  end: Date;
  isAvailable: boolean;
  conflictingAppointment?: any;
}

export interface AvailabilityRequest {
  providerId: string;
  organizationId: string;
  date: Date;
  duration?: number;
}

export interface SchedulingOptions {
  allowWeekends?: boolean;
  minAdvanceNotice?: number; // hours
  maxAdvanceBooking?: number; // days
  bufferTime?: number; // minutes between appointments
}

export class AppointmentService {
  private defaultSchedulingOptions: SchedulingOptions = {
    allowWeekends: true,
    minAdvanceNotice: 2, // 2 hours minimum advance notice
    maxAdvanceBooking: 90, // 90 days max advance booking
    bufferTime: 15 // 15 minutes buffer between appointments
  };

  /**
   * Get available time slots for a provider on a specific date
   */
  async getAvailableSlots(request: AvailabilityRequest, options?: SchedulingOptions): Promise<TimeSlot[]> {
    try {
      const opts = { ...this.defaultSchedulingOptions, ...options };
      const { providerId, organizationId, date, duration = 30 } = request;
      
      // Validate duration
      if (duration <= 0) {
        logger.debug(`Invalid duration: ${duration}. Must be greater than 0.`);
        return [];
      }
      
      // Check weekend restriction
      const dayOfWeek = date.getDay();
      if (!opts.allowWeekends && (dayOfWeek === 0 || dayOfWeek === 6)) {
        logger.debug('Weekend appointments not allowed');
        return [];
      }

      // Get provider with working hours
      const provider = await prisma.provider.findFirst({
        where: {
          id: providerId,
          organizationId,
          isActive: true
        }
      });

      if (!provider) {
        throw new Error('Provider not found or inactive');
      }

      // Get provider's working hours for the requested date
      const workingHours = this.parseWorkingHours(provider.workingHours as any, date);
      
      if (!workingHours.length) {
        return []; // No working hours for this day
      }

      // Get existing appointments for the date - READ FROM GOOGLE SHEETS FIRST
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      let existingAppointments: any[] = [];
      
      try {
        // Try to read from Google Sheets first (primary data source)
        existingAppointments = await this.getAppointmentsFromGoogleSheets(
          organizationId, 
          providerId, 
          startOfDay, 
          endOfDay
        );
        logger.debug(`Read ${existingAppointments.length} appointments from Google Sheets for provider ${providerId}`);
      } catch (error) {
        logger.warn('Failed to read appointments from Google Sheets, falling back to PostgreSQL:', error);
        
        // Fallback to PostgreSQL if Google Sheets fails
        existingAppointments = await prisma.appointment.findMany({
          where: {
            providerId,
            organizationId,
            scheduledAt: {
              gte: startOfDay,
              lte: endOfDay
            },
            status: {
              in: ['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS']
            }
          },
          orderBy: {
            scheduledAt: 'asc'
          }
        });
        logger.debug(`Fallback: Read ${existingAppointments.length} appointments from PostgreSQL for provider ${providerId}`);
      }

      // Generate time slots
      const slots: TimeSlot[] = [];

      for (const workingPeriod of workingHours) {
        let currentTime = new Date(workingPeriod.start);
        
        while (currentTime < workingPeriod.end) {
          const slotEnd = new Date(currentTime.getTime() + duration * 60000);
          
          // Check if slot fits within working hours
          if (slotEnd > workingPeriod.end) {
            break;
          }

          // Check for conflicts
          const conflict = this.checkSlotConflict(currentTime, slotEnd, existingAppointments, opts.bufferTime!);
          
          // Check advance notice and max booking restrictions
          const now = new Date();
          const isValidTiming = this.isValidTiming(currentTime, now, opts.minAdvanceNotice!, opts.maxAdvanceBooking!);

          slots.push({
            start: new Date(currentTime),
            end: new Date(slotEnd),
            isAvailable: !conflict.hasConflict && isValidTiming,
            conflictingAppointment: conflict.appointment
          });

          // Move to next slot
          currentTime = new Date(currentTime.getTime() + duration * 60000);
        }
      }

      return slots;
    } catch (error) {
      logger.error('Error getting available slots:', error);
      throw error;
    }
  }

  /**
   * Find next available appointment slot for a provider
   */
  async findNextAvailableSlot(
    providerId: string,
    organizationId: string,
    duration = 30,
    searchDays = 30
  ): Promise<TimeSlot | null> {
    try {
      const startDate = new Date();
      startDate.setHours(startDate.getHours() + 2); // Start searching 2 hours from now
      
      for (let i = 0; i < searchDays; i++) {
        const searchDate = new Date(startDate);
        searchDate.setDate(searchDate.getDate() + i);
        
        const slots = await this.getAvailableSlots({
          providerId,
          organizationId,
          date: searchDate,
          duration
        });

        const availableSlot = slots.find(slot => slot.isAvailable);
        if (availableSlot) {
          return availableSlot;
        }
      }

      return null; // No available slots found
    } catch (error) {
      logger.error('Error finding next available slot:', error);
      throw error;
    }
  }

  /**
   * Get provider's schedule for a date range
   */
  async getProviderSchedule(
    providerId: string,
    organizationId: string,
    startDate: Date,
    endDate: Date
  ): Promise<any[]> {
    try {
      let appointments: any[] = [];
      
      try {
        // Try to read from Google Sheets first (primary data source)
        appointments = await this.getAppointmentsFromGoogleSheets(
          organizationId,
          providerId,
          startDate,
          endDate,
          { excludeCancelled: true, includePatientDetails: true }
        );
        logger.debug(`Read provider schedule from Google Sheets: ${appointments.length} appointments`);
      } catch (error) {
        logger.warn('Failed to read provider schedule from Google Sheets, falling back to PostgreSQL:', error);
        
        // Fallback to PostgreSQL if Google Sheets fails
        appointments = await prisma.appointment.findMany({
          where: {
            providerId,
            organizationId,
            scheduledAt: {
              gte: startDate,
              lte: endDate
            },
            status: {
              not: 'CANCELLED'
            }
          },
          include: {
            patient: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                phone: true
              }
            }
          },
          orderBy: {
            scheduledAt: 'asc'
          }
        });
        logger.debug(`Fallback: Read provider schedule from PostgreSQL: ${appointments.length} appointments`);
      }

      return appointments;
    } catch (error) {
      logger.error('Error getting provider schedule:', error);
      throw error;
    }
  }

  /**
   * Check if a time slot has any conflicts
   */
  private checkSlotConflict(
    slotStart: Date,
    slotEnd: Date,
    appointments: any[],
    bufferTime: number
  ): { hasConflict: boolean; appointment?: any } {
    for (const appointment of appointments) {
      const appointmentStart = new Date(appointment.scheduledAt);
      const appointmentEnd = new Date(appointment.endTime);
      
      // Add buffer time to appointment
      const bufferedStart = new Date(appointmentStart.getTime() - bufferTime * 60000);
      const bufferedEnd = new Date(appointmentEnd.getTime() + bufferTime * 60000);

      // Check for overlap
      if (
        (slotStart >= bufferedStart && slotStart < bufferedEnd) ||
        (slotEnd > bufferedStart && slotEnd <= bufferedEnd) ||
        (slotStart <= bufferedStart && slotEnd >= bufferedEnd)
      ) {
        return { hasConflict: true, appointment };
      }
    }

    return { hasConflict: false };
  }

  /**
   * Parse provider working hours for a specific date
   */
  private parseWorkingHours(workingHours: any, date: Date): { start: Date; end: Date }[] {
    if (!workingHours || typeof workingHours !== 'object') {
      // Default working hours: 9 AM to 5 PM on weekdays
      const dayOfWeek = date.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) { // Sunday or Saturday
        return [];
      }
      
      return [{
        start: this.createTimeOnDate(date, 9, 0), // 9:00 AM
        end: this.createTimeOnDate(date, 17, 0)   // 5:00 PM
      }];
    }

    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = dayNames[date.getDay()];
    
    const daySchedule = dayName ? workingHours[dayName] : null;
    if (!daySchedule || !Array.isArray(daySchedule)) {
      return [];
    }

    const periods: { start: Date; end: Date }[] = [];
    
    // Handle array of time strings (e.g., ['09:00', '12:00', '14:00', '17:00'])
    // Only process as pairs if no time range strings are present
    const hasTimeRanges = daySchedule.some((time: string) => typeof time === 'string' && time.includes('-'));
    
    if (!hasTimeRanges && daySchedule.length % 2 === 0) {
      for (let i = 0; i < daySchedule.length; i += 2) {
        const startTime = daySchedule[i];
        const endTime = daySchedule[i + 1];
        
        const start = this.parseTimeString(startTime, date);
        const end = this.parseTimeString(endTime, date);
        
        // If any time parsing fails, return empty array for the whole day
        if (!start || !end || start >= end) {
          return [];
        }
        
        periods.push({ start, end });
      }
    }
    
    // Also handle single time range strings (e.g., ['09:00-17:00'])
    for (const timeRange of daySchedule) {
      if (typeof timeRange === 'string' && timeRange.includes('-')) {
        const [startTime, endTime] = timeRange.split('-');
        const start = startTime ? this.parseTimeString(startTime.trim(), date) : null;
        const end = endTime ? this.parseTimeString(endTime.trim(), date) : null;
        
        // If any time parsing fails, return empty array for the whole day
        if (!start || !end || start >= end) {
          return [];
        }
        
        periods.push({ start, end });
      }
    }

    return periods;
  }

  /**
   * Parse time string (e.g., "09:00", "17:30") and create Date object for specific date
   */
  private parseTimeString(timeStr: string | undefined, date: Date): Date | null {
    if (!timeStr) {
      return null;
    }
    
    const timeParts = timeStr.trim().match(/^(\d{1,2}):(\d{2})$/);
    if (!timeParts) {
      return null;
    }

    const hours = parseInt(timeParts[1]!, 10);
    const minutes = parseInt(timeParts[2]!, 10);

    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
      return null;
    }

    return this.createTimeOnDate(date, hours, minutes);
  }

  /**
   * Create a Date object with specific time on a given date
   */
  private createTimeOnDate(date: Date, hours: number, minutes: number): Date {
    const result = new Date(date);
    result.setHours(hours, minutes, 0, 0);
    return result;
  }

  /**
   * Check if timing is valid (respects advance notice and max booking window)
   */
  private isValidTiming(
    appointmentTime: Date,
    now: Date,
    minAdvanceNotice: number,
    maxAdvanceBooking: number
  ): boolean {
    const minTime = new Date(now.getTime() + minAdvanceNotice * 60 * 60 * 1000);
    const maxTime = new Date(now.getTime() + maxAdvanceBooking * 24 * 60 * 60 * 1000);

    return appointmentTime >= minTime && appointmentTime <= maxTime;
  }

  /**
   * Get appointment statistics for a provider
   */
  async getAppointmentStats(
    providerId: string,
    organizationId: string,
    startDate: Date,
    endDate: Date
  ): Promise<any> {
    try {
      let totalAppointments = 0;
      let statusCounts: Record<string, number> = {};
      
      try {
        // Try to calculate stats from Google Sheets first (primary data source)
        const appointments = await this.getAppointmentsFromGoogleSheets(
          organizationId,
          providerId,
          startDate,
          endDate
        );
        
        totalAppointments = appointments.length;
        statusCounts = appointments.reduce((acc: Record<string, number>, appointment: any) => {
          const status = appointment.status || 'SCHEDULED';
          acc[status] = (acc[status] || 0) + 1;
          return acc;
        }, {});
        
        logger.debug(`Calculated appointment stats from Google Sheets: ${totalAppointments} total appointments`);
      } catch (error) {
        logger.warn('Failed to calculate stats from Google Sheets, falling back to PostgreSQL:', error);
        
        // Fallback to PostgreSQL if Google Sheets fails
        const [pgTotalAppointments, pgStatusStats] = await Promise.all([
          prisma.appointment.count({
            where: {
              providerId,
              organizationId,
              scheduledAt: {
                gte: startDate,
                lte: endDate
              }
            }
          }),
          prisma.appointment.groupBy({
            by: ['status'],
            where: {
              providerId,
              organizationId,
              scheduledAt: {
                gte: startDate,
                lte: endDate
              }
            },
            _count: {
              id: true
            }
          })
        ]);
        
        totalAppointments = pgTotalAppointments;
        statusCounts = pgStatusStats.reduce((acc, stat) => {
          acc[stat.status] = stat._count.id;
          return acc;
        }, {} as Record<string, number>);
        
        logger.debug(`Fallback: Calculated appointment stats from PostgreSQL: ${totalAppointments} total appointments`);
      }

      return {
        totalAppointments,
        statusBreakdown: statusCounts,
        completionRate: statusCounts.COMPLETED ? 
          (statusCounts.COMPLETED / totalAppointments * 100).toFixed(2) : '0.00',
        noShowRate: statusCounts.NO_SHOW ? 
          (statusCounts.NO_SHOW / totalAppointments * 100).toFixed(2) : '0.00',
        cancellationRate: statusCounts.CANCELLED ? 
          (statusCounts.CANCELLED / totalAppointments * 100).toFixed(2) : '0.00'
      };
    } catch (error) {
      logger.error('Error getting appointment stats:', error);
      throw error;
    }
  }

  /**
   * Helper method to read appointments from Google Sheets
   * This method encapsulates the Google Sheets reading logic for reuse across methods
   */
  private async getAppointmentsFromGoogleSheets(
    organizationId: string,
    providerId: string,
    startDate: Date,
    endDate: Date,
    _options?: {
      excludeCancelled?: boolean;
      includePatientDetails?: boolean;
      statusFilter?: string[];
    }
  ): Promise<any[]> {
    try {
      // Initialize Google Sheets service for this organization
      await googleSheetsService.initializeClientCredentials(organizationId);
      
      // Get sheet structure
      await googleSheetsService.getSheetStructure(organizationId);
      
      // This is a placeholder for the actual Google Sheets reading implementation
      // In a real implementation, this would:
      // 1. Read from the appropriate Google Sheets tab/sheet (Appointments)
      // 2. Filter by providerId, date range
      // 3. Parse the data into appointment objects
      // 4. Apply status filters and other options
      
      // For now, return empty array and let it fallback to PostgreSQL
      // The actual implementation would involve Google Sheets API calls
      logger.debug(`Reading appointments from Google Sheets for provider ${providerId} (${startDate.toISOString()} to ${endDate.toISOString()})`);
      
      // Mock implementation - replace with actual Google Sheets API calls
      throw new Error('Google Sheets reading not yet fully implemented - using PostgreSQL fallback');
      
    } catch (error) {
      logger.debug('Google Sheets read operation failed, will use PostgreSQL fallback:', error);
      throw error;
    }
  }

  /**
   * Suggest optimal appointment times based on provider availability and patient preferences
   */
  async suggestAppointmentTimes(
    providerId: string,
    organizationId: string,
    preferredDate?: Date,
    duration = 30,
    maxSuggestions = 5
  ): Promise<TimeSlot[]> {
    try {
      const searchStartDate = preferredDate || new Date();
      const suggestions: TimeSlot[] = [];

      // Search for up to 14 days from preferred date
      for (let i = 0; i < 14 && suggestions.length < maxSuggestions; i++) {
        const searchDate = new Date(searchStartDate);
        searchDate.setDate(searchDate.getDate() + i);

        const slots = await this.getAvailableSlots({
          providerId,
          organizationId,
          date: searchDate,
          duration
        });

        const availableSlots = slots.filter(slot => slot.isAvailable);
        
        // Add up to the remaining needed suggestions
        const slotsToAdd = availableSlots.slice(0, maxSuggestions - suggestions.length);
        suggestions.push(...slotsToAdd);
      }

      return suggestions;
    } catch (error) {
      logger.error('Error suggesting appointment times:', error);
      throw error;
    }
  }
}
