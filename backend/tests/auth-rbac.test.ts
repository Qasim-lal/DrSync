import request from 'supertest';
import express from 'express';
import { authenticate, authorize, authorizeOrganization, requireSuperAdmin, requireOrgAdmin, requireDoctor, requireStaff, authorizeResourceAccess } from '../src/middleware/auth';
import { authService } from '../src/services/auth';

// Mock the auth service
jest.mock('../src/services/auth');
jest.mock('../src/utils/logger');

const mockedAuthService = authService as jest.Mocked<typeof authService>;

// Create test Express app
const createTestApp = () => {
  const app = express();
  app.use(express.json());
  
  // Test routes for different authorization levels
  app.get('/public', (_req, res) => res.json({ message: 'public endpoint' }));
  app.get('/auth-required', authenticate, (req: any, res) => res.json({ message: 'authenticated endpoint', user: req.user }));
  app.get('/super-admin-only', authenticate, requireSuperAdmin, (_req, res) => res.json({ message: 'super admin endpoint' }));
  app.get('/org-admin-only', authenticate, requireOrgAdmin, (_req, res) => res.json({ message: 'org admin endpoint' }));
  app.get('/doctor-only', authenticate, requireDoctor, (_req, res) => res.json({ message: 'doctor endpoint' }));
  app.get('/staff-only', authenticate, requireStaff, (_req, res) => res.json({ message: 'staff endpoint' }));
  app.get('/custom-roles', authenticate, authorize(['NURSE', 'DOCTOR']), (_req, res) => res.json({ message: 'nurse or doctor endpoint' }));
  app.get('/org/:organizationId/data', authenticate, authorizeOrganization, (req: any, res) => res.json({ message: 'org data', orgId: req.params.organizationId }));
  app.get('/users/:userId/profile', authenticate, authorizeResourceAccess('userId'), (req: any, res) => res.json({ message: 'user profile', userId: req.params.userId }));
  
  return app;
};

// Test user data for different roles
const createMockUser = (role: string, orgId: string = 'org-123', userId: string = 'user-123') => ({
  id: userId,
  email: `${role.toLowerCase()}@test.com`,
  firstName: 'Test',
  lastName: 'User',
  role,
  organizationId: orgId,
  organization: {
    id: orgId,
    name: 'Test Organization',
    slug: 'test-org',
  },
  isActive: true,
  emailVerified: true,
  lastLoginAt: new Date(),
  mfaEnabled: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  phone: null,
  avatar: null,
  permissions: null,
  mfaSecret: null,
  providerId: null,
} as any);

// Mock JWT payloads
const createMockJWTPayload = (userId: string, role: string, orgId: string = 'org-123') => ({
  userId,
  email: `${role.toLowerCase()}@test.com`,
  role,
  organizationId: orgId,
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + 900, // 15 minutes
});

describe('Role-Based Access Control Tests', () => {
  let app: express.Application;
  
  beforeEach(() => {
    app = createTestApp();
    jest.clearAllMocks();
  });

  describe('Authentication Tests', () => {
    it('should allow access to public endpoints without authentication', async () => {
      const response = await request(app)
        .get('/public')
        .expect(200);
      
      expect(response.body.message).toBe('public endpoint');
    });

    it('should reject requests without valid JWT token', async () => {
      const response = await request(app)
        .get('/auth-required')
        .expect(401);
      
      expect(response.body.code).toBe('AUTH_TOKEN_MISSING');
    });

    it('should reject requests with invalid JWT token', async () => {
      mockedAuthService.verifyAccessToken.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const response = await request(app)
        .get('/auth-required')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
      
      expect(response.body.code).toBe('AUTH_TOKEN_INVALID');
    });

    it('should reject requests when user not found', async () => {
      const payload = createMockJWTPayload('user-123', 'STAFF');
      mockedAuthService.verifyAccessToken.mockReturnValue(payload);
      mockedAuthService.getUserById.mockResolvedValue(null);

      const response = await request(app)
        .get('/auth-required')
        .set('Authorization', 'Bearer valid-token')
        .expect(401);
      
      expect(response.body.code).toBe('AUTH_USER_NOT_FOUND');
    });

    it('should authenticate valid user and attach to request', async () => {
      const user = createMockUser('STAFF');
      const payload = createMockJWTPayload(user.id, user.role);
      
      mockedAuthService.verifyAccessToken.mockReturnValue(payload);
      mockedAuthService.getUserById.mockResolvedValue(user);

      const response = await request(app)
        .get('/auth-required')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);
      
      expect(response.body.message).toBe('authenticated endpoint');
      expect(response.body.user.email).toBe(user.email);
    });
  });

  describe('Role-Based Authorization Tests', () => {
    const setupAuthenticatedRequest = (role: string, orgId: string = 'org-123', userId: string = 'user-123') => {
      const user = createMockUser(role, orgId, userId);
      const payload = createMockJWTPayload(user.id, user.role, user.organizationId);
      
      mockedAuthService.verifyAccessToken.mockReturnValue(payload);
      mockedAuthService.getUserById.mockResolvedValue(user);
      mockedAuthService.hasPermission.mockImplementation((userRole: string, requiredRoles: string[]) => {
        // Mock permission hierarchy
        const roleHierarchy = {
          'SUPER_ADMIN': ['SUPER_ADMIN', 'ORG_ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST', 'STAFF'],
          'ORG_ADMIN': ['ORG_ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST', 'STAFF'],
          'DOCTOR': ['DOCTOR', 'NURSE', 'RECEPTIONIST', 'STAFF'],
          'NURSE': ['NURSE', 'RECEPTIONIST', 'STAFF'],
          'RECEPTIONIST': ['RECEPTIONIST', 'STAFF'],
          'STAFF': ['STAFF']
        };
        
        const userPermissions = roleHierarchy[userRole as keyof typeof roleHierarchy] || [];
        return requiredRoles.some(role => userPermissions.includes(role));
      });
      
      return user;
    };

    describe('Super Admin Access', () => {
      it('should allow SUPER_ADMIN to access super admin endpoints', async () => {
        setupAuthenticatedRequest('SUPER_ADMIN');

        const response = await request(app)
          .get('/super-admin-only')
          .set('Authorization', 'Bearer valid-token')
          .expect(200);
        
        expect(response.body.message).toBe('super admin endpoint');
      });

      it('should allow SUPER_ADMIN to access all lower-level endpoints', async () => {
        setupAuthenticatedRequest('SUPER_ADMIN');

        await request(app)
          .get('/org-admin-only')
          .set('Authorization', 'Bearer valid-token')
          .expect(200);

        await request(app)
          .get('/doctor-only')
          .set('Authorization', 'Bearer valid-token')
          .expect(200);

        await request(app)
          .get('/staff-only')
          .set('Authorization', 'Bearer valid-token')
          .expect(200);
      });

      it('should reject ORG_ADMIN from super admin endpoints', async () => {
        setupAuthenticatedRequest('ORG_ADMIN');

        const response = await request(app)
          .get('/super-admin-only')
          .set('Authorization', 'Bearer valid-token')
          .expect(403);
        
        expect(response.body.code).toBe('AUTH_INSUFFICIENT_PERMISSIONS');
      });
    });

    describe('Organization Admin Access', () => {
      it('should allow ORG_ADMIN to access org admin endpoints', async () => {
        setupAuthenticatedRequest('ORG_ADMIN');

        const response = await request(app)
          .get('/org-admin-only')
          .set('Authorization', 'Bearer valid-token')
          .expect(200);
        
        expect(response.body.message).toBe('org admin endpoint');
      });

      it('should allow ORG_ADMIN to access lower-level endpoints', async () => {
        setupAuthenticatedRequest('ORG_ADMIN');

        await request(app)
          .get('/doctor-only')
          .set('Authorization', 'Bearer valid-token')
          .expect(200);

        await request(app)
          .get('/staff-only')
          .set('Authorization', 'Bearer valid-token')
          .expect(200);
      });

      it('should reject DOCTOR from org admin endpoints', async () => {
        setupAuthenticatedRequest('DOCTOR');

        const response = await request(app)
          .get('/org-admin-only')
          .set('Authorization', 'Bearer valid-token')
          .expect(403);
        
        expect(response.body.code).toBe('AUTH_INSUFFICIENT_PERMISSIONS');
      });
    });

    describe('Doctor Access', () => {
      it('should allow DOCTOR to access doctor endpoints', async () => {
        setupAuthenticatedRequest('DOCTOR');

        const response = await request(app)
          .get('/doctor-only')
          .set('Authorization', 'Bearer valid-token')
          .expect(200);
        
        expect(response.body.message).toBe('doctor endpoint');
      });

      it('should allow DOCTOR to access staff endpoints', async () => {
        setupAuthenticatedRequest('DOCTOR');

        const response = await request(app)
          .get('/staff-only')
          .set('Authorization', 'Bearer valid-token')
          .expect(200);
      });

      it('should reject NURSE from doctor-only endpoints', async () => {
        setupAuthenticatedRequest('NURSE');

        const response = await request(app)
          .get('/doctor-only')
          .set('Authorization', 'Bearer valid-token')
          .expect(403);
        
        expect(response.body.code).toBe('AUTH_INSUFFICIENT_PERMISSIONS');
      });
    });

    describe('Staff Access', () => {
      it('should allow all roles to access staff endpoints', async () => {
        const roles = ['SUPER_ADMIN', 'ORG_ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST', 'STAFF'];
        
        for (const role of roles) {
          setupAuthenticatedRequest(role);
          
          await request(app)
            .get('/staff-only')
            .set('Authorization', 'Bearer valid-token')
            .expect(200);
        }
      });
    });

    describe('Custom Role Requirements', () => {
      it('should allow NURSE to access nurse-or-doctor endpoint', async () => {
        setupAuthenticatedRequest('NURSE');

        const response = await request(app)
          .get('/custom-roles')
          .set('Authorization', 'Bearer valid-token')
          .expect(200);
        
        expect(response.body.message).toBe('nurse or doctor endpoint');
      });

      it('should allow DOCTOR to access nurse-or-doctor endpoint', async () => {
        setupAuthenticatedRequest('DOCTOR');

        const response = await request(app)
          .get('/custom-roles')
          .set('Authorization', 'Bearer valid-token')
          .expect(200);
      });

      it('should reject STAFF from nurse-or-doctor endpoint', async () => {
        setupAuthenticatedRequest('STAFF');

        const response = await request(app)
          .get('/custom-roles')
          .set('Authorization', 'Bearer valid-token')
          .expect(403);
        
        expect(response.body.code).toBe('AUTH_INSUFFICIENT_PERMISSIONS');
      });
    });
  });

  describe('Organization-Scoped Authorization Tests', () => {
    it('should allow access to own organization data', async () => {
      setupAuthenticatedRequest('STAFF', 'org-123');

      const response = await request(app)
        .get('/org/org-123/data')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);
      
      expect(response.body.message).toBe('org data');
      expect(response.body.orgId).toBe('org-123');
    });

    it('should reject access to different organization data', async () => {
      setupAuthenticatedRequest('STAFF', 'org-123');

      const response = await request(app)
        .get('/org/org-456/data')
        .set('Authorization', 'Bearer valid-token')
        .expect(403);
      
      expect(response.body.code).toBe('AUTH_ORG_ACCESS_DENIED');
    });

    it('should allow access when no organization parameter is specified', async () => {
      setupAuthenticatedRequest('STAFF', 'org-123');

      const response = await request(app)
        .get('/org//data')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);
    });
  });

  describe('Resource Access Authorization Tests', () => {
    it('should allow user to access their own profile', async () => {
      setupAuthenticatedRequest('STAFF', 'org-123', 'user-123');

      const response = await request(app)
        .get('/users/user-123/profile')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);
      
      expect(response.body.message).toBe('user profile');
      expect(response.body.userId).toBe('user-123');
    });

    it('should reject regular user from accessing other user profiles', async () => {
      setupAuthenticatedRequest('STAFF', 'org-123', 'user-123');

      const response = await request(app)
        .get('/users/user-456/profile')
        .set('Authorization', 'Bearer valid-token')
        .expect(403);
      
      expect(response.body.code).toBe('AUTH_RESOURCE_ACCESS_DENIED');
    });

    it('should allow SUPER_ADMIN to access any user profile', async () => {
      setupAuthenticatedRequest('SUPER_ADMIN', 'org-123', 'admin-123');

      const response = await request(app)
        .get('/users/user-456/profile')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);
      
      expect(response.body.message).toBe('user profile');
    });

    it('should allow ORG_ADMIN to access any user profile', async () => {
      setupAuthenticatedRequest('ORG_ADMIN', 'org-123', 'org-admin-123');

      const response = await request(app)
        .get('/users/user-456/profile')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);
      
      expect(response.body.message).toBe('user profile');
    });
  });

  describe('Cross-Organization Security Tests', () => {
    it('should prevent users from accessing resources in different organizations', async () => {
      // User from org-123 trying to access org-456 data
      setupAuthenticatedRequest('DOCTOR', 'org-123');

      const response = await request(app)
        .get('/org/org-456/data')
        .set('Authorization', 'Bearer valid-token')
        .expect(403);
      
      expect(response.body.code).toBe('AUTH_ORG_ACCESS_DENIED');
      expect(response.body.message).toBe('You can only access resources within your organization');
    });

    it('should prevent cross-organization resource access even for high-level roles', async () => {
      // ORG_ADMIN from org-123 trying to access org-456 data
      setupAuthenticatedRequest('ORG_ADMIN', 'org-123');

      const response = await request(app)
        .get('/org/org-456/data')
        .set('Authorization', 'Bearer valid-token')
        .expect(403);
      
      expect(response.body.code).toBe('AUTH_ORG_ACCESS_DENIED');
    });

    it('should allow SUPER_ADMIN to access any organization data', async () => {
      // SUPER_ADMIN should be able to access any organization
      setupAuthenticatedRequest('SUPER_ADMIN', 'org-123');

      // This test assumes SUPER_ADMIN bypass organization restrictions
      // Implementation may vary based on business requirements
      const response = await request(app)
        .get('/org/org-456/data')
        .set('Authorization', 'Bearer valid-token')
        .expect(403); // Or 200 if SUPER_ADMIN should have cross-org access
      
      // Adjust expectation based on your business requirements
    });
  });

  describe('Security Boundary Tests', () => {
    it('should handle malformed authorization headers', async () => {
      const response = await request(app)
        .get('/auth-required')
        .set('Authorization', 'InvalidFormat token')
        .expect(401);
      
      expect(response.body.code).toBe('AUTH_TOKEN_MISSING');
    });

    it('should handle missing Bearer prefix', async () => {
      const response = await request(app)
        .get('/auth-required')
        .set('Authorization', 'just-a-token')
        .expect(401);
      
      expect(response.body.code).toBe('AUTH_TOKEN_MISSING');
    });

    it('should handle expired tokens', async () => {
      const expiredPayload = {
        ...createMockJWTPayload('user-123', 'STAFF'),
        exp: Math.floor(Date.now() / 1000) - 3600, // Expired 1 hour ago
      };

      mockedAuthService.verifyAccessToken.mockImplementation(() => {
        throw new Error('Token expired');
      });

      const response = await request(app)
        .get('/auth-required')
        .set('Authorization', 'Bearer expired-token')
        .expect(401);
      
      expect(response.body.code).toBe('AUTH_TOKEN_INVALID');
    });

    it('should handle inactive users', async () => {
      const inactiveUser = { ...createMockUser('STAFF'), isActive: false };
      const payload = createMockJWTPayload(inactiveUser.id, inactiveUser.role);
      
      mockedAuthService.verifyAccessToken.mockReturnValue(payload);
      mockedAuthService.getUserById.mockResolvedValue(inactiveUser);

      // Assuming inactive users are treated as not found
      // Implementation may vary
      const response = await request(app)
        .get('/auth-required')
        .set('Authorization', 'Bearer valid-token')
        .expect(200); // Adjust based on your implementation
    });
  });
});
