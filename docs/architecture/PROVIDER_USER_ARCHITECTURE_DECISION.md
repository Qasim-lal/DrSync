# Provider And User Architecture Decision

**Date:** June 5, 2026
**Status:** Accepted
**Decision Owner:** DrSync project owner
**Related docs:** `docs/core/DrSync_SRS.md`, `docs/core/DrSync_TDD.md`, `docs/architecture/Multi_Client_Architecture.md`, `docs/features/staff-invitations/STAFF_INVITATION_WIZARD_IMPLEMENTATION.md`

## 1. Decision

`Provider` and `User` remain separate concepts.

DrSync will support an optional one-to-one link between a provider record and a dashboard user account.

Appointments must continue to reference `providerId` for scheduling. Dashboard authentication and permissions must continue to use `User` and `User.role`.

## 2. Business Scenario

DrSync clients can be:

- A hospital with many doctors, dentists, specialists, departments, or service providers.
- A clinic with multiple providers and shared reception/admin staff.
- An individual doctor operating as a single-provider organization.
- A specialist, pharmacy, diagnostic center, or other supported organization type.

Because of this, the app must support multiple providers per organization and multiple dashboard users per organization without assuming those lists are identical.

## 3. Definitions

### Organization

The paying/client account in DrSync. An organization owns its Google Sheets integration, WhatsApp setup, dashboard users, providers, notification settings, billing, and workflow data.

### Provider

A schedulable healthcare/service entity used for patient-facing booking and appointment management.

Examples:

- Doctor
- Dentist
- Specialist
- Consultant
- Diagnostic service provider

Provider data includes scheduling and clinical workflow fields such as name, specialty, consultation duration, fee, working hours, active status, and appointment availability.

Provider workflow data is Google Sheets authoritative and may be cached/synced into PostgreSQL for service-layer operations.

### User

A dashboard login account with authentication, role, permissions, and organization access.

Examples:

- Organization admin
- Doctor login
- Staff/receptionist
- Super admin

User data belongs to PostgreSQL as platform/auth metadata.

## 4. Relationship Model

```text
Organization
  has many Providers
  has many Users

Provider
  belongs to Organization
  optionally links to one User

User
  belongs to Organization
  may be linked from one Provider
```

Recommended future Prisma shape:

```prisma
model Provider {
  id             String @id
  organizationId String
  userId         String? @unique

  organization   Organization @relation(fields: [organizationId], references: [id])
  user           User?        @relation(fields: [userId], references: [id])
  appointments   Appointment[]
}

model User {
  id              String @id
  organization_id String
  role            UserRole

  providerProfile Provider?
}
```

The exact field names must be aligned with the current Prisma schema and migrations before implementation.

## 5. Rules

- Do not merge `Provider` and `User` into one table/model.
- Do not require every provider to have a user account.
- Do not require every doctor-role user to have a provider record.
- A provider may be created without login access.
- A user may be created without a provider profile.
- A doctor user may optionally link to one provider profile.
- Staff, receptionist, billing, and admin users should not require provider records.
- Appointments must reference providers for scheduling.
- RBAC must reference users and roles for authorization.
- Provider data used for appointment booking must remain Google Sheets authoritative.
- User/auth data must remain PostgreSQL authoritative.

## 6. Examples

### Hospital

```text
Organization: City Hospital

Providers:
  Dr Ahmed - Cardiologist
  Dr Sara - Dentist
  Dr Khan - Dermatologist

Users:
  Hospital Admin - ORG_ADMIN
  Receptionist - STAFF
  Dr Ahmed Login - DOCTOR, linked to Dr Ahmed provider
```

### Clinic

```text
Organization: Family Clinic

Providers:
  Dr Ali - General Physician
  Dr Fatima - Pediatrician

Users:
  Clinic Owner - ORG_ADMIN
  Front Desk - STAFF
  Dr Fatima Login - DOCTOR, linked to Dr Fatima provider
```

### Individual Doctor

```text
Organization: Dr Ali Clinic

Providers:
  Dr Ali

Users:
  Dr Ali - ORG_ADMIN or DOCTOR, linked to Dr Ali provider
  Assistant - STAFF
```

## 7. Product Behavior

### Provider Management

Provider management should create and update schedulable provider records. It should not automatically create dashboard user accounts unless the UI explicitly asks for that action.

### Staff Invitation

Staff invitation should create dashboard user accounts. If the invited role is doctor/provider-like, the UI may later offer:

- Link this user to an existing provider.
- Create a provider profile for this user.
- Leave the user unlinked.

### Appointments

Appointment creation, listing, availability checks, reminders, and WhatsApp booking flows must use `providerId` for the appointment owner/schedule target.

### Doctor Dashboard Views

If a doctor-role user is linked to a provider profile, the dashboard may filter appointment views to that linked provider where appropriate.

If a doctor-role user is not linked to a provider profile, the dashboard should show a clear setup/action state instead of guessing.

## 8. Implementation Guidance

Before implementing the optional relation:

1. Review `backend/prisma/schema.prisma` and migrations.
2. Decide exact field naming consistent with current schema.
3. Add a migration for the optional relation.
4. Update seed data and test fixtures.
5. Update provider APIs to return user link metadata only when needed.
6. Update staff invitation or provider UI to support explicit linking.
7. Verify Google Sheets provider rows still map to provider cache rows without requiring user records.

## 9. Non-Goals

- This decision does not require immediate schema changes.
- This decision does not require creating login accounts for all existing providers.
- This decision does not require adding provider records for all existing users.
- This decision does not change the Google Sheets primary data architecture.

## 10. Acceptance Criteria For Future Implementation

- Provider APIs no longer assume a `Provider.user` relation unless the optional relation is implemented.
- Existing providers without users continue to work.
- Existing users without provider profiles continue to work.
- Appointments continue to use `providerId`.
- Doctor-role dashboard filtering is based on explicit provider linkage, not guessed by email/name.
- Task tracker and affected docs are updated when schema/code implementation begins.
