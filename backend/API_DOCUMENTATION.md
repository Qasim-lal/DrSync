# DrSync API Documentation - Role-Based Access Control

This document provides comprehensive information about the DrSync Healthcare Management API, including authentication, authorization, and role-based access control.

## Table of Contents
- [Authentication & Authorization](#authentication--authorization)
- [Role Hierarchy](#role-hierarchy)  
- [API Endpoints](#api-endpoints)
- [Error Codes](#error-codes)
- [Testing](#testing)

## Authentication & Authorization

### JWT Token Structure
All protected endpoints require a valid JWT token in the Authorization header:
```
Authorization: Bearer <access_token>
```

### Token Payload
```json
{
  "userId": "user-id",
  "email": "user@example.com", 
  "role": "USER_ROLE",
  "organizationId": "org-id",
  "iat": 1640995200,
  "exp": 1640998800
}
```

### Organization Scope
Most endpoints are organization-scoped, meaning users can only access resources within their own organization. Cross-organization access is strictly forbidden except for SUPER_ADMIN users.

## Role Hierarchy

The system implements a hierarchical role-based access control (RBAC) system:

```
SUPER_ADMIN (System-wide access)
    ↓
ORG_ADMIN (Organization-wide access)
    ↓
DOCTOR (Clinical access + patient data)
    ↓  
NURSE (Limited clinical access)
    ↓
RECEPTIONIST (Appointment management + basic patient info)
    ↓
STAFF (Basic system access)
```

### Role Permissions Matrix

| Role | Can Access | Description |
|------|------------|-------------|
| **SUPER_ADMIN** | All endpoints | System administrators with cross-organization access |
| **ORG_ADMIN** | Organization management, all lower roles | Organization administrators |
| **DOCTOR** | Patient records, medical data, appointments | Healthcare providers |
| **NURSE** | Limited patient data, vital signs, basic records | Nursing staff |
| **RECEPTIONIST** | Appointments, basic patient info, scheduling | Front desk staff |
| **STAFF** | Basic system features, own profile | General staff members |

## API Endpoints

### 🔓 Public Endpoints (No Authentication)

#### Health Check
```http
GET /api/health
```
**Response:** Server status and basic system information
**Required Role:** None

---

### 🔐 Authentication Endpoints

#### User Login
```http
POST /api/auth/login
```
**Required Role:** None
**Body:**
```json
{
  "email": "user@example.com",
  "password": "password"
}
```
**Response:** JWT tokens and user information

#### Refresh Token
```http
POST /api/auth/refresh
```
**Required Role:** Valid refresh token
**Response:** New access token

#### Logout
```http
POST /api/auth/logout
```
**Required Role:** Authenticated user
**Effect:** Invalidates refresh token

#### Get Current User
```http
GET /api/auth/me
```
**Required Role:** Any authenticated user
**Response:** Current user profile and permissions

---

### 👤 User Management Endpoints

#### Get User Profile
```http
GET /api/users/profile
```
**Required Role:** Any authenticated user
**Response:** Own user profile

#### Update User Profile
```http
PUT /api/users/profile
```
**Required Role:** Any authenticated user
**Body:** User profile fields
**Effect:** Updates own profile

#### Get User by ID
```http
GET /api/users/:userId
```
**Required Role:** 
- Own user: Any authenticated user
- Other users: `ORG_ADMIN` or `SUPER_ADMIN`
**Organization Scope:** Yes (except SUPER_ADMIN)

---

### 🏥 Organization Management Endpoints

#### List Organizations
```http
GET /api/organizations
```
**Required Role:** `SUPER_ADMIN`
**Response:** All organizations in system

#### Get Organization Details
```http
GET /api/organizations/:organizationId
```
**Required Role:** 
- Own organization: `STAFF` or higher
- Other organizations: `SUPER_ADMIN`
**Organization Scope:** Yes (except SUPER_ADMIN)

#### Create Organization
```http
POST /api/organizations
```
**Required Role:** `SUPER_ADMIN`
**Body:** Organization details

#### Update Organization
```http
PUT /api/organizations/:organizationId
```
**Required Role:** 
- Own organization: `ORG_ADMIN`
- Other organizations: `SUPER_ADMIN`
**Organization Scope:** Yes (except SUPER_ADMIN)

#### List Organization Users
```http
GET /api/organizations/:organizationId/users
```
**Required Role:** `ORG_ADMIN` or `SUPER_ADMIN`
**Organization Scope:** Yes (except SUPER_ADMIN)

#### Add User to Organization
```http
POST /api/organizations/:organizationId/users
```
**Required Role:** `ORG_ADMIN` or `SUPER_ADMIN`
**Organization Scope:** Yes (except SUPER_ADMIN)
**Body:** User creation data

#### Update Organization User
```http
PUT /api/organizations/:organizationId/users/:userId
```
**Required Role:** `ORG_ADMIN` or `SUPER_ADMIN`
**Organization Scope:** Yes (except SUPER_ADMIN)
**Body:** User update data

#### Remove User from Organization
```http
DELETE /api/organizations/:organizationId/users/:userId
```
**Required Role:** `ORG_ADMIN` or `SUPER_ADMIN`
**Organization Scope:** Yes (except SUPER_ADMIN)

---

### 👥 Patient Management Endpoints

#### List Patients
```http
GET /api/patients
```
**Required Role:** `RECEPTIONIST` or higher
**Organization Scope:** Yes
**Query Parameters:**
- `limit`: Number of results
- `offset`: Pagination offset
- `search`: Search by name/phone

#### Get Patient Details
```http
GET /api/patients/:patientId
```
**Required Role:** 
- Basic info: `RECEPTIONIST` or higher
- Full medical record: `DOCTOR` or higher
**Organization Scope:** Yes

#### Create Patient
```http
POST /api/patients
```
**Required Role:** `RECEPTIONIST` or higher
**Organization Scope:** Yes
**Body:** Patient information

#### Update Patient
```http
PUT /api/patients/:patientId
```
**Required Role:** 
- Basic info: `RECEPTIONIST` or higher
- Medical data: `NURSE` or higher
**Organization Scope:** Yes
**Body:** Updated patient data

#### Get Patient Medical History
```http
GET /api/patients/:patientId/medical-history
```
**Required Role:** `NURSE` or higher
**Organization Scope:** Yes

#### Add Medical Record
```http
POST /api/patients/:patientId/medical-records
```
**Required Role:** `DOCTOR` or higher
**Organization Scope:** Yes
**Body:** Medical record data

---

### 📅 Appointment Management Endpoints

#### List Appointments
```http
GET /api/appointments
```
**Required Role:** `RECEPTIONIST` or higher
**Organization Scope:** Yes
**Query Parameters:**
- `date`: Filter by date
- `providerId`: Filter by healthcare provider
- `status`: Filter by appointment status

#### Get Appointment Details
```http
GET /api/appointments/:appointmentId
```
**Required Role:** `RECEPTIONIST` or higher
**Organization Scope:** Yes

#### Create Appointment
```http
POST /api/appointments
```
**Required Role:** `RECEPTIONIST` or higher
**Organization Scope:** Yes
**Body:** Appointment details

#### Update Appointment
```http
PUT /api/appointments/:appointmentId
```
**Required Role:** `RECEPTIONIST` or higher
**Organization Scope:** Yes
**Body:** Updated appointment data

#### Cancel Appointment
```http
DELETE /api/appointments/:appointmentId
```
**Required Role:** `RECEPTIONIST` or higher
**Organization Scope:** Yes

#### Get My Schedule (Provider)
```http
GET /api/appointments/my-schedule
```
**Required Role:** `DOCTOR` or higher
**Organization Scope:** Yes
**Response:** User's scheduled appointments

---

### 💊 Medical Records & Prescriptions

#### Get Patient Prescriptions
```http
GET /api/patients/:patientId/prescriptions
```
**Required Role:** `DOCTOR` or higher
**Organization Scope:** Yes

#### Create Prescription
```http
POST /api/prescriptions
```
**Required Role:** `DOCTOR` or higher
**Organization Scope:** Yes
**Body:** Prescription details

#### Update Prescription
```http
PUT /api/prescriptions/:prescriptionId
```
**Required Role:** `DOCTOR` or higher
**Organization Scope:** Yes
**Body:** Updated prescription

#### Add Vital Signs
```http
POST /api/patients/:patientId/vitals
```
**Required Role:** `NURSE` or higher
**Organization Scope:** Yes
**Body:** Vital signs data

---

### 📊 Analytics & Reports

#### Organization Dashboard
```http
GET /api/dashboard/stats
```
**Required Role:** `STAFF` or higher
**Organization Scope:** Yes
**Response:** Organization statistics and metrics

#### Generate Reports
```http
GET /api/reports/:reportType
```
**Required Role:** 
- Basic reports: `ORG_ADMIN` or higher
- Medical reports: `DOCTOR` or higher
**Organization Scope:** Yes
**Query Parameters:**
- `startDate`: Report period start
- `endDate`: Report period end
- `format`: Output format (JSON, CSV, PDF)

---

### 🛠️ System Administration (SUPER_ADMIN only)

#### System Health
```http
GET /api/admin/health
```
**Required Role:** `SUPER_ADMIN`
**Response:** Detailed system health information

#### List All Users
```http
GET /api/admin/users
```
**Required Role:** `SUPER_ADMIN`
**Response:** All users across organizations

#### System Logs
```http
GET /api/admin/logs
```
**Required Role:** `SUPER_ADMIN`
**Response:** System audit logs

#### Update System Settings
```http
PUT /api/admin/settings
```
**Required Role:** `SUPER_ADMIN`
**Body:** System configuration

---

## Error Codes

### Authentication Errors
- `AUTH_TOKEN_MISSING` (401): No authorization header or invalid format
- `AUTH_TOKEN_INVALID` (401): Invalid, expired, or malformed JWT token
- `AUTH_USER_NOT_FOUND` (401): Token valid but user doesn't exist or is inactive
- `AUTH_REQUIRED` (401): Endpoint requires authentication

### Authorization Errors  
- `AUTH_INSUFFICIENT_PERMISSIONS` (403): User doesn't have required role
- `AUTH_ORG_ACCESS_DENIED` (403): Cross-organization access attempt
- `AUTH_RESOURCE_ACCESS_DENIED` (403): Accessing unauthorized resources
- `AUTH_INTERNAL_ERROR` (500): Authentication process failed

### Validation Errors
- `VALIDATION_ERROR` (400): Request data validation failed
- `INVALID_REQUEST` (400): Malformed request
- `RESOURCE_NOT_FOUND` (404): Requested resource doesn't exist
- `DUPLICATE_RESOURCE` (409): Resource already exists

## Testing

### Test Credentials

The system includes comprehensive test data for all roles:

#### DrSync Test Hospital (test-org-healthcare-1)
| Role | Email | Password |
|------|-------|----------|
| SUPER_ADMIN | superadmin@drsync.com | SuperSecure2024! |
| ORG_ADMIN | admin@drsynctesthospital.com | HospitalAdmin2024! |
| DOCTOR | dr.smith@drsynctesthospital.com | Doctor2024! |
| NURSE | nurse.wilson@drsynctesthospital.com | Nurse2024! |
| RECEPTIONIST | reception@drsynctesthospital.com | Reception2024! |
| STAFF | staff@drsynctesthospital.com | Staff2024! |

#### Family Care Clinic (test-org-clinic-2)
| Role | Email | Password |
|------|-------|----------|
| ORG_ADMIN | admin@familyclinic.com | ClinicAdmin2024! |
| DOCTOR | dr.johnson@familyclinic.com | Doctor2024! |
| NURSE | nurse.davis@familyclinic.com | Nurse2024! |
| RECEPTIONIST | front.desk@familyclinic.com | Reception2024! |
| STAFF | support@familyclinic.com | Staff2024! |

### Testing Commands

```bash
# Seed test data
npx ts-node scripts/seed-rbac-test-data.ts seed

# Generate JWT tokens for testing
npx ts-node scripts/seed-rbac-test-data.ts tokens

# Verify RBAC setup
npx ts-node scripts/seed-rbac-test-data.ts verify

# Run authentication tests
npm test -- --testPathPattern="auth"

# Run RBAC tests
npm test -- --testPathPattern="rbac-simple"
```

### Example API Testing with curl

#### 1. Login to get JWT token
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "dr.smith@drsynctesthospital.com",
    "password": "Doctor2024!"
  }'
```

#### 2. Use token for authenticated requests
```bash
curl -X GET http://localhost:3001/api/users/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE"
```

#### 3. Test role-based access
```bash
# Should succeed - DOCTOR accessing patients
curl -X GET http://localhost:3001/api/patients \
  -H "Authorization: Bearer DOCTOR_JWT_TOKEN"

# Should fail - STAFF accessing admin endpoints
curl -X GET http://localhost:3001/api/admin/users \
  -H "Authorization: Bearer STAFF_JWT_TOKEN"
```

### Expected Test Results

✅ **Should Allow:**
- Higher roles accessing lower-level endpoints
- Users accessing resources within their organization
- Users accessing their own profile/data
- Valid JWT tokens with proper format

❌ **Should Block:**
- Lower roles accessing higher-privilege endpoints
- Cross-organization resource access
- Invalid, expired, or malformed tokens
- Missing authentication on protected endpoints
- Resource access without proper ownership

## Security Best Practices

1. **Token Storage**: Store JWT tokens securely (HttpOnly cookies for web, secure storage for mobile)
2. **Token Expiry**: Access tokens have short expiry (15 minutes), refresh tokens longer (7 days)
3. **Rate Limiting**: Implement rate limiting on authentication endpoints
4. **Audit Logging**: All access attempts and permission failures are logged
5. **Organization Isolation**: Strict enforcement of organization-scoped data access
6. **Role Validation**: Server-side role validation on every protected request
7. **Password Security**: Bcrypt hashing with proper salt rounds

## Support

For questions about API usage, role permissions, or integration:
- Check the comprehensive testing guide: `RBAC_TESTING_GUIDE.md`
- Review test implementations in `tests/` directory
- Run verification scripts to ensure proper setup

The RBAC system is designed to be secure by default with explicit permission requirements for each endpoint.
