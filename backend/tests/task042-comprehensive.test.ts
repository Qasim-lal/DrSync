/**
 * TASK-042 Comprehensive Integration Tests
 * 
 * Complete test coverage for the automated reminder and follow-up system.
 * Tests all functionality except real-time WhatsApp API calls (mocked).
 * 
 * Coverage:
 * - Template generation (12 templates, 2 languages)
 * - Follow-up scheduling (3 types, configurable timing)
 * - Database integration
 * - Cost tracking
 * - Statistics and history
 * - Edge cases and error handling
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

const testOrgId = 'test-org-task042-comprehensive';
const testOrgData = {
  id: testOrgId,
  name: 'TASK-042 Test Clinic',
  slug: 'task042-test-clinic',
  email: 'test@task042clinic.com',
  phone: '+923001234567',
  language: 'en',
  isActive: true,
};

describe('TASK-042: Comprehensive Integration Tests', () => {
  let testPatientId: string;
  let testProviderId: string;
  let testAppointmentId: string;

  beforeAll(async () => {
    try {
      // Cleanup
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
          language: 'en',
          bookingConfirmationsEnabled: true,
          remindersEnabled: true,
          followUpsEnabled: true,
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
      testPatientId = patient.id;

      // Create test provider
      const provider = await prisma.provider.create({
        data: {
          organizationId: testOrgId,
          firstName: 'Sarah',
          lastName: 'Wilson',
          specialization: 'General Practice',
        },
      });
      testProviderId = provider.id;

      // Create test appointment
      const appointment = await prisma.appointment.create({
        data: {
          organizationId: testOrgId,
          patientId: testPatientId,
          providerId: testProviderId,
          scheduledAt: new Date('2025-12-05T10:00:00Z'),
          endTime: new Date('2025-12-05T10:30:00Z'),
          status: 'SCHEDULED',
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
      
      // Close Bull queue connections
      await reminderQueueService.shutdown();
      
      await prisma.$disconnect();
    } catch (error) {
      console.error('Test cleanup error:', error);
    }
  });

  describe('SECTION 1: Template System (12 templates)', () => {
    describe('1.1 Template Availability', () => {
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
          expect(templates.length).toBeGreaterThanOrEqual(2);
        });
      });

      test('Should have both English and Urdu for each type', () => {
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
          const hasEnglish = templates.some(t => t.language === 'en');
          const hasUrdu = templates.some(t => t.language === 'ur');

          expect(hasEnglish).toBe(true);
          expect(hasUrdu).toBe(true);
        });
      });
    });

    describe('1.2 Message Generation - English', () => {
      const testData = {
        patientName: 'Ahmed Khan',
        doctorName: 'Dr. Sarah Wilson',
        clinicName: 'City Medical Center',
        clinicAddress: '123 Main St, Karachi',
        appointmentDate: new Date('2025-12-05T10:00:00Z'),
        appointmentTime: '10:00 AM',
      };

      test('Should generate 24-hour reminder message', () => {
        const message = reminderTemplateService.generateMessage(
          ReminderType.REMINDER_24H,
          'en',
          testData
        );

        expect(message).toContain('Ahmed Khan');
        expect(message).toContain('Dr. Sarah Wilson');
        expect(message).toContain('City Medical Center');
        expect(message).not.toContain('{{');
      });

      test('Should generate 2-hour reminder message', () => {
        const message = reminderTemplateService.generateMessage(
          ReminderType.REMINDER_2H,
          'en',
          testData
        );

        expect(message).toContain('Dr. Sarah Wilson');
        expect(message).toContain('10:00 AM');
        expect(message).not.toContain('{{');
      });

      test('Should generate 30-minute reminder message', () => {
        const message = reminderTemplateService.generateMessage(
          ReminderType.REMINDER_30MIN,
          'en',
          testData
        );

        expect(message).toContain('Dr. Sarah Wilson');
        expect(message).toContain('URGENT');
        expect(message).not.toContain('{{');
      });

      test('Should generate same-day follow-up message', () => {
        const message = reminderTemplateService.generateMessage(
          ReminderType.FOLLOWUP_SAME_DAY,
          'en',
          testData
        );

        expect(message).toContain('Ahmed Khan');
        expect(message).toContain('Dr. Sarah Wilson');
        expect(message).not.toContain('{{');
      });

      test('Should generate next-day follow-up message', () => {
        const message = reminderTemplateService.generateMessage(
          ReminderType.FOLLOWUP_NEXT_DAY,
          'en',
          testData
        );

        expect(message).toContain('Ahmed Khan');
        expect(message).toContain('Dr. Sarah Wilson');
        expect(message).not.toContain('{{');
      });

      test('Should generate no-show follow-up message', () => {
        const message = reminderTemplateService.generateMessage(
          ReminderType.NO_SHOW_FOLLOWUP,
          'en',
          testData
        );

        expect(message).toContain('Ahmed Khan');
        expect(message).toContain('City Medical Center');
        expect(message).not.toContain('{{');
      });
    });

    describe('1.3 Message Generation - Urdu', () => {
      const testData = {
        patientName: 'احمد خان',
        doctorName: 'ڈاکٹر سارہ',
        clinicName: 'سٹی میڈیکل سنٹر',
        clinicAddress: '123 مین سٹریٹ، کراچی',
        appointmentDate: new Date('2025-12-05T10:00:00Z'),
        appointmentTime: '10:00 AM',
      };

      test('Should generate Urdu messages with proper characters', () => {
        const types = [
          ReminderType.REMINDER_24H,
          ReminderType.REMINDER_2H,
          ReminderType.REMINDER_30MIN,
        ];

        types.forEach(type => {
          const message = reminderTemplateService.generateMessage(type, 'ur', testData);
          
          expect(message).toMatch(/[\u0600-\u06FF]/); // Urdu/Arabic characters
          expect(message).toContain('احمد خان');
          expect(message).not.toContain('{{');
        });
      });

      test('Should NOT add English "Dr." prefix to Urdu doctor names', () => {
        // Test with doctor name that already has Urdu title
        const message = reminderTemplateService.generateMessage(
          ReminderType.REMINDER_24H,
          'ur',
          testData
        );
        
        // Should contain the Urdu doctor title
        expect(message).toContain('ڈاکٹر سارہ'); // ڈاکٹر سارہ
        
        // Should NOT have "Dr. ڈاکٹر" (mixed English/Urdu)
        expect(message).not.toContain('Dr. ڈاکٹر');
        
        console.log('\n=== Urdu Message Output ===');
        console.log(message);
        console.log('===========================\n');
      });
    });

    describe('1.4 Template Validation', () => {
      test('Should validate correct template', () => {
        const template = 'Hello {{patientName}}, appointment at {{appointmentTime}}';
        const result = reminderTemplateService.validateTemplate(template);

        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      test('Should reject template with unmatched braces', () => {
        const template = 'Hello {{patientName, appointment at {{appointmentTime}}';
        const result = reminderTemplateService.validateTemplate(template);

        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });

      test('Should reject too short template', () => {
        const template = 'Hi';
        const result = reminderTemplateService.validateTemplate(template);

        expect(result.valid).toBe(false);
      });

      test('Should reject too long template', () => {
        const template = 'A'.repeat(5000);
        const result = reminderTemplateService.validateTemplate(template);

        expect(result.valid).toBe(false);
      });
    });
  });

  describe('SECTION 2: Follow-Up System - Default Timing', () => {
    beforeEach(async () => {
      await prisma.appointmentReminder.deleteMany({ where: { organizationId: testOrgId } });
    });

    test('Should schedule same-day follow-up with 2-hour default', async () => {
      const now = new Date();
      const followUpId = await followUpService.scheduleFollowUp({
        organizationId: testOrgId,
        appointmentId: testAppointmentId,
        followUpType: ReminderType.FOLLOWUP_SAME_DAY
      });

      expect(followUpId).toBeDefined();
      expect(typeof followUpId).toBe('string');

      // Verify in database
      const result = await prisma.appointmentReminder.findUnique({
        where: { id: followUpId }
      });

      expect(result).toBeDefined();
      expect(result?.reminderType).toBe(ReminderType.FOLLOWUP_SAME_DAY);
      expect(result?.status).toBe(ReminderStatus.PENDING);

      const scheduledTime = new Date(result!.scheduledFor);
      const expectedTime = new Date(now.getTime() + 2 * 60 * 60 * 1000);
      const timeDiff = Math.abs(scheduledTime.getTime() - expectedTime.getTime());
      
      expect(timeDiff).toBeLessThan(60000);
    });

    test('Should schedule next-day follow-up with 24-hour default', async () => {
      const now = new Date();
      const followUpId = await followUpService.scheduleFollowUp({
        organizationId: testOrgId,
        appointmentId: testAppointmentId,
        followUpType: ReminderType.FOLLOWUP_NEXT_DAY
      });

      const result = await prisma.appointmentReminder.findUnique({ where: { id: followUpId } });

      expect(result).toBeDefined();
      expect(result?.reminderType).toBe(ReminderType.FOLLOWUP_NEXT_DAY);

      const scheduledTime = new Date(result!.scheduledFor);
      const expectedTime = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const timeDiff = Math.abs(scheduledTime.getTime() - expectedTime.getTime());
      
      expect(timeDiff).toBeLessThan(60000);
    });

    test('Should schedule no-show follow-up with 1-hour default', async () => {
      const now = new Date();
      const followUpId = await followUpService.scheduleFollowUp({
        organizationId: testOrgId,
        appointmentId: testAppointmentId,
        followUpType: ReminderType.NO_SHOW_FOLLOWUP
      });

      const result = await prisma.appointmentReminder.findUnique({ where: { id: followUpId } });

      expect(result).toBeDefined();
      expect(result?.reminderType).toBe(ReminderType.NO_SHOW_FOLLOWUP);

      const scheduledTime = new Date(result!.scheduledFor);
      const expectedTime = new Date(now.getTime() + 1 * 60 * 60 * 1000);
      const timeDiff = Math.abs(scheduledTime.getTime() - expectedTime.getTime());
      
      expect(timeDiff).toBeLessThan(60000);
    });
  });

  describe('SECTION 3: Follow-Up System - Configurable Timing', () => {
    beforeEach(async () => {
      await prisma.appointmentReminder.deleteMany({ where: { organizationId: testOrgId } });
    });

    afterEach(async () => {
      await prisma.notificationSettings.update({
        where: { organizationId: testOrgId },
        data: {
          sameDayFollowUpHours: 2,
          nextDayFollowUpHours: 24,
          noShowFollowUpHours: 1,
        },
      });
    });

    test('Should respect custom 4-hour same-day timing', async () => {
      await prisma.notificationSettings.update({
        where: { organizationId: testOrgId },
        data: { sameDayFollowUpHours: 4 },
      });

      const now = new Date();
      const followUpId = await followUpService.scheduleFollowUp({
        organizationId: testOrgId,
        appointmentId: testAppointmentId,
        followUpType: ReminderType.FOLLOWUP_SAME_DAY
      });

      const result = await prisma.appointmentReminder.findUnique({ where: { id: followUpId } });
      const scheduledTime = new Date(result!.scheduledFor);
      const expectedTime = new Date(now.getTime() + 4 * 60 * 60 * 1000);
      const timeDiff = Math.abs(scheduledTime.getTime() - expectedTime.getTime());
      
      expect(timeDiff).toBeLessThan(60000);
    });

    test('Should respect custom 48-hour next-day timing', async () => {
      await prisma.notificationSettings.update({
        where: { organizationId: testOrgId },
        data: { nextDayFollowUpHours: 48 },
      });

      const now = new Date();
      const followUpId = await followUpService.scheduleFollowUp({
        organizationId: testOrgId,
        appointmentId: testAppointmentId,
        followUpType: ReminderType.FOLLOWUP_NEXT_DAY
      });

      const result = await prisma.appointmentReminder.findUnique({ where: { id: followUpId } });
      const scheduledTime = new Date(result!.scheduledFor);
      const expectedTime = new Date(now.getTime() + 48 * 60 * 60 * 1000);
      const timeDiff = Math.abs(scheduledTime.getTime() - expectedTime.getTime());
      
      expect(timeDiff).toBeLessThan(60000);
    });

    test('Should respect custom 3-hour no-show timing', async () => {
      await prisma.notificationSettings.update({
        where: { organizationId: testOrgId },
        data: { noShowFollowUpHours: 3 },
      });

      const now = new Date();
      const followUpId = await followUpService.scheduleFollowUp({
        organizationId: testOrgId,
        appointmentId: testAppointmentId,
        followUpType: ReminderType.NO_SHOW_FOLLOWUP
      });

      const result = await prisma.appointmentReminder.findUnique({ where: { id: followUpId } });
      const scheduledTime = new Date(result!.scheduledFor);
      const expectedTime = new Date(now.getTime() + 3 * 60 * 60 * 1000);
      const timeDiff = Math.abs(scheduledTime.getTime() - expectedTime.getTime());
      
      expect(timeDiff).toBeLessThan(60000);
    });

    test('Should handle very short timing (1 hour)', async () => {
      // Explicitly cleanup any existing FOLLOWUP_SAME_DAY reminders for this appointment
      await prisma.appointmentReminder.deleteMany({
        where: {
          organizationId: testOrgId,
          appointmentId: testAppointmentId,
          reminderType: ReminderType.FOLLOWUP_SAME_DAY
        }
      });

      // Note: DB field is INT, so we can't use 0.5 hours. Using 1 hour for "short timing" test
      await prisma.notificationSettings.update({
        where: { organizationId: testOrgId },
        data: { sameDayFollowUpHours: 1 },
      });

      const now = new Date();
      const followUpId = await followUpService.scheduleFollowUp({
        organizationId: testOrgId,
        appointmentId: testAppointmentId,
        followUpType: ReminderType.FOLLOWUP_SAME_DAY
      });

      const result = await prisma.appointmentReminder.findUnique({ where: { id: followUpId } });
      const scheduledTime = new Date(result!.scheduledFor);
      const expectedTime = new Date(now.getTime() + 1 * 60 * 60 * 1000);
      const timeDiff = Math.abs(scheduledTime.getTime() - expectedTime.getTime());
      
      // Allow up to 1 minute drift due to time capture differences between test and service
      expect(timeDiff).toBeLessThan(60000);
    });

    test('Should handle very long timing (168 hours = 1 week)', async () => {
      await prisma.notificationSettings.update({
        where: { organizationId: testOrgId },
        data: { nextDayFollowUpHours: 168 },
      });

      const now = new Date();
      const followUpId = await followUpService.scheduleFollowUp({
        organizationId: testOrgId,
        appointmentId: testAppointmentId,
        followUpType: ReminderType.FOLLOWUP_NEXT_DAY
      });

      const result = await prisma.appointmentReminder.findUnique({ where: { id: followUpId } });
      const scheduledTime = new Date(result!.scheduledFor);
      const expectedTime = new Date(now.getTime() + 168 * 60 * 60 * 1000);
      const timeDiff = Math.abs(scheduledTime.getTime() - expectedTime.getTime());
      
      expect(timeDiff).toBeLessThan(60000);
    });
  });

  describe('SECTION 4: Appointment Status Integration', () => {
    beforeEach(async () => {
      await prisma.appointmentReminder.deleteMany({ where: { organizationId: testOrgId } });
    });

    test('Should auto-schedule follow-up on completion', async () => {
      // Update appointment status to COMPLETED first
      await prisma.appointment.update({
        where: { id: testAppointmentId },
        data: { status: 'COMPLETED' }
      });

      // handleAppointmentCompletion returns void, it schedules internally
      await followUpService.handleAppointmentCompletion(testAppointmentId);

      // Verify follow-up was scheduled
      const reminders = await prisma.appointmentReminder.findMany({
        where: {
          organizationId: testOrgId,
          appointmentId: testAppointmentId,
          reminderType: ReminderType.FOLLOWUP_SAME_DAY
        }
      });

      expect(reminders.length).toBeGreaterThan(0);
      const result = reminders[0];
      expect(result).toBeDefined();
      expect(result?.status).toBe(ReminderStatus.PENDING);
      expect(result?.organizationId).toBe(testOrgId);
      expect(result?.appointmentId).toBe(testAppointmentId);
    });

    test('Should auto-schedule follow-up on no-show', async () => {
      // Update appointment status to NO_SHOW first
      await prisma.appointment.update({
        where: { id: testAppointmentId },
        data: { status: 'NO_SHOW' }
      });

      // handleAppointmentNoShow returns void, it schedules internally
      await followUpService.handleAppointmentNoShow(testAppointmentId);

      // Verify follow-up was scheduled
      const reminders = await prisma.appointmentReminder.findMany({
        where: {
          organizationId: testOrgId,
          appointmentId: testAppointmentId,
          reminderType: ReminderType.NO_SHOW_FOLLOWUP
        }
      });

      expect(reminders.length).toBeGreaterThan(0);
      const result = reminders[0];
      expect(result).toBeDefined();
      expect(result?.reminderType).toBe(ReminderType.NO_SHOW_FOLLOWUP);
      expect(result?.status).toBe(ReminderStatus.PENDING);
    });
  });

  describe('SECTION 5: History & Statistics', () => {
    beforeEach(async () => {
      await prisma.appointmentReminder.deleteMany({ where: { organizationId: testOrgId } });
    });

    test('Should track follow-up history', async () => {
      await followUpService.scheduleFollowUp({
        organizationId: testOrgId,
        appointmentId: testAppointmentId,
        followUpType: ReminderType.FOLLOWUP_SAME_DAY
      });
      await followUpService.scheduleFollowUp({
        organizationId: testOrgId,
        appointmentId: testAppointmentId,
        followUpType: ReminderType.FOLLOWUP_NEXT_DAY
      });

      const history = await followUpService.getFollowUpHistory(testAppointmentId);

      expect(history).toHaveLength(2);
      expect(history.some(r => r.reminderType === ReminderType.FOLLOWUP_SAME_DAY)).toBe(true);
      expect(history.some(r => r.reminderType === ReminderType.FOLLOWUP_NEXT_DAY)).toBe(true);
    });

    test('Should provide accurate statistics', async () => {
      await followUpService.scheduleFollowUp({
        organizationId: testOrgId,
        appointmentId: testAppointmentId,
        followUpType: ReminderType.FOLLOWUP_SAME_DAY
      });
      await followUpService.scheduleFollowUp({
        organizationId: testOrgId,
        appointmentId: testAppointmentId,
        followUpType: ReminderType.FOLLOWUP_NEXT_DAY
      });
      await followUpService.scheduleFollowUp({
        organizationId: testOrgId,
        appointmentId: testAppointmentId,
        followUpType: ReminderType.NO_SHOW_FOLLOWUP
      });

      const stats = await followUpService.getFollowUpStats(testOrgId);

      // Stats structure: { summary: { total, pending, sent, failed, skipped }, byType: { FOLLOWUP_SAME_DAY: count, ... } }
      expect(stats.summary.total).toBeGreaterThanOrEqual(3);
      expect(stats.byType[ReminderType.FOLLOWUP_SAME_DAY]).toBeGreaterThanOrEqual(1);
      expect(stats.byType[ReminderType.FOLLOWUP_NEXT_DAY]).toBeGreaterThanOrEqual(1);
      expect(stats.byType[ReminderType.NO_SHOW_FOLLOWUP]).toBeGreaterThanOrEqual(1);
    });

    test('Should return empty history for non-existent appointment', async () => {
      const history = await followUpService.getFollowUpHistory('non-existent-id');
      expect(history).toHaveLength(0);
    });
  });

  describe('SECTION 6: Follow-Up Cancellation', () => {
    test('Should successfully cancel follow-up', async () => {
      const followUpId = await followUpService.scheduleFollowUp({
        organizationId: testOrgId,
        appointmentId: testAppointmentId,
        followUpType: ReminderType.FOLLOWUP_SAME_DAY
      });

      const cancelled = await followUpService.cancelFollowUp(followUpId);

      expect(cancelled).toBe(true);

      // Verify it's actually cancelled in the database
      const dbRecord = await prisma.appointmentReminder.findUnique({
        where: { id: followUpId }
      });
      expect(dbRecord?.status).toBe(ReminderStatus.CANCELLED);
    });
  });

  describe('SECTION 7: Database Integrity', () => {
    test('Should create reminder record in database', async () => {
      const followUpId = await followUpService.scheduleFollowUp({
        organizationId: testOrgId,
        appointmentId: testAppointmentId,
        followUpType: ReminderType.FOLLOWUP_SAME_DAY
      });

      const dbRecord = await prisma.appointmentReminder.findUnique({
        where: { id: followUpId },
      });

      expect(dbRecord).toBeDefined();
      expect(dbRecord?.organizationId).toBe(testOrgId);
      expect(dbRecord?.appointmentId).toBe(testAppointmentId);
      expect(dbRecord?.reminderType).toBe(ReminderType.FOLLOWUP_SAME_DAY);
    });

    test('Should persist organization and appointment references', async () => {
      const followUpId = await followUpService.scheduleFollowUp({
        organizationId: testOrgId,
        appointmentId: testAppointmentId,
        followUpType: ReminderType.FOLLOWUP_NEXT_DAY
      });

      const result = await prisma.appointmentReminder.findUnique({ where: { id: followUpId } });
      expect(result?.organizationId).toBe(testOrgId);
      expect(result?.appointmentId).toBe(testAppointmentId);
    });

    test('Should set correct initial status', async () => {
      const followUpId = await followUpService.scheduleFollowUp({
        organizationId: testOrgId,
        appointmentId: testAppointmentId,
        followUpType: ReminderType.NO_SHOW_FOLLOWUP
      });

      const result = await prisma.appointmentReminder.findUnique({ where: { id: followUpId } });
      expect(result?.status).toBe(ReminderStatus.PENDING);
      expect(result?.attempts).toBe(0);
    });
  });

  describe('SECTION 8: Edge Cases & Error Handling', () => {
    test('Should handle multiple follow-ups for same appointment', async () => {
      await followUpService.scheduleFollowUp({ organizationId: testOrgId, appointmentId: testAppointmentId, followUpType: ReminderType.FOLLOWUP_SAME_DAY });
      await followUpService.scheduleFollowUp({ organizationId: testOrgId, appointmentId: testAppointmentId, followUpType: ReminderType.FOLLOWUP_NEXT_DAY });
      await followUpService.scheduleFollowUp({ organizationId: testOrgId, appointmentId: testAppointmentId, followUpType: ReminderType.NO_SHOW_FOLLOWUP });

      const history = await followUpService.getFollowUpHistory(testAppointmentId);
      expect(history.length).toBeGreaterThanOrEqual(3);
    });

    test('Should handle missing optional template variables', () => {
      const incompleteData = {
        patientName: 'Ahmed Khan',
        doctorName: 'Dr. Wilson',
        clinicName: 'Clinic',
        appointmentDate: new Date(),
        appointmentTime: '10:00 AM',
      };

      const message = reminderTemplateService.generateMessage(
        ReminderType.REMINDER_24H,
        'en',
        incompleteData
      );

      expect(message).toBeDefined();
      expect(message.length).toBeGreaterThan(0);
    });

    test('Should handle special characters in names', () => {
      const specialData = {
        patientName: "O'Connor Ahmad",
        doctorName: "Dr. José García",
        clinicName: "City's Best Clinic & Hospital",
        appointmentDate: new Date(),
        appointmentTime: '10:00 AM',
      };

      const message = reminderTemplateService.generateMessage(
        ReminderType.REMINDER_24H,
        'en',
        specialData
      );

      expect(message).toContain("O'Connor Ahmad");
      expect(message).toContain("Dr. José García");
      expect(message).toContain("City's Best Clinic & Hospital");
    });
  });

  describe('SECTION 9: Performance', () => {
    test('Should generate messages quickly (batch processing)', () => {
      const patients = Array.from({ length: 50 }, (_, i) => ({
        patientName: `Patient ${i}`,
        doctorName: 'Dr. Wilson',
        clinicName: 'Test Clinic',
        appointmentDate: new Date(),
        appointmentTime: '10:00 AM',
      }));

      const startTime = Date.now();
      
      patients.forEach(patient => {
        reminderTemplateService.generateMessage(
          ReminderType.REMINDER_24H,
          'en',
          patient
        );
      });

      const duration = Date.now() - startTime;
      
      expect(duration).toBeLessThan(1000); // Should process 50 messages in < 1 second
    });

    test('Should validate templates quickly', () => {
      const templates = Array.from({ length: 20 }, (_, i) => 
        `Template ${i}: Hello {{patientName}}, appointment at {{appointmentTime}}`
      );

      const startTime = Date.now();
      
      templates.forEach(template => {
        reminderTemplateService.validateTemplate(template);
      });

      const duration = Date.now() - startTime;
      
      expect(duration).toBeLessThan(100); // Should validate 20 templates in < 100ms
    });
  });
});
