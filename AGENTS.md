# DrSync Agent Rules

These rules apply to all agent work in this repository. Treat `WARP.md` as the full project rulebook and this file as the practical session checklist.

## Before Starting Work

- Read `docs/core/DrSync_Task_Tracking.md` before starting new implementation work.
- Review relevant docs under `docs/core`, `docs/tasks`, `docs/features`, and `docs/architecture` for the active task.
- Summarize current status, blockers, and the proposed next task before making code changes when resuming a session.
- Keep the Task Tracking Document updated whenever a task status, blocker, milestone, or completion state changes.

## Current Production Context

- Production domain: `https://drsync.app`
- Backend API domain: `https://api.drsync.app`
- VPS provider: Contabo
- Deployment runs in Docker containers on the server.
- Local development and debugging happen on this system first, then changes are applied to the Contabo server for real-time checks.
- WhatsApp Business account approval is currently pending, so live WhatsApp webhook production testing is blocked.

## WhatsApp Approval Constraint

- Do not treat live WhatsApp webhook failures as code blockers while Meta/WhatsApp approval is pending.
- Keep TASK-039 production webhook testing marked as blocked/deferred until WhatsApp Business approval is complete.
- Prefer simulator, mock payloads, local scripts, Postman/curl, seeded events, or test fixtures for WhatsApp-related development.
- Build and verify dashboard, settings, cost control, SSE, message lifecycle, and reminder features without requiring live WhatsApp approval where possible.

## Recommended Work Order While WhatsApp Is Pending

1. Implement dashboard-visible and configurable features that do not require live WhatsApp webhooks.
2. Prioritize TASK-040C notification settings UI and advanced features.
3. Then prioritize TASK-045 real-time SSE message monitoring dashboard if backend endpoints are available.
4. Keep production WhatsApp webhook registration/testing for after Meta approval.

## Development Rules

- **HARD RULE:** Before writing code for any task, first search for existing services, components, routes, helpers, hooks, schemas, and docs that already solve the same problem.
- **HARD RULE:** Do not duplicate business logic, API clients, auth/header handling, schemas, UI patterns, or data access paths. Reuse or extend the existing implementation unless there is a documented reason not to.
- Use Docker-based development for services whenever practical.
- Use npm as the package manager.
- Do not commit or expose `.env`, `.env.local`, tokens, private keys, or production credentials.
- Preserve the existing architecture and naming conventions.
- Prefer TypeScript types/interfaces over `any`.
- Keep changes scoped to the active task.
- Do not revert user changes or unrelated work.

## Data Architecture Rules

- Google Sheets is the client-facing primary data layer for appointment/patient workflow data.
- PostgreSQL stores system metadata, platform state, auth, subscriptions, caches, and sync data.
- Avoid changes that move sensitive patient ownership away from client-controlled Google Sheets unless the project docs are explicitly updated.

## Testing And Verification

- Run focused tests for changed backend/frontend areas when available.
- For frontend changes, verify the UI locally when a dev server is available.
- When live WhatsApp cannot be tested, document simulator/mock coverage and explicitly note that production webhook validation remains pending.
- After significant implementation, update the task tracker and notify the user of the milestone.

## Documentation Rules

- Keep `docs/core/DrSync_Task_Tracking.md` as the source of truth for task status.
- If a task has a dedicated document under `docs/tasks`, update it or create one when the implementation is substantial.
- If tracker status conflicts with newer implementation summaries, call out the ambiguity before proceeding.

## Git Rules

- Check worktree status before editing when Git is available.
- If Git reports dubious ownership, ask before configuring `safe.directory`.
- Never run destructive Git commands such as `git reset --hard` or checkout/revert user changes unless explicitly requested.
