/**
 * Patient Segmentation Service - TASK-040C
 *
 * Classifies patients from existing patient and appointment data. This reuses
 * existing models plus the migration-backed PatientSegment enum.
 */

import { AppointmentStatus, PatientSegment } from '@prisma/client';
import getPrismaClient from './prisma';
import logger from '../utils/logger';

interface PatientForSegmentation {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  isActive: boolean;
  createdAt: Date;
  appointments: Array<{
    scheduledAt: Date;
    status: AppointmentStatus;
  }>;
}

export interface PatientSegmentResult {
  patientId: string;
  patientName: string;
  phone: string;
  segment: PatientSegment;
  appointmentCount: number;
  completedCount: number;
  noShowCount: number;
  cancelledCount: number;
  lastAppointmentAt: string | null;
  reason: string;
}

export interface PatientSegmentationSummary {
  totalPatients: number;
  counts: Record<PatientSegment, number>;
  patients: PatientSegmentResult[];
}

class PatientSegmentationService {
  async getSegmentationSummary(organizationId: string): Promise<PatientSegmentationSummary> {
    try {
      const prisma = getPrismaClient();
      const patients = await prisma.patient.findMany({
        where: { organizationId },
        include: {
          appointments: {
            select: {
              scheduledAt: true,
              status: true,
            },
            orderBy: { scheduledAt: 'desc' },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      const classified = patients.map((patient) => this.classifyPatient(patient));
      const counts = this.emptyCounts();
      for (const patient of classified) {
        counts[patient.segment] += 1;
      }

      return {
        totalPatients: classified.length,
        counts,
        patients: classified,
      };
    } catch (error: any) {
      logger.error('[PatientSegmentation] Failed to get segmentation summary', {
        organizationId,
        error: error.message,
      });
      throw error;
    }
  }

  async getPatientSegment(
    organizationId: string,
    patientId: string
  ): Promise<PatientSegmentResult | null> {
    try {
      const prisma = getPrismaClient();
      const patient = await prisma.patient.findFirst({
        where: { id: patientId, organizationId },
        include: {
          appointments: {
            select: {
              scheduledAt: true,
              status: true,
            },
            orderBy: { scheduledAt: 'desc' },
          },
        },
      });

      return patient ? this.classifyPatient(patient) : null;
    } catch (error: any) {
      logger.error('[PatientSegmentation] Failed to get patient segment', {
        organizationId,
        patientId,
        error: error.message,
      });
      throw error;
    }
  }

  private classifyPatient(patient: PatientForSegmentation): PatientSegmentResult {
    const now = Date.now();
    const appointmentCount = patient.appointments.length;
    const completedCount = patient.appointments.filter(
      (appointment) => appointment.status === AppointmentStatus.COMPLETED
    ).length;
    const noShowCount = patient.appointments.filter(
      (appointment) => appointment.status === AppointmentStatus.NO_SHOW
    ).length;
    const cancelledCount = patient.appointments.filter(
      (appointment) => appointment.status === AppointmentStatus.CANCELLED
    ).length;
    const lastAppointment = patient.appointments[0]?.scheduledAt ?? null;
    const daysSinceCreated = this.daysBetween(patient.createdAt.getTime(), now);
    const daysSinceLastAppointment = lastAppointment
      ? this.daysBetween(lastAppointment.getTime(), now)
      : null;

    let segment = PatientSegment.REGULAR;
    let reason = 'Regular appointment activity';

    if (!patient.isActive || (daysSinceLastAppointment !== null && daysSinceLastAppointment >= 180)) {
      segment = PatientSegment.INACTIVE;
      reason = !patient.isActive
        ? 'Patient is marked inactive'
        : 'No appointment activity in 180+ days';
    } else if (noShowCount >= 2 || cancelledCount >= 3) {
      segment = PatientSegment.AT_RISK;
      reason = 'Repeated no-shows or cancellations';
    } else if (completedCount >= 5 && (daysSinceLastAppointment === null || daysSinceLastAppointment <= 90)) {
      segment = PatientSegment.VIP;
      reason = 'High completed appointment history';
    } else if (daysSinceCreated <= 30 || appointmentCount <= 1) {
      segment = PatientSegment.NEW;
      reason = 'New patient or first appointment cycle';
    }

    return {
      patientId: patient.id,
      patientName: `${patient.firstName} ${patient.lastName}`.trim(),
      phone: patient.phone,
      segment,
      appointmentCount,
      completedCount,
      noShowCount,
      cancelledCount,
      lastAppointmentAt: lastAppointment ? lastAppointment.toISOString() : null,
      reason,
    };
  }

  private emptyCounts(): Record<PatientSegment, number> {
    return {
      [PatientSegment.NEW]: 0,
      [PatientSegment.REGULAR]: 0,
      [PatientSegment.VIP]: 0,
      [PatientSegment.AT_RISK]: 0,
      [PatientSegment.INACTIVE]: 0,
    };
  }

  private daysBetween(startMs: number, endMs: number): number {
    return Math.floor((endMs - startMs) / (1000 * 60 * 60 * 24));
  }
}

export default new PatientSegmentationService();
