import { Request, Response, NextFunction } from 'express';
import { AuthUser } from '../services/auth';

/**
 * Role-based authorization utilities and constants
 * Provides easy-to-use functions and middleware for role checking
 */

// Role constants for type safety and consistency
export const ROLES = {
  STAFF: 'STAFF',
  RECEPTIONIST: 'RECEPTIONIST', 
  NURSE: 'NURSE',
  DOCTOR: 'DOCTOR',
  ORG_ADMIN: 'ORG_ADMIN',
  SUPER_ADMIN: 'SUPER_ADMIN'
} as const;

export type UserRole = typeof ROLES[keyof typeof ROLES];

// Role hierarchy levels (higher numbers = more permissions)
export const ROLE_LEVELS: Record<UserRole, number> = {
  [ROLES.STAFF]: 1,
  [ROLES.RECEPTIONIST]: 2,
  [ROLES.NURSE]: 3,
  [ROLES.DOCTOR]: 4,
  [ROLES.ORG_ADMIN]: 5,
  [ROLES.SUPER_ADMIN]: 6
};

// Common role groups for easier permission checking
export const ROLE_GROUPS = {
  // Basic access - can view basic information
  BASIC_ACCESS: [ROLES.STAFF, ROLES.RECEPTIONIST, ROLES.NURSE, ROLES.DOCTOR, ROLES.ORG_ADMIN, ROLES.SUPER_ADMIN],
  
  // Patient access - can interact with patients
  PATIENT_ACCESS: [ROLES.RECEPTIONIST, ROLES.NURSE, ROLES.DOCTOR, ROLES.ORG_ADMIN, ROLES.SUPER_ADMIN],
  
  // Medical access - can view/edit medical information
  MEDICAL_ACCESS: [ROLES.NURSE, ROLES.DOCTOR, ROLES.ORG_ADMIN, ROLES.SUPER_ADMIN],
  
  // Clinical access - can make medical decisions
  CLINICAL_ACCESS: [ROLES.DOCTOR, ROLES.ORG_ADMIN, ROLES.SUPER_ADMIN],
  
  // Administrative access - can manage organization
  ADMIN_ACCESS: [ROLES.ORG_ADMIN, ROLES.SUPER_ADMIN],
  
  // System access - can manage system-wide settings
  SYSTEM_ACCESS: [ROLES.SUPER_ADMIN]
};

// Permission constants for specific actions
export const PERMISSIONS = {
  // Authentication & Profile
  MANAGE_OWN_PROFILE: 'manage_own_profile',
  
  // User Management
  VIEW_USERS: 'view_users',
  CREATE_USERS: 'create_users',
  UPDATE_USERS: 'update_users',
  DELETE_USERS: 'delete_users',
  
  // Patient Management
  VIEW_PATIENTS: 'view_patients',
  CREATE_PATIENTS: 'create_patients',
  UPDATE_PATIENTS: 'update_patients',
  DELETE_PATIENTS: 'delete_patients',
  VIEW_MEDICAL_HISTORY: 'view_medical_history',
  UPDATE_MEDICAL_HISTORY: 'update_medical_history',
  PRESCRIBE_MEDICATIONS: 'prescribe_medications',
  
  // Appointment Management
  VIEW_APPOINTMENTS: 'view_appointments',
  MANAGE_APPOINTMENTS: 'manage_appointments',
  
  // Organization Management
  VIEW_ORG_SETTINGS: 'view_org_settings',
  UPDATE_ORG_SETTINGS: 'update_org_settings',
  MANAGE_INTEGRATIONS: 'manage_integrations',
  
  // Reports & Analytics
  VIEW_REPORTS: 'view_reports',
  
  // System Administration
  SYSTEM_ADMIN: 'system_admin'
} as const;

// Permission to role mapping
export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  [ROLES.STAFF]: [
    PERMISSIONS.MANAGE_OWN_PROFILE
  ],
  
  [ROLES.RECEPTIONIST]: [
    PERMISSIONS.MANAGE_OWN_PROFILE,
    PERMISSIONS.VIEW_PATIENTS,
    PERMISSIONS.CREATE_PATIENTS,
    PERMISSIONS.UPDATE_PATIENTS,
    PERMISSIONS.VIEW_APPOINTMENTS,
    PERMISSIONS.MANAGE_APPOINTMENTS
  ],
  
  [ROLES.NURSE]: [
    PERMISSIONS.MANAGE_OWN_PROFILE,
    PERMISSIONS.VIEW_PATIENTS,
    PERMISSIONS.CREATE_PATIENTS,
    PERMISSIONS.UPDATE_PATIENTS,
    PERMISSIONS.VIEW_MEDICAL_HISTORY,
    PERMISSIONS.UPDATE_MEDICAL_HISTORY,
    PERMISSIONS.VIEW_APPOINTMENTS,
    PERMISSIONS.MANAGE_APPOINTMENTS
  ],
  
  [ROLES.DOCTOR]: [
    PERMISSIONS.MANAGE_OWN_PROFILE,
    PERMISSIONS.VIEW_PATIENTS,
    PERMISSIONS.CREATE_PATIENTS,
    PERMISSIONS.UPDATE_PATIENTS,
    PERMISSIONS.DELETE_PATIENTS,
    PERMISSIONS.VIEW_MEDICAL_HISTORY,
    PERMISSIONS.UPDATE_MEDICAL_HISTORY,
    PERMISSIONS.PRESCRIBE_MEDICATIONS,
    PERMISSIONS.VIEW_APPOINTMENTS,
    PERMISSIONS.MANAGE_APPOINTMENTS,
    PERMISSIONS.VIEW_REPORTS
  ],
  
  [ROLES.ORG_ADMIN]: [
    PERMISSIONS.MANAGE_OWN_PROFILE,
    PERMISSIONS.VIEW_USERS,
    PERMISSIONS.CREATE_USERS,
    PERMISSIONS.UPDATE_USERS,
    PERMISSIONS.DELETE_USERS,
    PERMISSIONS.VIEW_PATIENTS,
    PERMISSIONS.CREATE_PATIENTS,
    PERMISSIONS.UPDATE_PATIENTS,
    PERMISSIONS.DELETE_PATIENTS,
    PERMISSIONS.VIEW_MEDICAL_HISTORY,
    PERMISSIONS.UPDATE_MEDICAL_HISTORY,
    PERMISSIONS.PRESCRIBE_MEDICATIONS,
    PERMISSIONS.VIEW_APPOINTMENTS,
    PERMISSIONS.MANAGE_APPOINTMENTS,
    PERMISSIONS.VIEW_ORG_SETTINGS,
    PERMISSIONS.UPDATE_ORG_SETTINGS,
    PERMISSIONS.MANAGE_INTEGRATIONS,
    PERMISSIONS.VIEW_REPORTS
  ],
  
  [ROLES.SUPER_ADMIN]: [
    ...Object.values(PERMISSIONS) // Super admin has all permissions
  ]
};

/**
 * Check if a user has a specific permission
 */
export const hasPermission = (user: AuthUser, permission: string): boolean => {
  const rolePermissions = ROLE_PERMISSIONS[user.role as UserRole] || [];
  return rolePermissions.includes(permission);
};

/**
 * Check if a user has any of the specified permissions
 */
export const hasAnyPermission = (user: AuthUser, permissions: string[]): boolean => {
  return permissions.some(permission => hasPermission(user, permission));
};

/**
 * Check if a user has all of the specified permissions
 */
export const hasAllPermissions = (user: AuthUser, permissions: string[]): boolean => {
  return permissions.every(permission => hasPermission(user, permission));
};

/**
 * Check if user role is at least the minimum required level
 */
export const hasMinimumRole = (user: AuthUser, minimumRole: UserRole): boolean => {
  const userLevel = ROLE_LEVELS[user.role as UserRole] || 0;
  const requiredLevel = ROLE_LEVELS[minimumRole] || 999;
  return userLevel >= requiredLevel;
};

/**
 * Check if user belongs to any of the specified role groups
 */
export const belongsToRoleGroup = (user: AuthUser, groupName: keyof typeof ROLE_GROUPS): boolean => {
  const allowedRoles = ROLE_GROUPS[groupName] || [];
  return allowedRoles.includes(user.role as UserRole);
};

/**
 * Middleware factory to require specific permissions
 */
export const requirePermissions = (permissions: string[], requireAll = false) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
        message: 'User must be authenticated to access this resource',
        code: 'AUTH_REQUIRED'
      });
      return;
    }

    const hasRequiredPermissions = requireAll 
      ? hasAllPermissions(req.user, permissions)
      : hasAnyPermission(req.user, permissions);

    if (!hasRequiredPermissions) {
      res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
        message: `Access denied. Required permissions: ${permissions.join(', ')}`,
        code: 'AUTH_INSUFFICIENT_PERMISSIONS'
      });
      return;
    }

    next();
  };
};

/**
 * Middleware factory to require minimum role level
 */
export const requireMinimumRole = (minimumRole: UserRole) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
        message: 'User must be authenticated to access this resource',
        code: 'AUTH_REQUIRED'
      });
      return;
    }

    if (!hasMinimumRole(req.user, minimumRole)) {
      res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
        message: `Access denied. Minimum role required: ${minimumRole}`,
        code: 'AUTH_INSUFFICIENT_PERMISSIONS'
      });
      return;
    }

    next();
  };
};

/**
 * Middleware factory to require role group membership
 */
export const requireRoleGroup = (groupName: keyof typeof ROLE_GROUPS) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
        message: 'User must be authenticated to access this resource',
        code: 'AUTH_REQUIRED'
      });
      return;
    }

    if (!belongsToRoleGroup(req.user, groupName)) {
      res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
        message: `Access denied. Required role group: ${groupName}`,
        code: 'AUTH_INSUFFICIENT_PERMISSIONS'
      });
      return;
    }

    next();
  };
};

/**
 * Convenient middleware shortcuts for common permission checks
 */
export const requirePatientAccess = requireRoleGroup('PATIENT_ACCESS');
export const requireMedicalAccess = requireRoleGroup('MEDICAL_ACCESS');
export const requireClinicalAccess = requireRoleGroup('CLINICAL_ACCESS');
export const requireAdminAccess = requireRoleGroup('ADMIN_ACCESS');
export const requireSystemAccess = requireRoleGroup('SYSTEM_ACCESS');

/**
 * Middleware for patient-related permissions
 */
export const requirePatientRead = requirePermissions([PERMISSIONS.VIEW_PATIENTS]);
export const requirePatientWrite = requirePermissions([PERMISSIONS.CREATE_PATIENTS, PERMISSIONS.UPDATE_PATIENTS], false);
export const requirePatientDelete = requirePermissions([PERMISSIONS.DELETE_PATIENTS]);

/**
 * Middleware for medical record permissions
 */
export const requireMedicalRead = requirePermissions([PERMISSIONS.VIEW_MEDICAL_HISTORY]);
export const requireMedicalWrite = requirePermissions([PERMISSIONS.UPDATE_MEDICAL_HISTORY]);
export const requirePrescriptionAccess = requirePermissions([PERMISSIONS.PRESCRIBE_MEDICATIONS]);

/**
 * Middleware for user management permissions
 */
export const requireUserRead = requirePermissions([PERMISSIONS.VIEW_USERS]);
export const requireUserWrite = requirePermissions([PERMISSIONS.CREATE_USERS, PERMISSIONS.UPDATE_USERS], false);
export const requireUserDelete = requirePermissions([PERMISSIONS.DELETE_USERS]);

/**
 * Get user's permission list for debugging/display purposes
 */
export const getUserPermissions = (user: AuthUser): string[] => {
  return ROLE_PERMISSIONS[user.role as UserRole] || [];
};

/**
 * Check if user can manage another user (based on role hierarchy)
 */
export const canManageUser = (manager: AuthUser, targetUser: AuthUser): boolean => {
  // Super admin can manage anyone
  if (manager.role === ROLES.SUPER_ADMIN) {
    return true;
  }

  // Org admin can manage users in same organization (except other org admins and super admins)
  if (manager.role === ROLES.ORG_ADMIN && 
      manager.organizationId === targetUser.organizationId) {
    const targetLevel = ROLE_LEVELS[targetUser.role as UserRole] || 0;
    const managerLevel = ROLE_LEVELS[manager.role as UserRole] || 0;
    return managerLevel > targetLevel;
  }

  return false;
};
