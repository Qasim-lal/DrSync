# Role-Based Access Control (RBAC) Testing Guide

This guide provides comprehensive instructions for manually testing the role-based access control system in the DrSync backend.

## Prerequisites

1. Backend server is running (`npm run dev` or `npm start`)
2. Database is connected and accessible
3. Test data is seeded (use the seed script below)
4. API testing tool (Postman, curl, or similar)

## Setting Up Test Data

Run the seeding script to create test organizations and users:

```bash
cd backend
ts-node scripts/seed-rbac-test-data.ts seed
```

This will create:
- 2 test organizations (DrSync Test Hospital & Family Care Clinic)
- 11 test users across all role levels
- Proper password hashing and organization assignments

## Test Credentials

### DrSync Test Hospital (test-org-healthcare-1)
| Role          | Email                                   | Password              |
|---------------|----------------------------------------|-----------------------|
| SUPER_ADMIN   | superadmin@drsync.com                  | SuperSecure2024!      |
| ORG_ADMIN     | admin@drsynctesthospital.com           | HospitalAdmin2024!    |
| DOCTOR        | dr.smith@drsynctesthospital.com        | Doctor2024!           |
| NURSE         | nurse.wilson@drsynctesthospital.com    | Nurse2024!            |
| RECEPTIONIST  | reception@drsynctesthospital.com       | Reception2024!        |
| STAFF         | staff@drsynctesthospital.com           | Staff2024!            |

### Family Care Clinic (test-org-clinic-2)
| Role          | Email                                   | Password              |
|---------------|----------------------------------------|-----------------------|
| ORG_ADMIN     | admin@familyclinic.com                 | ClinicAdmin2024!      |
| DOCTOR        | dr.johnson@familyclinic.com            | Doctor2024!           |
| NURSE         | nurse.davis@familyclinic.com           | Nurse2024!            |
| RECEPTIONIST  | front.desk@familyclinic.com            | Reception2024!        |
| STAFF         | support@familyclinic.com               | Staff2024!            |

## API Endpoints for Testing

### Authentication Endpoints
- `POST /api/auth/login` - Login with email/password
- `POST /api/auth/logout` - Logout (requires auth)
- `GET /api/auth/me` - Get current user profile (requires auth)
- `POST /api/auth/refresh` - Refresh JWT token

### Protected Endpoints (Role-Based)

#### Public Endpoints (No Auth Required)
```http
GET /api/health
GET /api/auth/health
```

#### Basic Authentication Required
```http
GET /api/users/profile
GET /api/auth/me
```

#### STAFF Level Access (All authenticated users)
```http
GET /api/dashboard/stats
GET /api/appointments/my-schedule
```

#### RECEPTIONIST Level Access
```http
GET /api/appointments
POST /api/appointments
PUT /api/appointments/:id
GET /api/patients/basic-info
```

#### NURSE Level Access
```http
GET /api/patients
POST /api/patients
PUT /api/patients/:id/vitals
GET /api/medical-records/limited
```

#### DOCTOR Level Access
```http
GET /api/patients/:id/full-record
POST /api/medical-records
PUT /api/medical-records/:id
GET /api/prescriptions
POST /api/prescriptions
```

#### ORG_ADMIN Level Access
```http
GET /api/organizations/:orgId/users
POST /api/organizations/:orgId/users
PUT /api/organizations/:orgId/users/:userId
DELETE /api/organizations/:orgId/users/:userId
GET /api/organizations/:orgId/reports
```

#### SUPER_ADMIN Level Access
```http
GET /api/admin/organizations
POST /api/admin/organizations
PUT /api/admin/organizations/:id
DELETE /api/admin/organizations/:id
GET /api/admin/users
GET /api/admin/system-logs
```

## Testing Scenarios

### 1. Basic Authentication Tests

#### Test 1.1: Login with Valid Credentials
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "dr.smith@drsynctesthospital.com",
  "password": "Doctor2024!"
}
```

**Expected Result:**
- Status: 200 OK
- Response contains: `accessToken`, `refreshToken`, user data
- Tokens are properly formatted JWT

#### Test 1.2: Login with Invalid Credentials
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "dr.smith@drsynctesthospital.com",
  "password": "WrongPassword"
}
```

**Expected Result:**
- Status: 401 Unauthorized
- Error message about invalid credentials

### 2. Role Hierarchy Tests

#### Test 2.1: SUPER_ADMIN Access All Endpoints
Login as `superadmin@drsync.com` and test access to:
- ✅ All admin endpoints (`/api/admin/*`)
- ✅ All organization endpoints
- ✅ All user-level endpoints

#### Test 2.2: ORG_ADMIN Access Restrictions
Login as `admin@drsynctesthospital.com` and test:
- ❌ Super admin endpoints (`/api/admin/*`) - Should fail with 403
- ✅ Organization endpoints for their org
- ✅ Lower-level endpoints (doctor, nurse, etc.)

#### Test 2.3: DOCTOR Access Restrictions
Login as `dr.smith@drsynctesthospital.com` and test:
- ❌ Admin endpoints - Should fail with 403
- ❌ Organization management - Should fail with 403
- ✅ Patient records and medical data
- ✅ Basic endpoints (profile, appointments)

#### Test 2.4: Lower Role Restrictions
Login as `staff@drsynctesthospital.com` and test:
- ❌ All higher-level endpoints - Should fail with 403
- ✅ Basic staff endpoints only

### 3. Organization-Scoped Security Tests

#### Test 3.1: Cross-Organization Access Prevention
Login as `admin@drsynctesthospital.com` (Hospital org admin):

**Should SUCCEED:**
```http
GET /api/organizations/test-org-healthcare-1/users
Authorization: Bearer <hospital-admin-token>
```

**Should FAIL (403):**
```http
GET /api/organizations/test-org-clinic-2/users
Authorization: Bearer <hospital-admin-token>
```

#### Test 3.2: Doctor Cross-Organization Patient Access
Login as `dr.smith@drsynctesthospital.com`:

**Should FAIL (403):**
```http
GET /api/organizations/test-org-clinic-2/patients
Authorization: Bearer <doctor-token>
```

### 4. JWT Token Security Tests

#### Test 4.1: Missing Authorization Header
```http
GET /api/users/profile
```

**Expected Result:**
- Status: 401 Unauthorized
- Error code: `AUTH_TOKEN_MISSING`

#### Test 4.2: Malformed Authorization Header
```http
GET /api/users/profile
Authorization: InvalidFormat token123
```

**Expected Result:**
- Status: 401 Unauthorized
- Error code: `AUTH_TOKEN_MISSING`

#### Test 4.3: Invalid JWT Token
```http
GET /api/users/profile
Authorization: Bearer invalid.jwt.token
```

**Expected Result:**
- Status: 401 Unauthorized
- Error code: `AUTH_TOKEN_INVALID`

### 5. Resource Access Control Tests

#### Test 5.1: User Accessing Own Profile
```http
GET /api/users/profile
Authorization: Bearer <valid-token>
```

**Expected Result:**
- Status: 200 OK
- Returns user's own profile data

#### Test 5.2: User Accessing Other User's Data
Regular user trying to access another user's data should be blocked by organization and resource-level authorization.

## Automated Testing Commands

### Run Unit Tests
```bash
cd backend
npm test src/test/auth.test.ts
```

### Run RBAC Integration Tests
```bash
cd backend
npm test tests/auth-rbac.test.ts
```

### Run All Authentication Tests
```bash
cd backend
npm test -- --testPathPattern="auth"
```

### Generate Test JWT Tokens
```bash
cd backend
ts-node scripts/seed-rbac-test-data.ts tokens
```

### Verify RBAC Setup
```bash
cd backend
ts-node scripts/seed-rbac-test-data.ts verify
```

## Expected Security Behaviors

### ✅ Should Allow
1. **Role Hierarchy:** Higher roles accessing lower-level endpoints
2. **Organization Scope:** Users accessing resources within their organization
3. **Resource Ownership:** Users accessing their own data
4. **Valid Authentication:** Properly authenticated requests with valid tokens

### ❌ Should Block
1. **Privilege Escalation:** Lower roles accessing higher-level endpoints
2. **Cross-Organization:** Users accessing resources in other organizations
3. **Resource Theft:** Users accessing other users' private data
4. **Invalid Authentication:** Malformed, expired, or invalid tokens
5. **Missing Authentication:** Requests without required authentication

## Common Error Codes

- `AUTH_TOKEN_MISSING` (401) - No authorization header or invalid format
- `AUTH_TOKEN_INVALID` (401) - Invalid, expired, or malformed JWT token  
- `AUTH_USER_NOT_FOUND` (401) - Token valid but user doesn't exist
- `AUTH_INSUFFICIENT_PERMISSIONS` (403) - User doesn't have required role
- `AUTH_ORG_ACCESS_DENIED` (403) - Cross-organization access attempt
- `AUTH_RESOURCE_ACCESS_DENIED` (403) - Accessing unauthorized resources

## Troubleshooting

### Test Data Issues
- Ensure seeding script ran successfully
- Check database connectivity
- Verify password hashing is working

### Token Issues  
- Check JWT_SECRET environment variables
- Verify token expiration times
- Ensure proper Bearer token format

### Permission Issues
- Confirm role hierarchy implementation
- Check organization ID matching
- Verify middleware order in routes

## Performance Considerations

During testing, monitor:
- Response times for authentication
- Database query efficiency for permission checks
- Memory usage with concurrent requests
- Rate limiting behavior (if implemented)

---

## Quick Test Checklist

- [ ] All test users can login with their credentials
- [ ] SUPER_ADMIN can access all endpoints
- [ ] ORG_ADMIN blocked from super admin endpoints
- [ ] Cross-organization access is prevented
- [ ] Invalid tokens are properly rejected
- [ ] Role hierarchy is enforced correctly
- [ ] Resource-level authorization works
- [ ] JWT tokens have proper expiration
- [ ] Error messages don't leak sensitive information
- [ ] Concurrent requests handle permissions correctly
