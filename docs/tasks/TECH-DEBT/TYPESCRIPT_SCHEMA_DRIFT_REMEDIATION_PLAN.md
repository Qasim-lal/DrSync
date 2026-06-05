# TypeScript And Prisma Schema Drift Remediation Plan

**Date:** June 5, 2026
**Branch:** codex-phase3-whatsapp-integration
**Status:** Planned technical-debt cleanup
**Scope:** Backend TypeScript build failures caused by Prisma schema/model naming drift and stale service contracts.

## 1. Purpose

The backend currently runs on VPS and the Docker image can build because production uses `ts-node`, but `npm run build` fails with many TypeScript errors. These failures are mostly unrelated to TASK-040C and come from older modules that still reference stale Prisma model names, relation names, field casing, or legacy auth/user shapes.

This plan records a safe remediation path so the cleanup can be started later without mixing it into feature delivery.

## 2. Current Known Symptoms

Running backend TypeScript build reports errors in these groups:

- Prisma relation/model drift in billing, support, communication, configuration, provider, system operations, and test utilities.
- Snake_case versus camelCase field drift, especially around Prisma-generated models.
- Missing Prisma models referenced by older services, such as payment, support, communication, and configuration backup entities.
- Auth user shape drift between raw Prisma users and frontend/API expectations.
- Reminder route status/field mismatches.
- WhatsApp service field-name drift. Some runtime-critical items were already fixed during the TASK-040C VPS deployment follow-up.

## 3. Hard Rules

- Do not duplicate services, schemas, route logic, or type aliases.
- Inspect current Prisma schema and existing migrations before changing any field/model.
- Prefer mapping/adapters at module boundaries only when the existing codebase already uses that pattern.
- Do not delete or rename database models without reviewing migrations and runtime data impact.
- Keep fixes grouped by domain, not scattered across unrelated modules in one large change.
- After each domain cleanup, run targeted checks before moving to the next group.

## 4. Recommended Work Order

### Phase 1 - Baseline And Classification

1. Run `docker compose -f docker-compose.dev.yml exec -T backend npm run db:generate`.
2. Run `docker compose -f docker-compose.dev.yml exec -T backend npm run build`.
3. Save the full error output into a temporary local note.
4. Classify every error into:
   - Prisma field casing
   - Prisma missing model/relation
   - Auth user contract
   - Reminder/appointment enum mismatch
   - Unused import or strict optional type
   - Test utility only

Deliverable:

- Error inventory grouped by domain and severity.

### Phase 2 - Prisma Contract Review

1. Compare `backend/prisma/schema.prisma` with all migrations.
2. Identify models referenced in code but missing from schema.
3. Decide for each missing model:
   - Restore it to schema because migration/runtime expects it.
   - Remove/update stale code because feature is no longer active.
   - Defer behind a documented feature toggle or future task.

Deliverable:

- A short schema decision table before code edits.

### Phase 3 - Fix Runtime-Critical Domains First

Recommended order:

1. Auth user contract and organization field aliases.
2. WhatsApp service and WhatsApp metrics field casing.
3. Reminder routes and reminder service enum/field casing.
4. Provider, patient, and appointment controller relation names.
5. Billing/payment models and billing analytics.
6. Support and communication models/services.
7. Configuration backup/status services.
8. System operations and test utilities.

Deliverable:

- Backend build error count reduced after each domain.

### Phase 4 - Verification Gates

After each domain:

1. Run targeted TypeScript build or full backend build.
2. Run affected unit/integration tests if available.
3. Run Docker startup smoke:
   - backend starts
   - `/health` returns healthy
   - no Prisma validation errors in logs
   - no Redis auth errors in logs
4. Update this plan with completed groups.

Final acceptance:

- `backend npm run build` passes.
- Prisma generate passes.
- Backend Docker image builds.
- VPS smoke logs are clean.
- No TASK-040C or WhatsApp approval blockers are mixed into this cleanup.

## 5. Open Decisions

1. Whether to restore older billing/support/communication Prisma models or retire stale services that reference them.
2. Whether auth should expose camelCase API-facing aliases from `AuthUser`, or whether all callers should use Prisma snake_case fields.
3. Whether backend production Docker should continue using `ts-node` during development or move to compiled JavaScript after build is fixed.
4. Whether `NODE_ENV=production` should be enabled now or delayed until email/SMTP and production-only validation behavior is confirmed.

## 6. Suggested First Session

Start with Phase 1 only:

1. Generate Prisma client.
2. Run backend build.
3. Save and classify errors.
4. Do not edit code until the first classification table is complete.

This keeps the cleanup controlled and prevents accidental broad refactors.
