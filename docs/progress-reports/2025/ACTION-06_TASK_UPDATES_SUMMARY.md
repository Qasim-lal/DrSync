# ACTION #6 Decisions - Task Document Updates Summary

**Date:** October 16, 2025  
**Status:** ✅ In Progress (2/3 tasks updated)

---

## 🎯 ACTION #6 Key Decisions

1. **Real-Time Updates:** Server-Sent Events (SSE)
2. **Language Preference:** Organization-level (not patient-level)
3. **Manual Reminders:** Hybrid approach (Auto + Manual)

---

## ✅ Completed Updates

### 1. TASK-040: Message Processing Pipeline

**File:** `docs/TASK-040_Breakdown.md`

**Changes Made:**
- **Section 2.2:** Added "Organization-Level Language Preference (ACTION #6 Decision)"
  - Use `NotificationSettings.language` field as default
  - Query organization language from database
  - Cache in Redis (30 min TTL)
  - Fall back to user detection if org preference not set
  
- **Section 2.5:** Updated "Language Detection Strategy"
  - Added note: "Prioritize organization-level language setting first"

**Impact:**
- Language detection now checks organization default before analyzing individual messages
- Simplifies implementation (single query per org vs per patient)
- Aligns with business reality (most clinics serve single-language patient base)

---

### 2. TASK-041: Appointment Booking

**File:** `docs/TASK-041_Breakdown.md`

**Changes Made:**
- **NEW Section 9:** "Real-Time Dashboard Updates (SSE) - ACTION #6 Decision"
  - Sub-task 9.1: EventEmitter Infrastructure
    - Create `appointmentEmitter` singleton
    - Define event types: `appointment:new`, `appointment:updated`
    - Organization-scoped events: `appointment:new:{orgId}`
    
  - Sub-task 9.2: SSE Endpoint Implementation
    - Endpoint: `GET /api/organizations/:orgId/appointments/stream`
    - SSE headers setup
    - Authentication and organization access validation
    - Event handlers with automatic cleanup
    
  - Sub-task 9.3: Booking Flow Integration
    - Emit events after Google Sheets write
    - Emit update events after confirmation sent
    - Real-time dashboard updates (<1 second latency)

**Code Examples Added:**
- Complete TypeScript SSE endpoint implementation
- EventEmitter setup and configuration
- Frontend `useRealtimeAppointments` hook example
- Event emission in booking service

**Architecture Rationale:**
- SSE chosen over Polling (real-time, lower load)
- SSE chosen over WebSocket (simpler, sufficient for one-way notifications)
- Organization scoping for security and performance

---

## 🔄 Pending Updates

### 3. TASK-042: Automated Reminders → **NEEDS MANUAL REMINDER SECTION**

**File:** `docs/TASK-042_Breakdown.md`

**Required Changes:**
- **NEW Section 5:** "Manual Reminder Sending (ACTION #6 Decision)"
  
  **Sub-tasks to Add:**
  - **5.1** Manual Reminder API Endpoint
    - `POST /api/reminders/send-manual`
    - Request body: `{ appointmentIds: string[], reminderType, customMessage }`
    - Response: `{ sent, failed, totalCost, failedAppointments, budgetWarning }`
    - Max 100 appointments per request
    
  - **5.2** Bulk Reminder Sending Logic
    - Iterate through selected appointments
    - Call `WhatsAppMessageProcessor.sendMessage()` with `trigger='manual'`
    - Track success/failure per appointment
    - Calculate total cost
    - Check budget before sending (warn but allow)
    
  - **5.3** ReminderTrigger Enum Addition
    - Add `trigger` field to AppointmentReminder model
    - Enum values: `AUTOMATIC` | `MANUAL`
    - Default: `AUTOMATIC`
    - Index on `trigger` for filtering
    
  - **5.4** Audit Trail
    - Add `sentBy` field to AppointmentReminder
    - Store user ID who sent manual reminder
    - Track for compliance and analytics
    
  - **5.5** Cost Estimation
    - Calculate estimated cost before sending: `appointmentCount * 0.50 PKR`
    - Check current month budget usage
    - Warn if over budget but still allow (ACTION #6 decision)
    - Log manual reminders separately in `MessageCostTracking.trigger = 'manual'`

**Database Schema Updates Needed:**
```prisma
enum ReminderTrigger {
  AUTOMATIC    // Scheduled by system (TASK-042 hourly job)
  MANUAL       // Sent manually by doctor (ACTION #6 decision)
}

model AppointmentReminder {
  // ... existing fields
  trigger        ReminderTrigger @default(AUTOMATIC)  // NEW
  sentBy         String?         // User ID (NEW)
  // ... rest
  
  @@index([trigger]) // NEW index
}
```

**Testing Requirements:**
- Test manual reminder endpoint with single appointment
- Test bulk send (50 appointments)
- Test max limit enforcement (100 appointments)
- Test budget check and warning
- Test `sentBy` audit trail
- Test auto reminders disabled, manual still works
- Test cost tracking separation (auto vs manual)

---

### 4. All TASK Documents → **NEEDS AppointmentReminder.trigger ENUM**

**Files Affected:**
- `docs/TASK-040_Breakdown.md`
- `docs/TASK-041_Breakdown.md`
- `docs/TASK-042_Breakdown.md`
- `docs/TASK-040A_Notification_Settings_Feature_Spec.md`

**Required Changes:**
- Add `ReminderTrigger` enum to all database schema sections
- Update AppointmentReminder model with:
  - `trigger` field (AUTOMATIC | MANUAL)
  - `sentBy` field (nullable user ID)
  - Index on `trigger`
- Update reminder creation code to specify `trigger: 'AUTOMATIC'`
- Reference ACTION #6 decision for manual reminders

---

## 📝 Quick Reference: ACTION #6 Decisions Implementation

### 1. SSE Real-Time Updates (TASK-041)

**Backend:**
```typescript
// 1. Create EventEmitter
import { EventEmitter } from 'events';
export const appointmentEmitter = new EventEmitter();

// 2. Create SSE endpoint
router.get('/organizations/:orgId/appointments/stream', authenticate, (req, res) => {
  // Setup SSE headers, listen to events, cleanup on disconnect
});

// 3. Emit events in booking flow
appointmentEmitter.emit(`appointment:new:${orgId}`, appointmentData);
```

**Frontend:**
```typescript
const eventSource = new EventSource(`/api/organizations/${orgId}/appointments/stream`);
eventSource.onmessage = (event) => {
  // Handle appointment:new and appointment:updated events
};
```

---

### 2. Organization-Level Language (TASK-040)

**Implementation:**
```typescript
// 1. Get organization language setting
const settings = await notificationSettings.get(organizationId);
const language = settings.language; // "en" | "ur"

// 2. Use in message processor
const message = translateMessage(content, language);

// 3. Fall back to detection if org preference not set
if (!settings.language) {
  language = await detectLanguageFromMessage(messageText);
}
```

**Database:**
```prisma
model NotificationSettings {
  id             String @id
  organizationId String @unique
  language       String @default("en") // ACTION #6
  // ... other settings
}
```

---

### 3. Manual Reminders (TASK-042)

**API Endpoint:**
```typescript
POST /api/reminders/send-manual
Body: {
  appointmentIds: ["uuid1", "uuid2"],
  reminderType: "REMINDER_24H",
  customMessage?: "Optional custom text"
}

Response: {
  sent: 45,
  failed: 5,
  totalCost: 25.00,
  failedAppointments: [...]
}
```

**Database Schema:**
```prisma
enum ReminderTrigger {
  AUTOMATIC
  MANUAL
}

model AppointmentReminder {
  // ... fields
  trigger  ReminderTrigger @default(AUTOMATIC)
  sentBy   String?  // User ID
  
  @@index([trigger])
}
```

**Implementation:**
```typescript
// Auto reminders (hourly job)
await prisma.appointmentReminder.create({
  data: {
    appointmentId,
    trigger: 'AUTOMATIC',
    // ... other fields
  }
});

// Manual reminders (API endpoint)
await prisma.appointmentReminder.create({
  data: {
    appointmentId,
    trigger: 'MANUAL',
    sentBy: userId,
    // ... other fields
  }
});
```

---

## 🎯 Next Steps

1. ✅ **TASK-040 Updated** (Org-level language)
2. ✅ **TASK-041 Updated** (SSE implementation)
3. 🔄 **Update TASK-042** (Add Section 5: Manual Reminders)
4. 🔄 **Update all tasks** (Add ReminderTrigger enum to schemas)
5. ✅ **Reference Documents Created:**
   - `ACTION-06_Backend_Frontend_Interface_Review_Agenda.md` (562 lines)
   - `ACTION-06_DECISIONS_SUMMARY.md` (301 lines)
   - `ACTION-07_Notification_Settings_Integration_Workshop.md` (1,411 lines)

---

## ✅ Integration Verification Checklist

Before starting Phase 3 implementation, verify:

**TASK-040 (Message Processing):**
- [ ] Language detection checks `NotificationSettings.language` first
- [ ] Falls back to Unicode/keyword detection if not set
- [ ] Caches organization language in Redis

**TASK-041 (Booking):**
- [ ] EventEmitter created and exported
- [ ] SSE endpoint implemented with org access control
- [ ] Events emitted after Google Sheets write
- [ ] Events emitted after confirmation sent
- [ ] Frontend hook example documented

**TASK-042 (Reminders):**
- [ ] Hourly job creates reminders with `trigger='AUTOMATIC'`
- [ ] Manual reminder endpoint supports bulk send
- [ ] `sentBy` field tracks who sent manual reminders
- [ ] Cost tracking separates auto vs manual
- [ ] Budget check warns but allows manual send

**All Tasks:**
- [ ] AppointmentReminder model includes `trigger` enum
- [ ] AppointmentReminder model includes `sentBy` field
- [ ] Database migrations prepared for new fields
- [ ] Integration tests updated for ACTION #6 features

---

**Document Version:** 1.0  
**Last Updated:** October 16, 2025  
**Status:** 2/4 updates complete, summary document created
