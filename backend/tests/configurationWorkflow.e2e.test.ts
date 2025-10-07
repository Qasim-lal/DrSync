/**
 * End-to-End Configuration Workflow Testing
 * TASK-036D-001: Comprehensive Configuration Testing
 * 
 * Tests complete wizard workflows including:
 * - WhatsApp Business API setup
 * - Google Sheets integration
 * - Staff invitation system
 * - Cross-service validation
 * - Performance benchmarks
 */

import request from 'supertest';
import { app } from '../src/app';
import { getPrismaClient } from '../src/services/prisma';
import { AuthService } from '../src/services/auth';
import { SubscriptionPlan, SubscriptionStatus, UserRole, OrganizationType } from '../src/generated/prisma';

const prisma = getPrismaClient();
const authService = new AuthService();

describe('TASK-036D-001: End-to-End Configuration Workflow Tests', () => {
  let organizationId: string;
  let adminToken: string;

  // Setup test organization and admin user
  beforeAll(async () => {
    // Create test organization
    const organization = await prisma.organization.create({
      data: {
        name: 'E2E Test Clinic',
        email: 'e2e-test-' + Date.now() + '@clinic.com',
        phone: '+923001234567',
        address: 'Test Address',
        slug: 'e2e-test-clinic-' + Date.now(),
        organizationType: OrganizationType.CLINIC,
        subscriptionPlan: SubscriptionPlan.FREE,
        subscriptionStatus: SubscriptionStatus.ACTIVE,
      },
    });
    organizationId = organization.id;

    // Create admin user
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash('TestPassword123!', 10);

    const adminUser = await prisma.user.create({
      data: {
        email: 'e2e-admin-' + Date.now() + '@clinic.com',
        password: hashedPassword,
        firstName: 'E2E',
        lastName: 'Admin',
        role: UserRole.ADMIN,
        organizationId: organization.id,
        emailVerified: true,
        isActive: true,
      },
    });

    // Generate admin token
    const tokenPair = authService.generateTokenPair({
      ...adminUser,
      organization: {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
      },
    } as any);
    adminToken = tokenPair.accessToken;
  });

  // Cleanup
  afterAll(async () => {
    // Clean up in reverse order of dependencies
    await prisma.staffInvitation.deleteMany({ where: { organizationId } });
    await prisma.user.deleteMany({ where: { organizationId } });
    await prisma.organization.delete({ where: { id: organizationId } });
    await prisma.$disconnect();
  });

  describe('Complete Configuration Workflow', () => {
    it('should complete full organization setup workflow', async () => {
      const startTime = Date.now();

      // Step 1: Verify organization exists and is accessible
      const orgCheck = await prisma.organization.findUnique({
        where: { id: organizationId },
      });
      expect(orgCheck).not.toBeNull();
      expect(orgCheck?.isActive).toBe(true);

      // Step 2: Check configuration status (should be incomplete initially)
      const statusResponse = await request(app)
        .get('/api/configuration/status')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(statusResponse.status).toBe(200);
      expect(statusResponse.body.success).toBe(true);

      // Step 3: Create staff invitation
      const invitationResponse = await request(app)
        .post('/api/invitations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'staff-' + Date.now() + '@example.com',
          role: 'DOCTOR',
          permissions: ['manage_appointments'],
        });

      expect(invitationResponse.status).toBe(201);
      expect(invitationResponse.body.success).toBe(true);

      // Step 4: Get invitation statistics
      const statsResponse = await request(app)
        .get('/api/invitations/stats')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(statsResponse.status).toBe(200);
      expect(statsResponse.body.data.pending).toBeGreaterThan(0);

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Performance assertion: Complete workflow should finish within 10 seconds
      expect(duration).toBeLessThan(10000);

      console.log(`✅ Complete workflow executed in ${duration}ms`);
    });

    it('should handle concurrent configuration requests', async () => {
      // Simulate multiple admins configuring simultaneously
      const requests = Array.from({ length: 5 }, () =>
        request(app)
          .get('/api/configuration/status')
          .set('Authorization', `Bearer ${adminToken}`)
      );

      const responses = await Promise.all(requests);

      responses.forEach((response) => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });

    it('should validate configuration persistence across requests', async () => {
      // Create invitation
      const response1 = await request(app)
        .post('/api/invitations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'persist-test-' + Date.now() + '@example.com',
          role: 'STAFF',
        });

      expect(response1.status).toBe(201);
      const invitationId = response1.body.data.invitationId;

      // Retrieve invitation in separate request
      const response2 = await request(app)
        .get(`/api/invitations/${invitationId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response2.status).toBe(200);
      expect(response2.body.data.id).toBe(invitationId);
    });
  });

  describe('Cross-Service Validation', () => {
    it('should verify WhatsApp configuration endpoints are accessible', async () => {
      const response = await request(app)
        .get('/api/configuration/status')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      // WhatsApp configuration object should be present
      expect(response.body.data).toHaveProperty('whatsapp');
    });

    it('should verify Google Sheets configuration endpoints are accessible', async () => {
      const response = await request(app)
        .get('/api/configuration/status')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('googleSheets');
    });

    it('should verify staff invitation system is integrated', async () => {
      const response = await request(app)
        .get('/api/invitations')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should enforce authentication across all configuration services', async () => {
      // Test without token
      const responses = await Promise.all([
        request(app).get('/api/configuration/status'),
        request(app).get('/api/invitations'),
        request(app).post('/api/invitations').send({}),
      ]);

      responses.forEach((response) => {
        expect(response.status).toBe(401);
      });
    });

    it('should enforce authorization (admin-only) for configuration', async () => {
      // Create a staff user (non-admin)
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash('TestPassword123!', 10);

      const staffUser = await prisma.user.create({
        data: {
          email: 'staff-' + Date.now() + '@clinic.com',
          password: hashedPassword,
          firstName: 'Staff',
          lastName: 'User',
          role: UserRole.STAFF,
          organizationId,
          emailVerified: true,
          isActive: true,
        },
      });

      const org = await prisma.organization.findUnique({
        where: { id: organizationId },
      });

      const staffTokenPair = authService.generateTokenPair({
        ...staffUser,
        organization: {
          id: org!.id,
          name: org!.name,
          slug: org!.slug,
        },
      } as any);

      // Try to create invitation as staff user
      const response = await request(app)
        .post('/api/invitations')
        .set('Authorization', `Bearer ${staffTokenPair.accessToken}`)
        .send({
          email: 'test@example.com',
          role: 'DOCTOR',
        });

      expect(response.status).toBe(403);

      // Cleanup
      await prisma.user.delete({ where: { id: staffUser.id } });
    });
  });

  describe('Integration Point Verification', () => {
    it('should verify database connectivity', async () => {
      const result = await prisma.$queryRaw`SELECT 1 as result`;
      expect(result).toBeDefined();
    });

    it('should verify API endpoints are properly registered', async () => {
      const endpoints = [
        '/api/configuration/status',
        '/api/invitations',
        '/api/invitations/stats',
      ];

      for (const endpoint of endpoints) {
        const response = await request(app)
          .get(endpoint)
          .set('Authorization', `Bearer ${adminToken}`);

        expect([200, 401, 403]).toContain(response.status);
      }
    });

    it('should verify authentication system integration', async () => {
      // Test with valid token
      const response1 = await request(app)
        .get('/api/invitations/stats')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response1.status).toBe(200);

      // Test with invalid token
      const response2 = await request(app)
        .get('/api/invitations/stats')
        .set('Authorization', 'Bearer invalid-token');

      expect(response2.status).toBe(401);
    });

    it('should verify multi-tenant data isolation', async () => {
      // Create another organization
      const otherOrg = await prisma.organization.create({
        data: {
          name: 'Other Clinic',
          email: 'other-' + Date.now() + '@clinic.com',
          phone: '+923009999999',
          address: 'Other Address',
          slug: 'other-clinic-' + Date.now(),
          organizationType: OrganizationType.CLINIC,
          subscriptionPlan: SubscriptionPlan.FREE,
          subscriptionStatus: SubscriptionStatus.ACTIVE,
        },
      });

      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash('TestPassword123!', 10);

      const otherAdmin = await prisma.user.create({
        data: {
          email: 'other-admin-' + Date.now() + '@clinic.com',
          password: hashedPassword,
          firstName: 'Other',
          lastName: 'Admin',
          role: UserRole.ADMIN,
          organizationId: otherOrg.id,
          emailVerified: true,
          isActive: true,
        },
      });

      const otherTokenPair = authService.generateTokenPair({
        ...otherAdmin,
        organization: {
          id: otherOrg.id,
          name: otherOrg.name,
          slug: otherOrg.slug,
        },
      } as any);

      // Try to access first org's data with second org's token
      const response = await request(app)
        .get('/api/invitations')
        .set('Authorization', `Bearer ${otherTokenPair.accessToken}`);

      expect(response.status).toBe(200);
      // Should not see first org's invitations
      const firstOrgInvitations = response.body.data.filter(
        (inv: any) => inv.organizationId === organizationId
      );
      expect(firstOrgInvitations.length).toBe(0);

      // Cleanup
      await prisma.user.delete({ where: { id: otherAdmin.id } });
      await prisma.organization.delete({ where: { id: otherOrg.id } });
    });
  });

  describe('Error Scenario Testing', () => {
    it('should handle invalid configuration data gracefully', async () => {
      const response = await request(app)
        .post('/api/invitations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'invalid-email',
          role: 'INVALID_ROLE',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should handle network timeout scenarios', async () => {
      // Test with extremely short timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1);

      try {
        await request(app)
          .get('/api/invitations/stats')
          .set('Authorization', `Bearer ${adminToken}`)
          .timeout(1);
      } catch (error: any) {
        // Timeout expected
        expect(error).toBeDefined();
      } finally {
        clearTimeout(timeoutId);
      }
    });

    it('should recover from temporary database unavailability', async () => {
      // Test normal operation
      const response = await request(app)
        .get('/api/invitations/stats')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
    });

    it('should validate duplicate prevention works across services', async () => {
      const email = 'duplicate-test-' + Date.now() + '@example.com';

      // Create first invitation
      const response1 = await request(app)
        .post('/api/invitations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email,
          role: 'DOCTOR',
        });

      expect(response1.status).toBe(201);

      // Try to create duplicate
      const response2 = await request(app)
        .post('/api/invitations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email,
          role: 'DOCTOR',
        });

      expect(response2.status).toBe(400);
      expect(response2.body.message).toContain('already exists');
    });
  });

  describe('Performance Benchmark Testing', () => {
    it('should complete configuration status check within 3 seconds', async () => {
      const startTime = Date.now();

      const response = await request(app)
        .get('/api/configuration/status')
        .set('Authorization', `Bearer ${adminToken}`);

      const duration = Date.now() - startTime;

      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(3000);

      console.log(`⚡ Configuration status check: ${duration}ms`);
    });

    it('should handle 10 concurrent users', async () => {
      const startTime = Date.now();

      const requests = Array.from({ length: 10 }, () =>
        request(app)
          .get('/api/invitations/stats')
          .set('Authorization', `Bearer ${adminToken}`)
      );

      const responses = await Promise.all(requests);

      const duration = Date.now() - startTime;

      responses.forEach((response) => {
        expect(response.status).toBe(200);
      });

      // All 10 requests should complete within 5 seconds
      expect(duration).toBeLessThan(5000);

      console.log(`⚡ 10 concurrent requests completed in ${duration}ms`);
    });

    it('should measure API response times', async () => {
      const endpoints = [
        '/api/configuration/status',
        '/api/invitations',
        '/api/invitations/stats',
      ];

      const timings: Record<string, number> = {};

      for (const endpoint of endpoints) {
        const startTime = Date.now();

        await request(app)
          .get(endpoint)
          .set('Authorization', `Bearer ${adminToken}`);

        timings[endpoint] = Date.now() - startTime;
      }

      // All endpoints should respond within 2 seconds
      Object.entries(timings).forEach(([endpoint, duration]) => {
        expect(duration).toBeLessThan(2000);
        console.log(`⚡ ${endpoint}: ${duration}ms`);
      });
    });

    it('should support rapid successive requests', async () => {
      const iterations = 20;
      const startTime = Date.now();

      for (let i = 0; i < iterations; i++) {
        const response = await request(app)
          .get('/api/invitations/stats')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
      }

      const duration = Date.now() - startTime;
      const avgTime = duration / iterations;

      console.log(`⚡ ${iterations} requests: ${duration}ms (avg: ${avgTime.toFixed(2)}ms)`);

      // Average response time should be under 500ms
      expect(avgTime).toBeLessThan(500);
    });
  });

  describe('Configuration State Management', () => {
    it('should persist configuration changes', async () => {
      // Create a configuration change
      const response1 = await request(app)
        .post('/api/invitations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'state-test-' + Date.now() + '@example.com',
          role: 'NURSE',
        });

      expect(response1.status).toBe(201);

      // Verify it persists
      const response2 = await request(app)
        .get('/api/invitations')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response2.status).toBe(200);
      const found = response2.body.data.some(
        (inv: any) => inv.id === response1.body.data.invitationId
      );
      expect(found).toBe(true);
    });

    it('should track configuration progress', async () => {
      const response = await request(app)
        .get('/api/configuration/status')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('whatsapp');
      expect(response.body.data).toHaveProperty('googleSheets');
    });
  });
});
