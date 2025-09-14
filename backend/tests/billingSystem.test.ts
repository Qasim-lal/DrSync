/**
 * Billing System Integration Tests
 * 
 * Test Coverage:
 * - Payment processing for Pakistani and international markets
 * - Subscription calculations and management
 * - Trial abuse prevention
 * - Multi-currency support
 * - Billing history and analytics
 * - Admin dashboard functionality
 * 
 * @author DrSync Development Team
 * @version 1.0.0
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import { PrismaClient } from '../src/generated/prisma';
import PaymentService from '../src/services/paymentService';
import SubscriptionService, { TRIAL_LIMITS } from '../src/services/subscriptionService';

const prisma = new PrismaClient();

// Test data setup
const testOrganization = {
  id: 'test_org_123',
  name: 'Test Healthcare Clinic',
  slug: 'test-clinic',
  email: 'test@testclinic.com',
  region: 'PAKISTAN',
  doctorCount: 2,
  subscriptionStatus: 'TRIAL' as const,
};

const testUser = {
  id: 'test_user_123',
  email: 'admin@testclinic.com',
  firstName: 'Test',
  lastName: 'Admin',
  role: 'ORG_ADMIN' as const,
  organizationId: testOrganization.id,
};

describe('Billing System Integration Tests', () => {
  beforeAll(async () => {
    // Clean up any existing test data
    await cleanup();
  });

  afterAll(async () => {
    await cleanup();
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Create test organization and user
    await prisma.organization.create({
      data: testOrganization,
    });

    await prisma.user.create({
      data: {
        ...testUser,
        password: 'hashedPassword123',
      },
    });
  });

  afterEach(async () => {
    await cleanup();
  });

  // ============================================================================
  // PAYMENT PROCESSING TESTS
  // ============================================================================

  describe('Payment Processing', () => {
    test('should calculate correct subscription amounts for Pakistani market', () => {
      const monthlyAmount = PaymentService.calculateSubscriptionAmount(2, 'MONTHLY', 'PKR');
      const yearlyAmount = PaymentService.calculateSubscriptionAmount(2, 'YEARLY', 'PKR');

      expect(monthlyAmount).toBe(6000); // 2 doctors × Rs. 3,000
      expect(yearlyAmount).toBe(59760); // 2 doctors × Rs. 29,880 (17% discount)
      expect(yearlyAmount).toBeLessThan(monthlyAmount * 12);
    });

    test('should calculate correct subscription amounts for international market', () => {
      const monthlyAmount = PaymentService.calculateSubscriptionAmount(3, 'MONTHLY', 'USD');
      const yearlyAmount = PaymentService.calculateSubscriptionAmount(3, 'YEARLY', 'USD');

      expect(monthlyAmount).toBe(60); // 3 doctors × $20
      expect(yearlyAmount).toBeCloseTo(597.6, 1); // 3 doctors × $199.20 (17% discount)
      expect(yearlyAmount).toBeLessThan(monthlyAmount * 12);
    });

    test('should process JazzCash payment successfully', async () => {
      const paymentRequest = {
        organizationId: testOrganization.id,
        amount: 6000,
        currency: 'PKR',
        paymentMethod: 'JAZZCASH',
        billingPeriod: '2025-09',
        subscriptionType: 'MONTHLY' as const,
        doctorCount: 2,
      };

      const result = await PaymentService.createPaymentIntent(paymentRequest);

      expect(result.success).toBe(true);
      expect(result.paymentIntentId).toBeTruthy();
      expect(result.transactionId).toMatch(/^JC_/);

      // Verify payment intent was created in database
      const paymentIntent = await prisma.paymentIntent.findUnique({
        where: { id: result.paymentIntentId },
      });

      expect(paymentIntent).toBeTruthy();
      expect(paymentIntent?.status).toBe('SUCCESS');
      expect(Number(paymentIntent?.amount)).toBe(6000);

      // Verify billing history was created
      const billingHistory = await prisma.billingHistory.findFirst({
        where: { 
          organizationId: testOrganization.id,
          paymentIntentId: result.paymentIntentId,
        },
      });

      expect(billingHistory).toBeTruthy();
      expect(billingHistory?.paymentStatus).toBe('SUCCESS');
    });

    test('should process EasyPaisa payment successfully', async () => {
      const result = await PaymentService.createPaymentIntent({
        organizationId: testOrganization.id,
        amount: 3000,
        currency: 'PKR',
        paymentMethod: 'EASYPAISA',
        billingPeriod: '2025-09',
        subscriptionType: 'MONTHLY',
        doctorCount: 1,
      });

      expect(result.success).toBe(true);
      expect(result.transactionId).toMatch(/^EP_/);
    });

    test('should process Payoneer payment for international client', async () => {
      const result = await PaymentService.createPaymentIntent({
        organizationId: testOrganization.id,
        amount: 40,
        currency: 'USD',
        paymentMethod: 'PAYONEER',
        billingPeriod: '2025-09',
        subscriptionType: 'MONTHLY',
        doctorCount: 2,
      });

      expect(result.success).toBe(true);
      expect(result.transactionId).toMatch(/^PO_/);
    });

    test('should process USDT cryptocurrency payment', async () => {
      const result = await PaymentService.createPaymentIntent({
        organizationId: testOrganization.id,
        amount: 40,
        currency: 'USDT',
        paymentMethod: 'USDT',
        billingPeriod: '2025-09',
        subscriptionType: 'MONTHLY',
        doctorCount: 2,
      });

      expect(result.success).toBe(true);
      expect(result.transactionId).toMatch(/^USDT_/);
      expect(result.gatewayResponse?.blockchainTxHash).toMatch(/^0x/);
    });

    test('should handle bank transfer with pending status', async () => {
      const result = await PaymentService.createPaymentIntent({
        organizationId: testOrganization.id,
        amount: 6000,
        currency: 'PKR',
        paymentMethod: 'BANK_TRANSFER',
        billingPeriod: '2025-09',
        subscriptionType: 'MONTHLY',
        doctorCount: 2,
      });

      expect(result.success).toBe(true);
      expect(result.transactionId).toMatch(/^BT_/);
      expect(result.gatewayResponse?.status).toBe('PENDING_VERIFICATION');
    });

    test('should reject unsupported payment method', async () => {
      const result = await PaymentService.createPaymentIntent({
        organizationId: testOrganization.id,
        amount: 6000,
        currency: 'PKR',
        paymentMethod: 'UNSUPPORTED_METHOD',
        billingPeriod: '2025-09',
        subscriptionType: 'MONTHLY',
        doctorCount: 2,
      });

      expect(result.success).toBe(false);
      expect(result.errorMessage).toContain('Unsupported payment method');
    });

    test('should reject currency not supported by payment method', async () => {
      const result = await PaymentService.createPaymentIntent({
        organizationId: testOrganization.id,
        amount: 40,
        currency: 'USD',
        paymentMethod: 'JAZZCASH', // JazzCash only supports PKR
        billingPeriod: '2025-09',
        subscriptionType: 'MONTHLY',
        doctorCount: 2,
      });

      expect(result.success).toBe(false);
      expect(result.errorMessage).toContain('does not support currency USD');
    });
  });

  // ============================================================================
  // SUBSCRIPTION MANAGEMENT TESTS
  // ============================================================================

  describe('Subscription Management', () => {
    test('should calculate subscription pricing correctly', () => {
      const pricing = SubscriptionService.calculateSubscriptionPricing(3, 'PAKISTAN');

      expect(pricing.doctorCount).toBe(3);
      expect(pricing.monthlyAmount).toBe(9000); // 3 × Rs. 3,000
      expect(pricing.yearlyAmount).toBe(89640); // 3 × Rs. 29,880
      expect(pricing.yearlyDiscount).toBe(17);
      expect(pricing.currency).toBe('PKR');
      expect(pricing.region).toBe('PAKISTAN');
    });

    test('should calculate international pricing correctly', () => {
      const pricing = SubscriptionService.calculateSubscriptionPricing(5, 'INTERNATIONAL');

      expect(pricing.monthlyAmount).toBe(100); // 5 × $20
      expect(pricing.yearlyAmount).toBe(996); // 5 × $199.20
      expect(pricing.currency).toBe('USD');
    });

    test('should start trial period correctly', async () => {
      const organization = await SubscriptionService.startTrialPeriod(testOrganization.id);

      expect(organization.subscriptionStatus).toBe('TRIAL');
      expect(organization.subscriptionEndsAt).toBeTruthy();

      // Trial should end in 14 days
      const trialEndDate = new Date(organization.subscriptionEndsAt!);
      const expectedEndDate = new Date();
      expectedEndDate.setDate(expectedEndDate.getDate() + TRIAL_LIMITS.durationDays);

      expect(trialEndDate.toDateString()).toBe(expectedEndDate.toDateString());
    });

    test('should check trial limits correctly', async () => {
      // Create some test data to check limits
      await prisma.patient.createMany({
        data: Array.from({ length: 10 }, (_, i) => ({
          firstName: `Patient${i}`,
          lastName: 'Test',
          phone: `+92300000000${i}`,
          organizationId: testOrganization.id,
        })),
      });

      const trialStatus = await SubscriptionService.checkTrialLimits(testOrganization.id);

      expect(trialStatus.withinLimits).toBe(true);
      expect(trialStatus.currentUsage.patients).toBe(10);
      expect(trialStatus.limits.maxPatients).toBe(TRIAL_LIMITS.maxPatients);
    });

    test('should detect trial limit exceeded', async () => {
      // Create more patients than allowed
      await prisma.patient.createMany({
        data: Array.from({ length: TRIAL_LIMITS.maxPatients + 5 }, (_, i) => ({
          firstName: `Patient${i}`,
          lastName: 'Test',
          phone: `+92300000000${i}`,
          organizationId: testOrganization.id,
        })),
      });

      const trialStatus = await SubscriptionService.checkTrialLimits(testOrganization.id);

      expect(trialStatus.withinLimits).toBe(false);
      expect(trialStatus.currentUsage.patients).toBeGreaterThan(TRIAL_LIMITS.maxPatients);
    });

    test('should update subscription settings', async () => {
      const updatedOrg = await SubscriptionService.updateSubscription({
        organizationId: testOrganization.id,
        doctorCount: 5,
        subscriptionType: 'YEARLY',
        paymentMethod: 'PAYONEER',
      });

      expect(updatedOrg.doctorCount).toBe(5);
      expect(updatedOrg.subscriptionType).toBe('YEARLY');
      expect(updatedOrg.paymentMethod).toBe('PAYONEER');
      expect(updatedOrg.nextBillingDate).toBeTruthy();
    });

    test('should activate subscription from trial', async () => {
      const activatedOrg = await SubscriptionService.activateSubscription(
        testOrganization.id,
        'MONTHLY',
        'JAZZCASH'
      );

      expect(activatedOrg.subscriptionStatus).toBe('ACTIVE');
      expect(activatedOrg.subscriptionPlan).toBe('PROFESSIONAL');
      expect(activatedOrg.subscriptionType).toBe('MONTHLY');
      expect(activatedOrg.paymentMethod).toBe('JAZZCASH');
      expect(activatedOrg.lastBilledAt).toBeTruthy();
      expect(activatedOrg.nextBillingDate).toBeTruthy();
    });

    test('should get subscription usage statistics', async () => {
      // Create test data
      await prisma.patient.create({
        data: {
          firstName: 'Test',
          lastName: 'Patient',
          phone: '+923001234567',
          organizationId: testOrganization.id,
        },
      });

      await prisma.provider.create({
        data: {
          firstName: 'Dr. Test',
          lastName: 'Provider',
          specialization: 'General Medicine',
          organizationId: testOrganization.id,
        },
      });

      const usage = await SubscriptionService.getSubscriptionUsage(testOrganization.id);

      expect(usage.currentPeriod.patients).toBe(1);
      expect(usage.currentPeriod.providers).toBe(1);
      expect(usage.billingInfo.subscriptionStatus).toBe('TRIAL');
      expect(usage.limits.patients).toBe(TRIAL_LIMITS.maxPatients);
    });
  });

  // ============================================================================
  // TRIAL ABUSE PREVENTION TESTS
  // ============================================================================

  describe('Trial Abuse Prevention', () => {
    const testPhone = '+923001234567';
    const testEmail = 'test@example.com';

    test('should allow trial for new phone number', async () => {
      const eligibility = await SubscriptionService.checkTrialEligibility(testPhone, testEmail);

      expect(eligibility.eligible).toBe(true);
      expect(eligibility.reason).toBeUndefined();
    });

    test('should register trial usage', async () => {
      const trialRecord = await SubscriptionService.registerTrialUsage({
        phoneNumber: testPhone,
        email: testEmail,
        organizationName: testOrganization.name,
        organizationId: testOrganization.id,
        ipAddress: '192.168.1.100',
        userAgent: 'Test Browser',
      });

      expect(trialRecord.phoneNumber).toBe(testPhone);
      expect(trialRecord.email).toBe(testEmail);
      expect(trialRecord.phoneVerified).toBe(false);
      expect(trialRecord.ipAddress).toBe('192.168.1.100');
    });

    test('should prevent duplicate trial for same phone number', async () => {
      // Register first trial
      await SubscriptionService.registerTrialUsage({
        phoneNumber: testPhone,
        email: testEmail,
        organizationName: testOrganization.name,
        organizationId: testOrganization.id,
      });

      // Try to register another trial with same phone
      const eligibility = await SubscriptionService.checkTrialEligibility(testPhone, 'different@email.com');

      expect(eligibility.eligible).toBe(false);
      expect(eligibility.reason).toContain('already been used for a trial');
      expect(eligibility.existingTrial).toBeTruthy();
    });

    test('should verify phone number', async () => {
      // Register trial first
      await SubscriptionService.registerTrialUsage({
        phoneNumber: testPhone,
        email: testEmail,
        organizationName: testOrganization.name,
        organizationId: testOrganization.id,
      });

      const isVerified = await SubscriptionService.verifyTrialPhoneNumber(testPhone, '123456');

      expect(isVerified).toBe(true);

      // Check if verification was recorded
      const trialRecord = await prisma.trialHistory.findUnique({
        where: { phoneNumber: testPhone },
      });

      expect(trialRecord?.phoneVerified).toBe(true);
    });

    test('should reject invalid verification code', async () => {
      await SubscriptionService.registerTrialUsage({
        phoneNumber: testPhone,
        email: testEmail,
        organizationName: testOrganization.name,
        organizationId: testOrganization.id,
      });

      const isVerified = await SubscriptionService.verifyTrialPhoneNumber(testPhone, 'wrong_code');

      expect(isVerified).toBe(false);
    });
  });

  // ============================================================================
  // AUTOMATIC BILLING TESTS
  // ============================================================================

  describe('Automatic Billing', () => {
    test('should process billing for active subscriptions', async () => {
      // Set up active subscription due for billing
      await prisma.organization.update({
        where: { id: testOrganization.id },
        data: {
          subscriptionStatus: 'ACTIVE',
          subscriptionType: 'MONTHLY',
          paymentMethod: 'JAZZCASH',
          nextBillingDate: new Date(Date.now() - 86400000), // Yesterday
          doctorCount: 2,
        },
      });

      const result = await SubscriptionService.processAutomaticBilling();

      expect(result.organizationsProcessed).toBe(1);
      expect(result.successfulPayments).toBe(1);
      expect(result.failedPayments).toBe(0);

      // Check if organization's billing date was updated
      const updatedOrg = await prisma.organization.findUnique({
        where: { id: testOrganization.id },
      });

      expect(updatedOrg?.lastBilledAt).toBeTruthy();
      expect(updatedOrg?.nextBillingDate).toBeTruthy();
      expect(new Date(updatedOrg!.nextBillingDate!)).toBeInstanceOf(Date);
    });

    test('should handle billing failures gracefully', async () => {
      // Set up subscription with unsupported payment method
      await prisma.organization.update({
        where: { id: testOrganization.id },
        data: {
          subscriptionStatus: 'ACTIVE',
          subscriptionType: 'MONTHLY',
          paymentMethod: 'INVALID_METHOD',
          nextBillingDate: new Date(Date.now() - 86400000),
          doctorCount: 1,
        },
      });

      const result = await SubscriptionService.processAutomaticBilling();

      expect(result.organizationsProcessed).toBe(1);
      expect(result.failedPayments).toBe(1);
      expect(result.errors.length).toBeGreaterThan(0);

      // Check if organization status was updated to PAST_DUE
      const updatedOrg = await prisma.organization.findUnique({
        where: { id: testOrganization.id },
      });

      expect(updatedOrg?.subscriptionStatus).toBe('PAST_DUE');
    });

    test('should suspend organization for overdue payments', async () => {
      // Set up overdue organization
      await prisma.organization.update({
        where: { id: testOrganization.id },
        data: {
          subscriptionStatus: 'PAST_DUE',
          nextBillingDate: new Date(Date.now() - (8 * 24 * 60 * 60 * 1000)), // 8 days ago
        },
      });

      await SubscriptionService.checkOverduePayments();

      const updatedOrg = await prisma.organization.findUnique({
        where: { id: testOrganization.id },
      });

      expect(updatedOrg?.subscriptionStatus).toBe('SUSPENDED');
      expect(updatedOrg?.isActive).toBe(false);
    });
  });

  // ============================================================================
  // MULTI-CURRENCY SUPPORT TESTS
  // ============================================================================

  describe('Multi-Currency Support', () => {
    test('should support PKR currency for Pakistani market', () => {
      const supportedMethods = PaymentService.getSupportedPaymentMethods('PAKISTAN', 'PKR');

      expect(supportedMethods).toContain('JAZZCASH');
      expect(supportedMethods).toContain('EASYPAISA');
      expect(supportedMethods).toContain('BANK_TRANSFER');
    });

    test('should support USD currency for international market', () => {
      const supportedMethods = PaymentService.getSupportedPaymentMethods('INTERNATIONAL', 'USD');

      expect(supportedMethods).toContain('PAYONEER');
      expect(supportedMethods).toContain('WISE');
      expect(supportedMethods).toContain('BANK_TRANSFER');
    });

    test('should validate payment method configuration', () => {
      const methodStatus = PaymentService.validatePaymentMethodConfiguration();

      expect(methodStatus).toHaveProperty('JAZZCASH');
      expect(methodStatus).toHaveProperty('EASYPAISA');
      expect(methodStatus).toHaveProperty('PAYONEER');
      expect(methodStatus).toHaveProperty('WISE');
      expect(methodStatus).toHaveProperty('USDT');
      expect(methodStatus).toHaveProperty('BANK_TRANSFER');
      
      // Bank transfer should always be available
      expect(methodStatus.BANK_TRANSFER).toBe(true);
    });
  });

  // ============================================================================
  // BILLING HISTORY TESTS
  // ============================================================================

  describe('Billing History', () => {
    test('should create billing history on successful payment', async () => {
      const paymentResult = await PaymentService.createPaymentIntent({
        organizationId: testOrganization.id,
        amount: 3000,
        currency: 'PKR',
        paymentMethod: 'JAZZCASH',
        billingPeriod: '2025-09',
        subscriptionType: 'MONTHLY',
        doctorCount: 1,
      });

      const billingHistory = await prisma.billingHistory.findFirst({
        where: { organizationId: testOrganization.id },
      });

      expect(billingHistory).toBeTruthy();
      expect(Number(billingHistory?.amount)).toBe(3000);
      expect(billingHistory?.currency).toBe('PKR');
      expect(billingHistory?.paymentMethod).toBe('JAZZCASH');
      expect(billingHistory?.paymentStatus).toBe('SUCCESS');
      expect(billingHistory?.paymentIntentId).toBe(paymentResult.paymentIntentId);
    });

    test('should track billing periods correctly', async () => {
      // Create multiple billing records for different periods
      const periods = ['2025-08', '2025-09', '2025-10'];
      
      for (const period of periods) {
        await PaymentService.createPaymentIntent({
          organizationId: testOrganization.id,
          amount: 3000,
          currency: 'PKR',
          paymentMethod: 'JAZZCASH',
          billingPeriod: period,
          subscriptionType: 'MONTHLY',
          doctorCount: 1,
        });
      }

      const billingHistory = await prisma.billingHistory.findMany({
        where: { organizationId: testOrganization.id },
        orderBy: { billingPeriod: 'asc' },
      });

      expect(billingHistory).toHaveLength(3);
      expect(billingHistory[0]?.billingPeriod).toBe('2025-08');
      expect(billingHistory[2]?.billingPeriod).toBe('2025-10');
    });
  });
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function cleanup() {
  // Clean up test data in reverse dependency order
  await prisma.billingHistory.deleteMany({
    where: { organizationId: testOrganization.id },
  });
  
  await prisma.paymentIntent.deleteMany({
    where: { organizationId: testOrganization.id },
  });
  
  await prisma.trialHistory.deleteMany({
    where: { organizationName: testOrganization.name },
  });
  
  await prisma.patient.deleteMany({
    where: { organizationId: testOrganization.id },
  });
  
  await prisma.provider.deleteMany({
    where: { organizationId: testOrganization.id },
  });
  
  await prisma.user.deleteMany({
    where: { organizationId: testOrganization.id },
  });
  
  await prisma.organization.deleteMany({
    where: { id: testOrganization.id },
  });
}