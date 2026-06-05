# Provider/User Linking Implementation Plan

**Date:** June 5, 2026
**Status:** Planned
**Branch:** codex-phase3-whatsapp-integration
**Architecture decision:** `docs/architecture/PROVIDER_USER_ARCHITECTURE_DECISION.md`

## 1. Purpose

Implement the accepted Provider/User architecture decision without changing appointment ownership or weakening the Google Sheets primary data model.

The accepted decision is:

- `Provider` and `User` remain separate.
- A provider may optionally link one-to-one to a dashboard user.
- Appointments continue to reference `providerId`.
- RBAC and dashboard authentication continue to use `User` and `User.role`.
- Provider workflow data remains Google Sheets authoritative.
- User/auth data remains PostgreSQL authoritative.

## 2. Current Context

The current Prisma `Provider` model has no `user` relation. Some older backend code referenced `Provider.user`, which caused provider fallback queries to fail when Google Sheets credentials were not configured.

This plan prevents future quick fixes from guessing the relationship. Schema and API changes must follow the accepted architecture decision.

## 3. Scope

### In Scope

- Add an optional one-to-one Provider-to-User relationship.
- Keep provider records usable without linked users.
- Keep users usable without provider profiles.
- Support explicit linking from provider management or doctor/staff invitation flows.
- Update provider APIs to return link metadata only where useful.
- Update tests, seed data, and documentation.

### Out Of Scope

- Merging Provider and User into one model.
- Replacing `providerId` with `userId` on appointments.
- Requiring all providers to have dashboard logins.
- Requiring all doctor-role users to have provider records.
- Moving provider workflow ownership away from Google Sheets.

## 4. Recommended Implementation Phases

### Phase 1 - Baseline Review

1. Review `backend/prisma/schema.prisma`.
2. Review migrations touching `users`, `providers`, and `appointments`.
3. Review provider controller/service paths and staff invitation paths.
4. Review Google Sheets provider row mapping.
5. Confirm current frontend provider and staff pages.

Deliverable:

- Short implementation notes confirming exact schema field names and affected files.

### Phase 2 - Schema And Migration

Recommended Prisma direction:

```prisma
model Provider {
  userId String? @unique
  user   User?   @relation(fields: [userId], references: [id])
}

model User {
  providerProfile Provider?
}
```

Important:

- Field types must match the current `User.id` type.
- Field naming must match current schema conventions.
- Migration must be nullable and non-destructive.
- No existing provider or user should be forced to link during migration.

Deliverable:

- Safe nullable migration for optional Provider-to-User relation.

### Phase 3 - Backend API Updates

1. Update provider create/update endpoints to optionally accept a `userId`.
2. Validate that linked user belongs to the same organization.
3. Validate that linked user role is appropriate, such as `DOCTOR` or `PROVIDER`, if role constraints are enforced.
4. Prevent linking one user to multiple providers.
5. Add explicit unlink support.
6. Return provider link metadata only where needed by UI.
7. Keep fallback provider reads working when no user is linked.

Deliverable:

- Provider APIs support explicit linking without requiring it.

### Phase 4 - Staff Invitation And UI Flow

Add explicit UI actions rather than automatic assumptions:

- Link invited doctor user to an existing provider.
- Create a provider profile for invited doctor user.
- Leave user unlinked.

For provider management:

- Allow selecting an existing dashboard user to link.
- Allow unlinking a provider from a user.
- Show clear state when a provider has no login account.

Deliverable:

- UI supports explicit Provider/User linking without hidden side effects.

### Phase 5 - Doctor Dashboard Behavior

If a doctor-role user is linked to a provider:

- Doctor dashboard may filter appointments to the linked provider where appropriate.

If a doctor-role user is not linked:

- Show a clear setup/action state.
- Do not guess by matching email, name, or phone.

Deliverable:

- Doctor dashboard behavior is deterministic and explainable.

### Phase 6 - Verification

Required checks:

- Prisma generate passes.
- Backend build/type-check status is recorded.
- Provider list works with Google Sheets configured.
- Provider list works with PostgreSQL fallback when Google Sheets is not configured.
- Existing appointments continue using `providerId`.
- Staff invitation still creates users correctly.
- Existing unlinked providers remain visible and bookable.
- Existing unlinked users can still log in.

VPS verification:

- Pull branch on VPS.
- Rebuild affected containers.
- Confirm `/api/providers` no longer returns 500.
- Confirm `/dashboard/appointments` opens without provider API crashes.
- Confirm `/dashboard/notification-settings` is visible and opens.

## 5. Risks

- Existing schema drift can obscure whether a failure belongs to this task or older technical debt.
- Current Google Sheets setup may be incomplete, so fallback behavior must be tested separately.
- Linking by guessed fields such as email/name can create wrong associations in clinics with shared emails or similar names.
- Adding a required relation would break hospitals/clinics with schedulable providers who do not need dashboard access.

## 6. Acceptance Criteria

- Provider and User remain separate models.
- Provider-to-User link is optional and one-to-one.
- Appointments still reference `providerId`.
- Provider APIs work when `userId` is null.
- Doctor-role dashboard filtering only uses explicit provider linkage.
- Staff/admin users do not require provider profiles.
- Provider workflow data remains Google Sheets authoritative.
- Task tracker and architecture docs reference the completed implementation.

## 7. Current VPS Verification Status

The latest pushed changes that exposed the dashboard notification link and provider fallback cleanup still need live VPS verification after pulling and rebuilding the branch on the server.

Suggested VPS commands:

```bash
cd /root/DrSync
git pull --ff-only origin codex-phase3-whatsapp-integration
docker compose -f docker-compose.prod.yml up -d --build backend frontend
docker logs drsync_backend --since=5m
docker logs drsync_frontend --since=5m
```

Browser checks:

- Open `https://drsync.app/dashboard`.
- Confirm the sidebar shows `Notifications`.
- Open `https://drsync.app/dashboard/notification-settings`.
- Open `https://drsync.app/dashboard/appointments`.
- Open `https://drsync.app/dashboard/providers`.
- Confirm backend logs do not show `Unknown field user for include statement on model Provider`.
