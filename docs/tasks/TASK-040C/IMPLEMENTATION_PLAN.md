# TASK-040C Implementation Plan

**Task:** Notification Settings Phase 3 - Frontend UI and Advanced Features
**Date:** June 3, 2026
**Branch:** codex-phase3-whatsapp-integration
**Status:** Implementation updated; runtime verification pending
**Constraint:** Live WhatsApp webhook production testing is blocked until Meta/WhatsApp Business approval is complete.

## 1. Goal

TASK-040C should turn the notification settings and cost-control foundation into a complete, production-usable dashboard experience with advanced cost optimization features.

The planned final outcome is:

- Organization/admin dashboard for notification settings.
- Message preview before sending.
- Patient segmentation support.
- Smart message bundling support.
- Cost analytics dashboard.
- Mock/simulator-based verification while WhatsApp approval is pending.

## 2. Verification Summary

The repository contains real implementation work for notification settings, presets, cost calculation, and spending caps. However, the advanced TASK-040C scope is not fully implemented.

Git history shows no commit explicitly named `TASK-040C`.

Relevant commits found:

- `e2bda6e feat: Complete TASK-040B Notification Settings Phase 2 implementation...`
- `7aef210 chore: Add test scripts and miscellaneous updates`
- `4d351bc Fix: Production development fixes - prisma client generation, Docker configs, and import paths...`

The current codebase should treat TASK-040C as **implemented but pending runtime verification**.

## 3. Implemented And Complete

### Backend

| Area | Status | Evidence |
|---|---:|---|
| Notification settings CRUD | Complete | `backend/src/services/notificationSettingsService.ts`, `backend/src/controllers/notificationSettingsController.ts`, `backend/src/routes/notificationSettings.ts` |
| Route registration | Complete | `backend/src/app.ts` mounts `/api/notification-settings` |
| Preset modes | Complete | `applyPreset()` supports `BUDGET`, `RECOMMENDED`, `PREMIUM` |
| Cost calculator API | Complete | `GET /api/notification-settings/:organizationId/calculate-cost` |
| Preset comparison API | Complete | `GET /api/notification-settings/:organizationId/compare-presets` |
| Message cost tracking service | Complete | `backend/src/services/messageCostTrackingService.ts` |
| Spending cap checks | Mostly complete | `checkSpendingCap()` exists and is used by wrapper service |
| WhatsApp cost tracking wrapper | Partially complete | `backend/src/services/whatsappCostTrackingIntegration.ts` exists, but broader integration into all send paths must be verified |

### Frontend

| Area | Status | Evidence |
|---|---:|---|
| Admin notification settings page | Partially complete | `frontend/src/app/admin/notification-settings/page.tsx` |
| Preset selector | Complete | `frontend/src/components/admin/settings/PresetSelector.tsx` |
| Cost calculator | Complete | `frontend/src/components/admin/settings/CostCalculator.tsx` |
| Preset comparison | Complete | `frontend/src/components/admin/settings/PresetComparison.tsx` |
| Spending cap config | Complete | `frontend/src/components/admin/settings/SpendingCapConfig.tsx` |
| Frontend API service | Complete | `frontend/src/services/notificationSettingsService.ts` |
| Admin sidebar link | Complete | `frontend/src/components/admin/layout/Sidebar.tsx` links to `/admin/notification-settings` |

## 4. Partially Complete Or Questionable

| Area | Current State | Required Work |
|---|---|---|
| Notification settings page | Exists as an admin/test-style page using a manually entered test organization ID | Convert into production dashboard page using authenticated user's organization context and remove debug/test UI |
| WhatsApp cost tracking integration | Wrapper exists | Verify all outbound send paths use it or consciously document exceptions |
| Message cost preview | Implemented in current TASK-040C work | `MessageCostPreview.tsx` now calls `POST /api/notification-settings/:organizationId/estimate-message-cost` through the shared notification settings service |
| Spending cap enforcement | Implemented in cost wrapper | Verify reminder, follow-up, booking confirmation, and bulk send flows respect it |
| Cost analytics | Implemented in current TASK-040C work | `CostAnalyticsPanel.tsx` uses `GET /api/notification-settings/:organizationId/cost-summary` |

## 5. Implemented And Remaining Gaps

| Feature | Status | Notes |
|---|---:|---|
| Patient segmentation service | Implemented in current TASK-040C work | `backend/src/services/patientSegmentationService.ts`, `GET /api/notification-settings/:organizationId/patient-segments`, `PatientSegmentationPanel.tsx` |
| Smart message bundling | Implemented in current TASK-040C work | `backend/src/services/smartMessageBundlingService.ts`, `POST /api/notification-settings/:organizationId/bundle-plan`, `SmartBundlingPanel.tsx` |
| Full WhatsApp-style message content preview | Partially implemented | Cost preview is wired through notification settings; full template/body preview remains a future polish item |
| Backend cost estimate endpoint | Implemented in current TASK-040C work | `MessageCostPreview.tsx` now calls `POST /api/notification-settings/:organizationId/estimate-message-cost` through the shared notification settings service |
| Cost analytics dashboard | Implemented in current TASK-040C work | `CostAnalyticsPanel.tsx` uses tracked monthly cost summary |
| Patient segment overrides | Schema restored; UI not implemented | `PatientNotificationOverride` model restored from existing migration; override management UI is future work |

## 5.1 Current Implementation Update - June 3, 2026

Implemented in this Codex branch:

- Reused the shared frontend API client instead of duplicating notification settings auth headers.
- Converted `/admin/notification-settings` from test organization input/debug UI to authenticated organization context.
- Added `POST /api/notification-settings/:organizationId/estimate-message-cost`.
- Added `GET /api/notification-settings/:organizationId/cost-summary`.
- Added `GET /api/notification-settings/:organizationId/patient-segments`.
- Added `POST /api/notification-settings/:organizationId/bundle-plan`.
- Restored Prisma schema fields/models from the existing TASK-040B migration so existing services match schema.
- Added `CostAnalyticsPanel`, `PatientSegmentationPanel`, and `SmartBundlingPanel`.
- Added project hard rules in `AGENTS.md` requiring no duplication before any code task.

Verification status:

- `git diff --check` passed.
- Docker is running and local container verification was performed.
- Prisma client generation passed in Docker with `docker compose -f docker-compose.dev.yml exec -T backend npm run db:generate`.
- Frontend type-check passed in Docker with `docker compose -f docker-compose.dev.yml exec -T frontend npm run type-check`.
- Backend full build was run in Docker with `docker compose -f docker-compose.dev.yml exec -T backend npm run build`; it still fails because of unrelated existing TypeScript/schema drift in billing, provider, support, communication, reminder, auth route, system operations, and WhatsApp service files.
- The touched TASK-040C controller/service files are no longer present in the backend build error list after the final controller/auth alias adjustments.
- VPS deploy follow-up on June 5, 2026 found and fixed runtime configuration issues outside TASK-040C: WhatsApp startup now uses Prisma camelCase fields, Bull queue services reuse authenticated Redis config, Express trusts the reverse proxy for rate limiting, production frontend Docker uses the standalone Next server, and the obsolete production Compose `version` warning was removed.

## 6. Main Risks

1. Documentation conflict: some docs say TASK-040A Phase 3 is complete, while the canonical tracker says TASK-040C is not started.
2. The repository has existing TypeScript/schema drift outside TASK-040C; backend full build cannot be used as a clean completion signal until those unrelated modules are repaired.
3. The notification settings UI is under `/admin`, but TASK-040C may need organization admin dashboard access as well.
4. Live WhatsApp webhook testing cannot be completed until WhatsApp Business approval is done.
5. Public GitHub repository means all new work must avoid committing secrets, production tokens, private keys, or `.env` files.

## 7. Recommended Implementation Plan

### Step 1 - Normalize Task Status And Scope

- Update `docs/core/DrSync_Task_Tracking.md`.
- Mark TASK-040C as `In Progress`.
- Record that it is partially implemented from prior TASK-040A/TASK-040B work.
- Record WhatsApp production webhook validation as blocked pending Meta approval.

Deliverable:

- Tracker accurately reflects current status.

### Step 2 - Make Notification Settings Page Production-Ready

- Replace test organization ID input with authenticated organization context.
- Support super admin view only if needed; otherwise keep organization settings scoped to the logged-in organization.
- Remove debug information from production UI.
- Add loading, empty, error, and unauthorized states.
- Confirm API base URL behavior is correct for local and VPS deployment.

Deliverable:

- Production-ready settings page for real users.

### Step 3 - Fix Message Cost Preview Backend

- Add a backend endpoint for cost estimate, or change the frontend to use an existing endpoint.
- Implemented endpoint:
  - `POST /api/notification-settings/:organizationId/estimate-message-cost`
  - Input: `organizationId`, `recipientCount`, `messageType`
  - Output: `costPerMessage`, `totalCost`, `currentSpend`, `monthlyCap`, `percentageUsed`, `willExceedCap`, `remainingBudget`
- Protect endpoint with auth and organization access checks.

Deliverable:

- `MessageCostPreview.tsx` becomes usable.

### Step 4 - Add Cost Analytics Dashboard

- Add backend endpoint for monthly cost summary using `messageCostTrackingService.getMonthlySummary()`.
- Add frontend cost analytics panel:
  - monthly spend
  - messages sent
  - messages saved
  - cost saved
  - breakdown by notification type
  - spending cap progress
- Use mock/seed data if live WhatsApp is unavailable.

Deliverable:

- Usable cost analytics view without requiring live WhatsApp.

### Step 5 - Add Patient Segmentation

- Define segments:
  - `NEW`
  - `REGULAR`
  - `VIP`
  - `AT_RISK`
  - `INACTIVE`
- Start with deterministic rules from existing patient/appointment data.
- Add backend service:
  - `patientSegmentationService.ts`
- Add optional schema only if needed for overrides/history.
- Add API endpoint for segment summary and patient segment lookup.
- Add frontend segment summary widget.

Deliverable:

- Patients can be categorized for future notification rules.

### Step 6 - Add Smart Message Bundling

- Add backend service:
  - `smartMessageBundlingService.ts`
- Start with safe, simple bundling:
  - same patient
  - same day or same appointment context
  - non-critical messages only
  - never bundle urgent reminders or confirmations that must be immediate
- Track bundled messages using existing `messagesBundled` field.
- Add tests for saved cost and non-bundled critical cases.

Deliverable:

- Basic bundling logic that reduces cost without risking patient communication quality.

### Step 7 - Add WhatsApp-Style Message Preview

- Add frontend preview component showing:
  - message type
  - language
  - patient name placeholder
  - doctor/provider placeholder
  - appointment date/time placeholder
  - estimated cost
- Use local templates and mock data while WhatsApp approval is pending.

Deliverable:

- Admins can preview content and cost before enabling/sending messages.

### Step 8 - Verify With Tests And Simulator

- Run focused backend tests for:
  - notification settings
  - cost estimate endpoint
  - analytics endpoint
  - segmentation
  - bundling
- Run focused frontend checks for the settings page.
- Use simulator/mock payloads instead of live WhatsApp webhooks.
- Document that live webhook validation remains blocked by WhatsApp approval.

Deliverable:

- Verified TASK-040C implementation ready for local and VPS deployment checks.

## 8. Suggested Acceptance Criteria

TASK-040C should be marked complete only when:

- Notification settings page is production-ready and no longer test-only.
- Message cost preview works against a real backend endpoint.
- Cost analytics dashboard shows monthly spend and type breakdown.
- Patient segmentation service exists and can classify patients.
- Smart bundling service exists and records bundled-message savings.
- All relevant backend and frontend tests/checks pass.
- Task tracker and TASK-040C docs are updated.
- WhatsApp live webhook testing blocker is documented separately, not counted as TASK-040C failure.

## 9. Recommended First Work Session

Start with the lowest-risk, highest-impact corrections:

1. Run a browser/API smoke check against the local or VPS deployment once backend runtime is healthy.
2. Decide whether full WhatsApp-style template/body preview is required now or can remain future polish.
3. Repair the unrelated backend TypeScript/schema drift as a separate task so full backend build can become a reliable verification gate.
4. Keep live WhatsApp webhook validation deferred until Meta/WhatsApp Business approval is complete.
