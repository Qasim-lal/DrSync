# Rules Review Conflict Report

**Date:** June 5, 2026
**Scope:** Review of `AGENTS.md` and `WARP.md` against current docs under `docs/core`, `docs/architecture`, and `docs/features`.
**Status:** `AGENTS.md` updated. `WARP.md` remains historical and should be reconciled later if the team wants one single long-form rulebook.

## 1. Rules Precedence Conflict

**Conflict:** The previous `AGENTS.md` said to treat `WARP.md` as the full project rulebook. `WARP.md` contains several outdated or overly absolute rules that do not match the current architecture and live development context.

**Documents involved:**

- `AGENTS.md`
- `WARP.md`
- `docs/core/DrSync_SRS.md`
- `docs/architecture/Multi_Client_Architecture.md`

**Resolution applied:**

- Updated `AGENTS.md` to state that it is the current practical rulebook.
- Added precedence language: when `WARP.md` conflicts with current docs or `AGENTS.md`, follow `AGENTS.md` and the current project docs.

**Suggested follow-up:**

- Later, either update `WARP.md` fully or mark it as historical to avoid future agent confusion.

## 2. Google Sheets And PostgreSQL Ownership Conflict

**Conflict:** Existing rules said Google Sheets is primary for appointment/patient workflow data, but omitted providers. Architecture docs clearly define Providers as part of client-owned Google Sheets workflow data.

**Documents involved:**

- Previous `AGENTS.md`
- `docs/architecture/Multi_Client_Architecture.md`
- `docs/core/DrSync_TDD.md`
- `docs/core/DrSync_SRS.md`

**Why it matters:**

- Provider data is used by WhatsApp booking, appointment scheduling, dashboard dropdowns, and provider availability.
- Omitting providers from the data ownership rule can lead agents to incorrectly treat provider records as PostgreSQL-primary.

**Resolution applied:**

- Updated `AGENTS.md` to say patient, appointment, and provider workflow data are Google Sheets authoritative.
- Clarified PostgreSQL as metadata/service/cache/sync/fallback layer.

## 3. Provider/User Concept Conflict

**Conflict:** Existing rules did not distinguish `Provider` from `User`. Code and docs show these are separate concepts:

- `Provider`: healthcare provider/doctor scheduling entity.
- `User`: dashboard login account with role/auth.

Some existing code references imply a `Provider.user` relation, but the current Prisma schema does not define it and the architecture docs do not require every provider to have a user account.

**Documents involved:**

- `backend/prisma/schema.prisma`
- `docs/core/DrSync_TDD.md`
- `docs/core/DrSync_SRS.md`
- `docs/features/staff-invitations/STAFF_INVITATION_WIZARD_IMPLEMENTATION.md`

**Why it matters:**

- Assuming every provider is a user can break dashboard fallback queries.
- Assuming every doctor-role user is a provider can incorrectly bind RBAC to scheduling data.

**Resolution applied:**

- Added Provider/User/Staff/Appointment rules to `AGENTS.md`.
- Required an architecture decision before adding a Provider/User mapping.

**Resolution applied after owner decision:**

- Created `docs/architecture/PROVIDER_USER_ARCHITECTURE_DECISION.md`.
- Accepted decision: Provider and User remain separate; Provider may optionally link one-to-one to a dashboard User; appointments remain linked to providers; RBAC remains linked to users.

## 4. PostgreSQL Fallback Conflict

**Conflict:** `WARP.md` includes broad fallback and rollback language such as PostgreSQL fallback within 3 seconds, queuing writes, and rollback to PostgreSQL-first mode. The architecture says PostgreSQL is fallback/cache/service layer, but patient data ownership must remain client-controlled and Google Sheets authoritative.

**Documents involved:**

- `WARP.md`
- `docs/architecture/Multi_Client_Architecture.md`
- `docs/core/DrSync_SRS.md`

**Why it matters:**

- A broad "rollback to PostgreSQL-first" rule can conflict with the security requirement that patient data remain in client-owned Google Sheets.
- Fallback reads are reasonable; silent fallback writes or ownership changes are not safe without explicit architecture updates.

**Resolution applied:**

- Updated `AGENTS.md` to allow PostgreSQL fallback/cache behavior but not silent replacement of client-owned Sheets.
- Added rule that moving sensitive patient ownership into PostgreSQL requires explicit architecture and tracker updates.

**Suggested follow-up:**

- Update `WARP.md` section 7.5 to clarify fallback read mode versus data ownership rollback.

## 5. WhatsApp Live Testing Conflict

**Conflict:** Older broad rules require testing live WhatsApp webhook handling and integration flows, while current production context says Meta/WhatsApp approval is pending.

**Documents involved:**

- `WARP.md`
- Previous `AGENTS.md`
- `docs/features/whatsapp/WHATSAPP_SIMULATOR_GUIDE.md`
- `docs/features/whatsapp/WHATSAPP_SIMULATOR_COMPLETE.md`
- `docs/core/DrSync_Task_Tracking.md`

**Why it matters:**

- Treating live webhook failures as code blockers would freeze unrelated dashboard, settings, SSE, reminder, and simulator-verifiable work.

**Resolution applied:**

- Kept and expanded the WhatsApp approval constraint in `AGENTS.md`.
- Added simulator/mock/local verification as the preferred path while approval is pending.

## 6. API Versioning Conflict

**Conflict:** `WARP.md` says APIs must use `/api/v1/`, but current code and docs use unversioned `/api/...` routes such as `/api/providers`, `/api/appointments`, `/api/notification-settings`, and `/api/events/messages/...`.

**Documents involved:**

- `WARP.md`
- `docs/core/DrSync_API_Documentation.md`
- `docs/architecture/SSE_EVENTS_USAGE_GUIDE.md`
- Current frontend/backend route usage

**Why it matters:**

- Enforcing `/api/v1/` now would create route duplication or breaking changes.

**Resolution applied:**

- Did not include `/api/v1/` as a hard rule in updated `AGENTS.md`.

**Suggested follow-up:**

- If API versioning is desired, create a migration plan rather than introducing duplicate routes ad hoc.

## 7. Frontend State Library Conflict

**Conflict:** `WARP.md` says global state must use Zustand, but current frontend docs and implemented pages mostly use React local state, hooks, and shared API helpers.

**Documents involved:**

- `WARP.md`
- `docs/features/google-sheets/GOOGLE_SHEETS_WIZARD_IMPLEMENTATION.md`
- `docs/features/staff-invitations/STAFF_INVITATION_WIZARD_IMPLEMENTATION.md`
- Current dashboard implementation

**Why it matters:**

- Requiring Zustand can introduce unnecessary new state layers and duplicate existing state patterns.

**Resolution applied:**

- Updated `AGENTS.md` to prefer existing patterns and reuse rather than requiring a specific global state library.

## 8. Documentation Minimalism Conflict

**Conflict:** `WARP.md` says not to create new documentation files and to keep all rules in `WARP.md`, but current project organization includes dedicated docs under `docs/tasks`, `docs/features`, and `docs/architecture`, and the user explicitly requested a separate conflict report.

**Documents involved:**

- `WARP.md`
- `docs/core/DrSync_Task_Tracking.md`
- `docs/tasks/**`
- `docs/features/**`
- User instruction for this review

**Why it matters:**

- A strict "no new docs" rule conflicts with task-specific planning, architecture decisions, and explicit user requests.

**Resolution applied:**

- Updated `AGENTS.md` to allow focused new documents in relevant folders when substantial or explicitly requested.
- Created this conflict report as a separate document.

## 9. Port And Environment Detail Conflict

**Conflict:** `WARP.md` lists local Docker service ports in a way that may not match current Compose files or VPS production ports. The live VPS uses frontend 3000 and backend 3001.

**Documents involved:**

- `WARP.md`
- `docker-compose.prod.yml`
- User-provided VPS `docker compose ps` output

**Why it matters:**

- Incorrect port assumptions can lead to broken verification commands and confusion during deployment.

**Resolution applied:**

- `AGENTS.md` now records the production domains and deployment context without hardcoding local development ports.

**Suggested follow-up:**

- Update `WARP.md` ports after reviewing current Compose files.

## 10. Notification Settings Access Gap

**Conflict:** Notification settings requirements say organization admins need an organization-level notification settings interface. Existing implementation initially exposed the TASK-040C page only through the super/admin layout sidebar, not the organization dashboard sidebar.

**Documents involved:**

- `docs/core/DrSync_SRS.md`
- `docs/tasks/TASK-040C/IMPLEMENTATION_PLAN.md`
- Current frontend dashboard navigation

**Why it matters:**

- Organization admins need cost-control and notification settings from their dashboard, especially while WhatsApp live testing is pending.

**Resolution applied:**

- Added rule that notification settings must be accessible to organization admins from the organization dashboard.
- Earlier code change added `/dashboard/notification-settings` as a no-duplication route reusing the existing page.

## Recommended Next Step

Begin implementation planning for the accepted Provider/User decision:

1. Review current Prisma schema and migrations.
2. Decide exact field names for the optional Provider-to-User relation.
3. Plan migration, seed/test fixture changes, and API updates.
4. Keep the implementation separate from unrelated TASK-040C UI work.
