/**
 * WhatsApp Configuration Integration Tests
 * Tests for TASK-036 WhatsApp Business API configuration wizard
 */

import request from 'supertest';
import { app } from '../src/app';
import { getPrismaClient } from '../src/services/prisma';

const prisma = getPrismaClient();

describe('WhatsApp Configuration Integration Tests', () => {
  let authToken: string;
  let organizationId: string;

  beforeAll(async () => {
    // Create test organization
    const organization = await prisma.organization.create({
      data: {
        name: 'Test Clinic - WhatsApp Config',
        slug: `test-clinic-wa-${Date.now()}`,
        email: `whatsapp-test-${Date.now()}@example.com`,
        organizationType: 'CLINIC',
      },
    });
    organizationId = organization.id;

    // Create test admin user
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash('password123', 10);
    const user = await prisma.user.create({
      data: {
        email: `admin-wa-${Date.now()}@example.com`,
        password: hashedPassword,
        firstName: 'Admin',
        lastName: 'User',
        role: 'ORG_ADMIN',
        organizationId,
      },
    });

    // Login to get auth token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: user.email,
        password: 'password123',
      });

    authToken = loginResponse.body.data.tokens.accessToken;
  });

  afterAll(async () => {
    // Cleanup
    await prisma.user.deleteMany({ where: { organizationId } });
    await prisma.organization.delete({ where: { id: organizationId } });
    await prisma.$disconnect();
  });

  describe('POST /api/configuration/whatsapp/validate-credentials', () => {
    it('should reject request without credentials', async () => {
      const response = await request(app)
        .post('/api/configuration/whatsapp/validate-credentials')
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('required');
    });

    it('should validate credential format', async () => {
      const response = await request(app)
        .post('/api/configuration/whatsapp/validate-credentials')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          appId: 'invalid_app_id', // Should be numeric
          appSecret: 'test_secret',
          accessToken: 'test_token',
          phoneNumberId: '123456789',
        });

      expect(response.status).toBe(400);
      expect(response.body.data.isValid).toBe(false);
      expect(response.body.data.errors).toContainEqual(
        expect.stringContaining('App ID must contain only numbers')
      );
    });

    it('should accept valid credential format', async () => {
      const response = await request(app)
        .post('/api/configuration/whatsapp/validate-credentials')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          appId: '123456789012345',
          appSecret: 'test_app_secret',
          accessToken: 'EAAG_test_access_token',
          phoneNumberId: '987654321098765',
        });

      // Note: This will fail API validation but pass format validation
      expect(response.status).toBe(400); // API validation will fail
      expect(response.body.data.errors).toBeDefined();
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/configuration/whatsapp/validate-credentials')
        .send({
          appId: '123456789012345',
          appSecret: 'test_secret',
          accessToken: 'test_token',
          phoneNumberId: '123456789',
        });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/configuration/whatsapp/generate-webhook', () => {
    it('should generate unique webhook URL', async () => {
      const response = await request(app)
        .get('/api/configuration/whatsapp/generate-webhook')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.webhookUrl).toBeDefined();
      expect(response.body.data.verifyToken).toBeDefined();
      expect(response.body.data.verifyToken.length).toBeGreaterThan(20);
    });

    it('should generate different tokens on multiple calls', async () => {
      const response1 = await request(app)
        .get('/api/configuration/whatsapp/generate-webhook')
        .set('Authorization', `Bearer ${authToken}`);

      const response2 = await request(app)
        .get('/api/configuration/whatsapp/generate-webhook')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response1.body.data.verifyToken).not.toBe(response2.body.data.verifyToken);
    });
  });

  describe('POST /api/configuration/whatsapp/register-phone', () => {
    it('should validate phone number format', async () => {
      const response = await request(app)
        .post('/api/configuration/whatsapp/register-phone')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          appId: '123456789012345',
          appSecret: 'test_secret',
          accessToken: 'test_token',
          phoneNumberId: '123456789',
          phoneNumber: '1234567890', // Missing + prefix
        });

      expect(response.status).toBe(400);
      expect(response.body.data.isValid).toBe(false);
      expect(response.body.data.errors).toContainEqual(
        expect.stringContaining('international format')
      );
    });

    it('should accept valid international format', async () => {
      const response = await request(app)
        .post('/api/configuration/whatsapp/register-phone')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          appId: '123456789012345',
          appSecret: 'test_secret',
          accessToken: 'test_token',
          phoneNumberId: '123456789',
          phoneNumber: '+1234567890',
        });

      expect(response.status).toBe(200);
      expect(response.body.data.isValid).toBe(true);
      expect(response.body.data.details.registrationStatus).toBe('pending_verification');
    });
  });

  describe('POST /api/configuration/whatsapp/verify-phone', () => {
    beforeEach(async () => {
      // Register phone first
      await request(app)
        .post('/api/configuration/whatsapp/register-phone')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          appId: '123456789012345',
          appSecret: 'test_secret',
          accessToken: 'test_token',
          phoneNumberId: '123456789',
          phoneNumber: '+1234567890',
        });
    });

    it('should reject invalid verification code format', async () => {
      const response = await request(app)
        .post('/api/configuration/whatsapp/verify-phone')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          appId: '123456789012345',
          appSecret: 'test_secret',
          accessToken: 'test_token',
          phoneNumberId: '123456789',
          phoneNumber: '+1234567890',
          verificationCode: '12345', // Must be 6 digits
        });

      expect(response.status).toBe(400);
      expect(response.body.data.isValid).toBe(false);
      expect(response.body.data.errors).toContainEqual(
        expect.stringContaining('6 digits')
      );
    });

    it('should accept valid 6-digit code', async () => {
      const response = await request(app)
        .post('/api/configuration/whatsapp/verify-phone')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          appId: '123456789012345',
          appSecret: 'test_secret',
          accessToken: 'test_token',
          phoneNumberId: '123456789',
          phoneNumber: '+1234567890',
          verificationCode: '123456',
        });

      expect(response.status).toBe(200);
      expect(response.body.data.isValid).toBe(true);
      expect(response.body.data.details.verified).toBe(true);
    });
  });

  describe('POST /api/configuration/whatsapp/save', () => {
    it('should save complete configuration', async () => {
      const webhookResponse = await request(app)
        .get('/api/configuration/whatsapp/generate-webhook')
        .set('Authorization', `Bearer ${authToken}`);

      const response = await request(app)
        .post('/api/configuration/whatsapp/save')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          appId: '123456789012345',
          appSecret: 'test_app_secret',
          accessToken: 'EAAG_test_token',
          phoneNumberId: '987654321098765',
          webhookUrl: webhookResponse.body.data.webhookUrl,
          verifyToken: webhookResponse.body.data.verifyToken,
        });

      expect(response.status).toBe(200);
      expect(response.body.data.isValid).toBe(true);
      expect(response.body.data.details.configured).toBe(true);

      // Verify data was saved to database
      const org = await prisma.organization.findUnique({
        where: { id: organizationId },
      });

      expect(org?.whatsappCredentials).toBeDefined();
      expect(org?.whatsappWebhookUrl).toBe(webhookResponse.body.data.webhookUrl);
      expect(org?.whatsappConfigured).toBe(true);
    });

    it('should encrypt sensitive credentials', async () => {
      const webhookResponse = await request(app)
        .get('/api/configuration/whatsapp/generate-webhook')
        .set('Authorization', `Bearer ${authToken}`);

      await request(app)
        .post('/api/configuration/whatsapp/save')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          appId: '123456789012345',
          appSecret: 'my_secret_key',
          accessToken: 'EAAG_my_access_token',
          phoneNumberId: '987654321098765',
          webhookUrl: webhookResponse.body.data.webhookUrl,
          verifyToken: webhookResponse.body.data.verifyToken,
        });

      const org = await prisma.organization.findUnique({
        where: { id: organizationId },
      });

      const credentials = org?.whatsappCredentials as any;
      
      // Check that secrets are encrypted (contain : separator for IV)
      expect(credentials.appSecret).toContain(':');
      expect(credentials.accessToken).toContain(':');
      
      // Original values should not be stored in plain text
      expect(credentials.appSecret).not.toBe('my_secret_key');
      expect(credentials.accessToken).not.toBe('EAAG_my_access_token');
    });
  });

  describe('GET /api/configuration/whatsapp/validate', () => {
    it('should validate incomplete setup', async () => {
      // Create a fresh organization without any WhatsApp configuration
      const freshOrg = await prisma.organization.create({
        data: {
          name: 'Test Clinic - Incomplete',
          slug: `test-incomplete-${Date.now()}`,
          email: `incomplete-${Date.now()}@example.com`,
          organizationType: 'CLINIC',
        },
      });

      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash('password123', 10);
      const freshUser = await prisma.user.create({
        data: {
          email: `admin-incomplete-${Date.now()}@example.com`,
          password: hashedPassword,
          firstName: 'Admin',
          lastName: 'Incomplete',
          role: 'ORG_ADMIN',
          organizationId: freshOrg.id,
        },
      });

      const freshLoginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: freshUser.email,
          password: 'password123',
        });

      const freshAuthToken = freshLoginResponse.body.data.tokens.accessToken;

      const response = await request(app)
        .get('/api/configuration/whatsapp/validate')
        .set('Authorization', `Bearer ${freshAuthToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.isValid).toBe(false);
      expect(response.body.data.errors.length).toBeGreaterThan(0);

      // Cleanup
      await prisma.user.delete({ where: { id: freshUser.id } });
      await prisma.organization.delete({ where: { id: freshOrg.id } });
    });

    it('should validate complete setup', async () => {
      // First complete the setup
      const webhookResponse = await request(app)
        .get('/api/configuration/whatsapp/generate-webhook')
        .set('Authorization', `Bearer ${authToken}`);

      await request(app)
        .post('/api/configuration/whatsapp/save')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          appId: '123456789012345',
          appSecret: 'test_secret',
          accessToken: 'EAAG_test',
          phoneNumberId: '987654321098765',
          webhookUrl: webhookResponse.body.data.webhookUrl,
          verifyToken: webhookResponse.body.data.verifyToken,
        });

      // Register and verify phone
      await request(app)
        .post('/api/configuration/whatsapp/register-phone')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          appId: '123456789012345',
          appSecret: 'test_secret',
          accessToken: 'EAAG_test',
          phoneNumberId: '987654321098765',
          phoneNumber: '+1234567890',
        });

      await request(app)
        .post('/api/configuration/whatsapp/verify-phone')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          appId: '123456789012345',
          appSecret: 'test_secret',
          accessToken: 'EAAG_test',
          phoneNumberId: '987654321098765',
          phoneNumber: '+1234567890',
          verificationCode: '123456',
        });

      // Now validate
      const response = await request(app)
        .get('/api/configuration/whatsapp/validate')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.isValid).toBe(true);
      expect(response.body.data.details.setupComplete).toBe(true);
    });
  });

  describe('GET /api/configuration/status', () => {
    it('should return overall configuration status', async () => {
      const response = await request(app)
        .get('/api/configuration/status')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.whatsapp).toBeDefined();
      expect(response.body.data.googleSheets).toBeDefined();
    });
  });

  describe('Authorization Tests', () => {
    it('should reject requests without authentication', async () => {
      const response = await request(app)
        .get('/api/configuration/whatsapp/validate');

      expect(response.status).toBe(401);
    });

    it('should reject requests from non-admin users', async () => {
      // Create staff user
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash('password123', 10);
      const staffUser = await prisma.user.create({
        data: {
          email: `staff-wa-${Date.now()}@example.com`,
          password: hashedPassword,
          firstName: 'Staff',
          lastName: 'User',
          role: 'STAFF',
          organizationId,
        },
      });

      const staffLoginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: staffUser.email,
          password: 'password123',
        });

      const staffToken = staffLoginResponse.body.data.tokens.accessToken;

      const response = await request(app)
        .post('/api/configuration/whatsapp/save')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          appId: '123456789012345',
          appSecret: 'test_secret',
          accessToken: 'test_token',
          phoneNumberId: '123456789',
          webhookUrl: 'https://example.com/webhook',
          verifyToken: 'test_verify',
        });

      expect(response.status).toBe(403); // Forbidden

      // Cleanup
      await prisma.user.delete({ where: { id: staffUser.id } });
    });
  });
});
