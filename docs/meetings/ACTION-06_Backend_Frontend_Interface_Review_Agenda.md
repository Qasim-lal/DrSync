# Backend-Frontend Interface Review Meeting
## ACTION #6: Phase 3 WhatsApp Integration Interface Coordination

**Meeting Type:** Technical Coordination (Priority 3)  
**Date:** TBD  
**Duration:** 1.5 hours  
**Status:** 📋 Agenda Prepared

---

## 👥 Required Attendees

| Role | Name | Responsibility |
|------|------|----------------|
| **Backend Developer 1** | TBD | TASK-040 (WhatsApp Bot), TASK-041 (Real-time Booking) |
| **Backend Developer 2** | TBD | TASK-042 (Reminders), TASK-040A (Notification Settings) |
| **Frontend Developer 1** | TBD | Provider Dashboard, Settings UI |
| **Frontend Developer 2** | TBD | Analytics Dashboard, Appointment Views |
| **Technical Lead** | TBD | Architecture Review, Decision Making |
| **UI/UX Designer** | TBD (Optional) | Interface Design Validation |

---

## 🎯 Meeting Objectives

1. **Define clear API contracts** between Backend and Frontend for Phase 3 features
2. **Review authentication/authorization** flow for WhatsApp-related endpoints
3. **Establish real-time update mechanisms** (webhooks, polling, WebSocket)
4. **Agree on error handling patterns** and user feedback strategies
5. **Validate data models** and ensure Frontend expectations match Backend implementation
6. **Coordinate testing approach** for integration scenarios

---

## 📋 Agenda

### 1. Introduction & Context (10 minutes)
**Led by:** Technical Lead

- Overview of Phase 3 scope (WhatsApp Integration)
- Review of SRS communication requirements
- Current Backend implementation status:
  - ✅ Shared Google Sheets sync service (ACTION #1)
  - ✅ Notification Settings Integration Guide (ACTION #2)
  - ✅ AppointmentReminder database table (ACTION #3)
  - ✅ Updated webhook documentation (ACTION #4)
  - ✅ Language detection strategy (ACTION #5)

---

### 2. API Contracts Review (30 minutes)
**Led by:** Backend Developer 1 & 2

#### 2.1 WhatsApp Notification Settings API (TASK-040A)
**Endpoint:** `GET /api/organizations/:orgId/notification-settings`

**Response Schema:**
```json
{
  "organizationId": "uuid",
  "bookingConfirmations": true,
  "appointmentReminders": true,
  "cancellationConfirmations": true,
  "rescheduleConfirmations": true,
  "followUpMessages": false,
  "language": "en" | "ur",
  "messageTemplate": {
    "bookingConfirmation": "Your appointment is confirmed for {date} at {time}",
    "reminder24h": "Reminder: Your appointment is tomorrow at {time}"
  },
  "costTracking": {
    "estimatedMonthlyCost": 500.00,
    "currentMonthSpend": 150.25,
    "messagesRemaining": 1500
  }
}
```

**Frontend Requirements:**
- [ ] Settings page UI mockup review
- [ ] Toggle switches for each notification type
- [ ] Cost display and warnings (budget limits)
- [ ] Message template preview
- [ ] Language selector (English/Urdu)

**Backend Commitments:**
- [ ] Endpoint implemented with proper validation
- [ ] Real-time cost calculation
- [ ] Patient-level override support
- [ ] Redis caching for frequent reads

**Discussion Points:**
- How should Frontend poll for cost updates? (Real-time vs periodic refresh)
- Should template editing be allowed? (Phase 3 vs Phase 6)
- What happens if settings update fails mid-save?

---

#### 2.2 Appointment Booking via WhatsApp (TASK-041)
**Endpoint:** `POST /api/appointments/book` (from WhatsApp webhook)

**Request Payload (Internal):**
```json
{
  "organizationId": "uuid",
  "patientPhone": "+923001234567",
  "patientName": "Ahmed Khan",
  "appointmentDate": "2025-11-05",
  "appointmentTime": "14:00",
  "appointmentType": "consultation",
  "notes": "First visit",
  "source": "whatsapp"
}
```

**Frontend Dashboard View:**
**Endpoint:** `GET /api/organizations/:orgId/appointments`

**Response Schema:**
```json
{
  "appointments": [
    {
      "id": "uuid",
      "patientName": "Ahmed Khan",
      "patientPhone": "+923001234567",
      "date": "2025-11-05T14:00:00Z",
      "status": "confirmed" | "pending" | "cancelled",
      "source": "whatsapp" | "dashboard",
      "notificationSent": true,
      "reminderScheduled": true,
      "createdAt": "2025-11-04T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 45
  }
}
```

**Frontend Requirements:**
- [ ] Appointment list with source indicator (WhatsApp icon)
- [ ] Real-time updates when booking comes via WhatsApp
- [ ] Status badges (confirmed, pending, cancelled)
- [ ] Notification status indicators
- [ ] Filter by source (WhatsApp vs Dashboard)

**Backend Commitments:**
- [ ] Real-time sync to PostgreSQL (via shared service)
- [ ] Immediate notification to Frontend (mechanism TBD)
- [ ] Google Sheets sync within 1 minute
- [ ] Conflict detection (double booking prevention)

**Discussion Points:**
- **How should Frontend be notified of new bookings?**
  - Option A: Polling every 10 seconds
  - Option B: WebSocket connection
  - Option C: Server-Sent Events (SSE)
- **What happens if Google Sheets is unavailable?**
  - Show warning banner in Frontend?
  - Allow manual retry?

---

#### 2.3 Appointment Reminders (TASK-042)
**Background Job:** Runs hourly, no direct Frontend API

**Frontend Monitoring View:**
**Endpoint:** `GET /api/organizations/:orgId/reminders/status`

**Response Schema:**
```json
{
  "upcomingReminders": [
    {
      "appointmentId": "uuid",
      "patientName": "Ahmed Khan",
      "scheduledFor": "2025-11-04T14:00:00Z",
      "reminderTime": "2025-11-03T14:00:00Z",
      "status": "scheduled" | "sent" | "failed",
      "failureReason": "invalid_phone_number"
    }
  ],
  "stats": {
    "totalScheduled": 25,
    "sentToday": 12,
    "failedToday": 2
  }
}
```

**Frontend Requirements:**
- [ ] Reminder queue dashboard
- [ ] Success/failure metrics
- [ ] Failed reminder retry UI
- [ ] Manual reminder trigger option

**Backend Commitments:**
- [ ] Hourly job execution (cron)
- [ ] 24-hour advance reminder logic
- [ ] Retry mechanism (3 attempts, exponential backoff)
- [ ] Failure logging and alerts

**Discussion Points:**
- Should Frontend allow manual reminder scheduling?
- How to display reminder status in appointment details?
- Alert Frontend when reminder failure rate >5%?

---

### 3. Authentication & Authorization (15 minutes)
**Led by:** Backend Developer 1

#### 3.1 Existing Auth Flow (From Phase 2.5)
- JWT-based authentication
- Role-Based Access Control (RBAC)
- Organization-level isolation

#### 3.2 Phase 3 Specific Requirements
**New Endpoints to Secure:**
- `GET /api/organizations/:orgId/notification-settings`
- `PUT /api/organizations/:orgId/notification-settings`
- `GET /api/organizations/:orgId/reminders/status`
- `POST /api/reminders/:id/retry`

**Required Permissions:**
- `notification_settings:read`
- `notification_settings:write`
- `reminders:read`
- `reminders:manage`

**Frontend Needs:**
- [ ] Token refresh mechanism (if JWT expires during session)
- [ ] Permission-based UI rendering (hide unavailable actions)
- [ ] Proper 401/403 error handling

**Backend Commitments:**
- [ ] Middleware validation on all endpoints
- [ ] Organization-scoped data queries
- [ ] Audit log for setting changes

**Discussion Points:**
- Should Frontend cache user permissions?
- How to handle token expiration during long sessions?
- Multi-tenant isolation verification approach

---

### 4. Real-Time Updates Strategy (15 minutes)
**Led by:** Technical Lead

#### 4.1 Problem Statement
WhatsApp bookings happen independently of Frontend. Dashboard needs to show new appointments without manual refresh.

#### 4.2 Proposed Solutions

**Option A: Polling (Simple, High Latency)**
```typescript
// Frontend pseudo-code
useEffect(() => {
  const interval = setInterval(() => {
    fetchAppointments();
  }, 10000); // Poll every 10 seconds
  
  return () => clearInterval(interval);
}, []);
```
**Pros:** Easy to implement, no infrastructure changes  
**Cons:** 5-10 second delay, increased API load

**Option B: Server-Sent Events (Recommended)**
```typescript
// Backend pseudo-code
app.get('/api/organizations/:orgId/appointments/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  
  // Send new appointment events
  appointmentEmitter.on('new', (appointment) => {
    res.write(`data: ${JSON.stringify(appointment)}\n\n`);
  });
});
```
**Pros:** Real-time, HTTP-based (firewall-friendly), auto-reconnect  
**Cons:** Requires event emitter infrastructure

**Option C: WebSocket (Full Duplex)**
```typescript
// Backend pseudo-code
io.on('connection', (socket) => {
  socket.join(`org:${orgId}`);
  
  appointmentEmitter.on('new', (appointment) => {
    io.to(`org:${orgId}`).emit('appointment:new', appointment);
  });
});
```
**Pros:** True real-time, bidirectional  
**Cons:** More complex, requires Socket.IO setup

#### 4.3 Decision Required
- [ ] Choose real-time update mechanism
- [ ] Define fallback strategy (if connection drops)
- [ ] Establish reconnection logic
- [ ] Set update event schema

**Discussion Points:**
- Does existing infrastructure support WebSocket/SSE?
- What's the expected scale (concurrent users per org)?
- Should we batch updates if many bookings occur simultaneously?

---

### 5. Error Handling & User Feedback (10 minutes)
**Led by:** Frontend Developer 1

#### 5.1 Error Categories

**1. Network Errors (Transient)**
- Frontend retry logic (3 attempts, exponential backoff)
- Show "Connection lost, retrying..." toast
- Cache last known state

**2. Validation Errors (User Fixable)**
- Backend returns `400 Bad Request` with detailed errors
```json
{
  "error": "validation_error",
  "details": [
    {
      "field": "appointmentDate",
      "message": "Date must be in the future"
    }
  ]
}
```
- Frontend displays inline field errors

**3. Authorization Errors (Redirect to Login)**
- Backend returns `401 Unauthorized`
- Frontend clears token, redirects to login

**4. Business Logic Errors (Show Alert)**
- Example: "Time slot already booked"
- Backend returns `409 Conflict`
- Frontend shows modal with explanation

#### 5.2 Success Feedback
- Toast notifications for mutations
- Optimistic UI updates (update UI before API confirms)
- Loading spinners for async operations

**Frontend Expectations:**
- [ ] Consistent error response format
- [ ] HTTP status codes follow standards
- [ ] User-friendly error messages (no stack traces)

**Backend Commitments:**
- [ ] Structured error responses
- [ ] Proper status codes (400, 401, 403, 409, 500)
- [ ] Error logging (do not expose to Frontend)

**Discussion Points:**
- Should Frontend implement optimistic updates for bookings?
- How to handle partial failures (e.g., booking saved but reminder failed)?

---

### 6. Data Models Validation (10 minutes)
**Led by:** Backend Developer 2

#### 6.1 AppointmentReminder Model
```prisma
model AppointmentReminder {
  id             String   @id @default(uuid())
  organizationId String
  appointmentId  String
  reminderType   ReminderType // CONFIRMATION, REMINDER_24H, etc.
  scheduledFor   DateTime
  sentAt         DateTime?
  status         ReminderStatus // SCHEDULED, SENT, FAILED
  messageId      String?
  skipReason     String? // "notifications_disabled"
  
  organization   Organization @relation(...)
  appointment    Appointment @relation(...)
}
```

**Frontend Needs:**
- [ ] Confirm all fields match Frontend expectations
- [ ] Discuss enum values (ReminderType, ReminderStatus)
- [ ] Clarify null vs empty string handling

#### 6.2 Notification Settings Model
```prisma
model NotificationSettings {
  id                          String   @id @default(uuid())
  organizationId              String   @unique
  bookingConfirmations        Boolean  @default(true)
  appointmentReminders        Boolean  @default(true)
  cancellationConfirmations   Boolean  @default(true)
  rescheduleConfirmations     Boolean  @default(true)
  followUpMessages            Boolean  @default(false)
  language                    String   @default("en") // "en" | "ur"
  
  organization                Organization @relation(...)
}
```

**Discussion Points:**
- Should `language` be stored at patient level instead of org level?
- How to handle per-appointment custom settings?

---

### 7. Testing & Integration Plan (10 minutes)
**Led by:** QA Engineer (if present) or Technical Lead

#### 7.1 Shared Testing Strategy
**Backend API Tests (Existing):**
- Unit tests for each endpoint
- Integration tests with test database
- Coverage target: >80%

**Frontend Component Tests:**
- React Testing Library for UI components
- Mock API responses (MSW - Mock Service Worker)
- E2E tests with Playwright

**Shared Integration Tests:**
- Test Backend + Frontend together in staging
- Use real WhatsApp test numbers
- Validate end-to-end flows

#### 7.2 Test Scenarios to Coordinate
1. **Scenario: New booking via WhatsApp shows in Dashboard**
   - Backend sends booking webhook
   - Frontend receives real-time update
   - UI updates without refresh

2. **Scenario: Disable notifications, verify no reminders sent**
   - Frontend toggles notification settings
   - Backend saves settings
   - Backend skips reminder job for that org

3. **Scenario: Google Sheets sync failure**
   - Backend detects Google API down
   - Frontend displays warning banner
   - Manual retry button works

**Discussion Points:**
- Who creates test data? (Shared seed scripts?)
- How to test real-time updates in CI/CD?
- Staging environment setup timeline

---

### 8. Timeline & Dependencies (5 minutes)
**Led by:** Technical Lead

#### 8.1 Implementation Timeline
| Task | Owner | Start | End | Status |
|------|-------|-------|-----|--------|
| TASK-040A (Notification Settings) | Backend Dev 2 | Week 1 | Week 1 | Pending |
| TASK-040 (WhatsApp Bot) | Backend Dev 1 | Week 1 | Week 2 | Pending |
| TASK-041 (Real-time Booking) | Backend Dev 1 | Week 2 | Week 2 | Pending |
| TASK-042 (Reminders) | Backend Dev 2 | Week 2 | Week 3 | Pending |
| Frontend Settings UI | Frontend Dev 1 | Week 1 | Week 2 | Pending |
| Frontend Dashboard Updates | Frontend Dev 2 | Week 2 | Week 3 | Pending |

#### 8.2 Critical Blockers
- [ ] Real-time update mechanism decision (affects both teams)
- [ ] Authentication/authorization review (security risk)
- [ ] Google Sheets service validation (data integrity)

#### 8.3 Parallel Work Streams
**Can Start Immediately:**
- Backend: TASK-040A (Notification Settings API)
- Frontend: Settings UI mockups

**Requires Real-time Decision:**
- Backend: Event emitter infrastructure
- Frontend: SSE/WebSocket client setup

---

### 9. Action Items & Decisions (5 minutes)
**Led by:** Technical Lead

#### Decisions Required
- [ ] **Real-time update mechanism:** Polling / SSE / WebSocket
- [ ] **Language preference storage:** Organization-level / Patient-level
- [ ] **Manual reminder trigger:** Allow in Phase 3 or defer to Phase 6
- [ ] **Optimistic UI updates:** Enable for bookings or wait for confirmation

#### Action Items
| Action | Owner | Due Date | Status |
|--------|-------|----------|--------|
| Implement chosen real-time mechanism | Backend Dev 1 | Week 1 | ⬜ |
| Create Frontend API mock service (MSW) | Frontend Dev 1 | Week 1 | ⬜ |
| Setup shared staging environment | DevOps | Week 1 | ⬜ |
| Document API contract in OpenAPI spec | Backend Dev 2 | Week 1 | ⬜ |
| Create integration test plan | QA Engineer | Week 1 | ⬜ |

---

## 📎 Supporting Documents

1. [Notification Settings Integration Guide](../NOTIFICATION_SETTINGS_INTEGRATION_GUIDE.md)
2. [TASK-040A Specification (Planning Only)](../TASK-040A_NOTIFICATION_SETTINGS_SPECIFICATION.md)
3. [Phase 3 Pre-Implementation Checklist](../PHASE-3_PRE_IMPLEMENTATION_CHECKLIST.md)
4. [TASK-040 WhatsApp Bot Breakdown](../TASK-040_Breakdown.md)
5. [DrSync API Documentation](../DrSync_API_Documentation.md)
6. [Prisma Schema](../../backend/prisma/schema.prisma)

---

## 📝 Meeting Notes - October 16, 2025

**Attendees:**
- ✅ Project Lead (Qasim)
- ✅ Development (AI Agent)

**Key Decisions:**
1. ✅ **Real-time updates:** **Server-Sent Events (SSE)** chosen
   - Rationale: Real-time updates for WhatsApp bookings without polling overhead
   - Implementation: `/api/organizations/:orgId/appointments/stream` endpoint
   - Benefits: HTTP-based, firewall-friendly, auto-reconnect

2. ✅ **Language preference:** **Organization level** storage
   - Rationale: Simpler for Phase 3, consistent experience per clinic
   - Implementation: `language` field in NotificationSettings model
   - Future: Can add patient-level override in Phase 6 if needed

3. ✅ **Manual reminder triggers:** **Yes - Include in Phase 3**
   - Rationale: Cost-conscious doctors can disable auto-reminders but send manually when needed
   - Implementation: "Send Reminder" button in dashboard (single + bulk select)
   - Use case: Doctor disables expensive auto-reminders, manually sends only to VIP patients
   - Endpoint: `POST /api/reminders/send-manual` with appointmentId array

4. ✅ **Reminder strategy:** **Hybrid (Auto + Manual)**
   - Auto reminders: Controlled by notification settings (can be disabled to save costs)
   - Manual reminders: Always available regardless of auto-reminder settings
   - Cost tracking: Both types logged separately in message_cost_tracking

**Action Items:**
1. ✅ Implement SSE endpoint for real-time appointment updates - Phase 3 TASK-041
2. ✅ Add `language` field to NotificationSettings (organization-level) - Phase 3 TASK-040A
3. ✅ Create manual reminder API endpoint with bulk support - Phase 3 TASK-042
4. ✅ Add "Send Reminder" UI to dashboard appointment list - Phase 3 Frontend
5. ✅ Track manual vs auto reminders separately in cost analytics - Phase 3 TASK-040A

**Implementation Notes:**
- SSE reconnection logic: Frontend auto-reconnects on disconnect
- Manual reminders: Check notification budget before sending (warn if over budget)
- Bulk reminders: Max 100 appointments per request to prevent abuse
- Cost display: Show "Auto: PKR 500, Manual: PKR 200" breakdown

**Next Meeting:** Post-implementation review after TASK-042 completion

---

## ✅ Meeting Success Criteria

- [ ] All API contracts reviewed and agreed upon
- [ ] Real-time update mechanism decided
- [ ] Authentication flow clarified
- [ ] Error handling patterns established
- [ ] Data models validated
- [ ] Testing strategy coordinated
- [ ] Timeline and dependencies confirmed
- [ ] All action items assigned with due dates
- [ ] Frontend team can start work immediately after meeting
- [ ] Backend team has clear integration requirements

---

**Document Version:** 1.0  
**Last Updated:** October 16, 2025  
**Status:** 📋 Ready for Scheduling
