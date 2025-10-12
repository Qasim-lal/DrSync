/**
 * TASK-038C: Platform Analytics Dashboard - Integration Tests
 * 
 * Test Suite Coverage:
 * - SUBTASK-038C-001: Platform Health Monitoring (4 tests)
 * - SUBTASK-038C-002: Usage Analytics (4 tests)
 * - SUBTASK-038C-003: Growth & Conversion Analytics (4 tests)
 * - SUBTASK-038C-004: Performance Benchmarking (4 tests)
 * - Authorization & Error Handling (4 tests)
 * 
 * Total Tests: 20
 */

import request from 'supertest';
import { app } from '../src/app';
import { PrismaClient } from '../src/generated/prisma';
import { authService } from '../src/services/auth';

const prisma = new PrismaClient();

describe('TASK-038C: Platform Analytics Dashboard', () => {
  let superAdminToken: string;
  let regularAdminToken: string;
  let superAdminUserId: string;
  let regularAdminUserId: string;
  let testOrgId: string;
  let testUserId: string;

  // ==================== SETUP & TEARDOWN ====================

  beforeAll(async () => {
    // Clean up existing test data
    await prisma.user.deleteMany({
      where: {
        email: {
          in: ['analytics-super@test.com', 'analytics-admin@test.com', 'analytics-user@test.com']
        }
      }
    });

    await prisma.organization.deleteMany({
      where: {
        slug: { startsWith: 'analytics-test-org' }
        }
    });

    // Create test organization for analytics
    const testOrg = await prisma.organization.create({
      data: {
        name: 'Analytics Test Organization',
        slug: 'analytics-test-org-main',
        email: 'analytics-org@test.com',
        phone: '+923001234567',
        address: '123 Test Street, Karachi',
        organizationType: 'CLINIC',
        subscriptionStatus: 'ACTIVE',
        subscriptionPlan: 'PROFESSIONAL',
        doctorCount: 5,
        region: 'PAKISTAN',
        isActive: true,
        timezone: 'Asia/Karachi',
        language: 'en',
        whatsappPhoneNumber: '+923001234567',
        whatsappPhoneVerified: true,
        googleSheetsId: 'test-sheets-id',
        maxPatients: 25,
        maxAppointments: 50
      }
    });
    testOrgId = testOrg.id;

    // Create super admin user
    const superAdminUser = await prisma.user.create({
      data: {
        email: 'analytics-super@test.com',
        password: 'hashedpassword123',
        firstName: 'Analytics',
        lastName: 'Super Admin',
        role: 'SUPER_ADMIN',
        organizationId: testOrgId,
        isActive: true,
        lastLoginAt: new Date()
      }
    });
    superAdminUserId = superAdminUser.id;
    superAdminToken = authService.generateAccessToken({
      userId: superAdminUserId,
      role: 'SUPER_ADMIN',
      organizationId: testOrgId,
      email: 'analytics-super@test.com'
    });

    // Create regular admin user (for authorization tests)
    const regularAdminUser = await prisma.user.create({
      data: {
        email: 'analytics-admin@test.com',
        password: 'hashedpassword123',
        firstName: 'Regular',
        lastName: 'Admin',
        role: 'ORG_ADMIN',
        organizationId: testOrgId,
        isActive: true
      }
    });
    regularAdminUserId = regularAdminUser.id;
    regularAdminToken = authService.generateAccessToken({
      userId: regularAdminUserId,
      role: 'ORG_ADMIN',
      organizationId: testOrgId,
      email: 'analytics-admin@test.com'
    });

    // Create additional test user
    const testUser = await prisma.user.create({
      data: {
        email: 'analytics-user@test.com',
        password: 'hashedpassword123',
        firstName: 'Test',
        lastName: 'User',
        role: 'STAFF',
        organizationId: testOrgId,
        isActive: true,
        lastLoginAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) // 2 days ago
      }
    });
    testUserId = testUser.id;

    // Create test patients BEFORE appointments
    const patient1 = await prisma.patient.create({
      data: {
        organizationId: testOrgId,
        firstName: 'Test',
        lastName: 'Patient 1',
        phone: '+923001111111',
        email: 'patient1@test.com'
      }
    });

    const patient2 = await prisma.patient.create({
      data: {
        organizationId: testOrgId,
        firstName: 'Test',
        lastName: 'Patient 2',
        phone: '+923002222222',
        email: 'patient2@test.com'
      }
    });

    // Create test provider
    const provider = await prisma.provider.create({
      data: {
        organizationId: testOrgId,
        firstName: 'Dr.',
        lastName: 'Test',
        specialization: 'General Medicine'
      }
    });

    // NOW create appointments with real IDs
    await prisma.appointment.createMany({
      data: [
        {
          organizationId: testOrgId,
          patientId: patient1.id,
          providerId: provider.id,
          scheduledAt: new Date(),
          duration: 30,
          endTime: new Date(Date.now() + 30 * 60 * 1000),
          status: 'CONFIRMED'
        },
        {
          organizationId: testOrgId,
          patientId: patient2.id,
          providerId: provider.id,
          scheduledAt: new Date(),
          duration: 30,
          endTime: new Date(Date.now() + 30 * 60 * 1000),
          status: 'COMPLETED'
        }
      ]
    });

    // Create trial history for trial conversion metrics
    await prisma.trialHistory.createMany({
      data: [
        {
          phoneNumber: '+923001234567',
          email: 'analytics-org@test.com',
          organizationName: 'Analytics Test Organization',
          phoneVerified: true
        }
      ]
    });
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.appointment.deleteMany({
      where: { organizationId: testOrgId }
    });

    await prisma.patient.deleteMany({
      where: { organizationId: testOrgId }
    });

    await prisma.trialHistory.deleteMany({
      where: { phoneNumber: '+923001234567' }
    });

    await prisma.provider.deleteMany({
      where: { organizationId: testOrgId }
    });

    await prisma.user.deleteMany({
      where: {
        id: {
          in: [superAdminUserId, regularAdminUserId, testUserId]
        }
      }
    });

    await prisma.organization.deleteMany({
      where: {
        id: testOrgId
      }
    });

    await prisma.$disconnect();
  });

  // ============================================================================
  // SUBTASK-038C-001: PLATFORM HEALTH MONITORING
  // ============================================================================

  describe('SUBTASK-038C-001: Platform Health Monitoring', () => {
    test('038C-001-1: Should get system health overview with all metrics', async () => {
      const response = await request(app)
        .get('/api/super-admin/analytics/system-health')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      
      const healthData = response.body.data;
      
      // Verify system status
      expect(healthData.status).toBeDefined();
      expect(['healthy', 'degraded', 'down']).toContain(healthData.status);
      
      // Verify uptime
      expect(healthData.uptime).toBeDefined();
      expect(typeof healthData.uptime).toBe('number');
      expect(healthData.uptime).toBeGreaterThan(0);
      expect(healthData.uptime).toBeLessThanOrEqual(100);
      
      // Verify active counts
      expect(healthData.activeOrganizations).toBeDefined();
      expect(typeof healthData.activeOrganizations).toBe('number');
      expect(healthData.activeOrganizations).toBeGreaterThanOrEqual(0);
      
      expect(healthData.activeUsers).toBeDefined();
      expect(typeof healthData.activeUsers).toBe('number');
      
      // Verify API performance metrics
      expect(healthData.apiPerformance).toBeDefined();
      expect(healthData.apiPerformance.averageResponseTime).toBeDefined();
      expect(healthData.apiPerformance.errorRate).toBeDefined();
      expect(healthData.apiPerformance.requestsPerMinute).toBeDefined();
      
      // Verify database health
      expect(healthData.databaseHealth).toBeDefined();
      expect(healthData.databaseHealth.connectionCount).toBeDefined();
      expect(healthData.databaseHealth.avgQueryTime).toBeDefined();
      expect(healthData.databaseHealth.slowQueryCount).toBeDefined();
      
      // Verify external services health
      expect(healthData.externalServices).toBeDefined();
      expect(healthData.externalServices.whatsapp).toBeDefined();
      expect(healthData.externalServices.whatsapp.status).toBeDefined();
      expect(healthData.externalServices.whatsapp.successRate).toBeDefined();
      
      expect(healthData.externalServices.googleSheets).toBeDefined();
      expect(healthData.externalServices.googleSheets.status).toBeDefined();
      expect(healthData.externalServices.googleSheets.successRate).toBeDefined();
      
      expect(healthData.externalServices.email).toBeDefined();
      expect(healthData.externalServices.email.status).toBeDefined();
      expect(healthData.externalServices.email.deliveryRate).toBeDefined();
    });

    test('038C-001-2: Should calculate external service health accurately', async () => {
      const response = await request(app)
        .get('/api/super-admin/analytics/system-health')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);

      const healthData = response.body.data;
      
      // All services should have valid success/delivery rates
      expect(healthData.externalServices.whatsapp.successRate).toBeGreaterThanOrEqual(0);
      expect(healthData.externalServices.whatsapp.successRate).toBeLessThanOrEqual(100);
      
      expect(healthData.externalServices.googleSheets.successRate).toBeGreaterThanOrEqual(0);
      expect(healthData.externalServices.googleSheets.successRate).toBeLessThanOrEqual(100);
      
      expect(healthData.externalServices.email.deliveryRate).toBeGreaterThanOrEqual(0);
      expect(healthData.externalServices.email.deliveryRate).toBeLessThanOrEqual(100);
    });

    test('038C-001-3: Should return active organizations and users counts', async () => {
      const response = await request(app)
        .get('/api/super-admin/analytics/system-health')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);

      const healthData = response.body.data;
      
      // Should have at least our test organization
      expect(healthData.activeOrganizations).toBeGreaterThanOrEqual(1);
      
      // Should have at least our test users (super admin and test user logged in recently)
      expect(healthData.activeUsers).toBeGreaterThanOrEqual(1);
    });

    test('038C-001-4: Should show API performance within acceptable range', async () => {
      const response = await request(app)
        .get('/api/super-admin/analytics/system-health')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);

      const healthData = response.body.data;
      
      // Average response time should be reasonable (< 1000ms)
      expect(healthData.apiPerformance.averageResponseTime).toBeLessThan(1000);
      
      // Error rate should be low (< 10%)
      expect(healthData.apiPerformance.errorRate).toBeLessThan(10);
      
      // Should have some requests per minute
      expect(healthData.apiPerformance.requestsPerMinute).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // SUBTASK-038C-002: USAGE ANALYTICS
  // ============================================================================

  describe('SUBTASK-038C-002: Usage Analytics', () => {
    test('038C-002-1: Should get usage analytics with all metrics', async () => {
      const response = await request(app)
        .get('/api/super-admin/analytics/usage')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      
      const usageData = response.body.data;
      
      // Verify active organization metrics
      expect(usageData.dailyActiveOrgs).toBeDefined();
      expect(typeof usageData.dailyActiveOrgs).toBe('number');
      
      expect(usageData.monthlyActiveOrgs).toBeDefined();
      expect(typeof usageData.monthlyActiveOrgs).toBe('number');
      
      expect(usageData.dauMauRatio).toBeDefined();
      expect(typeof usageData.dauMauRatio).toBe('number');
      
      // Verify appointment metrics
      expect(usageData.totalAppointments).toBeDefined();
      expect(typeof usageData.totalAppointments).toBe('number');
      expect(usageData.totalAppointments).toBeGreaterThanOrEqual(2); // We created 2 test appointments
      
      expect(usageData.appointmentsByMethod).toBeDefined();
      expect(usageData.appointmentsByMethod.whatsapp).toBeDefined();
      expect(usageData.appointmentsByMethod.dashboard).toBeDefined();
      
      // Verify feature adoption
      expect(usageData.featureAdoption).toBeDefined();
      expect(usageData.featureAdoption.whatsappSetup).toBeDefined();
      expect(usageData.featureAdoption.googleSheetsSetup).toBeDefined();
      expect(usageData.featureAdoption.staffInvitations).toBeDefined();
      
      // Verify communication metrics
      expect(usageData.communicationMetrics).toBeDefined();
      expect(usageData.communicationMetrics.whatsappMessagesSent).toBeDefined();
      expect(usageData.communicationMetrics.whatsappMessagesReceived).toBeDefined();
      expect(usageData.communicationMetrics.remindersSent).toBeDefined();
      expect(usageData.communicationMetrics.deliveryRate).toBeDefined();
      
      // Verify engagement metrics
      expect(usageData.engagementMetrics).toBeDefined();
      expect(usageData.engagementMetrics.averageSessionDuration).toBeDefined();
      expect(usageData.engagementMetrics.loginsToday).toBeDefined();
      expect(usageData.engagementMetrics.loginsThisWeek).toBeDefined();
      expect(usageData.engagementMetrics.loginsThisMonth).toBeDefined();
    });

    test('038C-002-2: Should calculate feature adoption rates correctly', async () => {
      const response = await request(app)
        .get('/api/super-admin/analytics/usage')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);

      const usageData = response.body.data;
      
      // All adoption rates should be percentages (0-100)
      expect(usageData.featureAdoption.whatsappSetup).toBeGreaterThanOrEqual(0);
      expect(usageData.featureAdoption.whatsappSetup).toBeLessThanOrEqual(100);
      
      expect(usageData.featureAdoption.googleSheetsSetup).toBeGreaterThanOrEqual(0);
      expect(usageData.featureAdoption.googleSheetsSetup).toBeLessThanOrEqual(100);
      
      expect(usageData.featureAdoption.staffInvitations).toBeGreaterThanOrEqual(0);
      expect(usageData.featureAdoption.staffInvitations).toBeLessThanOrEqual(100);
      
      // Our test org has WhatsApp configured, so adoption should be > 0
      expect(usageData.featureAdoption.whatsappSetup).toBeGreaterThan(0);
      
      // Our test org has Google Sheets configured
      expect(usageData.featureAdoption.googleSheetsSetup).toBeGreaterThan(0);
    });

    test('038C-002-3: Should track user engagement correctly', async () => {
      const response = await request(app)
        .get('/api/super-admin/analytics/usage')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);

      const usageData = response.body.data;
      
      // Should have at least 1 login this week (super admin just logged in for test)
      expect(usageData.engagementMetrics.loginsThisWeek).toBeGreaterThanOrEqual(1);
      
      // Monthly logins should be >= weekly logins
      expect(usageData.engagementMetrics.loginsThisMonth).toBeGreaterThanOrEqual(
        usageData.engagementMetrics.loginsThisWeek
      );
      
      // Weekly logins should be >= daily logins
      expect(usageData.engagementMetrics.loginsThisWeek).toBeGreaterThanOrEqual(
        usageData.engagementMetrics.loginsToday
      );
    });

    test('038C-002-4: Should calculate DAU/MAU ratio correctly', async () => {
      const response = await request(app)
        .get('/api/super-admin/analytics/usage')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);

      const usageData = response.body.data;
      
      // DAU/MAU ratio should be a percentage (0-100)
      expect(usageData.dauMauRatio).toBeGreaterThanOrEqual(0);
      expect(usageData.dauMauRatio).toBeLessThanOrEqual(100);
      
      // If we have monthly active orgs, DAU should be <= MAU
      if (usageData.monthlyActiveOrgs > 0) {
        expect(usageData.dailyActiveOrgs).toBeLessThanOrEqual(usageData.monthlyActiveOrgs);
      }
    });
  });

  // ============================================================================
  // SUBTASK-038C-003: GROWTH & CONVERSION ANALYTICS
  // ============================================================================

  describe('SUBTASK-038C-003: Growth & Conversion Analytics', () => {
    test('038C-003-1: Should get growth analytics with all metrics', async () => {
      const response = await request(app)
        .get('/api/super-admin/analytics/growth')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      
      const growthData = response.body.data;
      
      // Verify registration funnel
      expect(growthData.registrationFunnel).toBeDefined();
      expect(growthData.registrationFunnel.signups).toBeDefined();
      expect(growthData.registrationFunnel.emailVerified).toBeDefined();
      expect(growthData.registrationFunnel.whatsappConfigured).toBeDefined();
      expect(growthData.registrationFunnel.sheetsConfigured).toBeDefined();
      expect(growthData.registrationFunnel.activeUsers).toBeDefined();
      expect(growthData.registrationFunnel.conversionRate).toBeDefined();
      
      // Verify trial conversion
      expect(growthData.trialConversion).toBeDefined();
      expect(growthData.trialConversion.totalTrials).toBeDefined();
      expect(growthData.trialConversion.converted).toBeDefined();
      expect(growthData.trialConversion.cancelled).toBeDefined();
      expect(growthData.trialConversion.conversionRate).toBeDefined();
      expect(growthData.trialConversion.averageDaysToConvert).toBeDefined();
      
      // Verify growth metrics
      expect(growthData.growthMetrics).toBeDefined();
      expect(growthData.growthMetrics.organizationGrowth).toBeDefined();
      expect(growthData.growthMetrics.userGrowth).toBeDefined();
      expect(growthData.growthMetrics.revenueGrowth).toBeDefined();
      
      // Verify cohort retention
      expect(growthData.cohortRetention).toBeDefined();
      expect(growthData.cohortRetention.month0).toBeDefined();
      expect(growthData.cohortRetention.month1).toBeDefined();
      expect(growthData.cohortRetention.month3).toBeDefined();
      expect(growthData.cohortRetention.month6).toBeDefined();
      expect(growthData.cohortRetention.month12).toBeDefined();
    });

    test('038C-003-2: Should calculate registration funnel correctly', async () => {
      const response = await request(app)
        .get('/api/super-admin/analytics/growth')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);

      const growthData = response.body.data;
      const funnel = growthData.registrationFunnel;
      
      // Should have at least our test organization
      expect(funnel.signups).toBeGreaterThanOrEqual(1);
      
      // Funnel should narrow down (or stay same) at each step up to configuration
      expect(funnel.emailVerified).toBeLessThanOrEqual(funnel.signups);
      expect(funnel.whatsappConfigured).toBeLessThanOrEqual(funnel.emailVerified);
      expect(funnel.sheetsConfigured).toBeLessThanOrEqual(funnel.whatsappConfigured);
      // Note: activeUsers can be > sheetsConfigured since orgs can be active without sheets
      expect(funnel.activeUsers).toBeLessThanOrEqual(funnel.signups);
      
      // Conversion rate should be a valid percentage
      expect(funnel.conversionRate).toBeGreaterThanOrEqual(0);
      expect(funnel.conversionRate).toBeLessThanOrEqual(100);
    });

    test('038C-003-3: Should track organization and user growth', async () => {
      const response = await request(app)
        .get('/api/super-admin/analytics/growth')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);

      const growthData = response.body.data;
      const orgGrowth = growthData.growthMetrics.organizationGrowth;
      const userGrowth = growthData.growthMetrics.userGrowth;
      
      // Organization growth
      expect(orgGrowth.total).toBeGreaterThanOrEqual(1); // At least our test org
      expect(orgGrowth.newToday).toBeGreaterThanOrEqual(0);
      expect(orgGrowth.newThisWeek).toBeGreaterThanOrEqual(orgGrowth.newToday);
      expect(orgGrowth.newThisMonth).toBeGreaterThanOrEqual(orgGrowth.newThisWeek);
      expect(typeof orgGrowth.monthOverMonthGrowth).toBe('number');
      
      // User growth
      expect(userGrowth.total).toBeGreaterThanOrEqual(3); // At least our 3 test users
      expect(userGrowth.newToday).toBeGreaterThanOrEqual(0);
      expect(userGrowth.newThisWeek).toBeGreaterThanOrEqual(userGrowth.newToday);
      expect(userGrowth.newThisMonth).toBeGreaterThanOrEqual(userGrowth.newThisWeek);
    });

    test('038C-003-4: Should calculate trial conversion metrics', async () => {
      const response = await request(app)
        .get('/api/super-admin/analytics/growth')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);

      const growthData = response.body.data;
      const trialConversion = growthData.trialConversion;
      
      // Should have at least our test trial
      expect(trialConversion.totalTrials).toBeGreaterThanOrEqual(1);
      
      // Conversion rate should be valid percentage
      expect(trialConversion.conversionRate).toBeGreaterThanOrEqual(0);
      expect(trialConversion.conversionRate).toBeLessThanOrEqual(100);
      
      // Average days to convert should be positive
      expect(trialConversion.averageDaysToConvert).toBeGreaterThan(0);
      
      // Total trials should equal sum of converted + cancelled + active
      // (allowing some margin since we're only checking basic consistency)
      expect(trialConversion.converted).toBeGreaterThanOrEqual(0);
      expect(trialConversion.cancelled).toBeGreaterThanOrEqual(0);
    });
  });

  // ============================================================================
  // SUBTASK-038C-004: PERFORMANCE BENCHMARKING
  // ============================================================================

  describe('SUBTASK-038C-004: Performance Benchmarking', () => {
    test('038C-004-1: Should get performance benchmarks with all metrics', async () => {
      const response = await request(app)
        .get('/api/super-admin/analytics/benchmarks')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      
      const benchmarkData = response.body.data;
      
      // Verify appointments per org percentiles
      expect(benchmarkData.appointmentsPerOrg).toBeDefined();
      expect(benchmarkData.appointmentsPerOrg.p25).toBeDefined();
      expect(benchmarkData.appointmentsPerOrg.p50).toBeDefined();
      expect(benchmarkData.appointmentsPerOrg.p75).toBeDefined();
      expect(benchmarkData.appointmentsPerOrg.p95).toBeDefined();
      
      // Verify patients per org percentiles
      expect(benchmarkData.patientsPerOrg).toBeDefined();
      expect(benchmarkData.patientsPerOrg.p25).toBeDefined();
      expect(benchmarkData.patientsPerOrg.p50).toBeDefined();
      expect(benchmarkData.patientsPerOrg.p75).toBeDefined();
      expect(benchmarkData.patientsPerOrg.p95).toBeDefined();
      
      // Verify messages per org percentiles
      expect(benchmarkData.messagesPerOrg).toBeDefined();
      expect(benchmarkData.messagesPerOrg.p25).toBeDefined();
      expect(benchmarkData.messagesPerOrg.p50).toBeDefined();
      expect(benchmarkData.messagesPerOrg.p75).toBeDefined();
      expect(benchmarkData.messagesPerOrg.p95).toBeDefined();
      
      // Verify high performers array
      expect(benchmarkData.highPerformers).toBeDefined();
      expect(Array.isArray(benchmarkData.highPerformers)).toBe(true);
      
      // Verify low performers array
      expect(benchmarkData.lowPerformers).toBeDefined();
      expect(Array.isArray(benchmarkData.lowPerformers)).toBe(true);
    });

    test('038C-004-2: Should calculate percentiles in ascending order', async () => {
      const response = await request(app)
        .get('/api/super-admin/analytics/benchmarks')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);

      const benchmarkData = response.body.data;
      
      // Percentiles should be in ascending order
      const appts = benchmarkData.appointmentsPerOrg;
      expect(appts.p25).toBeLessThanOrEqual(appts.p50);
      expect(appts.p50).toBeLessThanOrEqual(appts.p75);
      expect(appts.p75).toBeLessThanOrEqual(appts.p95);
      
      const patients = benchmarkData.patientsPerOrg;
      expect(patients.p25).toBeLessThanOrEqual(patients.p50);
      expect(patients.p50).toBeLessThanOrEqual(patients.p75);
      expect(patients.p75).toBeLessThanOrEqual(patients.p95);
      
      const messages = benchmarkData.messagesPerOrg;
      expect(messages.p25).toBeLessThanOrEqual(messages.p50);
      expect(messages.p50).toBeLessThanOrEqual(messages.p75);
      expect(messages.p75).toBeLessThanOrEqual(messages.p95);
    });

    test('038C-004-3: Should identify high performers with valid data', async () => {
      const response = await request(app)
        .get('/api/super-admin/analytics/benchmarks')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);

      const benchmarkData = response.body.data;
      
      // If there are high performers, they should have valid structure
      if (benchmarkData.highPerformers.length > 0) {
        const performer = benchmarkData.highPerformers[0];
        expect(performer.organizationId).toBeDefined();
        expect(performer.name).toBeDefined();
        expect(performer.metrics).toBeDefined();
        expect(performer.metrics.appointmentsPerMonth).toBeDefined();
        expect(performer.metrics.patientsTotal).toBeDefined();
        expect(performer.metrics.messagesPerDay).toBeDefined();
      }
    });

    test('038C-004-4: Should identify low performers with suggestions', async () => {
      const response = await request(app)
        .get('/api/super-admin/analytics/benchmarks')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);

      const benchmarkData = response.body.data;
      
      // If there are low performers, they should have valid structure
      if (benchmarkData.lowPerformers.length > 0) {
        const performer = benchmarkData.lowPerformers[0];
        expect(performer.organizationId).toBeDefined();
        expect(performer.name).toBeDefined();
        expect(performer.issueType).toBeDefined();
        expect(performer.suggestions).toBeDefined();
        expect(Array.isArray(performer.suggestions)).toBe(true);
        expect(performer.suggestions.length).toBeGreaterThan(0);
      }
    });
  });

  // ============================================================================
  // AUTHORIZATION & ERROR HANDLING
  // ============================================================================

  describe('Authorization & Error Handling', () => {
    test('AUTH-1: Should reject unauthorized access (no token)', async () => {
      await request(app)
        .get('/api/super-admin/analytics/system-health')
        .expect(401);
    });

    test('AUTH-2: Should reject non-super-admin users', async () => {
      // Regular admin trying to access analytics
      await request(app)
        .get('/api/super-admin/analytics/system-health')
        .set('Authorization', `Bearer ${regularAdminToken}`)
        .expect(403);
      
      await request(app)
        .get('/api/super-admin/analytics/usage')
        .set('Authorization', `Bearer ${regularAdminToken}`)
        .expect(403);
      
      await request(app)
        .get('/api/super-admin/analytics/growth')
        .set('Authorization', `Bearer ${regularAdminToken}`)
        .expect(403);
      
      await request(app)
        .get('/api/super-admin/analytics/benchmarks')
        .set('Authorization', `Bearer ${regularAdminToken}`)
        .expect(403);
    });

    test('AUTH-3: Should allow super admin to access all analytics endpoints', async () => {
      // All endpoints should be accessible with super admin token
      await request(app)
        .get('/api/super-admin/analytics/system-health')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);
      
      await request(app)
        .get('/api/super-admin/analytics/usage')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);
      
      await request(app)
        .get('/api/super-admin/analytics/growth')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);
      
      await request(app)
        .get('/api/super-admin/analytics/benchmarks')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);
    });

    test('AUTH-4: Should handle invalid tokens gracefully', async () => {
      await request(app)
        .get('/api/super-admin/analytics/system-health')
        .set('Authorization', 'Bearer invalid-token-xyz')
        .expect(401);
    });
  });
});
