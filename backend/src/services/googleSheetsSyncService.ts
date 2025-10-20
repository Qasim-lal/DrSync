/**
 * Shared Google Sheets Sync Service (ACTION #1)
 * 
 * Created for Phase 3 Pre-Implementation Checklist
 * 
 * Purpose:
 * Provides shared sync functionality for TASK-041 (real-time appointment sync after booking)
 * and TASK-042 (hourly batch sync for reminders).
 * 
 * Avoids duplicate sync logic across multiple tasks.
 * 
 * Architecture:
 * - TASK-041: Calls syncAppointment() for real-time sync after WhatsApp booking
 * - TASK-042: Calls syncAllAppointments() for hourly batch reminder sync
 * - Google Sheets data ALWAYS wins in conflict resolution
 * - Retry logic: 3 attempts with exponential backoff
 * - Fallback: Direct Google Sheets read if sync fails
 * 
 * @version 1.0
 * @author DrSync Development Team
 * @date October 16, 2025
 * @task ACTION #1 - Phase 3 Pre-Implementation Checklist
 */

import logger from '../utils/logger';
import getPrismaClient from './prisma';
import googleSheetsService from './googleSheetsService';

// ============================================================================
// TYPES
// ============================================================================

interface SyncResult {
  success: boolean;
  appointmentId?: string;
  organizationId: string;
  syncTime: Date;
  errors: string[];
  retryAttempts: number;
  duration: number;
}

interface BatchSyncResult {
  success: boolean;
  organizationId: string;
  syncTime: Date;
  totalAppointments: number;
  successfulSyncs: number;
  failedSyncs: number;
  errors: string[];
  duration: number;
}

interface RetryConfig {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
}

// ============================================================================
// SERVICE CLASS
// ============================================================================

class GoogleSheetsSyncService {
  private readonly retryConfig: RetryConfig = {
    maxAttempts: 3,
    baseDelayMs: 1000,
    maxDelayMs: 10000,
  };

  /**
   * Sync single appointment from Google Sheets to PostgreSQL
   * 
   * Used by: TASK-041 (real-time sync after WhatsApp booking)
   * 
   * @param appointmentId - ID of appointment to sync
   * @param organizationId - Organization owning the appointment
   * @returns SyncResult with success status and metadata
   */
  async syncAppointment(
    appointmentId: string,
    organizationId: string
  ): Promise<SyncResult> {
    const startTime = Date.now();
    const syncResult: SyncResult = {
      success: false,
      appointmentId,
      organizationId,
      syncTime: new Date(),
      errors: [],
      retryAttempts: 0,
      duration: 0,
    };

    logger.info(`[GoogleSheetsSyncService] Starting sync for appointment ${appointmentId}`);

    try {
      // Attempt sync with retry logic
      const syncSuccess = await this.syncWithRetry(
        async () => await this.performAppointmentSync(appointmentId, organizationId),
        syncResult
      );

      syncResult.success = syncSuccess;
      syncResult.duration = Date.now() - startTime;

      if (syncSuccess) {
        logger.info(
          `[GoogleSheetsSyncService] Successfully synced appointment ${appointmentId} ` +
          `(${syncResult.retryAttempts} retries, ${syncResult.duration}ms)`
        );
      } else {
        logger.error(
          `[GoogleSheetsSyncService] Failed to sync appointment ${appointmentId} ` +
          `after ${syncResult.retryAttempts} attempts: ${syncResult.errors.join(', ')}`
        );
      }

      return syncResult;
    } catch (error) {
      syncResult.errors.push(error instanceof Error ? error.message : 'Unknown error');
      syncResult.duration = Date.now() - startTime;
      
      logger.error(`[GoogleSheetsSyncService] Sync exception for appointment ${appointmentId}:`, error);
      return syncResult;
    }
  }

  /**
   * Sync all appointments for an organization from Google Sheets to PostgreSQL
   * 
   * Used by: TASK-042 (hourly batch sync for reminders)
   * 
   * @param organizationId - Organization to sync
   * @returns BatchSyncResult with summary of sync operation
   */
  async syncAllAppointments(organizationId: string): Promise<BatchSyncResult> {
    const startTime = Date.now();
    const batchResult: BatchSyncResult = {
      success: false,
      organizationId,
      syncTime: new Date(),
      totalAppointments: 0,
      successfulSyncs: 0,
      failedSyncs: 0,
      errors: [],
      duration: 0,
    };

    logger.info(`[GoogleSheetsSyncService] Starting batch sync for organization ${organizationId}`);

    try {
      // Get all appointments from Google Sheets
      const appointments = await this.getAppointmentsFromSheets(organizationId);
      batchResult.totalAppointments = appointments.length;

      if (appointments.length === 0) {
        logger.info(`[GoogleSheetsSyncService] No appointments found for organization ${organizationId}`);
        batchResult.success = true;
        batchResult.duration = Date.now() - startTime;
        return batchResult;
      }

      // Sync each appointment
      for (const appointment of appointments) {
        try {
          const syncResult = await this.syncAppointment(appointment.id, organizationId);
          
          if (syncResult.success) {
            batchResult.successfulSyncs++;
          } else {
            batchResult.failedSyncs++;
            batchResult.errors.push(
              `Appointment ${appointment.id}: ${syncResult.errors.join(', ')}`
            );
          }
        } catch (error) {
          batchResult.failedSyncs++;
          batchResult.errors.push(
            `Appointment ${appointment.id}: ${error instanceof Error ? error.message : 'Unknown error'}`
          );
        }
      }

      batchResult.success = batchResult.failedSyncs === 0;
      batchResult.duration = Date.now() - startTime;

      logger.info(
        `[GoogleSheetsSyncService] Batch sync complete for ${organizationId}: ` +
        `${batchResult.successfulSyncs}/${batchResult.totalAppointments} successful ` +
        `(${batchResult.duration}ms)`
      );

      return batchResult;
    } catch (error) {
      batchResult.errors.push(error instanceof Error ? error.message : 'Unknown error');
      batchResult.duration = Date.now() - startTime;
      
      logger.error(`[GoogleSheetsSyncService] Batch sync exception for ${organizationId}:`, error);
      return batchResult;
    }
  }

  // ==========================================================================
  // PRIVATE HELPER METHODS
  // ==========================================================================

  /**
   * Perform actual appointment sync operation
   * Reads from Google Sheets (primary) and writes to PostgreSQL (service layer)
   */
  private async performAppointmentSync(
    appointmentId: string,
    organizationId: string
  ): Promise<boolean> {
    const prisma = getPrismaClient();

    try {
      // 1. Read appointment from Google Sheets (PRIMARY source)
      const sheetAppointment = await googleSheetsService.getAppointment(
        organizationId,
        appointmentId
      );

      if (!sheetAppointment) {
        throw new Error('Appointment not found in Google Sheets');
      }

      // 2. Check if appointment exists in PostgreSQL
      const existingAppointment = await prisma.appointment.findFirst({
        where: {
          id: appointmentId,
          organizationId,
        },
      });

      // 3. Upsert to PostgreSQL (conflict resolution: Google Sheets wins)
      if (existingAppointment) {
        // Update existing record
        await prisma.appointment.update({
          where: { id: appointmentId },
          data: {
            patientId: sheetAppointment.patientId,
            providerId: sheetAppointment.providerId,
            title: sheetAppointment.title || 'Appointment',
            description: sheetAppointment.description,
            scheduledAt: new Date(sheetAppointment.scheduledAt),
            duration: sheetAppointment.duration || 30,
            status: sheetAppointment.status,
            priority: sheetAppointment.priority || 'MEDIUM',
            bookingSource: sheetAppointment.bookingSource || 'WHATSAPP',
            updatedAt: new Date(),
          },
        });

        logger.debug(`[GoogleSheetsSyncService] Updated appointment ${appointmentId} in PostgreSQL`);
      } else {
        // Create new record
        const createData: any = {
          id: appointmentId,
          organizationId,
          patientId: sheetAppointment.patientId,
          providerId: sheetAppointment.providerId,
          title: sheetAppointment.title || 'Appointment',
          scheduledAt: new Date(sheetAppointment.scheduledAt),
          duration: sheetAppointment.duration || 30,
          status: sheetAppointment.status,
          priority: sheetAppointment.priority || 'MEDIUM',
          bookingSource: sheetAppointment.bookingSource || 'WHATSAPP',
        };
        if (sheetAppointment.description) {
          createData.description = sheetAppointment.description;
        }
        await prisma.appointment.create({ data: createData });

        logger.debug(`[GoogleSheetsSyncService] Created appointment ${appointmentId} in PostgreSQL`);
      }

      return true;
    } catch (error) {
      logger.error(`[GoogleSheetsSyncService] Sync failed for appointment ${appointmentId}:`, error);
      throw error;
    }
  }

  /**
   * Retry wrapper with exponential backoff
   */
  private async syncWithRetry(
    syncFunction: () => Promise<boolean>,
    syncResult: SyncResult
  ): Promise<boolean> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.retryConfig.maxAttempts; attempt++) {
      syncResult.retryAttempts = attempt;

      try {
        return await syncFunction();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        syncResult.errors.push(`Attempt ${attempt}: ${lastError.message}`);

        if (attempt < this.retryConfig.maxAttempts) {
          // Calculate exponential backoff delay
          const delay = Math.min(
            this.retryConfig.baseDelayMs * Math.pow(2, attempt - 1),
            this.retryConfig.maxDelayMs
          );

          logger.warn(
            `[GoogleSheetsSyncService] Retry attempt ${attempt}/${this.retryConfig.maxAttempts} ` +
            `failed, waiting ${delay}ms before next attempt...`
          );

          await this.sleep(delay);
        }
      }
    }

    // All retries failed
    if (lastError) {
      syncResult.errors.push(`All ${this.retryConfig.maxAttempts} retry attempts failed`);
    }

    return false;
  }

  /**
   * Get all appointments from Google Sheets for an organization
   */
  private async getAppointmentsFromSheets(organizationId: string): Promise<Array<{ id: string }>> {
    try {
      // Use existing googleSheetsService to fetch appointments
      const result = await googleSheetsService.getAppointments(organizationId);
      return result.appointments.map((apt: any) => ({ id: apt.id }));
    } catch (error) {
      logger.error(`[GoogleSheetsSyncService] Failed to fetch appointments from Google Sheets:`, error);
      throw error;
    }
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get sync statistics for monitoring
   */
  async getSyncStats(organizationId: string): Promise<{
    lastSyncTime: Date | null;
    totalSynced: number;
    failedSyncs: number;
  }> {
    try {
      const prisma = getPrismaClient();
      
      // Get last sync time from most recent appointment update
      const lastAppointment = await prisma.appointment.findFirst({
        where: { organizationId },
        orderBy: { updatedAt: 'desc' },
        select: { updatedAt: true },
      });

      // Count total appointments (successfully synced)
      const totalSynced = await prisma.appointment.count({
        where: { organizationId },
      });

      return {
        lastSyncTime: lastAppointment?.updatedAt || null,
        totalSynced,
        failedSyncs: 0, // TODO: Track failed syncs in separate table if needed
      };
    } catch (error) {
      logger.error(`[GoogleSheetsSyncService] Failed to get sync stats:`, error);
      throw error;
    }
  }
}

// ============================================================================
// EXPORT SINGLETON
// ============================================================================

const googleSheetsSyncService = new GoogleSheetsSyncService();
export default googleSheetsSyncService;
