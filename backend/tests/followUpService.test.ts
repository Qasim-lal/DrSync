/**
 * Follow-Up Service Tests - TASK-042
 * 
 * Tests the configurable follow-up timing system for post-appointment follow-ups.
 * Covers all 3 follow-up types with organization-specific timing configuration.
 * 
 * @version 1.0
 * @date December 4, 2025
 */

import followUpService from '../src/services/followUpService';
import getPrismaClient from '../src/services/prisma';
import { ReminderType, ReminderStatus } from '@prisma/client';

const prisma = getPrismaClient();

// Test data
const testOrgId = 'test-org-followup';
const testOrgData = {
  id: testOrgId,
  name: 'Test Follow-Up Clinic',
  slug: 'test-followup-clinic',
  email: 'test@followupclinic.com',
  phone: '+923001234567',
  language: 'en',
  isActive: true,
};

const testPatientId = 'test-patient-followup';
const testPatientData = {
  id: testPatientId,
  organizationId: testOrgId,
  firstName: 'Ahmed',
  lastName: 'Khan',
  phoneNumber: '+923001234567',
  language: 'en',
};

const testProviderId = 'test-provider-followup';
const testProviderData = {
  id: testProviderId,
  organizationId: testOrgId,
  name: 'Dr. Sarah Wilson',
  specialization: 'General Practice',
};

describe('FollowUpService - TASK-042 Integration Tests', () => {
  let testAppointmentId: string;

  beforeAll(async () => {
    try {
      // Clean up
      await prisma.appointmentReminder.deleteMany({ where: { organizationId: testOrgId } });
      await prisma.appointment.deleteMany({ where: { organizationId: testOrgId } });
      await prisma.notificationSettings.deleteMany({ where: { organizationId: testOrgId } });
      await prisma.patient.deleteMany({ where: { organizationId: testOrgId } });
      await prisma.provider.deleteMany({ where: { organizationId: testOrgId } });
      await prisma.organization.deleteMany({ where: { id: testOrgId } });

      // Create test organization
      await prisma.organization.create({ data: testOrgData });

      // Create notification settings with default timing
      await prisma.notificationSettings.create({
        data: {
          organizationId: testOrgId,
          sameDayFollowUpHours: 2,
          nextDayFollowUpHours: 24,
          noShowFollowUpHours: 1,
        },
      });

      // Create test patient
      await prisma.patient.create({ data: testPatientData });

      // Create test provider
      await prisma.provider.create({ data: testProviderData });

      // Create test appointment
      const appointment = await prisma.appointment.create({
        data: {
          organizationId: testOrgId,
          patientId: testPatientId,
          providerId: testProviderId,
          appointmentDate: new Date('2025-12-05'),
          appointmentTime: new Date('2025-12-05T10:00:00Z'),
          status: 'scheduled',
        },
      });

      testAppointmentId = appointment.id;
    } catch (error) {
      console.error('Test setup error:', error);
      throw error;
    }
  });

  afterAll(async () => {
    try {
      await prisma.appointmentReminder.deleteMany({ where: { organizationId: testOrgId } });
      await prisma.appointment.deleteMany({ where: { organizationId: testOrgId } });
      await prisma.notificationSettings.deleteMany({ where: { organizationId: testOrgId } });
      await prisma.patient.deleteMany({ where: { organizationId: testOrgId } });
      await prisma.provider.deleteMany({ where: { organizationId: testOrgId } });
      await prisma.organization.deleteMany({ where: { id: testOrgId } });
      await prisma.$disconnect();
    } catch (error) {
      console.error('Test cleanup error:', error);
    }
  });

  describe('1. Default Timing Configuration', () => {
    test('TEST-001: Should use default 2 hours for same-day follow-up', async () => {
      const now = new Date();
      const result = await followUpService.scheduleFollowUp(
        testOrgId,
        testAppointmentId,
        ReminderType.FOLLOWUP_SAME_DAY
      );

      expect(result).toBeDefined();
      expect(result.reminderType).toBe(ReminderType.FOLLOWUP_SAME_DAY);

      const scheduledTime = new Date(result.scheduledFor);
      const expectedTime = new Date(now.getTime() + 2 * 60 * 60 * 1000); // 2 hours

      // Allow 1 minute tolerance
      const timeDiff = Math.abs(scheduledTime.getTime() - expectedTime.getTime());
      expect(timeDiff).toBeLessThan(60000);
    });

    test('TEST-002: Should use default 24 hours for next-day follow-up', async () => {
      const appointmentDate = new Date('2025-12-05T10:00:00Z');
      const result = await followUpService.scheduleFollowUp(
        testOrgId,
        testAppointmentId,
        ReminderType.FOLLOWUP_NEXT_DAY,
        appointmentDate
      );

      expect(result).toBeDefined();
      expect(result.reminderType).toBe(ReminderType.FOLLOWUP_NEXT_DAY);

      const scheduledTime = new Date(result.scheduledFor);
      const expectedTime = new Date(appointmentDate.getTime() + 24 * 60 * 60 * 1000);

      const timeDiff = Math.abs(scheduledTime.getTime() - expectedTime.getTime());
      expect(timeDiff).toBeLessThan(60000);
    });

    test('TEST-003: Should use default 1 hour for no-show follow-up', async () => {
      const now = new Date();
      const result = await followUpService.scheduleFollowUp(
        testOrgId,
        testAppointmentId,
        ReminderType.NO_SHOW_FOLLOWUP
      );

      expect(result).toBeDefined();
      expect(result.reminderType).toBe(ReminderType.NO_SHOW_FOLLOWUP);

      const scheduledTime = new Date(result.scheduledFor);
      const expectedTime = new Date(now.getTime() + 1 * 60 * 60 * 1000); // 1 hour

      const timeDiff = Math.abs(scheduledTime.getTime() - expectedTime.getTime());
      expect(timeDiff).toBeLessThan(60000);
    });
  });

  describe('2. Custom Timing Configuration', () => {
    beforeEach(async () => {
      // Update settings to custom timing
      await prisma.notificationSettings.update({
        where: { organizationId: testOrgId },
        data: {
          sameDayFollowUpHours: 4, // 4 hours instead of 2
          nextDayFollowUpHours: 48, // 48 hours instead of 24
          noShowFollowUpHours: 3, // 3 hours instead of 1
        },
      });
    });

    afterEach(async () => {
      // Reset to defaults
      await prisma.notificationSettings.update({
        where: { organizationId: testOrgId },
        data: {
          sameDayFollowUpHours: 2,
          nextDayFollowUpHours: 24,
          noShowFollowUpHours: 1,
        },
      });

      // Clean up reminders
      await prisma.appointmentReminder.deleteMany({ where: { organizationId: testOrgId } });
    });

    test('TEST-004: Should use custom 4 hours for same-day follow-up', async () => {
      const now = new Date();
      const result = await followUpService.scheduleFollowUp(
        testOrgId,
        testAppointmentId,
        ReminderType.FOLLOWUP_SAME_DAY
      );

      const scheduledTime = new Date(result.scheduledFor);
      const expectedTime = new Date(now.getTime() + 4 * 60 * 60 * 1000); // 4 hours

      const timeDiff = Math.abs(scheduledTime.getTime() - expectedTime.getTime());
      expect(timeDiff).toBeLessThan(60000);
    });

    test('TEST-005: Should use custom 48 hours for next-day follow-up', async () => {
      const appointmentDate = new Date('2025-12-05T10:00:00Z');
      const result = await followUpService.scheduleFollowUp(
        testOrgId,
        testAppointmentId,
        ReminderType.FOLLOWUP_NEXT_DAY,
        appointmentDate
      );

      const scheduledTime = new Date(result.scheduledFor);
      const expectedTime = new Date(appointmentDate.getTime() + 48 * 60 * 60 * 1000);

      const timeDiff = Math.abs(scheduledTime.getTime() - expectedTime.getTime());
      expect(timeDiff).toBeLessThan(60000);
    });

    test('TEST-006: Should use custom 3 hours for no-show follow-up', async () => {
      const now = new Date();
      const result = await followUpService.scheduleFollowUp(
        testOrgId,
        testAppointmentId,
        ReminderType.NO_SHOW_FOLLOWUP
      );

      const scheduledTime = new Date(result.scheduledFor);
      const expectedTime = new Date(now.getTime() + 3 * 60 * 60 * 1000);

      const timeDiff = Math.abs(scheduledTime.getTime() - expectedTime.getTime());
      expect(timeDiff).toBeLessThan(60000);
    });
  });

  describe('3. Fallback to Defaults', () => {
    test('TEST-007: Should fallback to defaults if settings not found', async () => {
      const nonExistentOrgId = 'non-existent-org';
      
      // Create appointment for non-existent org (should use defaults)
      const tempOrg = await prisma.organization.create({
        data: {
          id: nonExistentOrgId,
          name: 'Temp Org',
          slug: 'temp-org',
          email: 'temp@org.com',
          phone: '+923001234567',
          language: 'en',
          isActive: true,
        },
      });

      const tempPatient = await prisma.patient.create({
        data: {
          organizationId: nonExistentOrgId,
          firstName: 'Test',
          lastName: 'Patient',
          phoneNumber: '+923001234567',
        },
      });

      const tempProvider = await prisma.provider.create({
        data: {
          organizationId: nonExistentOrgId,
          name: 'Test Provider',
        },
      });

      const tempAppointment = await prisma.appointment.create({
        data: {
          organizationId: nonExistentOrgId,
          patientId: tempPatient.id,
          providerId: tempProvider.id,
          appointmentDate: new Date(),
          appointmentTime: new Date(),
          status: 'scheduled',
        },
      });

      const now = new Date();
      const result = await followUpService.scheduleFollowUp(
        nonExistentOrgId,
        tempAppointment.id,
        ReminderType.FOLLOWUP_SAME_DAY
      );

      const scheduledTime = new Date(result.scheduledFor);
      const expectedTime = new Date(now.getTime() + 2 * 60 * 60 * 1000); // Default 2 hours

      const timeDiff = Math.abs(scheduledTime.getTime() - expectedTime.getTime());
      expect(timeDiff).toBeLessThan(60000);

      // Cleanup
      await prisma.appointmentReminder.deleteMany({ where: { organizationId: nonExistentOrgId } });
      await prisma.appointment.deleteMany({ where: { organizationId: nonExistentOrgId } });
      await prisma.patient.deleteMany({ where: { organizationId: nonExistentOrgId } });
      await prisma.provider.deleteMany({ where: { organizationId: nonExistentOrgId } });
      await prisma.organization.deleteMany({ where: { id: nonExistentOrgId } });
    });
  });

  describe('4. Appointment Status Integration', () => {
    beforeEach(async () => {
      await prisma.appointmentReminder.deleteMany({ where: { organizationId: testOrgId } });
    });

    test('TEST-008: Should schedule same-day follow-up when appointment completed', async () => {
      const result = await followUpService.handleAppointmentCompletion(
        testOrgId,
        testAppointmentId
      );

      expect(result).toBeDefined();
      expect(result.reminderType).toBe(ReminderType.FOLLOWUP_SAME_DAY);
      expect(result.status).toBe(ReminderStatus.PENDING);
    });

    test('TEST-009: Should schedule no-show follow-up when appointment missed', async () => {
      const result = await followUpService.handleAppointmentNoShow(
        testOrgId,
        testAppointmentId
      );

      expect(result).toBeDefined();
      expect(result.reminderType).toBe(ReminderType.NO_SHOW_FOLLOWUP);
      expect(result.status).toBe(ReminderStatus.PENDING);
    });
  });

  describe('5. Follow-Up History', () => {
    beforeEach(async () => {
      await prisma.appointmentReminder.deleteMany({ where: { organizationId: testOrgId } });
    });

    test('TEST-010: Should retrieve follow-up history for appointment', async () => {
      // Schedule multiple follow-ups
      await followUpService.scheduleFollowUp(testOrgId, testAppointmentId, ReminderType.FOLLOWUP_SAME_DAY);
      await followUpService.scheduleFollowUp(testOrgId, testAppointmentId, ReminderType.FOLLOWUP_NEXT_DAY);

      const history = await followUpService.getFollowUpHistory(testAppointmentId);

      expect(history).toHaveLength(2);
      expect(history.some(r => r.reminderType === ReminderType.FOLLOWUP_SAME_DAY)).toBe(true);
      expect(history.some(r => r.reminderType === ReminderType.FOLLOWUP_NEXT_DAY)).toBe(true);
    });

    test('TEST-011: Should return empty array if no follow-ups exist', async () => {
      const history = await followUpService.getFollowUpHistory('non-existent-id');

      expect(history).toHaveLength(0);
    });
  });

  describe('6. Follow-Up Statistics', () => {
    beforeEach(async () => {
      await prisma.appointmentReminder.deleteMany({ where: { organizationId: testOrgId } });
    });

    test('TEST-012: Should return accurate follow-up statistics', async () => {
      // Schedule follow-ups
      await followUpService.scheduleFollowUp(testOrgId, testAppointmentId, ReminderType.FOLLOWUP_SAME_DAY);
      await followUpService.scheduleFollowUp(testOrgId, testAppointmentId, ReminderType.FOLLOWUP_NEXT_DAY);
      await followUpService.scheduleFollowUp(testOrgId, testAppointmentId, ReminderType.NO_SHOW_FOLLOWUP);

      const stats = await followUpService.getFollowUpStats(testOrgId);

      expect(stats.total).toBeGreaterThanOrEqual(3);
      expect(stats.bySameDay).toBeGreaterThanOrEqual(1);
      expect(stats.byNextDay).toBeGreaterThanOrEqual(1);
      expect(stats.byNoShow).toBeGreaterThanOrEqual(1);
    });
  });

  describe('7. Follow-Up Cancellation', () => {
    test('TEST-013: Should cancel scheduled follow-up', async () => {
      const followUp = await followUpService.scheduleFollowUp(
        testOrgId,
        testAppointmentId,
        ReminderType.FOLLOWUP_SAME_DAY
      );

      const cancelled = await followUpService.cancelFollowUp(followUp.id);

      expect(cancelled.status).toBe(ReminderStatus.CANCELLED);
    });
  });

  describe('8. Edge Cases', () => {
    test('TEST-014: Should handle very short timing (0.5 hours)', async () => {
      await prisma.notificationSettings.update({
        where: { organizationId: testOrgId },
        data: { sameDayFollowUpHours: 0.5 },
      });

      const now = new Date();
      const result = await followUpService.scheduleFollowUp(
        testOrgId,
        testAppointmentId,
        ReminderType.FOLLOWUP_SAME_DAY
      );

      const scheduledTime = new Date(result.scheduledFor);
      const expectedTime = new Date(now.getTime() + 0.5 * 60 * 60 * 1000);

      const timeDiff = Math.abs(scheduledTime.getTime() - expectedTime.getTime());
      expect(timeDiff).toBeLessThan(60000);

      // Reset
      await prisma.notificationSettings.update({
        where: { organizationId: testOrgId },
        data: { sameDayFollowUpHours: 2 },
      });
    });

    test('TEST-015: Should handle very long timing (168 hours = 1 week)', async () => {
      await prisma.notificationSettings.update({
        where: { organizationId: testOrgId },
        data: { nextDayFollowUpHours: 168 },
      });

      const appointmentDate = new Date('2025-12-05T10:00:00Z');
      const result = await followUpService.scheduleFollowUp(
        testOrgId,
        testAppointmentId,
        ReminderType.FOLLOWUP_NEXT_DAY,
        appointmentDate
      );

      const scheduledTime = new Date(result.scheduledFor);
      const expectedTime = new Date(appointmentDate.getTime() + 168 * 60 * 60 * 1000);

      const timeDiff = Math.abs(scheduledTime.getTime() - expectedTime.getTime());
      expect(timeDiff).toBeLessThan(60000);

      // Reset
      await prisma.notificationSettings.update({
        where: { organizationId: testOrgId },
        data: { nextDayFollowUpHours: 24 },
      });
    });
  });
});
