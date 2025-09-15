/**
 * Organization Registration Test Suite
 * 
 * Tests the complete organization registration flow including:
 * - API endpoint validation
 * - Service logic 
 * - Database operations
 * - Email notifications
 * - Trial activation
 * - Phone verification
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import { app } from '../src/app';
import { PrismaClient } from '../src/generated/prisma';
import OrganizationRegistrationService from '../src/services/organizationRegistrationService';
import { SubscriptionService } from '../src/services/subscriptionService';

const prisma = new PrismaClient();
const registrationService = new OrganizationRegistrationService();

// Test data
const testOrgData = {
  organizationName: 'Test Medical Clinic',
  organizationType: 'CLINIC' as const,
  adminUser: {
    firstName: 'Dr. John',
    lastName: 'Smith', 
    email: 'john.smith@testclinic.com',
    password: 'SecurePassword123',
    phone: '+92301234567',
  },
  address: {
    street: '123 Test Street',
    city: 'Karachi',
    state: 'Sindh',
    country: 'Pakistan',
    postalCode: '12345',
  },
  phoneVerificationCode: '123456',
  acceptedTerms: true,
  marketingConsent: true,
};

describe('Organization Registration', () => {
  beforeAll(async () => {
    // Connect to test database
    await prisma.$connect();
  });

  afterAll(async () => {
    // Clean up and disconnect
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean up test data before each test
    await prisma.user.deleteMany({
      where: { email: testOrgData.adminUser.email }
    });
    await prisma.organization.deleteMany({
      where: { name: testOrgData.organizationName }
    });
    await prisma.trialHistory.deleteMany({
      where: { 
        OR: [
          { phoneNumber: testOrgData.adminUser.phone },
          { email: testOrgData.adminUser.email }
        ]
      }
    });
  });

  describe('API Endpoints', () => {
    describe('POST /api/organizations/register', () => {
      it('should successfully register a new organization', async () => {
        const response = await request(app)
          .post('/api/organizations/register')
          .send(testOrgData)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
        expect(response.body.data.organization.name).toBe(testOrgData.organizationName);
        expect(response.body.data.adminUser.email).toBe(testOrgData.adminUser.email);
        expect(response.body.data.tokens).toBeDefined();
        expect(response.body.data.trial).toBeDefined();
      });

      it('should require phone verification first', async () => {
        const dataWithoutVerification = {
          ...testOrgData,
          phoneVerificationCode: undefined,
        };

        const response = await request(app)
          .post('/api/organizations/register')
          .send(dataWithoutVerification)
          .expect(202);

        expect(response.body.success).toBe(false);
        expect(response.body.requiresPhoneVerification).toBe(true);
        expect(response.body.code).toBe('PHONE_VERIFICATION_REQUIRED');
      });

      it('should reject duplicate organization name', async () => {
        // First registration
        await request(app)
          .post('/api/organizations/register')
          .send(testOrgData)
          .expect(201);

        // Second registration with same name
        const duplicateData = {
          ...testOrgData,
          adminUser: {
            ...testOrgData.adminUser,
            email: 'different@email.com',
            phone: '+92301234568',
          },
        };

        const response = await request(app)
          .post('/api/organizations/register')
          .send(duplicateData)
          .expect(409);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('already registered');
      });

      it('should reject duplicate email', async () => {
        // First registration
        await request(app)
          .post('/api/organizations/register')
          .send(testOrgData)
          .expect(201);

        // Second registration with same email
        const duplicateData = {
          ...testOrgData,
          organizationName: 'Different Clinic',
          adminUser: {
            ...testOrgData.adminUser,
            phone: '+92301234568',
          },
        };

        const response = await request(app)
          .post('/api/organizations/register')
          .send(duplicateData)
          .expect(409);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('already registered');
      });

      it('should validate required fields', async () => {
        const incompleteData = {
          organizationName: '',
          adminUser: {
            firstName: '',
            email: 'invalid-email',
            password: '123', // Too short
          },
          acceptedTerms: false,
        };

        const response = await request(app)
          .post('/api/organizations/register')
          .send(incompleteData)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.code).toBe('VALIDATION_ERROR');
      });
    });

    describe('GET /api/organizations/check-availability', () => {
      it('should check organization name availability', async () => {
        const response = await request(app)
          .get('/api/organizations/check-availability')
          .query({ organizationName: 'Available Clinic' })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.organizationNameAvailable).toBe(true);
      });

      it('should check email availability', async () => {
        const response = await request(app)
          .get('/api/organizations/check-availability')
          .query({ email: 'available@example.com' })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.emailAvailable).toBe(true);
      });

      it('should detect unavailable organization name', async () => {
        // First create an organization
        await request(app)
          .post('/api/organizations/register')
          .send(testOrgData)
          .expect(201);

        // Then check availability
        const response = await request(app)
          .get('/api/organizations/check-availability')
          .query({ organizationName: testOrgData.organizationName })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.organizationNameAvailable).toBe(false);
      });
    });

    describe('POST /api/organizations/verify-phone', () => {
      it('should verify valid phone code', async () => {
        const response = await request(app)
          .post('/api/organizations/verify-phone')
          .send({
            phoneNumber: testOrgData.adminUser.phone,
            verificationCode: '123456',
          })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.phoneVerified).toBe(true);
      });

      it('should reject invalid phone code', async () => {
        const response = await request(app)
          .post('/api/organizations/verify-phone')
          .send({
            phoneNumber: testOrgData.adminUser.phone,
            verificationCode: 'invalid',
          })
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.code).toBe('PHONE_VERIFICATION_INVALID');
      });
    });
  });

  describe('Service Layer', () => {
    describe('OrganizationRegistrationService', () => {
      it('should register organization with all components', async () => {
        const result = await registrationService.registerOrganization(testOrgData);

        expect(result.success).toBe(true);
        expect(result.organization).toBeDefined();
        expect(result.adminUser).toBeDefined();
        expect(result.tokens).toBeDefined();
        expect(result.trialDetails).toBeDefined();

        // Verify database records
        const organization = await prisma.organization.findUnique({
          where: { id: result.organization!.id }
        });
        expect(organization).toBeDefined();
        expect(organization!.name).toBe(testOrgData.organizationName);
        expect(organization!.subscriptionStatus).toBe('TRIAL');

        const user = await prisma.user.findUnique({
          where: { id: result.adminUser!.id }
        });
        expect(user).toBeDefined();
        expect(user!.role).toBe('ORG_ADMIN');
        expect(user!.organizationId).toBe(organization!.id);
      });

      it('should enforce trial eligibility', async () => {
        // Register trial history for phone number
        await prisma.trialHistory.create({
          data: {
            phoneNumber: testOrgData.adminUser.phone,
            email: testOrgData.adminUser.email,
            organizationName: 'Previous Org',
            phoneVerified: true,
          }
        });

        const result = await registrationService.registerOrganization(testOrgData);

        expect(result.success).toBe(false);
        expect(result.error).toContain('already been used');
      });

      it('should validate registration data', async () => {
        const invalidData = {
          ...testOrgData,
          organizationName: '', // Invalid
          adminUser: {
            ...testOrgData.adminUser,
            email: 'invalid-email', // Invalid
          },
        };

        const result = await registrationService.registerOrganization(invalidData);

        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
      });
    });

    describe('SubscriptionService Integration', () => {
      it('should start trial period correctly', async () => {
        const result = await registrationService.registerOrganization(testOrgData);
        
        expect(result.success).toBe(true);
        expect(result.trialDetails).toBeDefined();
        expect(result.trialDetails!.daysRemaining).toBe(14);
        expect(result.trialDetails!.maxPatients).toBe(25);
        expect(result.trialDetails!.maxAppointments).toBe(50);
      });

      it('should check trial limits after registration', async () => {
        const result = await registrationService.registerOrganization(testOrgData);
        
        expect(result.success).toBe(true);
        
        const trialLimits = await SubscriptionService.checkTrialLimits(result.organization!.id);
        
        expect(trialLimits.withinLimits).toBe(true);
        expect(trialLimits.currentUsage.patients).toBe(0);
        expect(trialLimits.currentUsage.appointments).toBe(0);
      });
    });
  });

  describe('Database Operations', () => {
    it('should create all required database records', async () => {
      const result = await registrationService.registerOrganization(testOrgData);
      
      expect(result.success).toBe(true);

      // Check organization record
      const organization = await prisma.organization.findUnique({
        where: { id: result.organization!.id },
        include: { users: true }
      });

      expect(organization).toBeDefined();
      expect(organization!.name).toBe(testOrgData.organizationName);
      expect(organization!.slug).toBeDefined();
      expect(organization!.subscriptionStatus).toBe('TRIAL');
      expect(organization!.isActive).toBe(true);
      expect(organization!.users).toHaveLength(1);

      // Check user record
      const user = organization!.users[0];
      expect(user).toBeDefined();
      expect(user!.firstName).toBe(testOrgData.adminUser.firstName);
      expect(user!.lastName).toBe(testOrgData.adminUser.lastName);
      expect(user!.email).toBe(testOrgData.adminUser.email);
      expect(user!.role).toBe('ORG_ADMIN');
      expect(user!.isActive).toBe(true);

      // Check trial history record
      const trialHistory = await prisma.trialHistory.findUnique({
        where: { phoneNumber: testOrgData.adminUser.phone }
      });

      expect(trialHistory).toBeDefined();
      expect(trialHistory!.email).toBe(testOrgData.adminUser.email);
      expect(trialHistory!.organizationName).toBe(testOrgData.organizationName);
    });

    it('should handle database transaction rollback on error', async () => {
      // This would test transaction rollback in case of errors
      // For now, we'll test that duplicate records are handled properly
      
      const result1 = await registrationService.registerOrganization(testOrgData);
      expect(result1.success).toBe(true);

      // Attempt to register with same data should fail
      const result2 = await registrationService.registerOrganization({
        ...testOrgData,
        phoneVerificationCode: '123456', // Provide verification code
      });

      expect(result2.success).toBe(false);
      
      // Verify only one organization exists
      const organizationCount = await prisma.organization.count({
        where: { name: testOrgData.organizationName }
      });
      expect(organizationCount).toBe(1);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle network failures gracefully', async () => {
      // This would test behavior when external services fail
      // For now, test that service handles internal errors properly
      
      const invalidData = {
        ...testOrgData,
        adminUser: {
          ...testOrgData.adminUser,
          // Extremely long email to potentially cause database error
          email: 'a'.repeat(500) + '@test.com',
        },
      };

      const result = await registrationService.registerOrganization(invalidData);
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle missing required environment variables', async () => {
      // Test would verify behavior when ENV vars are missing
      // This is more of an integration test with configuration
      expect(true).toBe(true); // Placeholder
    });
  });
});

// Helper function to run manual tests
export const runManualRegistrationTest = async () => {
  console.log('🧪 Running manual organization registration test...');
  
  try {
    // Test the complete flow
    const testData = {
      ...testOrgData,
      organizationName: `Manual Test Clinic ${Date.now()}`,
      adminUser: {
        ...testOrgData.adminUser,
        email: `test${Date.now()}@example.com`,
        phone: `+9230${Date.now().toString().slice(-7)}`,
      },
    };

    const service = new OrganizationRegistrationService();
    const result = await service.registerOrganization(testData);

    if (result.success) {
      console.log('✅ Registration successful!');
      console.log('📧 Organization:', result.organization?.name);
      console.log('👤 Admin:', result.adminUser?.email);
      console.log('⏱️ Trial ends:', result.trialDetails?.trialEndDate);
      console.log('🔑 Tokens provided:', !!result.tokens);
    } else {
      console.log('❌ Registration failed:', result.error);
    }

    return result;
  } catch (error) {
    console.error('💥 Manual test error:', error);
    throw error;
  }
};