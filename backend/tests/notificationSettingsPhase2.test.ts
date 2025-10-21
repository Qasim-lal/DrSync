/**
 * Notification Settings Phase 2 Tests - TASK-040A
 * 
 * Tests for Phase 2 features:
 * - Preset modes (BUDGET, RECOMMENDED, PREMIUM)
 * - Cost calculator
 * - Preset comparison
 * - Message cost tracking integration
 * 
 * @version 2.0
 * @date October 20, 2025
 */

import { PresetMode, Prisma } from '../src/generated/prisma';
import notificationSettingsService from '../src/services/notificationSettingsService';
import messageCostTrackingService, { MessageType } from '../src/services/messageCostTrackingService';
import getPrismaClient from '../src/services/prisma';

const prisma = getPrismaClient();

// Test data
const testOrganizationId = 'test-org-phase2-settings';
const testOrganizationData = {
  id: testOrganizationId,
  name: 'Test Phase 2 Clinic',
  slug: 'test-phase2-clinic',
  email: 'test@phase2clinic.com',
  phone: '+1234567890',
  language: 'en',
  isActive: true,
};

describe('NotificationSettings Phase 2 - Preset Modes', () => {
  // Setup: Create test organization before all tests
  beforeAll(async () => {
    try {
      // Clean up in correct order (child records first)
      await prisma.messageCostTracking.deleteMany({
        where: { organizationId: testOrganizationId },
      });
      
      await prisma.notificationSettings.deleteMany({
        where: { organizationId: testOrganizationId },
      });
      
      await prisma.organization.deleteMany({
        where: { id: testOrganizationId },
      });

      // Create test organization
      const org = await prisma.organization.create({
        data: testOrganizationData,
      });
      
      // Verify organization was created
      expect(org.id).toBe(testOrganizationId);
    } catch (error) {
      console.error('Phase 2 test setup error:', error);
      throw error;
    }
  });

  afterAll(async () => {
    try {
      await prisma.messageCostTracking.deleteMany({
        where: { organizationId: testOrganizationId },
      });
      
      await prisma.notificationSettings.deleteMany({
        where: { organizationId: testOrganizationId },
      });
      
      await prisma.organization.deleteMany({
        where: { id: testOrganizationId },
      });

      await prisma.$disconnect();
    } catch (error) {
      console.error('Phase 2 test cleanup error:', error);
    }
  });

  describe('1. Preset Mode Application', () => {
    test('P2-001: Should apply BUDGET preset correctly', async () => {
      const settings = await notificationSettingsService.applyPreset(
        testOrganizationId,
        'BUDGET'
      );

      expect(settings.presetMode).toBe(PresetMode.BUDGET);
      expect(settings.bookingConfirmationsEnabled).toBe(false);
      expect(settings.remindersEnabled).toBe(true); // Only this enabled
      expect(settings.followUpsEnabled).toBe(false);
      expect(settings.medicationRemindersEnabled).toBe(false);
      expect(settings.wellnessChecksEnabled).toBe(false);
      expect(settings.preAppointmentInstructionsEnabled).toBe(false);
      expect(settings.arrivalNotificationEnabled).toBe(false);
      expect(settings.appointmentCompletionEnabled).toBe(false);
      expect(settings.reschedulingConfirmationEnabled).toBe(false);
      expect(settings.cancellationConfirmationEnabled).toBe(false);
      expect(settings.noShowFollowupEnabled).toBe(false);
      expect(settings.paymentReminderEnabled).toBe(false);
    });

    test('P2-002: Should apply RECOMMENDED preset correctly', async () => {
      const settings = await notificationSettingsService.applyPreset(
        testOrganizationId,
        'RECOMMENDED'
      );

      expect(settings.presetMode).toBe(PresetMode.RECOMMENDED);
      expect(settings.bookingConfirmationsEnabled).toBe(true);
      expect(settings.remindersEnabled).toBe(true);
      expect(settings.followUpsEnabled).toBe(false);
      expect(settings.reschedulingConfirmationEnabled).toBe(true);
      expect(settings.cancellationConfirmationEnabled).toBe(true);
      
      // Others should be disabled
      expect(settings.medicationRemindersEnabled).toBe(false);
      expect(settings.wellnessChecksEnabled).toBe(false);
      expect(settings.preAppointmentInstructionsEnabled).toBe(false);
      expect(settings.arrivalNotificationEnabled).toBe(false);
      expect(settings.noShowFollowupEnabled).toBe(false);
      expect(settings.paymentReminderEnabled).toBe(false);
    });

    test('P2-003: Should apply PREMIUM preset correctly', async () => {
      const settings = await notificationSettingsService.applyPreset(
        testOrganizationId,
        'PREMIUM'
      );

      expect(settings.presetMode).toBe(PresetMode.PREMIUM);
      expect(settings.bookingConfirmationsEnabled).toBe(true);
      expect(settings.remindersEnabled).toBe(true);
      expect(settings.followUpsEnabled).toBe(true);
      expect(settings.preAppointmentInstructionsEnabled).toBe(true);
      expect(settings.arrivalNotificationEnabled).toBe(true);
      expect(settings.appointmentCompletionEnabled).toBe(true);
      expect(settings.reschedulingConfirmationEnabled).toBe(true);
      expect(settings.cancellationConfirmationEnabled).toBe(true);
      expect(settings.noShowFollowupEnabled).toBe(true);
      expect(settings.paymentReminderEnabled).toBe(true);
      
      // These are opt-in (expensive)
      expect(settings.medicationRemindersEnabled).toBe(false);
      expect(settings.wellnessChecksEnabled).toBe(false);
    });

    test('P2-004: Should switch between presets without errors', async () => {
      // Start with BUDGET
      await notificationSettingsService.applyPreset(testOrganizationId, 'BUDGET');
      
      // Switch to RECOMMENDED
      const recommended = await notificationSettingsService.applyPreset(testOrganizationId, 'RECOMMENDED');
      expect(recommended.presetMode).toBe(PresetMode.RECOMMENDED);
      
      // Switch to PREMIUM
      const premium = await notificationSettingsService.applyPreset(testOrganizationId, 'PREMIUM');
      expect(premium.presetMode).toBe(PresetMode.PREMIUM);
      
      // Switch back to BUDGET
      const budget = await notificationSettingsService.applyPreset(testOrganizationId, 'BUDGET');
      expect(budget.presetMode).toBe(PresetMode.BUDGET);
    });

    test('P2-005: Should preserve other settings when applying preset', async () => {
      // Set custom quiet hours
      await notificationSettingsService.updateSettings(testOrganizationId, {
        quietHoursEnabled: true,
        quietHoursStart: '22:00',
        quietHoursEnd: '08:00',
        language: 'ur',
      });
      
      // Apply preset
      const settings = await notificationSettingsService.applyPreset(testOrganizationId, 'RECOMMENDED');
      
      // Preset should be applied
      expect(settings.presetMode).toBe(PresetMode.RECOMMENDED);
      
      // But other settings should be preserved
      expect(settings.quietHoursEnabled).toBe(true);
      expect(settings.quietHoursStart).toBe('22:00');
      expect(settings.quietHoursEnd).toBe('08:00');
      expect(settings.language).toBe('ur');
    });
  });

  describe('2. Cost Calculator', () => {
    beforeEach(async () => {
      // Ensure organization still exists
      const org = await prisma.organization.findUnique({
        where: { id: testOrganizationId },
      });
      
      if (!org) {
        await prisma.organization.create({
          data: testOrganizationData,
        });
      }
      
      // Reset to RECOMMENDED preset
      await notificationSettingsService.applyPreset(testOrganizationId, 'RECOMMENDED');
    });

    test('P2-006: Should calculate cost correctly for RECOMMENDED preset', async () => {
      const costData = await notificationSettingsService.calculateMonthlyCost(
        testOrganizationId,
        800 // 800 appointments
      );

      expect(costData.costPerMessage).toBe(3.5);
      expect(costData.totalMessages).toBeGreaterThan(0);
      expect(costData.estimatedCost).toBe(costData.totalMessages * 3.5);
      expect(costData.breakdown).toBeInstanceOf(Array);
      expect(costData.breakdown.length).toBeGreaterThan(0);
    });

    test('P2-007: Should include only enabled message types in calculation', async () => {
      const costData = await notificationSettingsService.calculateMonthlyCost(
        testOrganizationId,
        800
      );

      // Check that enabled types have counts > 0
      const bookingConfirmations = costData.breakdown.find(b => b.type === 'Booking Confirmations');
      const reminders = costData.breakdown.find(b => b.type === 'Reminders');
      expect(bookingConfirmations?.enabled).toBe(true);
      expect(bookingConfirmations?.count).toBeGreaterThan(0);
      expect(reminders?.enabled).toBe(true);
      expect(reminders?.count).toBeGreaterThan(0);

      // Disabled types should have count = 0
      const followUps = costData.breakdown.find(b => b.type === 'Follow-ups');
      expect(followUps?.enabled).toBe(false);
      expect(followUps?.count).toBe(0);
      expect(followUps?.cost).toBe(0);
    });

    test('P2-008: Should handle zero appointments gracefully', async () => {
      const costData = await notificationSettingsService.calculateMonthlyCost(
        testOrganizationId,
        0
      );

      expect(costData.totalMessages).toBe(0);
      expect(costData.estimatedCost).toBe(0);
      expect(costData.breakdown.every(b => b.count === 0)).toBe(true);
    });

    test('P2-009: Should use stored averageMonthlyAppointments if not provided', async () => {
      // Update settings with average
      await notificationSettingsService.updateSettings(testOrganizationId, {
        averageMonthlyAppointments: 500,
      });

      // Calculate without providing appointments
      const costData = await notificationSettingsService.calculateMonthlyCost(testOrganizationId);

      // Should use the stored value (500 appointments)
      expect(costData.totalMessages).toBeGreaterThan(0);
      expect(costData.estimatedCost).toBeGreaterThan(0);
    });

    test('P2-010: Should calculate different costs for different presets', async () => {
      const appointments = 800;

      // BUDGET
      await notificationSettingsService.applyPreset(testOrganizationId, 'BUDGET');
      const budgetCost = await notificationSettingsService.calculateMonthlyCost(
        testOrganizationId,
        appointments
      );

      // RECOMMENDED
      await notificationSettingsService.applyPreset(testOrganizationId, 'RECOMMENDED');
      const recommendedCost = await notificationSettingsService.calculateMonthlyCost(
        testOrganizationId,
        appointments
      );

      // PREMIUM
      await notificationSettingsService.applyPreset(testOrganizationId, 'PREMIUM');
      const premiumCost = await notificationSettingsService.calculateMonthlyCost(
        testOrganizationId,
        appointments
      );

      // Budget should be cheapest, Premium most expensive
      expect(budgetCost.estimatedCost).toBeLessThan(recommendedCost.estimatedCost);
      expect(recommendedCost.estimatedCost).toBeLessThan(premiumCost.estimatedCost);
    });

    test('P2-011: Should handle custom cost per message', async () => {
      // Set custom cost per message
      await notificationSettingsService.updateSettings(testOrganizationId, {
        costPerMessage: new Prisma.Decimal(5.0),
      });

      const costData = await notificationSettingsService.calculateMonthlyCost(
        testOrganizationId,
        100
      );

      expect(costData.costPerMessage).toBe(5.0);
      expect(costData.estimatedCost).toBe(costData.totalMessages * 5.0);
    });
  });

  describe('3. Preset Comparison', () => {
    test('P2-012: Should compare all presets correctly', async () => {
      // Set to RECOMMENDED
      await notificationSettingsService.applyPreset(testOrganizationId, 'RECOMMENDED');

      const comparison = await notificationSettingsService.comparePresets(
        testOrganizationId,
        800
      );

      expect(comparison.current.mode).toBe('RECOMMENDED');
      expect(comparison.current.cost).toBeGreaterThan(0);
      
      expect(comparison.budget.cost).toBeGreaterThan(0);
      expect(comparison.budget.savings).toBeGreaterThanOrEqual(0);
      
      expect(comparison.recommended.cost).toBeGreaterThan(0);
      
      expect(comparison.premium.cost).toBeGreaterThan(0);
      expect(comparison.premium.additionalCost).toBeGreaterThanOrEqual(0);
    });

    test('P2-013: Should show savings when current is more expensive than comparison', async () => {
      await notificationSettingsService.applyPreset(testOrganizationId, 'PREMIUM');

      const comparison = await notificationSettingsService.comparePresets(
        testOrganizationId,
        800
      );

      // Premium is most expensive, so budget and recommended should show savings
      expect(comparison.budget.savings).toBeGreaterThan(0);
      expect(comparison.recommended.savings).toBeGreaterThan(0);
    });

    test('P2-014: Should show additional cost when comparison is more expensive', async () => {
      await notificationSettingsService.applyPreset(testOrganizationId, 'BUDGET');

      const comparison = await notificationSettingsService.comparePresets(
        testOrganizationId,
        800
      );

      // Budget is cheapest, so premium should show additional cost
      expect(comparison.premium.additionalCost).toBeGreaterThan(0);
    });

    test('P2-015: Should handle CUSTOM preset mode', async () => {
      // Manually set settings (not using preset)
      await notificationSettingsService.updateSettings(testOrganizationId, {
        bookingConfirmationsEnabled: true,
        remindersEnabled: true,
        followUpsEnabled: true,
        // This creates a CUSTOM configuration
      });

      const comparison = await notificationSettingsService.comparePresets(
        testOrganizationId,
        800
      );

      // Mode should reflect custom or recommended
      expect(comparison.current.mode).toBeDefined();
      expect(comparison.current.cost).toBeGreaterThan(0);
    });
  });

  describe('4. Message Cost Tracking Integration', () => {
    beforeEach(async () => {
      // Clean up message cost tracking before each test
      await prisma.messageCostTracking.deleteMany({
        where: { organizationId: testOrganizationId },
      });
    });
    
    test('P2-016: Should track sent messages correctly', async () => {
      const year = new Date().getFullYear();
      const month = new Date().getMonth() + 1;

      // Track some messages
      await messageCostTrackingService.trackMessageSent(
        testOrganizationId,
        MessageType.BOOKING_CONFIRMATION,
        10
      );

      await messageCostTrackingService.trackMessageSent(
        testOrganizationId,
        MessageType.REMINDER,
        15
      );

      // Get summary
      const summary = await messageCostTrackingService.getMonthlySummary(
        testOrganizationId,
        year,
        month
      );

      expect(summary).toBeDefined();
      expect(summary!.totalMessagesSent).toBe(25);
      expect(summary!.estimatedCost).toBeGreaterThan(0);
      
      const bookingBreakdown = summary!.breakdown.find(b => b.messageType === 'Booking Confirmations');
      expect(bookingBreakdown?.count).toBe(10);
    });

    test('P2-017: Should track saved messages correctly', async () => {
      const year = new Date().getFullYear();
      const month = new Date().getMonth() + 1;

      // Track saved messages
      await messageCostTrackingService.trackMessageSaved(
        testOrganizationId,
        MessageType.FOLLOWUP,
        5
      );

      const summary = await messageCostTrackingService.getMonthlySummary(
        testOrganizationId,
        year,
        month
      );

      expect(summary).toBeDefined();
      expect(summary!.messagesSavedBySettings).toBeGreaterThanOrEqual(5);
      expect(summary!.costSaved).toBeGreaterThan(0);
    });

    test('P2-018: Should check spending cap correctly', async () => {
      // Set monthly cap
      await notificationSettingsService.updateSettings(testOrganizationId, {
        monthlyCap: new Prisma.Decimal(1000),
        alertThreshold: 80,
      });

      // Track some spending
      await messageCostTrackingService.trackMessageSent(
        testOrganizationId,
        MessageType.BOOKING_CONFIRMATION,
        200 // 200 * 3.5 = 700
      );

      const capCheck = await messageCostTrackingService.checkSpendingCap(testOrganizationId);

      expect(capCheck.monthlyCap).toBe(1000);
      expect(capCheck.currentSpend).toBeGreaterThan(0);
      expect(capCheck.percentageUsed).toBeGreaterThan(0);
      expect(capCheck.alertThreshold).toBe(80);
    });

    test('P2-019: Should alert when approaching spending cap', async () => {
      // Set low cap
      await notificationSettingsService.updateSettings(testOrganizationId, {
        monthlyCap: new Prisma.Decimal(100),
        alertThreshold: 80,
        currentMonthSpend: new Prisma.Decimal(85), // 85% of cap
      });

      const capCheck = await messageCostTrackingService.checkSpendingCap(testOrganizationId);

      expect(capCheck.isNearCap).toBe(true);
      expect(capCheck.percentageUsed).toBeGreaterThanOrEqual(80);
    });

    test('P2-020: Should not alert when below spending cap threshold', async () => {
      // Reset to lower spending
      await notificationSettingsService.updateSettings(testOrganizationId, {
        monthlyCap: new Prisma.Decimal(1000),
        alertThreshold: 80,
        currentMonthSpend: new Prisma.Decimal(500), // 50% of cap
      });

      const capCheck = await messageCostTrackingService.checkSpendingCap(testOrganizationId);

      expect(capCheck.isNearCap).toBe(false);
      expect(capCheck.percentageUsed).toBeLessThan(80);
    });
  });

  describe('5. Integration & Edge Cases', () => {
    test('P2-021: Should handle very large appointment counts', async () => {
      const costData = await notificationSettingsService.calculateMonthlyCost(
        testOrganizationId,
        10000 // 10k appointments
      );

      expect(costData.totalMessages).toBeGreaterThan(0);
      expect(costData.estimatedCost).toBeGreaterThan(0);
      expect(costData.breakdown).toBeDefined();
    });

    test('P2-022: Should handle preset application for new organization', async () => {
      const newOrgId = 'test-org-preset-new';
      
      try {
        await prisma.organization.create({
          data: {
            id: newOrgId,
            name: 'New Test Org',
            slug: 'new-test-org-preset',
            email: 'new@testorgpreset.com',
            isActive: true,
          },
        });

        // Apply preset to new org (should create settings)
        const settings = await notificationSettingsService.applyPreset(newOrgId, 'RECOMMENDED');

        expect(settings.organizationId).toBe(newOrgId);
        expect(settings.presetMode).toBe(PresetMode.RECOMMENDED);

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

    test('P2-023: Should maintain data consistency across multiple operations', async () => {
      // Apply preset
      await notificationSettingsService.applyPreset(testOrganizationId, 'BUDGET');
      
      // Calculate cost
      const cost1 = await notificationSettingsService.calculateMonthlyCost(testOrganizationId, 500);
      
      // Compare presets
      const comparison = await notificationSettingsService.comparePresets(testOrganizationId, 500);
      
      // Apply different preset
      await notificationSettingsService.applyPreset(testOrganizationId, 'PREMIUM');
      
      // Calculate again
      const cost2 = await notificationSettingsService.calculateMonthlyCost(testOrganizationId, 500);
      
      // Premium should cost more than Budget
      expect(cost2.estimatedCost).toBeGreaterThan(cost1.estimatedCost);
      
      // Comparison data should be valid
      expect(comparison.current.cost).toBeDefined();
      expect(comparison.budget.cost).toBeDefined();
    });

    test('P2-024: Should handle concurrent preset applications', async () => {
      const promises = [
        notificationSettingsService.applyPreset(testOrganizationId, 'BUDGET'),
        notificationSettingsService.applyPreset(testOrganizationId, 'RECOMMENDED'),
        notificationSettingsService.applyPreset(testOrganizationId, 'PREMIUM'),
      ];

      // Should complete without errors
      await Promise.all(promises);

      // Final state should be one of the presets
      const settings = await notificationSettingsService.getSettings(testOrganizationId);
      expect([PresetMode.BUDGET, PresetMode.RECOMMENDED, PresetMode.PREMIUM]).toContain(settings.presetMode);
    });

    test('P2-025: Should handle cost tracking for non-existent organization', async () => {
      // This should not throw, but should handle gracefully
      const capCheck = await messageCostTrackingService.checkSpendingCap('non-existent-org');

      expect(capCheck.monthlyCap).toBeNull();
      expect(capCheck.isNearCap).toBe(false);
    });
  });
});

describe('NotificationSettings Phase 2 - Performance', () => {
  beforeAll(async () => {
    try {
      // Ensure organization exists for performance tests
      const existingOrg = await prisma.organization.findUnique({
        where: { id: testOrganizationId },
      });
      
      if (!existingOrg) {
        await prisma.organization.create({
          data: testOrganizationData,
        });
      }
      
      // Initialize with a preset
      await notificationSettingsService.applyPreset(testOrganizationId, 'RECOMMENDED');
    } catch (error) {
      console.error('Performance test setup error:', error);
      throw error;
    }
  });
  
  test('PERF-P2-001: Preset application should complete in <100ms', async () => {
    const start = Date.now();
    await notificationSettingsService.applyPreset(testOrganizationId, 'RECOMMENDED');
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(100);
  });

  test('PERF-P2-002: Cost calculation should complete in <100ms', async () => {
    const start = Date.now();
    await notificationSettingsService.calculateMonthlyCost(testOrganizationId, 800);
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(100);
  });

  test('PERF-P2-003: Preset comparison should complete in <150ms', async () => {
    const start = Date.now();
    await notificationSettingsService.comparePresets(testOrganizationId, 800);
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(150);
  });
});
