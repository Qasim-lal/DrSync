/**
 * Staff Invitation Integration Tests
 * TASK-036C: Staff Invitation and Management System
 */

import request from 'supertest';
import { app } from '../src/app';
import { getPrismaClient } from '../src/services/prisma';
import * as staffInvitationService from '../src/services/staffInvitationService';
import { SubscriptionPlan, SubscriptionStatus, UserRole, OrganizationType } from '../src/generated/prisma';
import { AuthService } from '../src/services/auth';

const prisma = getPrismaClient();

describe('Staff Invitation System Integration Tests', () => {
  let adminToken: string;
  let adminUserId: string;
  let organizationId: string;
  let testInvitationId: string;
  let testToken: string;

  // Setup test data
  beforeAll(async () => {
    // Create test organization
    const organization = await prisma.organization.create({
      data: {
        name: 'Test Clinic for Invitations',
        email: 'invitations@testclinic.com',
        phone: '+923001234567',
        address: 'Test Address',
        slug: 'test-clinic-inv-' + Date.now(),
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
        email: 'admin@testclinic-inv.com',
        password: hashedPassword,
        firstName: 'Test',
        lastName: 'Admin',
        role: UserRole.ADMIN,
        organizationId: organization.id,
        emailVerified: true,
        isActive: true,
      },
    });
    adminUserId = adminUser.id;

    // Generate admin token using AuthService
    const authService = new AuthService();
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

  // Cleanup test data
  afterAll(async () => {
    await prisma.staffInvitation.deleteMany({
      where: { organizationId },
    });
    await prisma.user.deleteMany({
      where: { organizationId },
    });
    await prisma.organization.delete({
      where: { id: organizationId },
    });
    await prisma.$disconnect();
  });

  describe('POST /api/invitations - Create Invitation', () => {
    it('should create invitation successfully with valid data', async () => {
      const response = await request(app)
        .post('/api/invitations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'doctor@example.com',
          role: 'DOCTOR',
          permissions: ['manage_appointments', 'view_patients'],
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('invitationId');
      expect(response.body.data.email).toBe('doctor@example.com');
      expect(response.body.data.role).toBe('DOCTOR');
      expect(response.body.data).toHaveProperty('expiresAt');

      testInvitationId = response.body.data.invitationId;
    });

    it('should reject invitation with missing email', async () => {
      const response = await request(app)
        .post('/api/invitations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          role: 'DOCTOR',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Email and role are required');
    });

    it('should reject invitation with invalid email format', async () => {
      const response = await request(app)
        .post('/api/invitations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'invalid-email',
          role: 'DOCTOR',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid email format');
    });

    it('should reject invitation with invalid role', async () => {
      const response = await request(app)
        .post('/api/invitations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'test@example.com',
          role: 'INVALID_ROLE',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid role');
    });

    it('should reject duplicate invitation for same email', async () => {
      const response = await request(app)
        .post('/api/invitations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'doctor@example.com',
          role: 'DOCTOR',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Pending invitation already exists');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/invitations')
        .send({
          email: 'test@example.com',
          role: 'DOCTOR',
        });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/invitations - Get Pending Invitations', () => {
    it('should return all pending invitations for organization', async () => {
      const response = await request(app)
        .get('/api/invitations')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data[0]).toHaveProperty('email');
      expect(response.body.data[0]).toHaveProperty('status');
      expect(response.body.data[0].status).toBe('PENDING');
    });

    it('should require authentication', async () => {
      const response = await request(app).get('/api/invitations');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/invitations/stats - Get Invitation Statistics', () => {
    it('should return invitation statistics', async () => {
      const response = await request(app)
        .get('/api/invitations/stats')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('pending');
      expect(response.body.data).toHaveProperty('accepted');
      expect(response.body.data).toHaveProperty('expired');
      expect(response.body.data).toHaveProperty('cancelled');
      expect(response.body.data).toHaveProperty('total');
      expect(typeof response.body.data.pending).toBe('number');
    });
  });

  describe('GET /api/invitations/validate/:token - Validate Token', () => {
    beforeAll(async () => {
      // Get the invitation to extract token
      const invitation = await prisma.staffInvitation.findFirst({
        where: {
          email: 'doctor@example.com',
          organizationId,
        },
      });
      testToken = invitation?.token || '';
    });

    it('should validate valid invitation token', async () => {
      const response = await request(app).get(
        `/api/invitations/validate/${testToken}`
      );

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('email');
      expect(response.body.data).toHaveProperty('role');
      expect(response.body.data).toHaveProperty('organization');
      expect(response.body.data.email).toBe('doctor@example.com');
    });

    it('should reject invalid token', async () => {
      const response = await request(app).get(
        '/api/invitations/validate/invalid-token'
      );

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should reject expired token', async () => {
      // Create an expired invitation - need to create it first to get real ID
      const tempInvitation = await prisma.staffInvitation.create({
        data: {
          email: 'expired@example.com',
          role: UserRole.DOCTOR,
          organizationId,
          invitedBy: adminUserId,
          status: 'PENDING',
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });

      // Now update with actual token using the real ID and set to expired
      const expiredInvitation = await prisma.staffInvitation.update({
        where: { id: tempInvitation.id },
        data: {
          expiresAt: new Date(Date.now() - 1000), // Already expired
          token: staffInvitationService.generateInvitationToken(
            tempInvitation.id,
            'expired@example.com',
            organizationId
          ),
        },
      });

      const response = await request(app).get(
        `/api/invitations/validate/${expiredInvitation.token}`
      );

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('expired');

      // Cleanup
      await prisma.staffInvitation.delete({
        where: { id: expiredInvitation.id },
      });
    });
  });

  describe('POST /api/invitations/accept - Accept Invitation', () => {
    it('should accept invitation and create user account', async () => {
      // Create a fresh invitation for acceptance - create without token first
      const tempInvitation = await prisma.staffInvitation.create({
        data: {
          email: 'newdoctor@example.com',
          role: UserRole.DOCTOR,
          organizationId,
          invitedBy: adminUserId,
          status: 'PENDING',
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });

      // Update with the correct token using real ID
      const newInvitation = await prisma.staffInvitation.update({
        where: { id: tempInvitation.id },
        data: {
          token: staffInvitationService.generateInvitationToken(
            tempInvitation.id,
            'newdoctor@example.com',
            organizationId
          ),
        },
      });

      const response = await request(app)
        .post('/api/invitations/accept')
        .send({
          token: newInvitation.token,
          password: 'SecurePass123!',
          firstName: 'Jane',
          lastName: 'Doe',
          phone: '+923001234568',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('userId');
      expect(response.body.data).toHaveProperty('email');
      expect(response.body.data.email).toBe('newdoctor@example.com');
      expect(response.body.data.role).toBe('DOCTOR');

      // Verify user was created
      const user = await prisma.user.findFirst({
        where: { email: 'newdoctor@example.com' },
      });
      expect(user).not.toBeNull();
      expect(user?.emailVerified).toBe(true);
      expect(user?.isActive).toBe(true);

      // Verify invitation status updated
      const updatedInvitation = await prisma.staffInvitation.findUnique({
        where: { id: newInvitation.id },
      });
      expect(updatedInvitation?.status).toBe('ACCEPTED');
    });

    it('should reject acceptance with missing fields', async () => {
      const response = await request(app)
        .post('/api/invitations/accept')
        .send({
          token: testToken,
          password: 'SecurePass123!',
          firstName: 'John',
          // Missing lastName
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('required');
    });

    it('should reject acceptance with weak password', async () => {
      const response = await request(app)
        .post('/api/invitations/accept')
        .send({
          token: testToken,
          password: 'weak',
          firstName: 'John',
          lastName: 'Doe',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('at least 8 characters');
    });
  });

  describe('POST /api/invitations/:invitationId/resend - Resend Invitation', () => {
    it('should resend invitation successfully', async () => {
      const response = await request(app)
        .post(`/api/invitations/${testInvitationId}/resend`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('expiresAt');
    });

    it('should reject resend for non-existent invitation', async () => {
      const response = await request(app)
        .post('/api/invitations/non-existent-id/resend')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should require authentication', async () => {
      const response = await request(app).post(
        `/api/invitations/${testInvitationId}/resend`
      );

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/invitations/:invitationId - Get Invitation Details', () => {
    it('should return invitation details', async () => {
      const response = await request(app)
        .get(`/api/invitations/${testInvitationId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('email');
      expect(response.body.data).toHaveProperty('status');
    });

    it('should reject access to invitations from other organizations', async () => {
      // Create another organization and admin
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
          email: 'otheradmin-' + Date.now() + '@clinic.com',
          password: hashedPassword,
          firstName: 'Other',
          lastName: 'Admin',
          role: UserRole.ADMIN,
          organizationId: otherOrg.id,
          emailVerified: true,
          isActive: true,
        },
      });

      const authService = new AuthService();
      const otherTokenPair = authService.generateTokenPair({
        ...otherAdmin,
        organization: {
          id: otherOrg.id,
          name: otherOrg.name,
          slug: otherOrg.slug,
        },
      } as any);
      const otherToken = otherTokenPair.accessToken;

      const response = await request(app)
        .get(`/api/invitations/${testInvitationId}`)
        .set('Authorization', `Bearer ${otherToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Access denied');

      // Cleanup
      await prisma.user.delete({ where: { id: otherAdmin.id } });
      await prisma.organization.delete({ where: { id: otherOrg.id } });
    });
  });

  describe('DELETE /api/invitations/:invitationId - Cancel Invitation', () => {
    it('should cancel invitation successfully', async () => {
      const response = await request(app)
        .delete(`/api/invitations/${testInvitationId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('cancelled successfully');

      // Verify invitation was cancelled
      const invitation = await prisma.staffInvitation.findUnique({
        where: { id: testInvitationId },
      });
      expect(invitation?.status).toBe('CANCELLED');
    });

    it('should reject cancelling non-existent invitation', async () => {
      const response = await request(app)
        .delete('/api/invitations/non-existent-id')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should require authentication', async () => {
      const response = await request(app).delete(
        `/api/invitations/${testInvitationId}`
      );

      expect(response.status).toBe(401);
    });
  });

  describe('Token Generation and Verification', () => {
    it('should generate valid JWT token', () => {
      const token = staffInvitationService.generateInvitationToken(
        'test-id',
        'test@example.com',
        organizationId
      );

      expect(token).toBeTruthy();
      expect(typeof token).toBe('string');

      const decoded = staffInvitationService.verifyInvitationToken(token);
      expect(decoded.invitationId).toBe('test-id');
      expect(decoded.email).toBe('test@example.com');
      expect(decoded.organizationId).toBe(organizationId);
    });

    it('should reject tampered token', () => {
      const token = staffInvitationService.generateInvitationToken(
        'test-id',
        'test@example.com',
        organizationId
      );

      const tamperedToken = token.slice(0, -10) + 'tampered!!';

      expect(() => {
        staffInvitationService.verifyInvitationToken(tamperedToken);
      }).toThrow();
    });
  });
});
