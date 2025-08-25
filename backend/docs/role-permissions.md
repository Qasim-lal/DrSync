# DrSync Role-Based Access Control (RBAC) System

## 🎯 Role Hierarchy

The DrSync system implements a hierarchical role-based access control where higher roles inherit permissions from lower roles.

### Role Levels (1-6, higher numbers = more permissions)

| Level | Role | Description |
|-------|------|-------------|
| 1 | `STAFF` | Basic staff members with minimal access |
| 2 | `RECEPTIONIST` | Front desk staff with patient scheduling access |
| 3 | `NURSE` | Medical staff with patient care access |
| 4 | `DOCTOR` | Medical practitioners with full patient access |
| 5 | `ORG_ADMIN` | Organization administrators |
| 6 | `SUPER_ADMIN` | System-wide administrators |

## 🔐 Permission Matrix

### Authentication & Profile Management
| Action | STAFF | RECEPTIONIST | NURSE | DOCTOR | ORG_ADMIN | SUPER_ADMIN |
|--------|-------|-------------|--------|---------|-----------|-------------|
| Login/Logout | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| View Own Profile | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Update Own Profile | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Change Own Password | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

### User Management
| Action | STAFF | RECEPTIONIST | NURSE | DOCTOR | ORG_ADMIN | SUPER_ADMIN |
|--------|-------|-------------|--------|---------|-----------|-------------|
| View Organization Users | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| Create Users (Same Org) | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| Update Users (Same Org) | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| Delete Users (Same Org) | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| Manage Any Organization | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |

### Patient Management (Future Implementation)
| Action | STAFF | RECEPTIONIST | NURSE | DOCTOR | ORG_ADMIN | SUPER_ADMIN |
|--------|-------|-------------|--------|---------|-----------|-------------|
| View Patient List | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Create Patient | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| View Patient Details | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Update Patient Info | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Delete Patient | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| View Medical History | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |
| Update Medical History | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |
| Prescribe Medications | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |

### Appointment Management (Future Implementation)
| Action | STAFF | RECEPTIONIST | NURSE | DOCTOR | ORG_ADMIN | SUPER_ADMIN |
|--------|-------|-------------|--------|---------|-----------|-------------|
| View Appointments | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Schedule Appointments | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Modify Appointments | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Cancel Appointments | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| View All Org Appointments | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |

### Organization & Settings
| Action | STAFF | RECEPTIONIST | NURSE | DOCTOR | ORG_ADMIN | SUPER_ADMIN |
|--------|-------|-------------|--------|---------|-----------|-------------|
| View Org Settings | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| Update Org Settings | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| Manage Integrations | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| View Reports | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| System Administration | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |

## 🏥 Organization Isolation

### Key Principles:
- **Cross-Organization Access**: Users can ONLY access resources within their organization
- **Super Admin Exception**: SUPER_ADMIN can access any organization
- **Resource Scoping**: All queries automatically filter by user's organizationId
- **URL Parameters**: Organization ID in URLs must match user's organization

### Implementation:
```typescript
// All users (except SUPER_ADMIN) are restricted to their organization
const orgFilter = user.role === 'SUPER_ADMIN' ? {} : { organizationId: user.organizationId };
```

## 🛡️ Security Rules

### 1. Role Inheritance
- Higher roles inherit ALL permissions from lower roles
- DOCTOR can do everything NURSE, RECEPTIONIST, and STAFF can do
- ORG_ADMIN can do everything except system-wide admin tasks

### 2. Resource Ownership
- Users can always access their own profile/data
- Admins can access resources within their organization scope
- SUPER_ADMIN can access any resource system-wide

### 3. Endpoint Protection Levels
- **Public**: No authentication required
- **Authenticated**: Any logged-in user
- **Role-Based**: Specific roles required
- **Organization-Scoped**: Must belong to the right organization
- **Resource-Owned**: Can only access own resources (or admin override)

## 📝 Usage Examples

### Protecting Routes with Roles
```typescript
// Any authenticated user
router.get('/profile', authenticate, getProfile);

// Specific role required
router.get('/users', authenticate, requireOrgAdmin, getUsers);

// Multiple roles allowed
router.get('/patients', authenticate, authorize(['RECEPTIONIST', 'NURSE', 'DOCTOR', 'ORG_ADMIN']), getPatients);

// Organization + role check
router.get('/org/:organizationId/settings', 
  authenticate, 
  authorizeOrganization, 
  requireOrgAdmin, 
  getOrgSettings
);

// Resource ownership check
router.get('/users/:userId', 
  authenticate, 
  authorizeResourceAccess('userId'), 
  getUserDetails
);
```

### Permission Checking in Code
```typescript
// Check if user has specific role permission
if (authService.hasPermission(user.role, ['DOCTOR'])) {
  // Allow access to medical records
}

// Check organization membership
if (user.organizationId === resourceOrganizationId || user.role === 'SUPER_ADMIN') {
  // Allow access
}
```

## 🧪 Testing Matrix

Each role should be tested for:
- ✅ **Positive Tests**: Can access what they should
- ❌ **Negative Tests**: Cannot access what they shouldn't
- 🏥 **Organization Boundaries**: Cannot cross organization lines
- 🔒 **Resource Ownership**: Proper self-access vs admin access

---

*This document should be updated as new features and endpoints are added to the system.*
