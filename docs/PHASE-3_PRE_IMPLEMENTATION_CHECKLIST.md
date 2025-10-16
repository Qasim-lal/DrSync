# Phase 3 Pre-Implementation Checklist

**Project:** DrSync - Healthcare Appointment Management System  
**Date Created:** October 14, 2025  
**Status:** 🔴 PENDING - Must Complete Before Phase 3 Development  
**Reference:** Based on `PHASE-3_DETAILED_ANALYSIS_REPORT.md`  
**Total Estimated Effort:** 3.5 days (1 day pre-work + 0.5 day coordination + 2 days testing)

---

## 🎯 Overview

This checklist contains **10 prioritized action items** to address issues found in Phase 3 task documents analysis. All items must be completed before starting Phase 3 development.

**Quick Summary:**
- ✅ **3 Critical Issues** (HIGH priority - must complete before starting)
- ✅ **2 Medium Issues** (address before implementation)
- ✅ **5 Coordination/Testing Tasks** (complete during/after implementation)

---

## 📌 PRIORITY 1: Critical Issues (Complete Before Starting)

### ☐ ACTION #1: Create Shared Google Sheets Sync Service
**Severity:** 🔴 CRITICAL  
**Owner:** Backend Developer 1  
**Effort:** 4 hours  
**Status:** ⬜ Not Started  

**Issue:** Both TASK-041 and TASK-042 implement duplicate sync logic (Google Sheets → PostgreSQL)

**Deliverable:** `backend/src/services/googleSheetsSyncService.ts`

**Tasks:**
- [ ] Extract sync logic from existing implementations
- [ ] Create `syncAppointment(appointmentId)` method for real-time sync
- [ ] Create `syncAllAppointments(orgId)` method for batch sync
- [ ] Implement error handling with retry logic (3 attempts, exponential backoff)
- [ ] Add conflict resolution (Google Sheets data always wins)
- [ ] Write unit tests (minimum 15 tests)
- [ ] Document API in code comments

**Success Criteria:**
- ✅ Single shared service used by both TASK-041 and TASK-042
- ✅ All tests passing
- ✅ No duplicate sync code

**Integration:**
- TASK-041 calls: `syncService.syncAppointment(id)` after booking
- TASK-042 calls: `syncService.syncAllAppointments(orgId)` hourly

---

### ☐ ACTION #2: Create Notification Settings Integration Guide
**Severity:** 🔴 CRITICAL  
**Owner:** Backend Developer 2  
**Effort:** 3 hours  
**Status:** ⬜ Not Started  

**Issue:** TASK-040A specification complete but integration guide missing for TASK-040, TASK-041, TASK-042

**Note:** ⚠️ TASK-040A is **PLANNING ONLY** - Zero implementation exists. Complete specification document available at `docs/TASK-040A_Notification_Settings_Feature_Spec.md` (1,485 lines)

**Deliverable:** `docs/NOTIFICATION_SETTINGS_INTEGRATION_GUIDE.md`

**Content Required:**
- [ ] **API Endpoints Documentation:**
  - GET `/api/notification-settings/:organizationId`
  - POST `/api/notification-settings/:organizationId`
  - GET `/api/notification-settings/:organizationId/check/:notificationType`

- [ ] **Integration Code Examples:**
  ```typescript
  // Check before sending reminder
  const enabled = await notificationSettingsService.isEnabled(
    organizationId, 
    'appointment_reminder_24h'
  );
  if (!enabled) {
    await logSkippedMessage(appointmentId, 'disabled_by_org');
    return; // Skip sending
  }
  ```

- [ ] **Cost Tracking Integration:**
  - How to log sent messages
  - How to log skipped messages (cost savings)
  - How to update `message_cost_tracking` table

- [ ] **Patient-Level Overrides:**
  - How to check patient opt-outs
  - How to respect custom notification settings

- [ ] **Integration Checklist** for each task (TASK-040, 041, 042)

**Success Criteria:**
- ✅ Complete guide with working code examples
- ✅ All integration points documented
- ✅ Developers can follow guide independently

---

### ☐ ACTION #3: Add Missing Database Table
**Severity:** 🔴 CRITICAL  
**Owner:** Backend Developer 1  
**Effort:** 1 hour  
**Status:** ⬜ Not Started  

**Issue:** `appointment_reminders` table missing from Prisma schema (required by TASK-042)

**Deliverable:** Prisma migration + updated schema

**Tasks:**
- [ ] Add table to `backend/prisma/schema.prisma`:
  ```prisma
  model AppointmentReminder {
    id                String   @id @default(uuid())
    organizationId    String
    appointmentId     String
    reminderType      String   // "24h", "2h", "followup_same_day", etc.
    scheduledFor      DateTime
    sentAt            DateTime?
    status            String   @default("pending") // pending, sent, failed, skipped
    messageId         String?
    skipReason        String?  // "notification_disabled", "patient_opted_out"
    createdAt         DateTime @default(now())
    updatedAt         DateTime @updatedAt
    
    organization      Organization @relation(fields: [organizationId], references: [id])
    
    @@index([organizationId, scheduledFor])
    @@index([status, scheduledFor])
  }
  ```

- [ ] Generate migration: `npx prisma migrate dev --name add_appointment_reminders`
- [ ] Test migration on dev database
- [ ] Update seed data if needed
- [ ] Verify TASK-042 can access table

**Success Criteria:**
- ✅ Table exists in database
- ✅ Migration applied successfully
- ✅ Proper indexes created

---

## 📌 PRIORITY 2: Documentation Updates (Complete Before Starting)

### ☐ ACTION #4: Update TASK-039 Webhook Section
**Severity:** 🟡 MEDIUM  
**Owner:** Technical Lead  
**Effort:** 1 hour  
**Status:** ⬜ Not Started  

**Issue:** Document describes implementing webhook from scratch, but it already exists (TASK-033)

**Deliverable:** Updated `docs/TASK-039_WhatsApp_API_Integration_Detailed_Plan.md`

**Changes Required:**
- [ ] Lines 274-349 (Subtask 3.1.3): Change "Implement webhook endpoint" to "Verify and enhance existing webhook endpoint"
- [ ] Add reference: "Note: Webhook verification already implemented in TASK-033 (17/17 tests passing)"
- [ ] Update sub-subtasks to focus on:
  - Verify existing webhook working
  - Test production webhook with Meta
  - Add production hardening (logging, monitoring)
- [ ] Clarify Subtask 3.2.1 focuses on production enhancements, not initial implementation

**Success Criteria:**
- ✅ Document reflects existing implementation
- ✅ Focus shifted to verification and hardening

---

### ☐ ACTION #5: Add Language Detection Strategy to TASK-040
**Severity:** 🟡 MEDIUM  
**Owner:** Backend Developer 2  
**Effort:** 2 hours  
**Status:** ⬜ Not Started  

**Issue:** Language detection approach not specified in TASK-040

**Deliverable:** Updated `docs/TASK-040_Breakdown.md`

**Changes Required:**
- [ ] Add new sub-subtask under Section 2 (Intent Detection):
  
  **2.3 Language Detection Strategy**
  - Detect Urdu script (Unicode range U+0600 to U+06FF)
  - Check for Urdu keywords: سلام، شکریہ، نام، ڈاکٹر، وقت
  - Check for English keywords: hello, hi, appointment, booking, doctor
  - If ambiguous, prompt: "Select language: 1. English 2. اردو"
  - Store preference in conversation context (Redis)
  - Context TTL: 30 minutes

- [ ] Add test cases:
  - Test Urdu script detection
  - Test English keyword detection
  - Test ambiguous input handling
  - Test language persistence in conversation

**Success Criteria:**
- ✅ Clear detection strategy documented
- ✅ Test cases defined
- ✅ 30-minute context expiration specified

---

## 📌 PRIORITY 3: Coordination Tasks (During Implementation)

### ☐ ACTION #6: Sync Service Coordination Meeting
**Severity:** 🟢 COORDINATION  
**Attendees:** Backend Dev 1 (TASK-041), Backend Dev 2 (TASK-042), Technical Lead  
**Duration:** 30 minutes  
**Status:** ⬜ Not Scheduled  

**Agenda:**
- [ ] Review shared sync service design (from ACTION #1)
- [ ] Agree on responsibility split:
  - TASK-041: Real-time sync after booking
  - TASK-042: Hourly batch sync for reminders
- [ ] Define error handling strategy (retry, fallback, alerts)
- [ ] Set up shared testing approach
- [ ] Clarify conflict resolution rules

**Success Criteria:**
- ✅ Both teams aligned on sync service usage
- ✅ Clear responsibilities documented
- ✅ No duplicate implementation

---

### ☐ ACTION #7: Notification Settings Integration Review
**Severity:** 🟢 COORDINATION  
**Attendees:** All Phase 3 developers + TASK-040A implementer  
**Duration:** 1 hour  
**Status:** ⬜ Not Scheduled  

**Agenda:**
- [ ] Walk through integration guide (from ACTION #2)
- [ ] Review code examples for each task
- [ ] Test notification settings API endpoints
- [ ] Verify cost tracking integration
- [ ] Q&A session

**Success Criteria:**
- ✅ All developers understand integration points
- ✅ Questions answered
- ✅ Ready to implement

---

## 📌 PRIORITY 4: Testing & Validation (Before Production)

### ☐ ACTION #8: End-to-End Integration Testing
**Severity:** 🔴 CRITICAL  
**Owner:** QA Engineer + Backend Developers  
**Effort:** 1 day  
**Status:** ⬜ Not Started  

**Test Scenarios:**
- [ ] **Scenario 1: Booking with notifications disabled**
  - Book appointment via WhatsApp
  - Verify no reminder sent
  - Verify cost savings logged
  - Check `message_cost_tracking` table

- [ ] **Scenario 2: Booking with all notifications enabled**
  - Book appointment via WhatsApp
  - Verify 24h reminder scheduled
  - Verify booking confirmation sent
  - Verify sync to PostgreSQL

- [ ] **Scenario 3: Sync service under load**
  - Create 100 appointments simultaneously
  - Verify all sync to PostgreSQL correctly
  - Verify no data loss
  - Verify sync lag <1 minute

- [ ] **Scenario 4: Google Sheets unavailable**
  - Disconnect Google Sheets API
  - Attempt booking
  - Verify fallback to PostgreSQL
  - Restore Sheets and verify sync

**Success Criteria:**
- ✅ All scenarios pass
- ✅ Zero data loss
- ✅ Performance within targets

---

### ☐ ACTION #9: Multi-Tenant Isolation Validation
**Severity:** 🔴 CRITICAL  
**Owner:** QA Engineer  
**Effort:** 4 hours  
**Status:** ⬜ Not Started  

**Test Scenarios:**
- [ ] Create 3 test organizations (Org A, B, C)
- [ ] Book appointments from all orgs simultaneously
- [ ] Verify messages route to correct organization
- [ ] Verify data isolation (Org A cannot see Org B data)
- [ ] Test concurrent booking conflicts (same slot, different orgs)
- [ ] Verify WhatsApp credentials isolated per org

**Success Criteria:**
- ✅ 100% routing accuracy
- ✅ Zero data leakage between organizations
- ✅ No cross-tenant contamination

---

### ☐ ACTION #10: Performance Benchmarking
**Severity:** 🟡 MEDIUM  
**Owner:** Backend Developer 1  
**Effort:** 4 hours  
**Status:** ⬜ Not Started  

**Benchmarks to Validate:**
- [ ] **WhatsApp Response Time:** <3 seconds (SRS requirement)
  - Test with 50 concurrent users
  - Measure 95th percentile
  - Target: <2.5 seconds

- [ ] **Booking Transaction Time:** <3 seconds
  - Measure end-to-end booking with Google Sheets write
  - Include slot locking time
  - Target: <2 seconds

- [ ] **Reminder Sending Rate:** 1000 reminders/hour minimum
  - Batch test with 1000 scheduled reminders
  - Verify all sent within 1 hour

- [ ] **Sync Service Throughput:** 10,000 appointments in <5 minutes
  - Load test sync service
  - Verify no errors under load

**Success Criteria:**
- ✅ All benchmarks meet or exceed targets
- ✅ Performance documented for baseline

---

## 📊 Progress Tracking

### Overall Completion Status

| Priority | Actions | Completed | Percentage |
|----------|---------|-----------|------------|
| Priority 1 (Critical) | 3 | ☐☐☐ | 0% |
| Priority 2 (Documentation) | 2 | ☐☐ | 0% |
| Priority 3 (Coordination) | 2 | ☐☐ | 0% |
| Priority 4 (Testing) | 3 | ☐☐☐ | 0% |
| **TOTAL** | **10** | **0/10** | **0%** |

### Timeline Estimate

```
Day 1: Critical Issues
├── Morning (4h): ACTION #1 - Shared Sync Service
├── Afternoon (3h): ACTION #2 - Integration Guide
└── Evening (1h): ACTION #3 - Database Table

Day 2: Documentation + Coordination
├── Morning (3h): ACTION #4-5 - Documentation Updates
└── Afternoon (1.5h): ACTION #6-7 - Coordination Meetings

Day 3-4: Testing & Validation
├── Day 3: ACTION #8-9 - Integration + Isolation Testing
└── Day 4 (half): ACTION #10 - Performance Benchmarking
```

**Total: 3.5 days before Phase 3 development**

---

## ✅ Sign-Off

### Pre-Implementation Sign-Off (Required before Phase 3 starts)

- [ ] **Backend Developer 1:** ACTION #1, #3, #10 complete
- [ ] **Backend Developer 2:** ACTION #2, #5 complete
- [ ] **Technical Lead:** ACTION #4 complete, all actions reviewed
- [ ] **QA Engineer:** ACTION #8, #9 complete
- [ ] **Project Manager:** All 10 actions verified complete

### Approval to Start Phase 3

- [ ] All Priority 1 actions complete (Critical)
- [ ] All Priority 2 actions complete (Documentation)
- [ ] Coordination meetings scheduled (Priority 3)
- [ ] Testing plan approved (Priority 4)

**Sign-Off Date:** ________________  
**Approved By:** ________________  
**Phase 3 Start Date:** ________________

---

## 📋 Quick Reference

### Critical Files Created/Modified

| File | Action | Status |
|------|--------|--------|
| `backend/src/services/googleSheetsSyncService.ts` | ACTION #1 | ☐ |
| `docs/NOTIFICATION_SETTINGS_INTEGRATION_GUIDE.md` | ACTION #2 | ☐ |
| `backend/prisma/schema.prisma` | ACTION #3 | ☐ |
| `docs/TASK-039_WhatsApp_API_Integration_Detailed_Plan.md` | ACTION #4 | ☐ |
|| `docs/TASK-040_Breakdown.md` | ACTION #5 | ☐ |
|| `docs/TASK-040A_Notification_Settings_Feature_Spec.md` | Reference (Spec only) | ✅ Planning complete, implementation NOT started |

### Key Decisions Made

1. **Sync Service Responsibility:**
   - TASK-041: Real-time sync after booking (transactional)
   - TASK-042: Hourly batch sync (scheduled)
   - Both use shared `GoogleSheetsSyncService`

2. **Language Detection:**
   - Keyword-based detection (Urdu script + common words)
   - 30-minute conversation context TTL
   - User prompt for ambiguous cases

3. **Testing Priorities:**
   - Integration testing (Day 3)
   - Multi-tenant isolation (Day 3)
   - Performance benchmarking (Day 4)

---

## 🔗 Related Documents

- **Analysis Report:** `docs/PHASE-3_DETAILED_ANALYSIS_REPORT.md` (full analysis)
- **Task Tracking:** `docs/DrSync_Task_Tracking.md` (Phase 3 tasks)
- **Requirements:** `docs/DrSync_SRS.md` (system requirements)
- **Architecture:** `docs/DrSync_TDD.md` (technical design)
- **TASK-040A Specification:** `docs/TASK-040A_Notification_Settings_Feature_Spec.md` (1,485 lines - planning complete, implementation NOT started)

---

**Document Version:** 1.1  
**Last Updated:** October 16, 2025  
**Change Log:** Updated TASK-040A status - renamed document to `TASK-040A_Notification_Settings_Feature_Spec.md` and clarified that only specification exists (zero implementation)  
**Next Review:** After Priority 1 completion  
**Status:** 🔴 ACTIVE - Pre-Implementation Phase

**END OF CHECKLIST**
