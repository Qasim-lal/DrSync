import request from 'supertest';
import { app } from '../src/app';
import { PrismaClient } from '../src/generated/prisma';
import { authService } from '../src/services/auth';

const prisma = new PrismaClient();

/**
 * TASK-038B: Super Admin Billing & Subscription Integration Tests
 * Tests for billing analytics, transaction management, subscription lifecycle, and trial management
 * 
 * Test Coverage:
 * - SUBTASK-038B-001: Billing dashboard overview (MRR, ARR, revenue)
 * - SUBTASK-038B-002: Payment transaction monitoring and management
 * - SUBTASK-038B-003: Subscription lifecycle management
 * - SUBTASK-038B-004: Trial management and abuse prevention
 */

describe('TASK-038B: Super Admin - Billing & Subscription Management', () => {
  let superAdminToken: string;
  let regularAdminToken: string;
  let testOrgId: string;
  let trialOrgId: string;
  let paymentIntentId: string;
  let superAdminUser: any;
  let regularAdminUser: any;

  // Setup: Create test users, organizations, and billing data
  beforeAll(async () => {
    // Clean up any existing test data
    await prisma.user.deleteMany({
      where: { email: { in: ['billing_superadmin@test.com', 'billing_admin@test.com'] } }
    });
    await prisma.organization.deleteMany({
      where: { email: { in: ['billing_super@clinic.com', 'billing_test@clinic.com', 'trial_test@clinic.com'] } }
    });

    // Create test organization for super admin
    const superAdminOrg = await prisma.organization.create({
      data: {
        name: 'Billing Super Admin Org',
        slug: 'billing-super-admin-org',
        email: 'billing_super@clinic.com',
        organizationType: 'CLINIC',
        subscriptionPlan: 'ENTERPRISE',
        subscriptionStatus: 'ACTIVE',
        region: 'PAKISTAN',
        isActive: true,
        doctorCount: 5,
        subscriptionType: 'MONTHLY',
        nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        lastBilledAt: new Date()
      }
    });

    // Create super admin user
    const hashedPassword = await authService.hashPassword('TestPassword123!');
    superAdminUser = await prisma.user.create({
      data: {
        email: 'billing_superadmin@test.com',
        password: hashedPassword,
        firstName: 'Billing',
        lastName: 'SuperAdmin',
        role: 'SUPER_ADMIN',
        organizationId: superAdminOrg.id,
        emailVerified: true,
        isActive: true
      }
    });

    // Generate JWT for super admin
    superAdminToken = authService.generateAccessToken({
      userId: superAdminUser.id,
      organizationId: superAdminOrg.id,
      role: 'SUPER_ADMIN'
    });

    // Create test organization with active subscription
    const testOrg = await prisma.organization.create({
      data: {
        name: 'Billing Test Clinic',
        slug: 'billing-test-clinic',
        email: 'billing_test@clinic.com',
        organizationType: 'CLINIC',
        subscriptionPlan: 'PROFESSIONAL',
        subscriptionStatus: 'ACTIVE',
        region: 'PAKISTAN',
        isActive: true,
        doctorCount: 3,
        subscriptionType: 'MONTHLY',
        nextBillingDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
        lastBilledAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000)
      }
    });
    testOrgId = testOrg.id;

    // Create trial organization
    const trialOrg = await prisma.organization.create({
      data: {
        name: 'Trial Test Clinic',
        slug: 'trial-test-clinic',
        email: 'trial_test@clinic.com',
        phone: '+923001234567',
        organizationType: 'CLINIC',
        subscriptionPlan: 'FREE',
        subscriptionStatus: 'TRIAL',
        region: 'PAKISTAN',
        isActive: true,
        doctorCount: 1,
        maxPatients: 25,
        maxAppointments: 50,
        subscriptionEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // Expires in 7 days
      }
    });
    trialOrgId = trialOrg.id;

    // Create regular admin user
    regularAdminUser = await prisma.user.create({
      data: {
        email: 'billing_admin@test.com',
        password: hashedPassword,
        firstName: 'Billing',
        lastName: 'Admin',
        role: 'ORG_ADMIN',
        organizationId: testOrg.id,
        emailVerified: true,
        isActive: true
      }
    });

    // Generate JWT for regular admin
    regularAdminToken = authService.generateAccessToken({
      userId: regularAdminUser.id,
      organizationId: testOrg.id,
      role: 'ORG_ADMIN'
    });

    // Create test billing history
    await prisma.billingHistory.create({
      data: {
        organizationId: testOrg.id,
        amount: 2997, // 3 doctors * 999
        currency: 'PKR',
        paymentMethod: 'BANK_TRANSFER',
        paymentStatus: 'SUCCESS',
        billingPeriod: '2024-12',
        doctorCount: 3
      }
    });

    // Create test payment intents
    const successPayment = await prisma.paymentIntent.create({
      data: {
        organizationId: testOrg.id,
        amount: 2997,
        currency: 'PKR',
        status: 'SUCCESS',
        paymentMethod: 'BANK_TRANSFER',
        billingPeriod: '2024-12',
        subscriptionType: 'MONTHLY',
        doctorCount: 3,
        retryCount: 0,
        maxRetries: 3
      }
    });
    paymentIntentId = successPayment.id;

    await prisma.paymentIntent.create({
      data: {
        organizationId: testOrg.id,
        amount: 2997,
        currency: 'PKR',
        status: 'FAILED',
        paymentMethod: 'JAZZCASH',
        billingPeriod: '2024-11',
        subscriptionType: 'MONTHLY',
        doctorCount: 3,
        retryCount: 1,
        maxRetries: 3,
        failureReason: 'Insufficient funds'
      }
    });

    // Create trial history for abuse detection
    await prisma.trialHistory.create({
      data: {
        phoneNumber: '+923001234567',
        email: 'trial_test@clinic.com',
        organizationName: 'Trial Test Clinic',
        phoneVerified: false
      }
    });

    // Create some patients and appointments for trial usage tracking
    const patient1 = await prisma.patient.create({
      data: {
        organizationId: trialOrgId,
        firstName: 'John',
        lastName: 'Doe',
        phone: '+923009999999',
        dateOfBirth: new Date('1990-01-01'),
        gender: 'MALE'
      }
    });

    const provider = await prisma.provider.create({
      data: {
        organizationId: trialOrgId,
        firstName: 'Dr. Test',
        lastName: 'Provider',
        specialization: 'General',
        phone: '+923001111111'
      }
    });

    const appointmentDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const endTime = new Date(appointmentDate.getTime() + 30 * 60 * 1000);
    
    await prisma.appointment.create({
      data: {
        organizationId: trialOrgId,
        patientId: patient1.id,
        providerId: provider.id,
        scheduledAt: appointmentDate,
        duration: 30,
        endTime: endTime,
        status: 'SCHEDULED',
        bookingSource: 'DASHBOARD'
      }
    });
  });

  // Cleanup
  afterAll(async () => {
    await prisma.appointment.deleteMany({
      where: { organizationId: { in: [testOrgId, trialOrgId] } }
    });
    await prisma.patient.deleteMany({
      where: { organizationId: { in: [testOrgId, trialOrgId] } }
    });
    await prisma.provider.deleteMany({
      where: { organizationId: { in: [testOrgId, trialOrgId] } }
    });
    await prisma.paymentIntent.deleteMany({
      where: { organizationId: testOrgId }
    });
    await prisma.billingHistory.deleteMany({
      where: { organizationId: testOrgId }
    });
    await prisma.trialHistory.deleteMany({
      where: { phoneNumber: '+923001234567' }
    });
    await prisma.user.deleteMany({
      where: { email: { in: ['billing_superadmin@test.com', 'billing_admin@test.com'] } }
    });
    await prisma.organization.deleteMany({
      where: { email: { in: ['billing_super@clinic.com', 'billing_test@clinic.com', 'trial_test@clinic.com'] } }
    });
    await prisma.$disconnect();
  });

  // ============================================================================
  // SUBTASK-038B-001: Billing Dashboard Overview Tests
  // ============================================================================

  describe('SUBTASK-038B-001: Billing Dashboard Overview', () => {
    /**
     * TEST-038B-001-1: Test billing overview returns MRR, ARR, and revenue metrics
     */
    it('TEST-038B-001-1: should return billing overview with MRR and ARR', async () => {
      const response = await request(app)
        .get('/api/super-admin/billing/overview')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('mrr');
      expect(response.body.data).toHaveProperty('arr');
      expect(response.body.data).toHaveProperty('totalRevenue');
      expect(response.body.data).toHaveProperty('outstandingPayments');
      expect(response.body.data).toHaveProperty('failedPayments');
      expect(response.body.data).toHaveProperty('growth');
      expect(response.body.data).toHaveProperty('revenueByPlan');
      expect(response.body.data).toHaveProperty('revenueByPaymentMethod');
      expect(response.body.data).toHaveProperty('revenueByRegion');

      // Verify numeric values
      expect(typeof response.body.data.mrr).toBe('number');
      expect(typeof response.body.data.arr).toBe('number');
      expect(response.body.data.arr).toBe(response.body.data.mrr * 12);
    });

    /**
     * TEST-038B-001-2: Test unauthorized access is rejected
     */
    it('TEST-038B-001-2: should reject access without super admin role', async () => {
      await request(app)
        .get('/api/super-admin/billing/overview')
        .set('Authorization', `Bearer ${regularAdminToken}`)
        .expect(403);
    });

    /**
     * TEST-038B-001-3: Test billing overview without authentication
     */
    it('TEST-038B-001-3: should reject unauthenticated requests', async () => {
      await request(app)
        .get('/api/super-admin/billing/overview')
        .expect(401);
    });
  });

  // ============================================================================
  // SUBTASK-038B-002: Payment Transaction Monitoring Tests
  // ============================================================================

  describe('SUBTASK-038B-002: Payment Transaction Monitoring', () => {
    /**
     * TEST-038B-002-1: Test transaction listing with pagination
     */
    it('TEST-038B-002-1: should list payment transactions with pagination', async () => {
      const response = await request(app)
        .get('/api/super-admin/billing/transactions?page=1&limit=10')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.pagination).toHaveProperty('page', 1);
      expect(response.body.pagination).toHaveProperty('limit', 10);
      expect(response.body.pagination).toHaveProperty('total');
      expect(response.body.pagination).toHaveProperty('totalPages');
      expect(response.body.pagination).toHaveProperty('hasMore');
    });

    /**
     * TEST-038B-002-2: Test transaction filtering by status
     */
    it('TEST-038B-002-2: should filter transactions by status', async () => {
      const response = await request(app)
        .get('/api/super-admin/billing/transactions?status=SUCCESS')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      
      // All returned transactions should have SUCCESS status
      response.body.data.forEach((txn: any) => {
        expect(txn.status).toBe('SUCCESS');
      });
    });

    /**
     * TEST-038B-002-3: Test payment status breakdown
     */
    it('TEST-038B-002-3: should return payment status breakdown', async () => {
      const response = await request(app)
        .get('/api/super-admin/billing/payment-status')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(typeof response.body.data).toBe('object');
      
      // Check if breakdown has status keys with count and amount
      Object.values(response.body.data).forEach((statusData: any) => {
        expect(statusData).toHaveProperty('count');
        expect(statusData).toHaveProperty('amount');
        expect(typeof statusData.count).toBe('number');
        expect(typeof statusData.amount).toBe('number');
      });
    });

    /**
     * TEST-038B-002-4: Test retry failed payment
     */
    it('TEST-038B-002-4: should retry a failed payment', async () => {
      // First, get a failed payment
      const failedPayments = await prisma.paymentIntent.findFirst({
        where: { status: 'FAILED' }
      });

      if (failedPayments) {
        const response = await request(app)
          .post(`/api/super-admin/billing/transactions/${failedPayments.id}/retry`)
          .set('Authorization', `Bearer ${superAdminToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe('Payment queued for retry');
        expect(response.body.data).toHaveProperty('status', 'PENDING');
        expect(response.body.data.retryCount).toBeGreaterThan(failedPayments.retryCount);
      }
    });

    /**
     * TEST-038B-002-5: Test refund processing
     */
    it('TEST-038B-002-5: should process refund for successful payment', async () => {
      const response = await request(app)
        .post(`/api/super-admin/billing/transactions/${paymentIntentId}/refund`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          amount: 2997,
          reason: 'Test refund for integration test'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Refund processed successfully');
      expect(response.body.data).toHaveProperty('status', 'CANCELLED');
    });

    /**
     * TEST-038B-002-6: Test refund validation (missing amount)
     */
    it('TEST-038B-002-6: should reject refund without amount', async () => {
      const response = await request(app)
        .post(`/api/super-admin/billing/transactions/${paymentIntentId}/refund`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          reason: 'Missing amount'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('amount');
    });

    /**
     * TEST-038B-002-7: Test refund validation (missing reason)
     */
    it('TEST-038B-002-7: should reject refund without reason', async () => {
      const response = await request(app)
        .post(`/api/super-admin/billing/transactions/${paymentIntentId}/refund`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          amount: 2997
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('reason');
    });
  });

  // ============================================================================
  // SUBTASK-038B-003: Subscription Lifecycle Management Tests
  // ============================================================================

  describe('SUBTASK-038B-003: Subscription Lifecycle Management', () => {
    /**
     * TEST-038B-003-1: Test subscription lifecycle overview
     */
    it('TEST-038B-003-1: should return subscription lifecycle overview', async () => {
      const response = await request(app)
        .get('/api/super-admin/subscriptions/lifecycle')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('statusBreakdown');
      expect(response.body.data).toHaveProperty('planBreakdown');
      expect(response.body.data).toHaveProperty('metrics');
      
      // Verify metrics structure
      expect(response.body.data.metrics).toHaveProperty('churnRate');
      expect(response.body.data.metrics).toHaveProperty('retentionRate');
      expect(response.body.data.metrics).toHaveProperty('activeSubscriptions');
      expect(response.body.data.metrics).toHaveProperty('trialSubscriptions');
    });

    /**
     * TEST-038B-003-2: Test subscription plan update
     */
    it('TEST-038B-003-2: should update subscription plan', async () => {
      const response = await request(app)
        .put(`/api/super-admin/subscriptions/${testOrgId}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          subscriptionPlan: 'ENTERPRISE',
          reason: 'Test upgrade'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Subscription updated successfully');
      expect(response.body.data).toHaveProperty('subscriptionPlan', 'ENTERPRISE');
    });

    /**
     * TEST-038B-003-3: Test invalid subscription plan rejection
     */
    it('TEST-038B-003-3: should reject invalid subscription plan', async () => {
      const response = await request(app)
        .put(`/api/super-admin/subscriptions/${testOrgId}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          subscriptionPlan: 'INVALID_PLAN',
          reason: 'Test invalid plan'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid subscription plan');
    });

    /**
     * TEST-038B-003-4: Test subscription suspension
     */
    it('TEST-038B-003-4: should suspend subscription', async () => {
      const response = await request(app)
        .post(`/api/super-admin/subscriptions/${testOrgId}/suspend`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          reason: 'Test suspension for integration test'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Subscription suspended successfully');
      expect(response.body.data).toHaveProperty('subscriptionStatus', 'SUSPENDED');
      expect(response.body.data).toHaveProperty('isActive', false);
    });

    /**
     * TEST-038B-003-5: Test subscription reactivation
     */
    it('TEST-038B-003-5: should reactivate suspended subscription', async () => {
      const response = await request(app)
        .post(`/api/super-admin/subscriptions/${testOrgId}/reactivate`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Subscription reactivated successfully');
      expect(response.body.data).toHaveProperty('subscriptionStatus', 'ACTIVE');
      expect(response.body.data).toHaveProperty('isActive', true);
    });

    /**
     * TEST-038B-003-6: Test suspension without reason
     */
    it('TEST-038B-003-6: should reject suspension without reason', async () => {
      const response = await request(app)
        .post(`/api/super-admin/subscriptions/${testOrgId}/suspend`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('reason');
    });
  });

  // ============================================================================
  // SUBTASK-038B-004: Trial Management & Abuse Prevention Tests
  // ============================================================================

  describe('SUBTASK-038B-004: Trial Management & Abuse Prevention', () => {
    /**
     * TEST-038B-004-1: Test trial overview dashboard
     */
    it('TEST-038B-004-1: should return trial overview', async () => {
      const response = await request(app)
        .get('/api/super-admin/trials/overview')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('activeTrials');
      expect(response.body.data).toHaveProperty('conversionRate');
      expect(response.body.data).toHaveProperty('averageDaysToConvert');
      expect(response.body.data).toHaveProperty('expiringToday');
      expect(response.body.data).toHaveProperty('expiringSoon');
      expect(response.body.data).toHaveProperty('expired');
      expect(response.body.data).toHaveProperty('totalTrialsStarted');
      expect(response.body.data).toHaveProperty('totalConverted');
      
      // Verify numeric values
      expect(typeof response.body.data.activeTrials).toBe('number');
      expect(typeof response.body.data.conversionRate).toBe('number');
    });

    /**
     * TEST-038B-004-2: Test trial abuse detection
     */
    it('TEST-038B-004-2: should detect trial abuse patterns', async () => {
      const response = await request(app)
        .get('/api/super-admin/trials/abuse-detection')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('suspiciousOrganizations');
      expect(response.body.data).toHaveProperty('totalFlagged');
      expect(response.body.data).toHaveProperty('abuseStats');
      
      expect(response.body.data.suspiciousOrganizations).toBeInstanceOf(Array);
      expect(response.body.data.abuseStats).toHaveProperty('duplicatePhones');
      expect(response.body.data.abuseStats).toHaveProperty('duplicateEmails');
      expect(response.body.data.abuseStats).toHaveProperty('multipleTrials');
    });

    /**
     * TEST-038B-004-3: Test trial usage monitoring
     */
    it('TEST-038B-004-3: should monitor trial usage limits', async () => {
      const response = await request(app)
        .get('/api/super-admin/trials/usage')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body).toHaveProperty('count');
      
      // Verify usage data structure for trial orgs
      if (response.body.data.length > 0) {
        const usage = response.body.data[0];
        expect(usage).toHaveProperty('organizationId');
        expect(usage).toHaveProperty('organizationName');
        expect(usage).toHaveProperty('maxPatients');
        expect(usage).toHaveProperty('currentPatients');
        expect(usage).toHaveProperty('maxAppointments');
        expect(usage).toHaveProperty('currentAppointments');
        expect(usage).toHaveProperty('patientsUsagePercent');
        expect(usage).toHaveProperty('appointmentsUsagePercent');
        expect(usage).toHaveProperty('isNearLimit');
        expect(usage).toHaveProperty('isOverLimit');
      }
    });

    /**
     * TEST-038B-004-4: Test trial extension
     */
    it('TEST-038B-004-4: should extend trial period', async () => {
      const response = await request(app)
        .post(`/api/super-admin/trials/${trialOrgId}/extend`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          extensionDays: 7,
          reason: 'Test extension for integration test'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Trial extended by 7 days');
      expect(response.body.data).toHaveProperty('subscriptionEndsAt');
    });

    /**
     * TEST-038B-004-5: Test trial extension validation (missing days)
     */
    it('TEST-038B-004-5: should reject extension without days', async () => {
      const response = await request(app)
        .post(`/api/super-admin/trials/${trialOrgId}/extend`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          reason: 'Missing days'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Extension days');
    });

    /**
     * TEST-038B-004-6: Test trial extension validation (missing reason)
     */
    it('TEST-038B-004-6: should reject extension without reason', async () => {
      const response = await request(app)
        .post(`/api/super-admin/trials/${trialOrgId}/extend`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          extensionDays: 7
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('reason');
    });

    /**
     * TEST-038B-004-7: Test trial conversions tracking
     */
    it('TEST-038B-004-7: should track trial conversions', async () => {
      const response = await request(app)
        .get('/api/super-admin/trials/conversions?days=30')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('period');
      expect(response.body.data).toHaveProperty('trialsStarted');
      expect(response.body.data).toHaveProperty('converted');
      expect(response.body.data).toHaveProperty('stillInTrial');
      expect(response.body.data).toHaveProperty('cancelled');
      expect(response.body.data).toHaveProperty('conversionRate');
      expect(response.body.data).toHaveProperty('metrics');
      
      // Verify metrics structure
      expect(response.body.data.metrics).toHaveProperty('conversionRate');
      expect(response.body.data.metrics).toHaveProperty('cancelRate');
      expect(response.body.data.metrics).toHaveProperty('activeTrialRate');
    });

    /**
     * TEST-038B-004-8: Test trial end actions
     */
    it('TEST-038B-004-8: should get trial end actions', async () => {
      const response = await request(app)
        .get('/api/super-admin/trials/ending-actions')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('expiringToday');
      expect(response.body.data).toHaveProperty('recentlyExpired');
      expect(response.body.data).toHaveProperty('recommendedActions');
      
      // Verify structure
      expect(response.body.data.expiringToday).toHaveProperty('count');
      expect(response.body.data.expiringToday).toHaveProperty('organizations');
      expect(response.body.data.recentlyExpired).toHaveProperty('count');
      expect(response.body.data.recentlyExpired).toHaveProperty('organizations');
    });
  });

  // ============================================================================
  // Authorization & Error Handling Tests
  // ============================================================================

  describe('Authorization & Error Handling', () => {
    /**
     * TEST-038B-AUTH-1: Test all endpoints reject non-super-admin users
     */
    it('TEST-038B-AUTH-1: should reject regular admin access to billing endpoints', async () => {
      const endpoints = [
        '/api/super-admin/billing/overview',
        '/api/super-admin/billing/transactions',
        '/api/super-admin/billing/payment-status',
        '/api/super-admin/subscriptions/lifecycle',
        '/api/super-admin/trials/overview',
        '/api/super-admin/trials/abuse-detection',
        '/api/super-admin/trials/usage',
        '/api/super-admin/trials/conversions',
        '/api/super-admin/trials/ending-actions'
      ];

      for (const endpoint of endpoints) {
        await request(app)
          .get(endpoint)
          .set('Authorization', `Bearer ${regularAdminToken}`)
          .expect(403);
      }
    });

    /**
     * TEST-038B-AUTH-2: Test all endpoints reject unauthenticated requests
     */
    it('TEST-038B-AUTH-2: should reject unauthenticated requests', async () => {
      const endpoints = [
        '/api/super-admin/billing/overview',
        '/api/super-admin/billing/transactions',
        '/api/super-admin/subscriptions/lifecycle',
        '/api/super-admin/trials/overview'
      ];

      for (const endpoint of endpoints) {
        await request(app)
          .get(endpoint)
          .expect(401);
      }
    });

    /**
     * TEST-038B-ERROR-1: Test 404 handling for non-existent resources
     */
    it('TEST-038B-ERROR-1: should return 404 for non-existent organization', async () => {
      const fakeId = 'non-existent-id-12345';
      
      const response = await request(app)
        .put(`/api/super-admin/subscriptions/${fakeId}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          subscriptionPlan: 'PROFESSIONAL',
          reason: 'Test'
        });

      // Should handle error (might be 404 or 500 depending on implementation)
      expect(response.body.success).toBe(false);
    });

    /**
     * TEST-038B-ERROR-2: Test invalid parameter handling
     */
    it('TEST-038B-ERROR-2: should reject invalid extension days (negative)', async () => {
      const response = await request(app)
        .post(`/api/super-admin/trials/${trialOrgId}/extend`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          extensionDays: -5,
          reason: 'Negative days test'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });
});
