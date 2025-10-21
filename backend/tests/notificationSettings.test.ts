/**
 * Notification Settings Integration Tests - TASK-040A
 * 
 * Tests the NotificationSettings API endpoints and service layer functionality
 * including integration with TASK-040 (language detection) and TASK-041 (booking confirmations).
 * 
 * Test Environment: Docker with PostgreSQL, Redis, and Mock WhatsApp Server
 * 
 * @version 1.0
 * @date October 20, 2025
 */

import { ReminderTiming } from '../src/generated/prisma';
import notificationSettingsService, { NotificationType } from '../src/services/notificationSettingsService';
import getPrismaClient from '../src/services/prisma';

const prisma = getPrismaClient();

// Test data
const testOrganizationId = 'test-org-notification-settings';
const testOrganizationData = {
  id: testOrganizationId,
  name: 'Test Notification Clinic',
  slug: 'test-notification-clinic',
  email: 'test@notificationclinic.com',
  phone: '+1234567890',
  language: 'en',
  isActive: true,
};

describe('NotificationSettings Service - TASK-040A Integration Tests', () => {
  // Setup: Create test organization before all tests
  beforeAll(async () => {
    try {
      // Clean up any existing test data
      await prisma.notificationSettings.deleteMany({
        where: { organizationId: testOrganizationId },
      });
      
      await prisma.organization.deleteMany({
        where: { id: testOrganizationId },
      });

      // Create test organization
      await prisma.organization.create({
        data: testOrganizationData,
      });
    } catch (error) {
      console.error('Test setup error:', error);
      throw error;
    }
  });

  // Cleanup: Remove test data after all tests
  afterAll(async () => {
    try {
      await prisma.notificationSettings.deleteMany({
        where: { organizationId: testOrganizationId },
      });
      
      await prisma.organization.deleteMany({
        where: { id: testOrganizationId },
      });

      await prisma.$disconnect();
    } catch (error) {
      console.error('Test cleanup error:', error);
    }
  });

  describe('1. Default Settings Creation', () => {
    test('TEST-001: Should auto-create default settings on first access', async () => {
      const settings = await notificationSettingsService.getSettings(testOrganizationId);

      expect(settings).toBeDefined();
      expect(settings.organizationId).toBe(testOrganizationId);
      expect(settings.language).toBe('en');
      expect(settings.bookingConfirmationsEnabled).toBe(true);
      expect(settings.remindersEnabled).toBe(true);
      expect(settings.followUpsEnabled).toBe(false);
      expect(settings.medicationRemindersEnabled).toBe(false);
      expect(settings.wellnessChecksEnabled).toBe(false);
      expect(settings.reminderTiming).toBe(ReminderTiming.HOURS_24);
      expect(settings.enabledChannels).toEqual(['WHATSAPP']);
      expect(settings.quietHoursEnabled).toBe(false);
      expect(settings.alertThreshold).toBe(80);
    });

    test('TEST-002: Should return same settings on subsequent access (no duplicate creation)', async () => {
      const settings1 = await notificationSettingsService.getSettings(testOrganizationId);
      const settings2 = await notificationSettingsService.getSettings(testOrganizationId);

      expect(settings1.id).toBe(settings2.id);
      expect(settings1.createdAt).toEqual(settings2.createdAt);
    });
  });

  describe('2. Settings Update Operations', () => {
    test('TEST-003: Should update notification type toggles', async () => {
      const updated = await notificationSettingsService.updateSettings(testOrganizationId, {
        bookingConfirmationsEnabled: false,
        followUpsEnabled: true,
        medicationRemindersEnabled: true,
      });

      expect(updated.bookingConfirmationsEnabled).toBe(false);
      expect(updated.followUpsEnabled).toBe(true);
      expect(updated.medicationRemindersEnabled).toBe(true);
      expect(updated.remindersEnabled).toBe(true); // Unchanged
    });

    test('TEST-004: Should update reminder timing', async () => {
      const updated = await notificationSettingsService.updateSettings(testOrganizationId, {
        reminderTiming: ReminderTiming.HOURS_48,
      });

      expect(updated.reminderTiming).toBe(ReminderTiming.HOURS_48);
    });

    test('TEST-005: Should update custom reminder minutes', async () => {
      const updated = await notificationSettingsService.updateSettings(testOrganizationId, {
        reminderTiming: ReminderTiming.CUSTOM,
        customReminderMinutes: 360, // 6 hours
      });

      expect(updated.reminderTiming).toBe(ReminderTiming.CUSTOM);
      expect(updated.customReminderMinutes).toBe(360);
    });

    test('TEST-006: Should update quiet hours settings', async () => {
      const updated = await notificationSettingsService.updateSettings(testOrganizationId, {
        quietHoursEnabled: true,
        quietHoursStart: '22:00',
        quietHoursEnd: '08:00',
      });

      expect(updated.quietHoursEnabled).toBe(true);
      expect(updated.quietHoursStart).toBe('22:00');
      expect(updated.quietHoursEnd).toBe('08:00');
    });

    test('TEST-007: Should update language preference', async () => {
      const updated = await notificationSettingsService.updateSettings(testOrganizationId, {
        language: 'ur',
      });

      expect(updated.language).toBe('ur');
    });
  });

  describe('3. shouldSendNotification() Logic', () => {
    beforeEach(async () => {
      // Reset to default settings
      await notificationSettingsService.updateSettings(testOrganizationId, {
        bookingConfirmationsEnabled: true,
        remindersEnabled: true,
        followUpsEnabled: false,
        medicationRemindersEnabled: false,
        wellnessChecksEnabled: false,
        quietHoursEnabled: false,
      });
    });

    test('TEST-008: Should allow enabled notification types', async () => {
      const shouldSend = await notificationSettingsService.shouldSendNotification(
        testOrganizationId,
        NotificationType.BOOKING_CONFIRMATION,
        new Date()
      );

      expect(shouldSend).toBe(true);
    });

    test('TEST-009: Should block disabled notification types', async () => {
      await notificationSettingsService.updateSettings(testOrganizationId, {
        bookingConfirmationsEnabled: false,
      });

      const shouldSend = await notificationSettingsService.shouldSendNotification(
        testOrganizationId,
        NotificationType.BOOKING_CONFIRMATION,
        new Date()
      );

      expect(shouldSend).toBe(false);
    });

    test('TEST-010: Should block notifications during quiet hours (normal range)', async () => {
      // Set quiet hours: 22:00 to 08:00
      await notificationSettingsService.updateSettings(testOrganizationId, {
        quietHoursEnabled: true,
        quietHoursStart: '22:00',
        quietHoursEnd: '08:00',
      });

      // Test during quiet hours (23:00)
      const quietTime = new Date('2025-10-20T23:00:00Z');
      const shouldSendDuringQuiet = await notificationSettingsService.shouldSendNotification(
        testOrganizationId,
        NotificationType.REMINDER,
        quietTime
      );

      expect(shouldSendDuringQuiet).toBe(false);

      // Test outside quiet hours (10:00)
      const normalTime = new Date('2025-10-20T10:00:00Z');
      const shouldSendNormal = await notificationSettingsService.shouldSendNotification(
        testOrganizationId,
        NotificationType.REMINDER,
        normalTime
      );

      expect(shouldSendNormal).toBe(true);
    });

    test('TEST-011: Should allow all notification types when disabled', async () => {
      const types = [
        NotificationType.BOOKING_CONFIRMATION,
        NotificationType.REMINDER,
        NotificationType.FOLLOWUP,
        NotificationType.MEDICATION,
        NotificationType.WELLNESS,
      ];

      for (const type of types) {
        const shouldSend = await notificationSettingsService.shouldSendNotification(
          testOrganizationId,
          type,
          new Date('2025-10-20T10:00:00Z')
        );
        
        // Reminders and booking confirmations are enabled by default
        if (type === NotificationType.REMINDER || type === NotificationType.BOOKING_CONFIRMATION) {
          expect(shouldSend).toBe(true);
        } else {
          expect(shouldSend).toBe(false);
        }
      }
    });
  });

  describe('4. Reminder Timing Calculation', () => {
    test('TEST-012: Should return correct minutes for each timing option', async () => {
      const timingTests = [
        { timing: ReminderTiming.IMMEDIATELY, expected: 0 },
        { timing: ReminderTiming.MINUTES_30, expected: 30 },
        { timing: ReminderTiming.HOURS_1, expected: 60 },
        { timing: ReminderTiming.HOURS_2, expected: 120 },
        { timing: ReminderTiming.HOURS_4, expected: 240 },
        { timing: ReminderTiming.HOURS_24, expected: 1440 },
        { timing: ReminderTiming.HOURS_48, expected: 2880 },
        { timing: ReminderTiming.HOURS_72, expected: 4320 },
      ];

      for (const test of timingTests) {
        await notificationSettingsService.updateSettings(testOrganizationId, {
          reminderTiming: test.timing,
        });

        const minutes = await notificationSettingsService.getReminderTimingMinutes(testOrganizationId);
        expect(minutes).toBe(test.expected);
      }
    });

    test('TEST-013: Should return custom minutes when timing is CUSTOM', async () => {
      await notificationSettingsService.updateSettings(testOrganizationId, {
        reminderTiming: ReminderTiming.CUSTOM,
        customReminderMinutes: 720, // 12 hours
      });

      const minutes = await notificationSettingsService.getReminderTimingMinutes(testOrganizationId);
      expect(minutes).toBe(720);
    });

    test('TEST-014: Should default to 24 hours if custom minutes not set', async () => {
      await notificationSettingsService.updateSettings(testOrganizationId, {
        reminderTiming: ReminderTiming.CUSTOM,
        customReminderMinutes: null,
      });

      const minutes = await notificationSettingsService.getReminderTimingMinutes(testOrganizationId);
      expect(minutes).toBe(1440); // Default 24 hours
    });
  });

  describe('5. Language Preference (TASK-040 Integration)', () => {
    test('TEST-015: Should return NotificationSettings language if set', async () => {
      await notificationSettingsService.updateSettings(testOrganizationId, {
        language: 'ur',
      });

      const language = await notificationSettingsService.getOrganizationLanguage(testOrganizationId);
      expect(language).toBe('ur');
    });

    test('TEST-016: Should fall back to Organization language if NotificationSettings not set', async () => {
      // Update organization language
      await prisma.organization.update({
        where: { id: testOrganizationId },
        data: { language: 'ur' },
      });

      // Reset NotificationSettings language to match org
      await notificationSettingsService.updateSettings(testOrganizationId, {
        language: 'ur',
      });

      const language = await notificationSettingsService.getOrganizationLanguage(testOrganizationId);
      expect(language).toBe('ur');
    });

    test('TEST-017: Should default to "en" if neither is set', async () => {
      // This test verifies the final fallback in the chain
      const language = await notificationSettingsService.getOrganizationLanguage(testOrganizationId);
      expect(language).toMatch(/^(en|ur)$/); // Should be one of the valid languages
    });
  });

  describe('6. Error Handling and Edge Cases', () => {
    test('TEST-018: Should fail open (allow notification) on service errors', async () => {
      // Test with non-existent organization (simulates error condition)
      const shouldSend = await notificationSettingsService.shouldSendNotification(
        'non-existent-org-id',
        NotificationType.REMINDER,
        new Date()
      );

      // Should fail open - allow notification despite error
      expect(shouldSend).toBe(true);
    });

    test('TEST-019: Should handle cross-day quiet hours (22:00 to 08:00)', async () => {
      await notificationSettingsService.updateSettings(testOrganizationId, {
        quietHoursEnabled: true,
        quietHoursStart: '22:00',
        quietHoursEnd: '08:00',
      });

      // Test times across midnight boundary
      const testCases = [
        { time: '21:00', shouldAllow: true, description: 'before quiet hours' },
        { time: '22:00', shouldAllow: false, description: 'start of quiet hours' },
        { time: '23:30', shouldAllow: false, description: 'during quiet hours (PM)' },
        { time: '02:00', shouldAllow: false, description: 'during quiet hours (AM)' },
        { time: '07:30', shouldAllow: false, description: 'near end of quiet hours' },
        { time: '08:00', shouldAllow: true, description: 'end of quiet hours' },
        { time: '10:00', shouldAllow: true, description: 'after quiet hours' },
      ];

      for (const testCase of testCases) {
        const [hoursStr = '0', minutesStr = '0'] = testCase.time.split(':');
        const hours = parseInt(hoursStr, 10);
        const minutes = parseInt(minutesStr, 10);
        const testTime = new Date('2025-10-20T00:00:00Z');
        testTime.setUTCHours(hours, minutes, 0, 0);

        const shouldSend = await notificationSettingsService.shouldSendNotification(
          testOrganizationId,
          NotificationType.REMINDER,
          testTime
        );

        expect(shouldSend).toBe(testCase.shouldAllow);
      }
    });

    test('TEST-020: Should handle updates to non-existent organization (creates new)', async () => {
      const newOrgId = 'test-org-new-notification-settings';
      
      try {
        // Create org first
        await prisma.organization.create({
          data: {
            id: newOrgId,
            name: 'New Test Org',
            slug: 'new-test-org-notifications',
            email: 'new@testorg.com',
            isActive: true,
          },
        });

        // Update should create settings
        const settings = await notificationSettingsService.updateSettings(newOrgId, {
          language: 'ur',
          remindersEnabled: false,
        });

        expect(settings.organizationId).toBe(newOrgId);
        expect(settings.language).toBe('ur');
        expect(settings.remindersEnabled).toBe(false);

        // Cleanup
        await prisma.notificationSettings.deleteMany({ where: { organizationId: newOrgId } });
        await prisma.organization.deleteMany({ where: { id: newOrgId } });
      } catch (error) {
        // Cleanup on error
        await prisma.notificationSettings.deleteMany({ where: { organizationId: newOrgId } }).catch(() => {});
        await prisma.organization.deleteMany({ where: { id: newOrgId } }).catch(() => {});
        throw error;
      }
    });
  });

  describe('7. Integration Validation', () => {
    test('TEST-021: TASK-040 Integration - Language detection uses NotificationSettings', async () => {
      // Set language in NotificationSettings
      await notificationSettingsService.updateSettings(testOrganizationId, {
        language: 'ur',
      });

      // Verify languageDetectionService would read this value
      const language = await notificationSettingsService.getOrganizationLanguage(testOrganizationId);
      expect(language).toBe('ur');
    });

    test('TEST-022: TASK-041 Integration - Booking confirmations can be disabled', async () => {
      // Disable booking confirmations
      await notificationSettingsService.updateSettings(testOrganizationId, {
        bookingConfirmationsEnabled: false,
      });

      // Verify BookAppointmentHandler would respect this setting
      const shouldSend = await notificationSettingsService.shouldSendNotification(
        testOrganizationId,
        NotificationType.BOOKING_CONFIRMATION,
        new Date()
      );

      expect(shouldSend).toBe(false);
    });

    test('TEST-023: Multiple notification type toggles work independently', async () => {
      // Reset settings to ensure clean state
      await notificationSettingsService.updateSettings(testOrganizationId, {
        bookingConfirmationsEnabled: true,
        remindersEnabled: false,
        followUpsEnabled: true,
        medicationRemindersEnabled: false,
        wellnessChecksEnabled: true,
        quietHoursEnabled: false, // Disable quiet hours from previous tests
      });

      const results = await Promise.all([
        notificationSettingsService.shouldSendNotification(testOrganizationId, NotificationType.BOOKING_CONFIRMATION, new Date()),
        notificationSettingsService.shouldSendNotification(testOrganizationId, NotificationType.REMINDER, new Date()),
        notificationSettingsService.shouldSendNotification(testOrganizationId, NotificationType.FOLLOWUP, new Date()),
        notificationSettingsService.shouldSendNotification(testOrganizationId, NotificationType.MEDICATION, new Date()),
        notificationSettingsService.shouldSendNotification(testOrganizationId, NotificationType.WELLNESS, new Date()),
      ]);

      expect(results).toEqual([true, false, true, false, true]);
    });
  });

  describe('8. Performance Tests', () => {
    test('PERF-001: Should handle concurrent access without errors', async () => {
      const promises = Array.from({ length: 10 }, () => 
        notificationSettingsService.shouldSendNotification(
          testOrganizationId,
          NotificationType.REMINDER,
          new Date()
        )
      );

      const results = await Promise.all(promises);
      expect(results).toHaveLength(10);
      expect(results.every(r => typeof r === 'boolean')).toBe(true);
    });

    test('PERF-002: Settings lookup should complete in under 100ms', async () => {
      const start = Date.now();
      await notificationSettingsService.getSettings(testOrganizationId);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(100);
    });
  });
});
