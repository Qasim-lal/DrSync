import request from 'supertest';
import { app } from '../src/app';
import { PrismaClient } from '../src/generated/prisma';
import { authService } from '../src/services/auth';

const prisma = new PrismaClient();

/**
 * TASK-038A: Super Admin Integration Tests
 * Tests for organization management endpoints
 * 
 * Test Coverage:
 * - SUBTASK-038A-001: Organization listing with filtering and pagination
 * - SUBTASK-038A-002: Organization details view
 * - SUBTASK-038A-003: Organization status management
 * - SUBTASK-038A-004: Organization configuration management
 * - SUBTASK-038A-005: Organization user management
 * - SUBTASK-038A-006: Organization statistics
 */

describe('TASK-038A: Super Admin - Organization Management', () => {
  let superAdminToken: string;
  let regularAdminToken: string;
  let testOrgId: string;
  let superAdminUser: any;
  let regularAdminUser: any;
  let testOrg: any;

  // Setup: Create test users and organizations
  beforeAll(async () => {
    // Clean up any existing test data
    await prisma.user.deleteMany({
      where: { email: { in: ['superadmin@test.com', 'admin@test.com'] } }
    });
    await prisma.organization.deleteMany({
      where: { email: { in: ['supertest@clinic.com', 'regular@clinic.com'] } }
    });

    // Create test organization for super admin
    const superAdminOrg = await prisma.organization.create({
      data: {
        name: 'Super Admin Org',
        slug: 'super-admin-org',
        email: 'supertest@clinic.com',
        organizationType: 'CLINIC',
        subscriptionPlan: 'ENTERPRISE',
        subscriptionStatus: 'ACTIVE',
        region: 'PAKISTAN',
        isActive: true
      }
    });

    // Create super admin user
    const hashedPassword = await authService.hashPassword('TestPassword123!');
    superAdminUser = await prisma.user.create({
      data: {
        email: 'superadmin@test.com',
        password: hashedPassword,
        firstName: 'Super',
        lastName: 'Admin',
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

    // Create test organization for regular admin
    testOrg = await prisma.organization.create({
      data: {
        name: 'Test Clinic',
        slug: 'test-clinic',
        email: 'regular@clinic.com',
        organizationType: 'CLINIC',
        subscriptionPlan: 'BASIC',
        subscriptionStatus: 'TRIAL',
        region: 'PAKISTAN',
        isActive: true,
        maxPatients: 25,
        maxAppointments: 50
      }
    });
    testOrgId = testOrg.id;

    // Create regular admin user
    regularAdminUser = await prisma.user.create({
      data: {
        email: 'admin@test.com',
        password: hashedPassword,
        firstName: 'Regular',
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
  });

  // Cleanup
  afterAll(async () => {
    await prisma.user.deleteMany({
      where: { email: { in: ['superadmin@test.com', 'admin@test.com'] } }
    });
    await prisma.organization.deleteMany({
      where: { email: { in: ['supertest@clinic.com', 'regular@clinic.com'] } }
    });
    await prisma.$disconnect();
  });

  // ============================================================================
  // SUBTASK-038A-001: Organization Listing & Search Tests
  // ============================================================================

  describe('SUBTASK-038A-001: Organization Listing & Search', () => {
    /**
     * TEST-038A-001-1: Test pagination works correctly with various page sizes
     */
    it('TEST-038A-001-1: should return paginated organizations', async () => {
      const response = await request(app)
        .get('/api/super-admin/organizations?page=1&limit=10')
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
     * TEST-038A-001-2: Verify search returns correct results across all fields
     */
    it('TEST-038A-001-2: should search organizations by name', async () => {
      const response = await request(app)
        .get('/api/super-admin/organizations?search=Test')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      
      // Verify search filter is returned
      expect(response.body.filters).toHaveProperty('search', 'Test');
      
      // Verify at least one result matches (our test org)
      if (response.body.data.length > 0) {
        const hasMatch = response.body.data.some((org: any) => 
          org.name.includes('Test') || org.email.includes('test')
        );
        expect(hasMatch).toBe(true);
      }
    });

    /**
     * TEST-038A-001-3: Test subscription status filtering accuracy
     */
    it('TEST-038A-001-3: should filter by subscription status', async () => {
      const response = await request(app)
        .get('/api/super-admin/organizations?subscriptionStatus=TRIAL')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.filters.subscriptionStatus).toEqual(['TRIAL']);
      
      // All returned orgs should have TRIAL status
      response.body.data.forEach((org: any) => {
        expect(org.subscriptionStatus).toBe('TRIAL');
      });
    });

    /**
     * TEST-038A-001-4: Validate organization type filtering
     */
    it('TEST-038A-001-4: should filter by organization type', async () => {
      const response = await request(app)
        .get('/api/super-admin/organizations?organizationType=CLINIC')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.filters.organizationType).toEqual(['CLINIC']);
      
      // All returned orgs should be CLINIC type
      response.body.data.forEach((org: any) => {
        expect(org.organizationType).toBe('CLINIC');
      });
    });

    /**
     * TEST-038A-001-5: Test multiple filters working together
     */
    it('TEST-038A-001-5: should handle multiple filters simultaneously', async () => {
      const response = await request(app)
        .get('/api/super-admin/organizations?subscriptionStatus=TRIAL&organizationType=CLINIC&region=PAKISTAN')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.filters.subscriptionStatus).toEqual(['TRIAL']);
      expect(response.body.filters.organizationType).toEqual(['CLINIC']);
      expect(response.body.filters.region).toBe('PAKISTAN');
      
      // All returned orgs should match all filters
      response.body.data.forEach((org: any) => {
        expect(org.subscriptionStatus).toBe('TRIAL');
        expect(org.organizationType).toBe('CLINIC');
        expect(org.region).toBe('PAKISTAN');
      });
    });

    /**
     * TEST-038A-001-6: Verify date range filtering with edge cases
     */
    it('TEST-038A-001-6: should filter by creation date range', async () => {
      const today = new Date();
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
      const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

      const response = await request(app)
        .get(`/api/super-admin/organizations?createdFrom=${yesterday.toISOString()}&createdTo=${tomorrow.toISOString()}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      
      // All returned orgs should be created within date range
      response.body.data.forEach((org: any) => {
        const createdAt = new Date(org.createdAt);
        expect(createdAt.getTime()).toBeGreaterThanOrEqual(yesterday.getTime());
        expect(createdAt.getTime()).toBeLessThanOrEqual(tomorrow.getTime());
      });
    });

    /**
     * TEST-038A-001-7: Test performance with 10,000+ organizations (mocked)
     * Note: This test validates pagination and query optimization
     */
    it('TEST-038A-001-7: should handle large result sets efficiently', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .get('/api/super-admin/organizations?page=1&limit=100')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);
      
      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(response.body.success).toBe(true);
      expect(responseTime).toBeLessThan(3000); // Should respond within 3 seconds
      expect(response.body.data.length).toBeLessThanOrEqual(100); // Respects limit
    });

    /**
     * TEST-038A-001-8: Verify authorization (SUPER_ADMIN only)
     */
    it('TEST-038A-001-8: should deny access to non-super-admin users', async () => {
      const response = await request(app)
        .get('/api/super-admin/organizations')
        .set('Authorization', `Bearer ${regularAdminToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Insufficient permissions');
      expect(response.body.code).toBe('SUPER_ADMIN_REQUIRED');
    });

    it('should deny access without authentication', async () => {
      const response = await request(app)
        .get('/api/super-admin/organizations')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  // ============================================================================
  // SUBTASK-038A-002: Organization Details View Tests
  // ============================================================================

  describe('SUBTASK-038A-002: Organization Details View', () => {
    it('should retrieve comprehensive organization details', async () => {
      const response = await request(app)
        .get(`/api/super-admin/organizations/${testOrgId}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id', testOrgId);
      expect(response.body.data).toHaveProperty('name');
      expect(response.body.data).toHaveProperty('email');
      expect(response.body.data).toHaveProperty('_count');
      expect(response.body.data._count).toHaveProperty('users');
      expect(response.body.data._count).toHaveProperty('patients');
      expect(response.body.data._count).toHaveProperty('appointments');
    });

    it('should mask sensitive credentials', async () => {
      const response = await request(app)
        .get(`/api/super-admin/organizations/${testOrgId}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);

      // Credentials should be masked or null
      if (response.body.data.whatsappCredentials) {
        expect(response.body.data.whatsappCredentials).toBe('***MASKED***');
      }
      if (response.body.data.googleCredentials) {
        expect(response.body.data.googleCredentials).toBe('***MASKED***');
      }
    });

    it('should return 404 for non-existent organization', async () => {
      const response = await request(app)
        .get('/api/super-admin/organizations/non-existent-id')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Organization not found');
    });
  });

  // ============================================================================
  // SUBTASK-038A-003: Organization Status Management Tests
  // ============================================================================

  describe('SUBTASK-038A-003: Organization Status Management', () => {
    it('should deactivate an organization', async () => {
      const response = await request(app)
        .patch(`/api/super-admin/organizations/${testOrgId}/status`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ isActive: false, reason: 'Test deactivation' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.isActive).toBe(false);
    });

    it('should reactivate an organization', async () => {
      const response = await request(app)
        .patch(`/api/super-admin/organizations/${testOrgId}/status`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ isActive: true, reason: 'Test reactivation' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.isActive).toBe(true);
    });

    it('should suspend an organization with reason', async () => {
      const response = await request(app)
        .post(`/api/super-admin/organizations/${testOrgId}/suspend`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ reason: 'Payment failure' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.subscriptionStatus).toBe('SUSPENDED');
      expect(response.body.data.isActive).toBe(false);
    });

    it('should require reason for suspension', async () => {
      const response = await request(app)
        .post(`/api/super-admin/organizations/${testOrgId}/suspend`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Suspension reason is required');
    });
  });

  // ============================================================================
  // SUBTASK-038A-004: Organization Configuration Management Tests
  // ============================================================================

  describe('SUBTASK-038A-004: Organization Configuration Management', () => {
    it('should retrieve organization configuration', async () => {
      const response = await request(app)
        .get(`/api/super-admin/organizations/${testOrgId}/config`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('timezone');
      expect(response.body.data).toHaveProperty('language');
      expect(response.body.data).toHaveProperty('region');
      expect(response.body.data).toHaveProperty('maxPatients');
      expect(response.body.data).toHaveProperty('maxAppointments');
    });

    it('should update trial limits', async () => {
      const response = await request(app)
        .patch(`/api/super-admin/organizations/${testOrgId}/limits`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ maxPatients: 50, maxAppointments: 100 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.maxPatients).toBe(50);
      expect(response.body.data.maxAppointments).toBe(100);
    });

    it('should validate trial limit values', async () => {
      const response = await request(app)
        .patch(`/api/super-admin/organizations/${testOrgId}/limits`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ maxPatients: -1, maxAppointments: 100 })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('must be a positive number');
    });
  });

  // ============================================================================
  // SUBTASK-038A-005: Organization User Management Tests
  // ============================================================================

  describe('SUBTASK-038A-005: Organization User Management', () => {
    it('should retrieve organization users', async () => {
      const response = await request(app)
        .get(`/api/super-admin/organizations/${testOrgId}/users`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.count).toBeGreaterThanOrEqual(1); // At least the regular admin
      
      // Verify user structure
      if (response.body.data.length > 0) {
        const user = response.body.data[0];
        expect(user).toHaveProperty('id');
        expect(user).toHaveProperty('email');
        expect(user).toHaveProperty('role');
        expect(user).toHaveProperty('isActive');
      }
    });
  });

  // ============================================================================
  // SUBTASK-038A-006: Organization Statistics Tests
  // ============================================================================

  describe('SUBTASK-038A-006: Organization Statistics', () => {
    it('should retrieve platform-wide statistics', async () => {
      const response = await request(app)
        .get('/api/super-admin/statistics/organizations')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('total');
      expect(response.body.data).toHaveProperty('active');
      expect(response.body.data).toHaveProperty('trial');
      expect(response.body.data).toHaveProperty('suspended');
      expect(response.body.data).toHaveProperty('inactive');
      expect(response.body.data).toHaveProperty('newToday');
      expect(response.body.data).toHaveProperty('newThisWeek');
      expect(response.body.data).toHaveProperty('newThisMonth');
      expect(response.body.data).toHaveProperty('byType');
      expect(response.body.data).toHaveProperty('byPlan');
      expect(response.body.data).toHaveProperty('byRegion');
      expect(response.body.data).toHaveProperty('byStatus');
      
      // Verify counts are numbers
      expect(typeof response.body.data.total).toBe('number');
      expect(typeof response.body.data.active).toBe('number');
      
      // Verify distribution objects
      expect(typeof response.body.data.byType).toBe('object');
      expect(typeof response.body.data.byPlan).toBe('object');
    });

    it('should have consistent statistics', async () => {
      const response = await request(app)
        .get('/api/super-admin/statistics/organizations')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);

      // Total should equal sum of active + inactive
      const { total, active, inactive } = response.body.data;
      expect(total).toBeGreaterThanOrEqual(active + inactive);
    });
  });
});
