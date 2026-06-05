# DrSync Agent Rules

These rules apply to all agent work in this repository. Use this file as the current practical rulebook for Codex and other agents. `WARP.md` contains older broad project rules; when `WARP.md` conflicts with this file or with the current project documents, follow this file and the current documents under `docs/core`, `docs/architecture`, and `docs/features`.

## Before Starting Work

- Read `docs/core/DrSync_Task_Tracking.md` before starting new implementation work.
- Review relevant docs under `docs/core`, `docs/tasks`, `docs/features`, and `docs/architecture` for the active task.
- Summarize current status, blockers, and the proposed next task before making code changes when resuming a session.
- Check `git status` before editing when Git is available.
- Keep the Task Tracking Document updated whenever a task status, blocker, milestone, or completion state changes.
- If tracker status conflicts with newer implementation summaries, call out the ambiguity before proceeding.

## Current Production Context

- Production domain: `https://drsync.app`
- Backend API domain: `https://api.drsync.app`
- VPS provider: Contabo
- Deployment runs in Docker containers on the server.
- Local development and debugging happen on this system first, then changes are applied to the Contabo server for real-time checks.
- Production Compose on the VPS may contain local domain-specific settings. Preserve those settings during pulls, stashes, rebuilds, and conflict resolution.
- WhatsApp Business account approval is currently pending, so live WhatsApp webhook production testing is blocked.

## Source Of Truth Documents

- Core requirements: `docs/core/DrSync_SRS.md`
- Technical design: `docs/core/DrSync_TDD.md`
- Development specifications: `docs/core/DrSync_DevSpecs.md`
- Task tracking: `docs/core/DrSync_Task_Tracking.md`
- Multi-client and data ownership architecture: `docs/architecture/Multi_Client_Architecture.md`
- Client communication architecture: `docs/architecture/DRSYNC_CLIENT_COMMUNICATION_ARCHITECTURE.md`
- Feature-specific docs: `docs/features/**`
- Task-specific docs: `docs/tasks/**`

## Architecture Principles

- DrSync is a multi-tenant SaaS platform for healthcare appointment management.
- Each organization must remain isolated from every other organization.
- Client-owned Google Sheets are the authoritative data layer for patient, appointment, and provider workflow data.
- PostgreSQL is the service and metadata layer for organizations, auth/users, roles, subscriptions, billing, settings, queues, sync state, audit logs, reminders, cost tracking, and cached/fallback workflow data.
- Dashboard reads for patient, appointment, and provider data should prefer Google Sheets and use PostgreSQL only as fallback/cache when Sheets is unavailable or not configured.
- Dashboard writes for patient, appointment, and provider workflow data should write to Google Sheets first, then sync to PostgreSQL for platform services.
- Do not move sensitive patient ownership into PostgreSQL unless the architecture docs and task tracker are explicitly updated first.
- Google Sheets setup may be incomplete during development; expected Google Sheets credential warnings should not be treated as core runtime failures if fallback behavior works.

## Provider, User, Staff, And Appointment Rules

- Follow `docs/architecture/PROVIDER_USER_ARCHITECTURE_DECISION.md` for Provider/User/Staff/Appointment identity rules.
- Treat `Provider` and `User` as separate concepts.
- `Provider` means a healthcare provider/doctor used for appointment scheduling, availability, specialties, fees, and patient-facing booking flows.
- `User` means a dashboard login account with authentication, role, and permissions.
- A dashboard `User` may have a role such as `ORG_ADMIN`, `DOCTOR`, `STAFF`, or `SUPER_ADMIN`.
- Do not assume every provider has a dashboard user account.
- Do not assume every doctor-role user has a provider record.
- If the app needs to connect a provider record to a login user, use the accepted optional one-to-one Provider-to-User link described in the architecture decision.
- Appointments should remain linked to providers for scheduling and to patients for patient workflow. Do not replace `providerId` with `userId` without a documented architecture change.

## WhatsApp Approval Constraint

- Do not treat live WhatsApp webhook failures as code blockers while Meta/WhatsApp approval is pending.
- Keep TASK-039 production webhook testing marked as blocked/deferred until WhatsApp Business approval is complete.
- Prefer simulator, mock payloads, local scripts, Postman/curl, seeded events, or test fixtures for WhatsApp-related development.
- Build and verify dashboard, settings, cost control, SSE, message lifecycle, reminders, and simulator-supported WhatsApp flows without requiring live WhatsApp approval where possible.
- Live WhatsApp webhook validation must remain a separate deployment/approval blocker, not a reason to mark unrelated code incomplete.

## Recommended Work Order While WhatsApp Is Pending

1. Stabilize dashboard-visible and configurable features that do not require live WhatsApp webhooks.
2. Verify TASK-040C notification settings UI and advanced features from the organization dashboard.
3. Repair TypeScript/Prisma schema drift in controlled domain groups so backend builds become reliable again.
4. Then prioritize TASK-045 real-time SSE message monitoring dashboard if backend endpoints are available.
5. Keep production WhatsApp webhook registration/testing for after Meta approval.

## Development Rules

- **HARD RULE:** Before writing code for any task, first search for existing services, components, routes, helpers, hooks, schemas, and docs that already solve the same problem.
- **HARD RULE:** Do not duplicate business logic, API clients, auth/header handling, schemas, UI patterns, or data access paths. Reuse or extend the existing implementation unless there is a documented reason not to.
- **HARD RULE:** For schema/model mismatches, inspect the Prisma schema, migrations, generated types if needed, and relevant architecture docs before changing controller/service logic.
- Keep changes scoped to the active task.
- Preserve existing architecture and naming conventions.
- Prefer TypeScript types/interfaces over `any`.
- Use npm as the package manager.
- Use Docker-based development for services whenever practical.
- Do not commit or expose `.env`, `.env.local`, tokens, private keys, production credentials, or secret backups.
- Do not revert user changes or unrelated work.
- Do not make destructive Git or filesystem changes unless explicitly requested.

## API And Data Access Rules

- Keep organization scoping on all protected data access paths.
- Validate authenticated organization access before reading or writing organization-owned settings or workflow data.
- Reuse existing shared API clients and auth/header helpers.
- Do not add parallel API clients for the same backend surface.
- Use existing Google Sheets service and sync service paths for workflow data unless a documented task explicitly replaces them.
- Use PostgreSQL fallback only as graceful degradation, cache, or service-layer support, not as a silent replacement for client-owned Sheets.
- If Google Sheets is not configured, fallback responses should be clear and should not crash dashboard pages.

## Notification Settings And Cost Control Rules

- Organization-level notification settings belong in PostgreSQL as platform configuration.
- Notification settings must be accessible to organization admins from the organization dashboard.
- Reuse existing TASK-040A/040B/040C notification settings services and components.
- Respect notification settings before sending automated WhatsApp messages where the relevant send path is implemented.
- Track sent, skipped, saved, and bundled messages for cost analytics where the feature path supports it.
- Patient segmentation and smart bundling must not require live WhatsApp approval for development verification.

## Staff And Invitation Rules

- Staff management is dashboard-user management, not provider management by default.
- Staff invitation flow creates dashboard users and assigns roles.
- Doctor-role invitations may link to provider records through the accepted optional Provider-to-User link, but the UI/action must be explicit.
- Preserve RBAC and organization isolation for invitations and user management.

## Testing And Verification

- Run focused tests for changed backend/frontend areas when available.
- For frontend changes, verify the UI locally when a dev server is available.
- If local tooling is unavailable, document the blocker and provide VPS/Docker verification commands.
- For VPS checks, inspect container logs and browser-visible behavior, not only `/health`.
- When live WhatsApp cannot be tested, document simulator/mock coverage and explicitly note that production webhook validation remains pending.
- After significant implementation, update the task tracker and notify the user of the milestone.

## Documentation Rules

- Keep `docs/core/DrSync_Task_Tracking.md` as the source of truth for task status.
- If a task has a dedicated document under `docs/tasks`, update it or create one when the implementation is substantial.
- Update architecture docs or create a focused architecture decision document before changing core relationships such as Provider/User, Google Sheets/PostgreSQL ownership, or appointment ownership.
- Keep documentation concise and avoid duplicate plans. If a new document is needed, put it in the relevant folder and link it from the task tracker or task plan.
- If implementation behavior diverges from older docs, document the divergence and ask whether to update the older doc or treat it as historical.

## Git Rules

- Check worktree status before editing when Git is available.
- Work on `codex-phase3-whatsapp-integration` unless the user directs otherwise.
- Keep `feature/phase3-whatsapp-integration` untouched unless the user explicitly asks to modify it.
- If Git reports dubious ownership, ask before configuring `safe.directory`.
- Never run destructive Git commands such as `git reset --hard` or checkout/revert user changes unless explicitly requested.
- Do not commit or push without confirming the intended scope if the worktree contains unrelated changes.
