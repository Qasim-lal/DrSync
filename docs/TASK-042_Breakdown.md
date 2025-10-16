# TASK-042: Automated Reminders - Task Breakdown

**Parent:** Phase 3: WhatsApp Integration  
**Status:** 🔄 Not Started  
**Priority:** 🔴 HIGH - Core SRS functionality  
**Assignee:** Backend Developer 2  
**Estimate:** 2 days  
**Dependencies:** TASK-041 (Appointment Booking)

---

## 📋 Overview

Implement automated reminder system that reads appointment data from Google Sheets as the primary data source. This system sends timely reminders and follow-ups to patients via WhatsApp, respecting notification settings configured in TASK-040A.

**Source:** DrSync_Task_Tracking.md Lines 1101-1111  
**Architecture Note:** **READ FROM GOOGLE SHEETS** - PostgreSQL reads appointments from Google Sheets for reminders (data source change)

---

## 🎯 SRS Requirements Coverage

### Primary Focus
- **REQ-COMM-001**: System SHALL send appointment reminders 24 hours before scheduled time
- **REQ-COMM-003**: System SHALL deliver customizable follow-up messages post-appointment
- **REQ-COMM-004**: System SHALL support medication reminders based on treatment
- **REQ-COMM-005**: System SHALL send wellness check-ins based on patient history
- **REQ-COMM-006**: System SHALL handle message scheduling and queuing
- **REQ-COMM-007**: System SHALL support message templates with personalization
- **REQ-NOTIF-004**: System SHALL support configurable timing for notifications (e.g., 24 hours, 2 hours before)
- **REQ-NOTIF-011**: System SHALL respect notification settings when sending automated messages
- **REQ-NOTIF-012**: System SHALL support 12+ notification types
- **REQ-DATA-002**: System SHALL read and update appointment data in real-time
- **US-P002**: As a patient, I want to receive appointment reminders so that I don't miss my scheduled visits
- **US-P005**: As a patient, I want to receive follow-up care instructions so that I can properly manage my health

### Integration Requirements
- **REQ-NOTIF-003**: Calculate cost impact of reminders (TASK-040A integration)
- **REQ-NOTIF-008**: Smart message bundling to reduce costs (TASK-040A)
- **REQ-NOTIF-009**: Track messages sent vs. saved (TASK-040A)

---

## 📊 Task Breakdown

### MAIN TASK: TASK-042 - Automated Reminders from Google Sheets

#### 1. Google Sheets Data Reader Service
**Objective:** Read appointment data from Google Sheets for reminder processing (PRIMARY DATA SOURCE)

**Sub-tasks:**

- **1.1** Appointment Data Sync Service
  - Read appointments from Google Sheets hourly
  - Sync to PostgreSQL cache for efficient querying
  - Handle sync failures with fallback to direct reads
  - Track sync status and health
  
- **1.2** Upcoming Appointments Query
  - Query appointments scheduled for next 24-48 hours
  - Filter by status (confirmed, pending)
  - Group by organization and time window
  - Cache results for performance
  
- **1.3** Patient Contact Information Retrieval
  - Read patient data from Google Sheets
  - Extract phone numbers and preferred language
  - Handle family accounts (multiple patients per phone)
  - Validate contact information completeness

**Sub-subtasks (1.1):**
- Create `GoogleSheetsReminderSyncService` class
- Implement `syncAppointmentsFromSheets(orgId)` method
- Schedule hourly sync jobs using Bull Queue cron
- Read all appointments from Google Sheets appointments tab
- Upsert into PostgreSQL cache with `lastSyncedAt` timestamp
- Handle sync errors: log, alert, retry after 15 minutes
- Fallback: if sync fails, read directly from Google Sheets

**Sub-subtasks (1.2):**
- Implement `getUpcomingAppointments(orgId, timeWindow)` method
- Query PostgreSQL cache (if fresh) or Google Sheets (if stale)
- Filter appointments: status IN ('confirmed', 'booked')
- Time window: 24 hours for reminders, 48 hours for advance planning
- Return array of {appointmentId, patientId, doctorName, date, time}
- Cache results in Redis (5 min TTL)

**Sub-subtasks (1.3):**
- Implement `getPatientContactInfo(orgId, patientId)` method
- Read from Google Sheets patients worksheet
- Extract: name, phone, preferredLanguage, notificationEnabled
- Check if patient has opted out of reminders
- Handle missing phone numbers gracefully

**Deliverables:**
- ✅ Google Sheets sync service
- ✅ Upcoming appointments query
- ✅ Patient contact retrieval
- ✅ Sync fallback mechanism

**Testing:**
- Test hourly sync from Google Sheets
- Test sync failure and fallback
- Test upcoming appointments query (24h/48h)
- Test patient contact retrieval
- Test cache invalidation
- Test multi-organization isolation

---

#### 2. Reminder Scheduler System
**Objective:** Schedule and trigger reminders at appropriate times (REQ-COMM-001, REQ-NOTIF-004)

**Sub-tasks:**

- **2.1** Time-based Reminder Scheduler
  - Schedule reminders 24 hours before appointment
  - Support configurable timing (2 hours, 6 hours, 12 hours, 24 hours)
  - Handle timezone considerations
  - Prevent duplicate reminders
  
- **2.2** Reminder Job Queue
  - Create Bull Queue for reminder jobs
  - Schedule jobs based on appointment time
  - Handle job delays and retries
  - Track job execution status
  
- **2.3** Reminder Trigger Logic
  - Trigger reminder at scheduled time
  - Check notification settings (TASK-040A integration)
  - Skip if notification disabled for reminder type
  - Log skipped reminders for cost tracking

**Sub-subtasks (2.1):**
- Create `ReminderScheduler` class
- Implement `scheduleReminder(appointment, timing)` method
- Calculate reminder send time: appointmentTime - reminderTiming
- Support multiple timing options: 24h (default), 2h, 12h
- Check if reminder already scheduled (prevent duplicates)
- Store scheduled reminders in database
- Handle timezone: use organization's timezone

**Sub-subtasks (2.2):**
- Create Bull Queue: `appointmentReminders`
- Job payload: {organizationId, appointmentId, reminderType, scheduledFor}
- Schedule job with delay: `queue.add(payload, {delay: msUntilReminder})`
- Configure retry: 3 attempts with 5-min backoff
- Track job status: scheduled, sent, failed, skipped
- Clean up old jobs (>7 days)

**Sub-subtasks (2.3):**
- Implement `triggerReminder(appointmentId, reminderType)` job processor
- Fetch latest appointment data from Google Sheets/cache
- Check appointment status (skip if cancelled/completed)
- Fetch notification settings from TASK-040A service
- Check if reminder type is enabled for organization
- If disabled: log "Reminder skipped for cost savings", mark as skipped
- If enabled: proceed to message generation (Section 3)

**Deliverables:**
- ✅ Reminder scheduler
- ✅ Bull Queue for reminders
- ✅ Trigger logic with notification settings check
- ✅ Duplicate prevention

**Testing:**
- Test reminder scheduling (24h before)
- Test configurable timing (2h, 12h, 24h)
- Test job queue execution
- Test duplicate prevention
- Test notification settings integration
- Test skipped reminder logging
- Test timezone handling

---

#### 3. Message Template System
**Objective:** Generate personalized reminder messages (REQ-COMM-007, REQ-NOTIF-014)

**Sub-tasks:**

- **3.1** Bilingual Message Templates
  - Create reminder templates (English/Urdu)
  - Create follow-up templates (English/Urdu)
  - Create medication reminder templates
  - Support template customization per organization
  
- **3.2** Template Variable Substitution
  - Replace {{patientName}} with actual patient name
  - Replace {{doctorName}} with doctor name
  - Replace {{appointmentDate}} with formatted date
  - Replace {{appointmentTime}} with formatted time
  - Replace {{clinicName}} with organization name
  - Replace {{clinicAddress}} with clinic location
  
- **3.3** Template Personalization
  - Use patient's preferred language
  - Include patient history context (if available)
  - Add doctor-specific instructions
  - Include appointment-specific details

**Sub-subtasks (3.1):**
- Create `ReminderTemplates` class with template library
- Define template structure: {id, type, language, content, variables}
- Templates by type:
  - `reminder_24h`: "Reminder: Your appointment with {{doctorName}} is tomorrow at {{time}}"
  - `reminder_2h`: "Your appointment with {{doctorName}} is in 2 hours at {{time}}"
  - `followup_same_day`: "Thank you for visiting {{clinicName}}. How are you feeling?"
  - `followup_3day`: "Follow-up: Has your condition improved since your visit?"
  - `medication_reminder`: "Reminder: Please take your prescribed medication"
  - `wellness_checkin`: "We hope you're doing well. Need to schedule a check-up?"
- Store templates in database for customization
- Load organization-specific templates if configured

**Sub-subtasks (3.2):**
- Implement `renderTemplate(templateId, language, variables)` method
- Parse template string for {{variable}} placeholders
- Replace each variable with actual value
- Handle missing variables: use default or empty string
- Format dates appropriately for language (English vs Urdu)
- Format times with AM/PM or 24-hour format
- Add emojis for visual appeal: 📅 🕐 🏥 💊

**Sub-subtasks (3.3):**
- Fetch patient's preferred language from Google Sheets
- Select appropriate template based on language
- Include context from appointment notes (if any)
- Add doctor's special instructions (if configured)
- Include clinic contact info: phone, address, WhatsApp link
- Generate cancellation/rescheduling instructions

**Deliverables:**
- ✅ Bilingual template library (6+ templates)
- ✅ Variable substitution engine
- ✅ Personalization logic
- ✅ Organization-specific customization

**Testing:**
- Test template rendering (English/Urdu)
- Test variable substitution (all variables)
- Test missing variable handling
- Test date/time formatting
- Test organization-specific templates
- Test emoji rendering

---

#### 4. Reminder Sending Service
**Objective:** Send reminders via WhatsApp with notification settings compliance (REQ-NOTIF-011)

**Sub-tasks:**

- **4.1** WhatsApp Message Sender
  - Send reminder via WhatsApp Business API
  - Handle rate limiting (80 messages/second)
  - Track delivery status
  - Log all sent reminders
  
- **4.2** Notification Settings Integration
  - Check if reminder type enabled (TASK-040A)
  - Respect patient-level overrides
  - Skip sending if disabled
  - Track cost savings from skipped messages
  
- **4.3** Message Delivery Tracking
  - Track sent status
  - Track delivered status
  - Track read status
  - Update appointment record with reminder status
  
- **4.4** Failure Handling and Retry
  - Retry failed sends (max 3 attempts)
  - Handle phone number errors
  - Handle API errors
  - Log failures for admin review

**Sub-subtasks (4.1):**
- Implement `sendReminder(appointmentId, message, phone)` method
- Use WhatsApp Business API sendMessage endpoint
- Include organization's WhatsApp business number as sender
- Set message type: text (or template if approved)
- Apply rate limiting: max 80 messages/second per org
- Use Bull Queue rate limiter
- Log message ID, timestamp, status
- Return success/failure result

**Sub-subtasks (4.2):**
- Call `NotificationSettingsService.isReminderEnabled(orgId, reminderType)`
- Check patient-level overrides: `hasPatientOptedOut(patientId)`
- If disabled at org level: skip, log "Reminder disabled by org settings"
- If disabled by patient: skip, log "Patient opted out of reminders"
- Track cost savings: calculate WhatsApp message cost saved
- Update message_cost_tracking table (TASK-040A)

**Sub-subtasks (4.3):**
- Store sent reminder in `appointment_reminders` table
- Fields: id, appointmentId, reminderType, sentAt, status, messageId
- Listen for WhatsApp delivery webhooks
- Update status: sent → delivered → read
- Update appointment.lastReminderSentAt field
- Prevent duplicate reminders: check lastReminderSentAt

**Sub-subtasks (4.4):**
- Wrap send in try-catch
- On transient error: retry up to 3 times with exponential backoff
- On permanent error (invalid phone): mark as failed, don't retry
- On API error (rate limit): queue for later retry
- Log all failures with error details
- Create admin alert for >10% failure rate

**Deliverables:**
- ✅ WhatsApp sender service
- ✅ Notification settings compliance
- ✅ Delivery tracking system
- ✅ Failure handling with retry

**Testing:**
- Test reminder sending success
- Test notification settings respected (100% compliance)
- Test patient opt-out respected
- Test delivery status tracking
- Test failure retry logic
- Test rate limiting
- Test duplicate prevention
- Test cost tracking for skipped messages

---

#### 5. Post-Appointment Follow-ups
**Objective:** Send follow-up messages after appointments (REQ-COMM-003)

**Sub-tasks:**

- **5.1** Follow-up Scheduler
  - Schedule follow-up messages after appointment
  - Support multiple timing options (same day, 3 days, 7 days)
  - Handle completed appointments only
  - Skip cancelled appointments
  
- **5.2** Follow-up Message Types
  - Same-day follow-up (Thank you + satisfaction check)
  - 3-day follow-up (Recovery progress check)
  - 7-day follow-up (Long-term recovery check)
  - Medication adherence reminder
  
- **5.3** Follow-up Response Handling
  - Capture patient responses to follow-ups
  - Flag concerning responses for doctor review
  - Log positive feedback
  - Track follow-up engagement rates

**Sub-subtasks (5.1):**
- Implement `scheduleFollowup(appointmentId, timing)` method
- Trigger when appointment status changes to "completed"
- Schedule follow-up jobs:
  - Same-day: 4 hours after appointment
  - 3-day: 72 hours after appointment
  - 7-day: 7 days after appointment
- Check notification settings for follow-up type
- Skip if follow-ups disabled (cost savings)

**Sub-subtasks (5.2):**
- Create follow-up templates:
  - Same-day (English): "Hi {{patientName}}, thank you for visiting. How are you feeling?"
  - Same-day (Urdu): "سلام {{patientName}}، آپ کی آمد کا شکریہ۔ آپ کیسا محسوس کر رہے ہیں؟"
  - 3-day: "It's been 3 days since your visit. How is your recovery progressing?"
  - 7-day: "How are you feeling now? Need a follow-up appointment?"
  - Medication: "Have you been taking your prescribed medication regularly?"
- Include doctor's custom follow-up instructions (if configured)
- Add satisfaction rating request: "Rate your experience 1-5"

**Sub-subtasks (5.3):**
- Listen for patient replies to follow-up messages
- Parse response for keywords: "pain", "worse", "emergency", "good", "better"
- Flag concerning responses: notify doctor via dashboard alert
- Log positive feedback for patient satisfaction tracking
- Track engagement: response rate, satisfaction scores
- Store responses in appointment notes

**Deliverables:**
- ✅ Follow-up scheduler
- ✅ Multiple follow-up types (4 types)
- ✅ Response capture and flagging
- ✅ Engagement tracking

**Testing:**
- Test follow-up scheduling (same-day, 3-day, 7-day)
- Test follow-up message content
- Test notification settings compliance
- Test response capture
- Test concerning response flagging
- Test engagement rate tracking
- Test skipped follow-ups (cost savings)

---

#### 6. Medication and Wellness Reminders
**Objective:** Send medication and wellness reminders (REQ-COMM-004, REQ-COMM-005)

**Sub-tasks:**

- **6.1** Medication Reminder Setup
  - Allow doctors to configure medication reminders
  - Support multiple medications per patient
  - Set reminder frequency (daily, twice daily, etc.)
  - Set reminder duration (7 days, 14 days, 30 days)
  
- **6.2** Medication Reminder Scheduling
  - Schedule recurring medication reminders
  - Send at configured times (e.g., 9 AM, 9 PM)
  - Track adherence via patient responses
  - Stop reminders when course completed
  
- **6.3** Wellness Check-in System
  - Schedule periodic wellness check-ins
  - Target patients with chronic conditions
  - Encourage preventive care appointments
  - Track patient engagement

**Sub-subtasks (6.1):**
- Add medication reminder config to appointment notes
- Format: "Medication: Amoxicillin, Frequency: 3x/day, Duration: 7 days"
- Parse medication details from Google Sheets
- Store in structured format: {name, frequency, times[], startDate, endDate}
- Allow doctor to set reminder times: ["09:00 AM", "03:00 PM", "09:00 PM"]

**Sub-subtasks (6.2):**
- Implement `scheduleMedicationReminders(patientId, medicationConfig)` method
- Create recurring Bull Queue jobs for each time
- Job payload: {patientId, medicationName, time, endDate}
- Send reminder: "💊 Medication Reminder: Time to take your {{medicationName}}"
- Track responses: "Taken" / "Missed" / "No response"
- Stop reminders after endDate
- Alert doctor if >3 missed doses

**Sub-subtasks (6.3):**
- Identify patients with chronic conditions (from appointment history)
- Schedule wellness check-ins every 30-90 days
- Message: "We care about your health. Schedule a wellness check-up?"
- Include booking link or menu option
- Track check-in response rate
- Report to doctors: patient engagement metrics

**Deliverables:**
- ✅ Medication reminder configuration
- ✅ Recurring medication reminders
- ✅ Adherence tracking
- ✅ Wellness check-in system

**Testing:**
- Test medication reminder setup
- Test recurring reminder scheduling
- Test reminder times (morning, evening)
- Test adherence tracking
- Test reminder completion (stop after duration)
- Test wellness check-in scheduling
- Test chronic patient identification

---

#### 7. Reminder Analytics and Reporting
**Objective:** Track reminder effectiveness and cost impact

**Sub-tasks:**

- **7.1** Reminder Metrics Collection
  - Track total reminders sent
  - Track reminders skipped (cost savings)
  - Track delivery and read rates
  - Track patient response rates
  
- **7.2** Cost Impact Analysis
  - Calculate WhatsApp costs for reminders
  - Calculate savings from disabled reminders
  - Report cost per organization
  - Show ROI of reminder system
  
- **7.3** Effectiveness Metrics
  - Track appointment show-up rates
  - Compare show-up with/without reminders
  - Track patient satisfaction scores
  - Generate monthly reports

**Sub-subtasks (7.1):**
- Create `reminder_analytics` table
- Track daily metrics by organization:
  - totalScheduled, totalSent, totalSkipped, totalFailed
  - deliveryRate, readRate, responseRate
  - Show-up rate (appointments attended)
- Aggregate metrics hourly via cron job
- Expose metrics via API for dashboard

**Sub-subtasks (7.2):**
- Calculate message cost: PKR 0.50 per message (Pakistan rate)
- Calculate cost spent: sentCount × PKR 0.50
- Calculate cost saved: skippedCount × PKR 0.50
- Show savings percentage: (saved / (sent + saved)) × 100
- Generate cost report per organization
- Include in monthly billing report

**Sub-subtasks (7.3):**
- Track appointment attendance: completed vs no-show
- Compare show-up rates:
  - With reminder sent: attendance percentage
  - Without reminder: attendance percentage
  - Calculate reminder effectiveness: difference in %
- Track satisfaction from follow-up responses
- Generate monthly effectiveness report
- Email report to organization admins

**Deliverables:**
- ✅ Reminder metrics collection
- ✅ Cost impact analysis
- ✅ Effectiveness reporting
- ✅ Monthly analytics reports

**Testing:**
- Test metrics collection accuracy
- Test cost calculations
- Test effectiveness tracking
- Test show-up rate comparison
- Test monthly report generation

---

#### 8. Error Handling and Monitoring
**Objective:** Ensure reliable reminder delivery with comprehensive error handling

**Sub-tasks:**

- **8.1** Sync Error Handling
  - Handle Google Sheets sync failures
  - Fallback to direct reads
  - Alert on persistent sync issues
  - Monitor sync health
  
- **8.2** Delivery Error Handling
  - Handle WhatsApp API errors
  - Retry transient failures
  - Skip permanent failures
  - Log all errors with context
  
- **8.3** Scheduler Error Handling
  - Handle timezone errors
  - Handle invalid appointment data
  - Prevent reminder loops
  - Clean up stale jobs
  
- **8.4** Monitoring and Alerts
  - Monitor reminder queue depth
  - Alert on high failure rates (>10%)
  - Alert on sync failures
  - Track system health

**Sub-subtasks (8.1):**
- Wrap Google Sheets API calls in try-catch
- On sync error: log error, retry after 15 min
- After 3 failed retries: alert admin
- Fallback: read directly from Google Sheets for reminders
- Monitor sync lag: alert if >2 hours behind

**Sub-subtasks (8.2):**
- Catch WhatsApp API errors
- Transient errors (timeout, rate limit): retry with backoff
- Permanent errors (invalid phone): log and skip
- Track failure rate per hour
- Alert if failure rate >10%

**Sub-subtasks (8.3):**
- Validate appointment data before scheduling
- Check appointment time is in future
- Check appointment not already reminded
- Prevent duplicate reminders: check lastReminderSentAt
- Clean up jobs for cancelled appointments
- Remove completed jobs >7 days old

**Sub-subtasks (8.4):**
- Monitor Bull Queue metrics: waiting, active, failed
- Alert if queue depth >1000 (backlog)
- Alert if failure rate >10%
- Alert if sync hasn't run in >2 hours
- Create health check endpoint: /api/health/reminders
- Include metrics in super admin dashboard

**Deliverables:**
- ✅ Comprehensive error handling
- ✅ Fallback mechanisms
- ✅ Monitoring system
- ✅ Admin alerting

**Testing:**
- Test sync error handling
- Test API error handling
- Test retry logic
- Test fallback to direct reads
- Test alert triggers
- Test queue cleanup
- Test health check endpoint

---

## ✅ Overall Deliverables

**Core Services:**
1. ✅ Google Sheets sync service (hourly)
2. ✅ Reminder scheduler (24h, 2h, 12h options)
3. ✅ Message template system (6+ templates, English/Urdu)
4. ✅ WhatsApp sender with notification settings compliance
5. ✅ Follow-up system (same-day, 3-day, 7-day)
6. ✅ Medication reminder system (recurring)
7. ✅ Wellness check-in system
8. ✅ Analytics and reporting

**APIs/Endpoints:**
- `POST /api/reminders/schedule` - Schedule reminder
- `GET /api/reminders/upcoming` - Get upcoming reminders
- `GET /api/reminders/analytics` - Get reminder metrics
- `POST /api/reminders/test-send` - Test reminder (admin)
- `GET /api/health/reminders` - Health check

**Background Jobs:**
- Hourly Google Sheets sync
- Scheduled reminder sending
- Follow-up scheduling
- Medication reminder scheduling
- Wellness check-in scheduling
- Metrics aggregation

**Documentation:**
- Reminder flow diagram
- Template documentation
- Integration guide (TASK-040A)
- Analytics guide

---

## 🧪 Testing Requirements

### Unit Tests (40+ tests)
- Google Sheets sync (8 tests)
- Reminder scheduling (10 tests)
- Template rendering (8 tests)
- Message sending (8 tests)
- Follow-up logic (6 tests)

### Integration Tests (15+ tests)
- End-to-end reminder flow (5 tests)
- Notification settings integration (3 tests)
- Follow-up complete flow (3 tests)
- Medication reminder flow (2 tests)
- Analytics collection (2 tests)

### Performance Tests
- Handle 1000 reminders/hour
- Sync 10,000 appointments in <5 minutes
- Queue processing throughput
- Template rendering speed

### Acceptance Tests
- ✅ 24-hour reminder sent correctly
- ✅ Notification settings respected (100%)
- ✅ Follow-up messages sent on schedule
- ✅ Cost tracking accurate
- ✅ Show-up rates improve with reminders

---

## 📈 Success Criteria

1. ✅ **Data Source:** All reminders read from Google Sheets (100%)
2. ✅ **Timeliness:** 24-hour reminders sent within 5-minute window
3. ✅ **Compliance:** Notification settings respected (100%)
4. ✅ **Delivery Rate:** >95% successful delivery
5. ✅ **Cost Tracking:** Accurate cost and savings reporting
6. ✅ **Effectiveness:** Show-up rates improve by >15%
7. ✅ **Engagement:** >30% response rate on follow-ups
8. ✅ **Reliability:** <2% system failure rate
9. ✅ **Performance:** Process 1000 reminders/hour
10. ✅ **Multi-tenant:** Complete organization isolation

---

## 🔗 Related Tasks

**Prerequisites (Must Complete First):**
- ✅ TASK-041: Appointment booking (writes to Google Sheets)
- ✅ TASK-040: Message processing pipeline
- ✅ TASK-039: WhatsApp Business API
- ✅ TASK-023: Google Sheets integration foundation

**Parallel Tasks (Integrate With):**
- 🔄 TASK-040A: Notification settings (check before sending)
- 🔄 TASK-044: Google Sheets sync service (shares sync logic)

**Dependent Tasks (Build Upon This):**
- ⏳ TASK-043: Google Sheets primary database (template setup)
- ⏳ Dashboard analytics (displays reminder metrics)

**Related Documents:**
- `DrSync_SRS.md` - Requirements (Section 3.6)
- `DrSync_TDD.md` - Architecture (Section 7.2)
- `DrSync_Task_Tracking.md` - Project plan (Lines 1101-1111)
- `TASK-041_Breakdown.md` - Appointment booking
- `NOTIFICATION_SETTINGS_FEATURE_SPEC.md` (TASK-040A)

---

## 📝 Implementation Notes

**Technology Stack:**
- Node.js 18+ with TypeScript
- Bull Queue for scheduling (cron jobs)
- Google Sheets API v4 (read appointments)
- PostgreSQL 15+ (cache for performance)
- Redis 7.0+ (job queue, caching)
- WhatsApp Business API (message sending)

**Key Design Decisions:**
1. **Google Sheets Primary:** All appointment data read from Sheets (architectural requirement)
2. **PostgreSQL Cache:** Hourly sync for query performance
3. **Fallback Strategy:** Direct Sheets read if sync fails
4. **Notification Settings:** 100% compliance with TASK-040A
5. **Smart Scheduling:** Use Bull Queue delayed jobs
6. **Cost Tracking:** Track sent vs skipped messages

**Data Flow:**
```
Google Sheets (Appointments) ← Source of Truth
    ↓ (Hourly Sync)
PostgreSQL Cache ← Query Performance
    ↓
Reminder Scheduler (Bull Queue)
    ↓
Check Notification Settings (TASK-040A)
    ↓ (If Enabled)
Template Engine → Generate Message
    ↓
WhatsApp Business API → Send Reminder
    ↓
Track Delivery & Analytics
```

**Scheduling Strategy:**
- **Sync:** Hourly via cron job (0 * * * *)
- **24h Reminders:** Scheduled 24 hours before appointment
- **2h Reminders:** Scheduled 2 hours before (if enabled)
- **Follow-ups:** Same-day (4h after), 3-day, 7-day
- **Medication:** Recurring at specified times
- **Wellness:** Every 30-90 days

**Performance Targets:**
- Sync 10,000 appointments in <5 minutes
- Process 1000 reminders per hour
- Template rendering: <50ms per message
- Message sending: <1 second per message
- End-to-end reminder: <3 seconds

**Cost Optimization:**
- WhatsApp cost: ~PKR 0.50 per message
- Budget mode: Only 24h reminders (saves 67%)
- Recommended mode: 24h reminders + follow-ups (saves 33%)
- Premium mode: All reminders enabled
- Average savings: PKR 5,600/month with Budget mode

---

## ⚠️ Architecture Notes

### CRITICAL: Read from Google Sheets
**Data Source:**
- Google Sheets = Primary (source of truth)
- PostgreSQL = Cache (for performance)

**Why This Matters:**
1. **Client Control:** Appointment data lives in client's sheets
2. **Real-time Updates:** Clients can edit appointments directly
3. **Sync Tolerance:** Cache can lag without data loss
4. **Fallback:** Direct read from Sheets if cache stale

### Integration Points:

**TASK-040A (Notification Settings):**
- Check if reminder type enabled before sending
- Respect patient-level opt-outs
- Track cost savings from skipped messages
- Integration: `NotificationSettingsService.isEnabled(orgId, type)`

**TASK-041 (Appointment Booking):**
- Reads appointments created by booking flow
- Depends on Google Sheets write (from TASK-041)
- Syncs same data to PostgreSQL cache

**TASK-044 (Sheets Sync Service):**
- May share sync logic with TASK-044
- Both tasks sync Google Sheets → PostgreSQL
- Can consolidate into single sync service

---

**Document Version:** 1.0  
**Last Updated:** October 14, 2025  
**Source:** DrSync_Task_Tracking.md (Lines 1101-1111)  
**Author:** DrSync Development Team
