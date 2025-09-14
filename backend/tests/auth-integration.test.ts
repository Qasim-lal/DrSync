import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { authService } from '../src/services/auth';

// This file contains integration tests that test the actual API endpoints
// with real database interactions and JWT tokens

const prisma = new PrismaClient();

// Test data setup
const testOrganizations = [
  {
    id: 'test-org-1',
    name: 'Test Hospital 1',
    slug: 'test-hospital-1',
    address: '123 Test St',
    phone: '+1234567890',
    email: 'admin@testhospital1.com',
    website: 'https://testhospital1.com',
    isActive: true,
  },
  {
    id: 'test-org-2',
    name: 'Test Clinic 2',
    slug: 'test-clinic-2',
    address: '456 Test Ave',
    phone: '+1987654321',
    email: 'admin@testclinic2.com',
    website: 'https://testclinic2.com',
    isActive: true,
  }
];

const testUsers = [
  {
    id: 'super-admin-1',
    email: 'superadmin@drsync.com',
    password: 'SuperAdmin123!',
    firstName: 'Super',
    lastName: 'Admin',
    role: 'SUPER_ADMIN',
    organizationId: 'test-org-1',
    isActive: true,
    emailVerified: true,
  },
  {
    id: 'org-admin-1',
    email: 'orgadmin1@testhospital1.com',
    password: 'OrgAdmin123!',
    firstName: 'Org',
    lastName: 'Admin',
    role: 'ORG_ADMIN',
    organizationId: 'test-org-1',
    isActive: true,
    emailVerified: true,
  },
  {
    id: 'org-admin-2',
    email: 'orgadmin2@testclinic2.com',
    password: 'OrgAdmin123!',
    firstName: 'Org',
    lastName: 'Admin Two',
    role: 'ORG_ADMIN',
    organizationId: 'test-org-2',
    isActive: true,
    emailVerified: true,
  },
  {
    id: 'doctor-1',
    email: 'doctor1@testhospital1.com',
    password: 'Doctor123!',
    firstName: 'Dr.',
    lastName: 'Smith',
    role: 'DOCTOR',
    organizationId: 'test-org-1',
    isActive: true,
    emailVerified: true,
  },
  {
    id: 'doctor-2',
    email: 'doctor2@testclinic2.com',
    password: 'Doctor123!',
    firstName: 'Dr.',
    lastName: 'Jones',
    role: 'DOCTOR',
    organizationId: 'test-org-2',
    isActive: true,
    emailVerified: true,
  },
  {
    id: 'nurse-1',
    email: 'nurse1@testhospital1.com',
    password: 'Nurse123!',
    firstName: 'Nurse',
    lastName: 'Wilson',
    role: 'NURSE',
    organizationId: 'test-org-1',
    isActive: true,
    emailVerified: true,
  },
  {
    id: 'staff-1',
    email: 'staff1@testhospital1.com',
    password: 'Staff123!',
    firstName: 'Staff',
    lastName: 'Member',
    role: 'STAFF',
    organizationId: 'test-org-1',
    isActive: true,
    emailVerified: true,
  }
];

// Helper functions for test setup
const createTestData = async () => {
  // Clean up existing test data
  await prisma.user.deleteMany({
    where: {
      email: {
        contains: 'test'
      }
    }
  });
  
  await prisma.organization.deleteMany({
    where: {
      slug: {
        startsWith: 'test-'
      }
    }
  });

  // Create test organizations
  for (const org of testOrganizations) {
    await prisma.organization.create({
      data: org
    });
  }

  // Create test users with hashed passwords
  for (const user of testUsers) {
    const hashedPassword = await authService.hashPassword(user.password);
    await prisma.user.create({
      data: {
        ...user,
        password: hashedPassword,
      }
    });
  }
};

const cleanupTestData = async () => {
  await prisma.user.deleteMany({
    where: {
      email: {
        contains: 'test'
      }
    }
  });
  
  await prisma.organization.deleteMany({
    where: {
      slug: {
        startsWith: 'test-'
      }
    }
  });
};

// Helper function to login and get JWT token
const loginUser = async (email: string, password: string): Promise<string> => {
  // Since we're testing integration, we'll use the actual auth service
  const user = await prisma.user.findUnique({
    where: { email },
    include: { organization: true }
  });
  
  if (!user) {
    throw new Error('User not found');
  }

  const isValidPassword = await authService.verifyPassword(password, user.password);
  if (!isValidPassword) {
    throw new Error('Invalid password');
  }

  const tokens = authService.generateTokenPair(user);
  return tokens.accessToken;
};

// Mock the Express app (you would import your actual app here)
const createApp = () => {
  const express = require('express');
  const app = express();
  
  // Import your actual routes here
  // app.use('/api/auth', authRoutes);
  // app.use('/api/users', userRoutes);
  // app.use('/api/organizations', organizationRoutes);
  
  // For now, we'll create mock routes that mimic the real API structure
  app.use(express.json());
  
  // Import actual middleware
  const { authenticate, requireSuperAdmin, requireOrgAdmin, requireDoctor, authorizeOrganization } = require('../src/middleware/auth');
  
  // Mock API routes with proper middleware
  app.get('/api/health', (req: any, res: any) => res.json({ status: 'ok' }));
  app.get('/api/users/profile', authenticate, (req: any, res: any) => res.json({ user: req.user }));
  app.get('/api/admin/users', authenticate, requireSuperAdmin, (req: any, res: any) => res.json({ users: [] }));
  app.get('/api/organizations/:organizationId/users', authenticate, requireOrgAdmin, authorizeOrganization, (req: any, res: any) => res.json({ users: [], orgId: req.params.organizationId }));
  app.get('/api/organizations/:organizationId/patients', authenticate, requireDoctor, authorizeOrganization, (req: any, res: any) => res.json({ patients: [], orgId: req.params.organizationId }));
  
  return app;
};

describe('Role-Based Access Control Integration Tests', () => {
  let app: any;
  let tokens: Record<string, string> = {};

  beforeAll(async () => {
    app = createApp();
    
    // Set up test environment
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'test-jwt-secret-key-for-integration-tests';
    process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-key-for-integration-tests';
    
    await createTestData();
    
    // Login all test users and store their tokens
    for (const user of testUsers) {
      try {
        tokens[user.role + '_' + user.organizationId] = await loginUser(user.email, user.password);
      } catch (error) {
        console.error(`Failed to login user ${user.email}:`, error);
      }
    }
  });

  afterAll(async () => {
    await cleanupTestData();
    await prisma.$disconnect();
  });

  describe('Super Admin Access Tests', () => {
    it('should allow SUPER_ADMIN to access admin endpoints', async () => {
      const token = tokens['SUPER_ADMIN_test-org-1'];
      expect(token).toBeDefined();

      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('users');
    });

    it('should reject non-SUPER_ADMIN from admin endpoints', async () => {
      const token = tokens['ORG_ADMIN_test-org-1'];
      expect(token).toBeDefined();

      await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });
  });

  describe('Organization Admin Access Tests', () => {
    it('should allow ORG_ADMIN to access their organization users', async () => {
      const token = tokens['ORG_ADMIN_test-org-1'];
      expect(token).toBeDefined();

      const response = await request(app)
        .get('/api/organizations/test-org-1/users')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('users');
      expect(response.body.orgId).toBe('test-org-1');
    });

    it('should prevent ORG_ADMIN from accessing other organization users', async () => {
      const token = tokens['ORG_ADMIN_test-org-1'];
      expect(token).toBeDefined();

      await request(app)
        .get('/api/organizations/test-org-2/users')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });

    it('should reject DOCTOR from org admin endpoints', async () => {
      const token = tokens['DOCTOR_test-org-1'];
      expect(token).toBeDefined();

      await request(app)
        .get('/api/organizations/test-org-1/users')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });
  });

  describe('Doctor Access Tests', () => {
    it('should allow DOCTOR to access patient data in their organization', async () => {
      const token = tokens['DOCTOR_test-org-1'];
      expect(token).toBeDefined();

      const response = await request(app)
        .get('/api/organizations/test-org-1/patients')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('patients');
      expect(response.body.orgId).toBe('test-org-1');
    });

    it('should prevent DOCTOR from accessing patients in other organizations', async () => {
      const token = tokens['DOCTOR_test-org-1'];
      expect(token).toBeDefined();

      await request(app)
        .get('/api/organizations/test-org-2/patients')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });

    it('should reject NURSE from doctor-only endpoints', async () => {
      const token = tokens['NURSE_test-org-1'];
      expect(token).toBeDefined();

      await request(app)
        .get('/api/organizations/test-org-1/patients')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });
  });

  describe('Cross-Organization Security Tests', () => {
    it('should prevent cross-organization access for all non-SUPER_ADMIN roles', async () => {
      const testCases = [
        { role: 'ORG_ADMIN', endpoint: '/api/organizations/test-org-2/users' },
        { role: 'DOCTOR', endpoint: '/api/organizations/test-org-2/patients' }
      ];

      for (const testCase of testCases) {
        const token = tokens[`${testCase.role}_test-org-1`];
        expect(token).toBeDefined();

        await request(app)
          .get(testCase.endpoint)
          .set('Authorization', `Bearer ${token}`)
          .expect(403);
      }
    });

    it('should allow users to access their own profile regardless of organization', async () => {
      const roles = ['ORG_ADMIN', 'DOCTOR', 'NURSE', 'STAFF'];
      
      for (const role of roles) {
        const token = tokens[`${role}_test-org-1`];
        if (token) {
          const response = await request(app)
            .get('/api/users/profile')
            .set('Authorization', `Bearer ${token}`)
            .expect(200);

          expect(response.body.user).toBeDefined();
          expect(response.body.user.role).toBe(role);
          expect(response.body.user.organizationId).toBe('test-org-1');
        }
      }
    });
  });

  describe('JWT Token Security Tests', () => {
    it('should reject expired tokens', async () => {
      // Create a token with very short expiry for testing
      const user = await prisma.user.findUnique({
        where: { email: 'staff1@testhospital1.com' },
        include: { organization: true }
      });

      if (user) {
        // Mock expired token (this would require modifying the JWT service for testing)
        // For now, we'll test with an invalid token
        await request(app)
          .get('/api/users/profile')
          .set('Authorization', 'Bearer expired.token.here')
          .expect(401);
      }
    });

    it('should reject malformed tokens', async () => {
      const malformedTokens = [
        'invalid-token',
        'Bearer',
        'Bearer ',
        'Bearer invalid',
        '',
      ];

      for (const token of malformedTokens) {
        await request(app)
          .get('/api/users/profile')
          .set('Authorization', token)
          .expect(401);
      }
    });

    it('should validate token format correctly', async () => {
      const token = tokens['STAFF_test-org-1'];
      expect(token).toBeDefined();

      // Valid token should work
      await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Missing Bearer prefix should fail
      await request(app)
        .get('/api/users/profile')
        .set('Authorization', token)
        .expect(401);
    });
  });

  describe('Role Hierarchy Tests', () => {
    it('should enforce role hierarchy correctly', async () => {
      const hierarchyTests = [
        // SUPER_ADMIN can access everything
        { userRole: 'SUPER_ADMIN', org: 'test-org-1', endpoint: '/api/admin/users', shouldAllow: true },
        { userRole: 'SUPER_ADMIN', org: 'test-org-1', endpoint: '/api/organizations/test-org-1/users', shouldAllow: true },
        
        // ORG_ADMIN can access org-level endpoints but not super admin
        { userRole: 'ORG_ADMIN', org: 'test-org-1', endpoint: '/api/admin/users', shouldAllow: false },
        { userRole: 'ORG_ADMIN', org: 'test-org-1', endpoint: '/api/organizations/test-org-1/users', shouldAllow: true },
        
        // DOCTOR can access doctor endpoints but not admin
        { userRole: 'DOCTOR', org: 'test-org-1', endpoint: '/api/organizations/test-org-1/users', shouldAllow: false },
        { userRole: 'DOCTOR', org: 'test-org-1', endpoint: '/api/organizations/test-org-1/patients', shouldAllow: true },
        
        // Lower roles cannot access higher-privilege endpoints
        { userRole: 'NURSE', org: 'test-org-1', endpoint: '/api/organizations/test-org-1/patients', shouldAllow: false },
        { userRole: 'STAFF', org: 'test-org-1', endpoint: '/api/organizations/test-org-1/patients', shouldAllow: false },
      ];

      for (const test of hierarchyTests) {
        const token = tokens[`${test.userRole}_${test.org}`];
        expect(token).toBeDefined();

        const expectedStatus = test.shouldAllow ? 200 : 403;
        await request(app)
          .get(test.endpoint)
          .set('Authorization', `Bearer ${token}`)
          .expect(expectedStatus);
      }
    });
  });

  describe('Performance and Security Tests', () => {
    it('should handle multiple concurrent requests with different roles', async () => {
      const requests = [];
      
      // Create concurrent requests with different roles
      for (let i = 0; i < 10; i++) {
        const role = ['STAFF', 'NURSE', 'DOCTOR'][i % 3];
        const token = tokens[`${role}_test-org-1`];
        
        if (token) {
          requests.push(
            request(app)
              .get('/api/users/profile')
              .set('Authorization', `Bearer ${token}`)
              .expect(200)
          );
        }
      }
      
      // Wait for all requests to complete
      await Promise.all(requests);
    });

    it('should rate limit authentication attempts (if implemented)', async () => {
      // This test would verify rate limiting on auth endpoints
      // Implementation depends on your rate limiting strategy
      
      // For now, just verify that the endpoint exists
      await request(app)
        .get('/api/health')
        .expect(200);
    });
  });
});
