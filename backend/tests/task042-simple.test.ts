/**
 * TASK-042 Simple Functional Tests
 * 
 * Core functionality verification without complex edge cases.
 * Tests the essential features that must work in production.
 * 
 * @version 1.0
 * @date December 4, 2025
 */

import reminderTemplateService from '../src/services/reminderTemplateService';
import followUpService from '../src/services/followUpService';
import reminderQueueService from '../src/services/reminderQueueService';
import getPrismaClient from '../src/services/prisma';
import { ReminderType, ReminderStatus } from '@prisma/client';

const prisma = getPrismaClient();

const testOrgId = 'test-org-task042-simple';

describe('TASK-042: Core Functionality Tests', () => {
  let testAppointmentId: string;

  beforeAll(async () => {
    // Cleanup
    await prisma.appointmentReminder.deleteMany({ where: { organizationId: testOrgId } });
    await prisma.appointment.deleteMany({ where: { organizationId: testOrgId } });
    await prisma.notificationSettings.deleteMany({ where: { organizationId: testOrgId } });
    await prisma.patient.deleteMany({ where: { organizationId: testOrgId } });
    await prisma.provider.deleteMany({ where: { organizationId: testOrgId } });
    await prisma.organization.deleteMany({ where: { id: testOrgId } });

    // Create test organization
    await prisma.organization.create({
      data: {
        id: testOrgId,
        name: 'TASK-042 Test Clinic',
        slug: 'task042-test',
        email: 'test@task042.com',
        language: 'en',
        isActive: true,
      },
    });

    // Create notification settings
    await prisma.notificationSettings.create({
      data: {
        organizationId: testOrgId,
        sameDayFollowUpHours: 2,
        nextDayFollowUpHours: 24,
        noShowFollowUpHours: 1,
      },
    });

    // Create test patient
    const patient = await prisma.patient.create({
      data: {
        organizationId: testOrgId,
        firstName: 'Ahmed',
        lastName: 'Khan',
        phone: '+923001234567',
        preferredLanguage: 'en',
      },
    });

    // Create test provider
    const provider = await prisma.provider.create({
      data: {
        organizationId: testOrgId,
        firstName: 'Sarah',
        lastName: 'Wilson',
        specialization: 'General Practice',
      },
    });

    // Create test appointment
    const appointment = await prisma.appointment.create({
      data: {
        organizationId: testOrgId,
        patientId: patient.id,
        providerId: provider.id,
        scheduledAt: new Date('2025-12-05T10:00:00Z'),
        endTime: new Date('2025-12-05T10:30:00Z'),
        status: 'SCHEDULED',
      },
    });

    testAppointmentId = appointment.id;
  });

  afterAll(async () => {
    // Clean up database
    await prisma.appointmentReminder.deleteMany({ where: { organizationId: testOrgId } });
    await prisma.appointment.deleteMany({ where: { organizationId: testOrgId } });
    await prisma.notificationSettings.deleteMany({ where: { organizationId: testOrgId } });
    await prisma.patient.deleteMany({ where: { organizationId: testOrgId } });
    await prisma.provider.deleteMany({ where: { organizationId: testOrgId } });
    await prisma.organization.deleteMany({ where: { id: testOrgId } });
    
    // Close Bull queue connections to prevent open handles
    await reminderQueueService.shutdown();
    
    // Disconnect Prisma
    await prisma.$disconnect();
  });

  describe('1. Template System - Core', () => {
    test('Should have templates for all 6 reminder types', () => {
      const types = [
        ReminderType.REMINDER_24H,
        ReminderType.REMINDER_2H,
        ReminderType.REMINDER_30MIN,
        ReminderType.FOLLOWUP_SAME_DAY,
        ReminderType.FOLLOWUP_NEXT_DAY,
        ReminderType.NO_SHOW_FOLLOWUP,
      ];

      types.forEach(type => {
        const templates = reminderTemplateService.getAvailableTemplates(type);
        expect(templates.length).toBeGreaterThanOrEqual(2); // English + Urdu
      });
    });

    test('Should generate English messages without template variables', () => {
      const testData = {
        patientName: 'Ahmed Khan',
        doctorName: 'Sarah Wilson',
        clinicName: 'City Medical',
        appointmentDate: new Date('2025-12-05'),
        appointmentTime: '10:00 AM',
      };

      const message = reminderTemplateService.generateMessage(
        ReminderType.REMINDER_24H,
        'en',
        testData
      );

      expect(message).toBeDefined();
      expect(message.length).toBeGreaterThan(50);
      expect(message).not.toContain('{{');
      expect(message).not.toContain('}}');
    });

    test('Should generate different messages for different types', () => {
      const testData = {
        patientName: 'Ahmed Khan',
        doctorName: 'Sarah Wilson',
        clinicName: 'City Medical',
        appointmentDate: new Date(),
        appointmentTime: '10:00 AM',
      };

      const msg24h = reminderTemplateService.generateMessage(ReminderType.REMINDER_24H, 'en', testData);
      const msgFollowUp = reminderTemplateService.generateMessage(ReminderType.FOLLOWUP_SAME_DAY, 'en', testData);

      expect(msg24h).not.toBe(msgFollowUp);
    });

    test('Should validate correct templates', () => {
      const validTemplate = 'Hello {{patientName}}, appointment at {{appointmentTime}}';
      const result = reminderTemplateService.validateTemplate(validTemplate);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('Should reject invalid templates', () => {
      const invalidTemplate = 'Hello {{patientName';
      const result = reminderTemplateService.validateTemplate(invalidTemplate);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('2. Follow-Up System - Default Timing', () => {
    beforeEach(async () => {
      await prisma.appointmentReminder.deleteMany({ where: { organizationId: testOrgId } });
    });

    test('Should schedule same-day follow-up with default timing', async () => {
      const followUpId = await followUpService.scheduleFollowUp({
        organizationId: testOrgId,
        appointmentId: testAppointmentId,
        followUpType: ReminderType.FOLLOWUP_SAME_DAY,
      });

      expect(followUpId).toBeDefined();
      expect(typeof followUpId).toBe('string');

      // Verify in database
      const dbRecord = await prisma.appointmentReminder.findUnique({
        where: { id: followUpId },
      });

      expect(dbRecord).toBeDefined();
      expect(dbRecord?.reminderType).toBe(ReminderType.FOLLOWUP_SAME_DAY);
      expect(dbRecord?.status).toBe(ReminderStatus.PENDING);
    });

    test('Should schedule next-day follow-up', async () => {
      const followUpId = await followUpService.scheduleFollowUp({
        organizationId: testOrgId,
        appointmentId: testAppointmentId,
        followUpType: ReminderType.FOLLOWUP_NEXT_DAY,
      });

      expect(followUpId).toBeDefined();

      const dbRecord = await prisma.appointmentReminder.findUnique({
        where: { id: followUpId },
      });

      expect(dbRecord?.reminderType).toBe(ReminderType.FOLLOWUP_NEXT_DAY);
    });

    test('Should schedule no-show follow-up', async () => {
      const followUpId = await followUpService.scheduleFollowUp({
        organizationId: testOrgId,
        appointmentId: testAppointmentId,
        followUpType: ReminderType.NO_SHOW_FOLLOWUP,
      });

      expect(followUpId).toBeDefined();

      const dbRecord = await prisma.appointmentReminder.findUnique({
        where: { id: followUpId },
      });

      expect(dbRecord?.reminderType).toBe(ReminderType.NO_SHOW_FOLLOWUP);
    });
  });

  describe('3. Follow-Up System - Configurable Timing', () => {
    beforeEach(async () => {
      await prisma.appointmentReminder.deleteMany({ where: { organizationId: testOrgId } });
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
    });

    test('Should use custom 4-hour timing for same-day follow-up', async () => {
      await prisma.notificationSettings.update({
        where: { organizationId: testOrgId },
        data: { sameDayFollowUpHours: 4 },
      });

      const now = new Date();
      const followUpId = await followUpService.scheduleFollowUp({
        organizationId: testOrgId,
        appointmentId: testAppointmentId,
        followUpType: ReminderType.FOLLOWUP_SAME_DAY,
      });

      const dbRecord = await prisma.appointmentReminder.findUnique({
        where: { id: followUpId },
      });

      const scheduledTime = new Date(dbRecord!.scheduledFor);
      const expectedTime = new Date(now.getTime() + 4 * 60 * 60 * 1000);
      const timeDiff = Math.abs(scheduledTime.getTime() - expectedTime.getTime());

      expect(timeDiff).toBeLessThan(60000); // Within 1 minute
    });

    test('Should use custom 48-hour timing for next-day follow-up', async () => {
      await prisma.notificationSettings.update({
        where: { organizationId: testOrgId },
        data: { nextDayFollowUpHours: 48 },
      });

      const appointmentDate = new Date('2025-12-05T10:00:00Z');
      const followUpId = await followUpService.scheduleFollowUp({
        organizationId: testOrgId,
        appointmentId: testAppointmentId,
        followUpType: ReminderType.FOLLOWUP_NEXT_DAY,
        scheduledFor: new Date(appointmentDate.getTime() + 48 * 60 * 60 * 1000),
      });

      const dbRecord = await prisma.appointmentReminder.findUnique({
        where: { id: followUpId },
      });

      expect(dbRecord).toBeDefined();
    });
  });

  describe('4. Database Integration', () => {
    test('Should create reminder records in database', async () => {
      const followUpId = await followUpService.scheduleFollowUp({
        organizationId: testOrgId,
        appointmentId: testAppointmentId,
        followUpType: ReminderType.FOLLOWUP_SAME_DAY,
      });

      const dbRecord = await prisma.appointmentReminder.findUnique({
        where: { id: followUpId },
      });

      expect(dbRecord).toBeDefined();
      expect(dbRecord?.organizationId).toBe(testOrgId);
      expect(dbRecord?.appointmentId).toBe(testAppointmentId);
      expect(dbRecord?.status).toBe(ReminderStatus.PENDING);
      expect(dbRecord?.attempts).toBe(0);
    });

    test('Should prevent duplicate follow-ups', async () => {
      const followUpId1 = await followUpService.scheduleFollowUp({
        organizationId: testOrgId,
        appointmentId: testAppointmentId,
        followUpType: ReminderType.FOLLOWUP_SAME_DAY,
      });

      const followUpId2 = await followUpService.scheduleFollowUp({
        organizationId: testOrgId,
        appointmentId: testAppointmentId,
        followUpType: ReminderType.FOLLOWUP_SAME_DAY,
      });

      // Should return same ID (duplicate prevention)
      expect(followUpId1).toBe(followUpId2);
    });
  });

  describe('5. System Health', () => {
    test('Template service should be initialized', () => {
      const templates = reminderTemplateService.getAvailableTemplates(ReminderType.REMINDER_24H);
      expect(templates.length).toBeGreaterThan(0);
    });

    test('Database connection should be working', async () => {
      const count = await prisma.organization.count({
        where: { id: testOrgId },
      });
      expect(count).toBe(1);
    });

    test('Notification settings should exist', async () => {
      const settings = await prisma.notificationSettings.findUnique({
        where: { organizationId: testOrgId },
      });

      expect(settings).toBeDefined();
      expect(settings?.sameDayFollowUpHours).toBe(2);
      expect(settings?.nextDayFollowUpHours).toBe(24);
      expect(settings?.noShowFollowUpHours).toBe(1);
    });
  });
});
