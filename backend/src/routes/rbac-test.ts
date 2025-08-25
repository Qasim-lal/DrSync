import { Router, Request, Response } from 'express';
import { authenticate, requireSuperAdmin, requireOrgAdmin, requireDoctor, requireStaff, authorize, authorizeOrganization, authorizeResourceAccess } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

// Test endpoint for STAFF level access (lowest level - all authenticated users)
router.get('/staff-only', authenticate, requireStaff, asyncHandler(async (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Access granted to STAFF level endpoint',
    data: {
      user: {
        id: req.user!.id,
        email: req.user!.email,
        role: req.user!.role,
        organization: req.user!.organizationId
      },
      endpoint: 'STAFF or higher',
      requiredRoles: ['STAFF', 'RECEPTIONIST', 'NURSE', 'DOCTOR', 'ORG_ADMIN', 'SUPER_ADMIN']
    }
  });
}));

// Test endpoint for DOCTOR level access
router.get('/doctor-only', authenticate, requireDoctor, asyncHandler(async (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Access granted to DOCTOR level endpoint',
    data: {
      user: {
        id: req.user!.id,
        email: req.user!.email,
        role: req.user!.role,
        organization: req.user!.organizationId
      },
      endpoint: 'DOCTOR or higher',
      requiredRoles: ['DOCTOR', 'ORG_ADMIN', 'SUPER_ADMIN']
    }
  });
}));

// Test endpoint for ORG_ADMIN level access
router.get('/org-admin-only', authenticate, requireOrgAdmin, asyncHandler(async (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Access granted to ORG_ADMIN level endpoint',
    data: {
      user: {
        id: req.user!.id,
        email: req.user!.email,
        role: req.user!.role,
        organization: req.user!.organizationId
      },
      endpoint: 'ORG_ADMIN or higher',
      requiredRoles: ['ORG_ADMIN', 'SUPER_ADMIN']
    }
  });
}));

// Test endpoint for SUPER_ADMIN level access
router.get('/super-admin-only', authenticate, requireSuperAdmin, asyncHandler(async (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Access granted to SUPER_ADMIN level endpoint',
    data: {
      user: {
        id: req.user!.id,
        email: req.user!.email,
        role: req.user!.role,
        organization: req.user!.organizationId
      },
      endpoint: 'SUPER_ADMIN only',
      requiredRoles: ['SUPER_ADMIN']
    }
  });
}));

// Test endpoint for custom role combinations (NURSE or DOCTOR)
router.get('/nurse-or-doctor', authenticate, authorize(['NURSE', 'DOCTOR']), asyncHandler(async (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Access granted to NURSE or DOCTOR endpoint',
    data: {
      user: {
        id: req.user!.id,
        email: req.user!.email,
        role: req.user!.role,
        organization: req.user!.organizationId
      },
      endpoint: 'NURSE or DOCTOR',
      requiredRoles: ['NURSE', 'DOCTOR']
    }
  });
}));

// Test endpoint for organization-scoped access
router.get('/org/:organizationId/data', authenticate, authorizeOrganization, asyncHandler(async (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Access granted to organization data',
    data: {
      user: {
        id: req.user!.id,
        email: req.user!.email,
        role: req.user!.role,
        organization: req.user!.organizationId
      },
      requestedOrg: req.params.organizationId,
      userOrg: req.user!.organizationId,
      endpoint: 'Organization-scoped data'
    }
  });
}));

// Test endpoint for resource-level access (user can only access their own data)
router.get('/users/:userId/profile', authenticate, authorizeResourceAccess('userId'), asyncHandler(async (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Access granted to user profile',
    data: {
      user: {
        id: req.user!.id,
        email: req.user!.email,
        role: req.user!.role,
        organization: req.user!.organizationId
      },
      requestedUserId: req.params.userId,
      actualUserId: req.user!.id,
      endpoint: 'Resource-level access control',
      note: 'Users can only access their own profile, admins can access any profile'
    }
  });
}));

// Test endpoint to list all available RBAC test endpoints
router.get('/', asyncHandler(async (_req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'RBAC Test Endpoints',
    data: {
      description: 'These endpoints test role-based access control according to the RBAC_TESTING_GUIDE.md',
      endpoints: {
        '/staff-only': 'Requires STAFF or higher role',
        '/doctor-only': 'Requires DOCTOR or higher role', 
        '/org-admin-only': 'Requires ORG_ADMIN or higher role',
        '/super-admin-only': 'Requires SUPER_ADMIN role',
        '/nurse-or-doctor': 'Requires NURSE or DOCTOR role',
        '/org/:organizationId/data': 'Organization-scoped access',
        '/users/:userId/profile': 'Resource-level access control'
      },
      roles: {
        hierarchy: 'SUPER_ADMIN > ORG_ADMIN > DOCTOR > NURSE > RECEPTIONIST > STAFF',
        description: 'Higher roles can access lower-level endpoints'
      },
      testCredentials: {
        superAdmin: 'superadmin@drsync.com / SuperSecure2024!',
        orgAdmin: 'admin@drsynctesthospital.com / HospitalAdmin2024!',
        doctor: 'dr.smith@drsynctesthospital.com / Doctor2024!',
        staff: 'staff@drsynctesthospital.com / Staff2024!'
      }
    }
  });
}));

export default router;
