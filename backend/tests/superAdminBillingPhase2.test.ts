/**
 * Integration Tests for TASK-038B Phase 2
 * SUBTASK-038B-005: Invoice & Receipt Management
 * SUBTASK-038B-006: Revenue Reports & Analytics
 * 
 * Tests all billing, invoice, receipt, and revenue analytics endpoints
 */

import request from 'supertest';
import { app } from '../src/app';
import { getPrismaClient } from '../src/services/prisma';
import { authService } from '../src/services/auth';

const prisma = getPrismaClient();

describe('TASK-038B Phase 2: Invoice, Receipt & Revenue Analytics', () => {
  let superAdminToken: string;
  let superAdminUser: any;
  let testOrganization: any;
  let testUser: any;
  let testBillingHistory: any;
  let testPaymentIntent: any;

  // ============================================================================
  // SETUP & TEARDOWN
  // ============================================================================

  beforeAll(async () => {
    // Create super admin user for testing
    superAdminUser = await prisma.user.create({
      data: {
        email: 'superadmin-billing@test.com',
        password: 'hashedpassword',
        firstName: 'Super',
        lastName: 'Admin',
        role: 'SUPER_ADMIN',
        emailVerified: true,
        organization: {
          create: {
            name: 'DrSync Platform',
            slug: 'drsync-platform-test',
            email: 'platform@drsync.com',
            phone: '+923001234567',
            subscriptionPlan: 'ENTERPRISE',
            subscriptionStatus: 'ACTIVE',
            isActive: true,
            organizationType: 'HOSPITAL'
          }
        }
      }
    });

    // Generate access token
    superAdminToken = authService.generateAccessToken({
      userId: superAdminUser.id,
      email: superAdminUser.email,
      role: superAdminUser.role,
      organizationId: superAdminUser.organizationId
    });

    // Create test organization with billing data
    testOrganization = await prisma.organization.create({
      data: {
        name: 'Test Clinic for Billing',
        slug: 'test-clinic-billing',
        email: 'billing-test@clinic.com',
        phone: '+923009999999',
        subscriptionPlan: 'PROFESSIONAL',
        subscriptionStatus: 'ACTIVE',
        isActive: true,
        organizationType: 'CLINIC',
        doctorCount: 5
      }
    });

    // Create test user
    testUser = await prisma.user.create({
      data: {
        email: 'testuser@billing.com',
        password: 'hashedpassword',
        firstName: 'Test',
        lastName: 'User',
        role: 'ORG_ADMIN',
        organizationId: testOrganization.id
      }
    });

    // Create test billing history records
    const billingRecords = [];
    for (let i = 0; i < 5; i++) {
      const record = await prisma.billingHistory.create({
        data: {
          organization: {
            connect: { id: testOrganization.id }
          },
          amount: 15000 + (i * 1000),
          currency: 'PKR',
          paymentStatus: i < 3 ? 'SUCCESS' : 'PENDING',
          paymentMethod: 'JAZZCASH',
          billingPeriod: `2024-${String(i + 1).padStart(2, '0')}`,
          doctorCount: 5,
          transactionId: i < 3 ? `TXN-${Date.now()}-${i}` : null
        }
      });
      billingRecords.push(record);
    }
    testBillingHistory = billingRecords[0];

    // Create test payment intents
    for (let i = 0; i < 3; i++) {
      await prisma.paymentIntent.create({
        data: {
          organization: {
            connect: { id: testOrganization.id }
          },
          amount: 15000,
          currency: 'PKR',
          status: 'SUCCESS',
          paymentMethod: 'JAZZCASH',
          subscriptionType: 'PROFESSIONAL',
          billingPeriod: `2024-${String(i + 1).padStart(2, '0')}`,
          doctorCount: 5,
          gatewayIntentId: `GATEWAY-${Date.now()}-${i}`,
          retryCount: 0,
          maxRetries: 3
        }
      });
    }

    // Get one payment intent for testing
    testPaymentIntent = await prisma.paymentIntent.findFirst({
      where: { organizationId: testOrganization.id, status: 'SUCCESS' }
    });
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.billingHistory.deleteMany({
      where: { organizationId: testOrganization.id }
    });
    await prisma.paymentIntent.deleteMany({
      where: { organizationId: testOrganization.id }
    });
    await prisma.user.deleteMany({
      where: { organizationId: testOrganization.id }
    });
    await prisma.organization.delete({
      where: { id: testOrganization.id }
    });
    await prisma.user.delete({
      where: { id: superAdminUser.id }
    });
    await prisma.organization.delete({
      where: { id: superAdminUser.organizationId }
    });

    await prisma.$disconnect();
  });

  // ============================================================================
  // SUBTASK-038B-005: INVOICE & RECEIPT MANAGEMENT
  // ============================================================================

  describe('SUBTASK-038B-005: Invoice & Receipt Management', () => {
    
    describe('GET /api/super-admin/billing/invoices', () => {
      it('TEST-038B-005-1: should list all invoices with pagination', async () => {
        const response = await request(app)
          .get('/api/super-admin/billing/invoices')
          .set('Authorization', `Bearer ${superAdminToken}`)
          .query({ page: 1, limit: 10 });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('invoices');
        expect(response.body.data).toHaveProperty('pagination');
        expect(Array.isArray(response.body.data.invoices)).toBe(true);
        expect(response.body.data.pagination).toHaveProperty('page');
        expect(response.body.data.pagination).toHaveProperty('total');
      });

      it('TEST-038B-005-2: should filter invoices by organization', async () => {
        const response = await request(app)
          .get('/api/super-admin/billing/invoices')
          .set('Authorization', `Bearer ${superAdminToken}`)
          .query({ organizationId: testOrganization.id });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.invoices.length).toBeGreaterThan(0);
        
        // All invoices should belong to the test organization
        response.body.data.invoices.forEach((invoice: any) => {
          expect(invoice.organization.id).toBe(testOrganization.id);
        });
      });

      it('TEST-038B-005-3: should filter invoices by status', async () => {
        const response = await request(app)
          .get('/api/super-admin/billing/invoices')
          .set('Authorization', `Bearer ${superAdminToken}`)
          .query({ status: 'SUCCESS,PENDING' });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });

      it('TEST-038B-005-4: should require super admin authorization', async () => {
        const response = await request(app)
          .get('/api/super-admin/billing/invoices');

        expect(response.status).toBe(401);
      });
    });

    describe('POST /api/super-admin/billing/invoices/preview', () => {
      it('TEST-038B-005-5: should generate invoice preview', async () => {
        const response = await request(app)
          .post('/api/super-admin/billing/invoices/preview')
          .set('Authorization', `Bearer ${superAdminToken}`)
          .send({ billingHistoryId: testBillingHistory.id });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('invoiceNumber');
        expect(response.body.data).toHaveProperty('organizationName');
        expect(response.body.data).toHaveProperty('total');
        expect(response.body.data).toHaveProperty('items');
      });

      it('TEST-038B-005-6: should require billingHistoryId', async () => {
        const response = await request(app)
          .post('/api/super-admin/billing/invoices/preview')
          .set('Authorization', `Bearer ${superAdminToken}`)
          .send({});

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('required');
      });
    });

    describe('POST /api/super-admin/billing/invoices/generate', () => {
      it('TEST-038B-005-7: should generate and send invoice', async () => {
        const response = await request(app)
          .post('/api/super-admin/billing/invoices/generate')
          .set('Authorization', `Bearer ${superAdminToken}`)
          .send({ 
            billingHistoryId: testBillingHistory.id,
            sendEmail: false 
          });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('invoiceNumber');
        expect(response.body).toHaveProperty('emailSent');
      });

      it('TEST-038B-005-8: should handle email sending flag', async () => {
        const response = await request(app)
          .post('/api/super-admin/billing/invoices/generate')
          .set('Authorization', `Bearer ${superAdminToken}`)
          .send({ 
            billingHistoryId: testBillingHistory.id,
            sendEmail: true 
          });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.emailSent).toBe(true);
      });
    });

    describe('GET /api/super-admin/billing/receipts', () => {
      it('TEST-038B-005-9: should list all receipts with pagination', async () => {
        const response = await request(app)
          .get('/api/super-admin/billing/receipts')
          .set('Authorization', `Bearer ${superAdminToken}`)
          .query({ page: 1, limit: 10 });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('receipts');
        expect(response.body.data).toHaveProperty('pagination');
        expect(Array.isArray(response.body.data.receipts)).toBe(true);
      });

      it('TEST-038B-005-10: should filter receipts by organization', async () => {
        const response = await request(app)
          .get('/api/super-admin/billing/receipts')
          .set('Authorization', `Bearer ${superAdminToken}`)
          .query({ organizationId: testOrganization.id });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        
        // All receipts should belong to the test organization
        response.body.data.receipts.forEach((receipt: any) => {
          expect(receipt.organization.id).toBe(testOrganization.id);
        });
      });

      it('TEST-038B-005-11: should only show receipts for successful payments', async () => {
        const response = await request(app)
          .get('/api/super-admin/billing/receipts')
          .set('Authorization', `Bearer ${superAdminToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        
        // All receipts should have status PAID
        response.body.data.receipts.forEach((receipt: any) => {
          expect(receipt.status).toBe('PAID');
        });
      });
    });

    describe('POST /api/super-admin/billing/receipts/:id/generate', () => {
      it('TEST-038B-005-12: should generate receipt for successful payment', async () => {
        const response = await request(app)
          .post(`/api/super-admin/billing/receipts/${testPaymentIntent.id}/generate`)
          .set('Authorization', `Bearer ${superAdminToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('receiptNumber');
        expect(response.body.data).toHaveProperty('organizationName');
        expect(response.body.data).toHaveProperty('amount');
        expect(response.body.data).toHaveProperty('paymentMethod');
        expect(response.body.data.status).toBe('PAID');
      });

      it('TEST-038B-005-13: should require payment intent ID', async () => {
        const response = await request(app)
          .post('/api/super-admin/billing/receipts//generate')
          .set('Authorization', `Bearer ${superAdminToken}`);

        expect(response.status).toBe(404);
      });
    });
  });

  // ============================================================================
  // SUBTASK-038B-006: REVENUE REPORTS & ANALYTICS
  // ============================================================================

  describe('SUBTASK-038B-006: Revenue Reports & Analytics', () => {
    
    describe('GET /api/super-admin/revenue/trends', () => {
      it('TEST-038B-006-1: should return revenue trends with daily granularity', async () => {
        const startDate = new Date('2024-01-01').toISOString();
        const endDate = new Date('2024-12-31').toISOString();

        const response = await request(app)
          .get('/api/super-admin/revenue/trends')
          .set('Authorization', `Bearer ${superAdminToken}`)
          .query({ 
            granularity: 'daily',
            startDate,
            endDate 
          });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('granularity', 'daily');
        expect(response.body.data).toHaveProperty('trends');
        expect(response.body.data).toHaveProperty('totalRevenue');
        expect(response.body.data).toHaveProperty('totalTransactions');
        expect(Array.isArray(response.body.data.trends)).toBe(true);
      });

      it('TEST-038B-006-2: should return revenue trends with monthly granularity', async () => {
        const startDate = new Date('2024-01-01').toISOString();
        const endDate = new Date('2024-12-31').toISOString();

        const response = await request(app)
          .get('/api/super-admin/revenue/trends')
          .set('Authorization', `Bearer ${superAdminToken}`)
          .query({ 
            granularity: 'monthly',
            startDate,
            endDate 
          });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.granularity).toBe('monthly');
      });

      it('TEST-038B-006-3: should require all parameters', async () => {
        const response = await request(app)
          .get('/api/super-admin/revenue/trends')
          .set('Authorization', `Bearer ${superAdminToken}`)
          .query({ granularity: 'monthly' });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('required');
      });

      it('TEST-038B-006-4: should support quarterly granularity', async () => {
        const startDate = new Date('2024-01-01').toISOString();
        const endDate = new Date('2024-12-31').toISOString();

        const response = await request(app)
          .get('/api/super-admin/revenue/trends')
          .set('Authorization', `Bearer ${superAdminToken}`)
          .query({ 
            granularity: 'quarterly',
            startDate,
            endDate 
          });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.granularity).toBe('quarterly');
      });
    });

    describe('GET /api/super-admin/revenue/ltv', () => {
      it('TEST-038B-006-5: should calculate customer lifetime value', async () => {
        const response = await request(app)
          .get('/api/super-admin/revenue/ltv')
          .set('Authorization', `Bearer ${superAdminToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('totalOrganizations');
        expect(response.body.data).toHaveProperty('totalLTV');
        expect(response.body.data).toHaveProperty('averageLTV');
        expect(typeof response.body.data.totalLTV).toBe('number');
        expect(typeof response.body.data.averageLTV).toBe('number');
      });

      it('TEST-038B-006-6: should segment LTV by plan', async () => {
        const response = await request(app)
          .get('/api/super-admin/revenue/ltv')
          .set('Authorization', `Bearer ${superAdminToken}`)
          .query({ segmentBy: 'plan' });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('segmentBy', 'plan');
        expect(response.body.data).toHaveProperty('segments');
      });

      it('TEST-038B-006-7: should segment LTV by region', async () => {
        const response = await request(app)
          .get('/api/super-admin/revenue/ltv')
          .set('Authorization', `Bearer ${superAdminToken}`)
          .query({ segmentBy: 'region' });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('segmentBy', 'region');
      });

      it('TEST-038B-006-8: should segment LTV by organization type', async () => {
        const response = await request(app)
          .get('/api/super-admin/revenue/ltv')
          .set('Authorization', `Bearer ${superAdminToken}`)
          .query({ segmentBy: 'organizationType' });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('segmentBy', 'organizationType');
      });
    });

    describe('GET /api/super-admin/revenue/churn', () => {
      it('TEST-038B-006-9: should analyze churn rate', async () => {
        const startDate = new Date('2024-01-01').toISOString();
        const endDate = new Date('2024-12-31').toISOString();

        const response = await request(app)
          .get('/api/super-admin/revenue/churn')
          .set('Authorization', `Bearer ${superAdminToken}`)
          .query({ startDate, endDate });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('period');
        expect(response.body.data).toHaveProperty('activeOrganizationsAtStart');
        expect(response.body.data).toHaveProperty('churnedOrganizations');
        expect(response.body.data).toHaveProperty('churnRate');
        expect(response.body.data).toHaveProperty('monthlyRevenueChurn');
        expect(response.body.data).toHaveProperty('annualRevenueChurn');
        expect(typeof response.body.data.churnRate).toBe('number');
      });

      it('TEST-038B-006-10: should require date range parameters', async () => {
        const response = await request(app)
          .get('/api/super-admin/revenue/churn')
          .set('Authorization', `Bearer ${superAdminToken}`)
          .query({ startDate: new Date().toISOString() });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('required');
      });

      it('TEST-038B-006-11: should calculate revenue impact of churn', async () => {
        const startDate = new Date('2024-01-01').toISOString();
        const endDate = new Date('2024-12-31').toISOString();

        const response = await request(app)
          .get('/api/super-admin/revenue/churn')
          .set('Authorization', `Bearer ${superAdminToken}`)
          .query({ startDate, endDate });

        expect(response.status).toBe(200);
        expect(response.body.data.monthlyRevenueChurn).toBeGreaterThanOrEqual(0);
        expect(response.body.data.annualRevenueChurn).toBe(
          response.body.data.monthlyRevenueChurn * 12
        );
      });
    });

    describe('GET /api/super-admin/revenue/forecast', () => {
      it('TEST-038B-006-12: should generate revenue forecast', async () => {
        const response = await request(app)
          .get('/api/super-admin/revenue/forecast')
          .set('Authorization', `Bearer ${superAdminToken}`)
          .query({ months: 12 });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('currentMRR');
        expect(response.body.data).toHaveProperty('monthlyGrowthRate');
        expect(response.body.data).toHaveProperty('forecastMonths', 12);
        expect(response.body.data).toHaveProperty('forecast');
        expect(response.body.data).toHaveProperty('assumptions');
        expect(Array.isArray(response.body.data.forecast)).toBe(true);
        expect(response.body.data.forecast.length).toBe(12);
      });

      it('TEST-038B-006-13: should include best and worst case scenarios', async () => {
        const response = await request(app)
          .get('/api/super-admin/revenue/forecast')
          .set('Authorization', `Bearer ${superAdminToken}`)
          .query({ months: 6 });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        
        response.body.data.forecast.forEach((period: any) => {
          expect(period).toHaveProperty('projectedMRR');
          expect(period).toHaveProperty('projectedARR');
          expect(period).toHaveProperty('bestCase');
          expect(period).toHaveProperty('worstCase');
          expect(period.bestCase).toBeGreaterThan(period.projectedMRR);
          expect(period.worstCase).toBeLessThan(period.projectedMRR);
        });
      });

      it('TEST-038B-006-14: should use default forecast period', async () => {
        const response = await request(app)
          .get('/api/super-admin/revenue/forecast')
          .set('Authorization', `Bearer ${superAdminToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.forecast.length).toBe(12); // Default
      });

      it('TEST-038B-006-15: should include growth assumptions', async () => {
        const response = await request(app)
          .get('/api/super-admin/revenue/forecast')
          .set('Authorization', `Bearer ${superAdminToken}`)
          .query({ months: 3 });

        expect(response.status).toBe(200);
        expect(response.body.data.assumptions).toBeDefined();
        expect(Array.isArray(response.body.data.assumptions)).toBe(true);
        expect(response.body.data.assumptions.length).toBeGreaterThan(0);
      });
    });
  });

  // ============================================================================
  // AUTHORIZATION TESTS
  // ============================================================================

  describe('Authorization & Security', () => {
    it('TEST-038B-AUTH-1: should reject requests without token', async () => {
      const response = await request(app)
        .get('/api/super-admin/billing/invoices');

      expect(response.status).toBe(401);
    });

    it('TEST-038B-AUTH-2: should reject non-super-admin users', async () => {
      const regularUserToken = authService.generateAccessToken({
        userId: testUser.id,
        email: testUser.email,
        role: 'ORG_ADMIN',
        organizationId: testOrganization.id
      });

      const response = await request(app)
        .get('/api/super-admin/billing/invoices')
        .set('Authorization', `Bearer ${regularUserToken}`);

      expect(response.status).toBe(403);
    });
  });
});
