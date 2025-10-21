# TASK-041: Appointment Booking - Task Breakdown

**Parent:** Phase 3: WhatsApp Integration  
**Status:** ✅ **COMPLETE (100%)**  
**Completion Date:** October 20, 2025  
**Priority:** 🔴 HIGH - Core SRS functionality  
**Assignee:** Backend Developer 1  
**Estimate:** 4 days | **Actual:** 5 days  
**Dependencies:** TASK-040 (Message Processing Pipeline) ✅ Complete

---

## 📋 Overview

Implement WhatsApp-based appointment booking that writes directly to Google Sheets as the primary data source. This represents a critical architectural change where Google Sheets becomes the source of truth, with PostgreSQL serving as a cache for message processing.

**Source:** DrSync_Task_Tracking.md Lines 1080-1098  
**Architecture Note:** **DIRECT WRITE TO GOOGLE SHEETS** - All appointments book directly to Google Sheets first, then PostgreSQL syncs for messaging

---

## 🎯 SRS Requirements Coverage

### Primary Focus
- **REQ-WA-004**: System SHALL show real-time appointment availability
- **REQ-WA-005**: System SHALL allow appointment booking, rescheduling, and cancellation
- **REQ-WA-006**: System SHALL send automated booking confirmations
- **REQ-WA-009**: System SHALL support family member registration via shared WhatsApp number
- **REQ-WA-010**: System SHALL handle booking conflicts with intelligent slot suggestions
- **REQ-APPT-001**: System SHALL validate appointment availability in real-time
- **REQ-APPT-002**: System SHALL prevent double-booking conflicts
- **REQ-APPT-004**: System SHALL track appointment status (booked, confirmed, completed, cancelled)
- **REQ-APPT-008**: System SHALL implement slot locking during booking process
- **REQ-APPT-009**: System SHALL suggest next available slot if requested slot is taken
- **REQ-APPT-010**: System SHALL support family-based patient management with shared contact numbers
- **REQ-DATA-001**: System SHALL connect to multiple client Google Sheets simultaneously
- **REQ-DATA-002**: System SHALL read and update appointment data in real-time
- **REQ-DATA-004**: System SHALL validate data integrity before updates
- **REQ-DATA-008**: System SHALL implement atomic booking operations to prevent double-booking
- **REQ-DATA-009**: System SHALL support multiple patients per phone number for family accounts
- **REQ-DATA-010**: System SHALL resolve booking conflicts by suggesting alternative slots
- **REQ-COMM-002**: System SHALL send appointment confirmations upon booking
- **PERF-001**: System SHALL respond to WhatsApp messages within 3 seconds

---

## 📊 Task Breakdown

### MAIN TASK: TASK-041 - Appointment Booking to Google Sheets

#### 1. Google Sheets Direct Write Service
**Objective:** Implement service to write appointments directly to Google Sheets (PRIMARY DATA SOURCE)

**Sub-tasks:**

- **1.1** Google Sheets Appointment Writer
  - Connect to organization's Google Sheet using service account
  - Locate appointments worksheet/tab
  - Format appointment data for sheet structure
  - Write appointment row with atomic operation
  - Return success/failure with row ID
  
- **1.2** Multi-Client Sheet Management
  - Fetch organization's sheet ID from database
  - Validate sheet access permissions
  - Handle different sheet structures (tabs vs separate sheets per doctor)
  - Support custom column mappings per organization
  
- **1.3** Data Validation Before Write
  - Validate all required fields present (patient, doctor, date, time)
  - Validate date/time format
  - Validate doctor exists in sheet
  - Check data integrity constraints

**Sub-subtasks (1.1):**
- Create `GoogleSheetsAppointmentService` class
- Implement `writeAppointment(orgId, appointmentData)` method
- Use batch update API for atomic writes
- Add retry logic (3 attempts) for transient failures
- Log all write operations for audit trail

**Sub-subtasks (1.2):**
- Query organization settings for sheet ID and structure
- Implement sheet structure detection (tabs, columns)
- Create column mapping configuration per org
- Handle sheet not found errors gracefully

**Sub-subtasks (1.3):**
- Create appointment data validator
- Check required fields: patientName, phone, doctorName, date, time, status
- Validate date is not in past
- Validate time format (HH:MM AM/PM)
- Return validation errors with helpful messages

**Deliverables:**
- ✅ Google Sheets write service
- ✅ Multi-client sheet support
- ✅ Data validation framework
- ✅ Atomic write operations

**Testing:**
- Test write to single organization sheet
- Test multi-client isolation (no cross-contamination)
- Test validation catches all error cases
- Test retry mechanism on transient failures
- Test different sheet structures (tabs, columns)

---

#### 2. Patient Identification and Management
**Objective:** Identify or register patients in Google Sheets (REQ-DATA-009, REQ-APPT-010)

**Sub-tasks:**

- **2.1** Patient Lookup in Google Sheets
  - Search patients worksheet by phone number
  - Return patient details if found
  - Support partial matches for family members
  - Handle multiple patients per phone (family accounts)
  
- **2.2** Family Account Management
  - Detect if phone number has multiple patients
  - Present list of family members to user
  - Allow user to select which family member
  - Create new family member if needed
  
- **2.3** New Patient Registration
  - Collect patient details (name, age, gender optional)
  - Write new patient to Google Sheets
  - Generate unique patient ID
  - Return patient record for booking

**Sub-subtasks (2.1):**
- Implement `findPatientByPhone(orgId, phoneNumber)` method
- Query Google Sheets patients worksheet
- Parse patient rows into structured data
- Return array of patients (for family accounts)
- Cache patient lookups in Redis (5 min TTL)

**Sub-subtasks (2.2):**
- Detect multiple patients with same phone
- Format family member selection message (bilingual)
- Parse user's family member selection
- Validate selected member exists
- Handle "add new family member" option

**Sub-subtasks (2.3):**
- Collect patient name via conversation flow
- Write patient data to Google Sheets patients tab
- Generate patient ID (auto-increment or UUID)
- Link patient to phone number
- Sync to PostgreSQL cache asynchronously

**Deliverables:**
- ✅ Patient lookup service
- ✅ Family account handling
- ✅ Patient registration flow
- ✅ Patient data caching

**Testing:**
- Test patient lookup by phone
- Test family account detection (2+ patients)
- Test family member selection flow
- Test new patient registration
- Test patient cache hit/miss
- Test single patient vs family account scenarios

---

#### 3. Provider Selection and Availability
**Objective:** Display doctors and check availability from Google Sheets (REQ-WA-003, REQ-WA-004)

**Sub-tasks:**

- **3.1** Provider List from Google Sheets
  - Read doctors/providers from Google Sheets
  - Parse doctor details (name, specialty, fee, schedule)
  - Format doctor list for WhatsApp display
  - Support both English and Urdu names
  
- **3.2** Provider Schedule Parsing
  - Parse doctor's working hours from sheet
  - Handle different schedule formats (daily, specific days)
  - Calculate available time slots
  - Consider lunch breaks and off-hours
  
- **3.3** Provider Selection Handling
  - Parse user's doctor selection (number or name)
  - Validate doctor exists and is available
  - Return doctor details for booking
  - Handle "show more doctors" pagination

**Sub-subtasks (3.1):**
- Implement `getDoctorsList(orgId)` method
- Read from doctors/providers worksheet
- Parse columns: name, specialty, fee, schedule, active status
- Filter only active doctors
- Format as numbered list for WhatsApp
- Cache doctor list (15 min TTL)

**Sub-subtasks (3.2):**
- Parse schedule string formats:
  - "Mon-Fri 9:00 AM - 5:00 PM"
  - "Mon,Wed,Fri 10:00 AM - 2:00 PM, 4:00 PM - 8:00 PM"
  - "Daily 9:00 AM - 1:00 PM"
- Create time slot generator (30-min or custom intervals)
- Apply lunch breaks if specified
- Return list of available dates and times

**Sub-subtasks (3.3):**
- Parse user input (number 1-5 or doctor name)
- Match against doctor list
- Validate doctor is active
- Return doctor object with all details
- Handle "Doctor not found" errors

**Deliverables:**
- ✅ Doctor list service
- ✅ Schedule parser
- ✅ Doctor selection handler
- ✅ Doctor data caching

**Testing:**
- Test doctor list retrieval
- Test schedule parsing (various formats)
- Test slot generation (30-min intervals)
- Test doctor selection (number and name)
- Test inactive doctor filtering
- Test cache expiration

---

#### 4. Slot Availability Checking
**Objective:** Check real-time slot availability and prevent conflicts (REQ-APPT-001, REQ-APPT-002, REQ-DATA-008)

**Sub-tasks:**

- **4.1** Available Slots Query
  - Read existing appointments from Google Sheets
  - Filter by doctor and date range
  - Compare against doctor's schedule
  - Return list of available (unbooked) slots
  
- **4.2** Conflict Detection
  - Check if requested slot is already booked
  - Detect overlapping appointments
  - Consider appointment duration (default 30 min)
  - Flag potential conflicts
  
- **4.3** Slot Locking Mechanism
  - Implement temporary slot reservation (5 minutes)
  - Prevent double-booking during user confirmation
  - Release lock after timeout or cancellation
  - Use Redis for distributed locking
  
- **4.4** Alternative Slot Suggestion
  - If requested slot unavailable, suggest next 3 slots
  - Consider same day first, then next available days
  - Respect doctor's working hours
  - Format suggestions for user

**Sub-subtasks (4.1):**
- Implement `getAvailableSlots(orgId, doctorId, date)` method
- Query appointments sheet for doctor on date
- Parse booked slots
- Generate all possible slots from schedule
- Remove booked slots from available list
- Return array of {date, time, available: boolean}

**Sub-subtasks (4.2):**
- Implement `checkSlotConflict(orgId, doctorId, date, time)` method
- Query appointments within ±30 min window
- Check appointment status (exclude cancelled)
- Return conflict details if found
- Log conflict detections for analytics

**Sub-subtasks (4.3):**
- Create slot lock key: `slot_lock:{orgId}:{doctorId}:{date}:{time}`
- Use Redis SETNX for atomic lock acquisition
- Set 5-minute TTL on lock
- Implement `acquireSlotLock()` and `releaseSlotLock()` methods
- Check lock before writing appointment

**Sub-subtasks (4.4):**
- Implement `suggestAlternativeSlots(orgId, doctorId, requestedDate)` method
- Find next 3 available slots on same day
- If <3 slots same day, check next 2 days
- Format as: "1. Today 2:00 PM\n2. Today 3:30 PM\n3. Tomorrow 10:00 AM"
- Return in user's language (English/Urdu)

**Deliverables:**
- ✅ Slot availability checker
- ✅ Conflict detection system
- ✅ Redis-based slot locking
- ✅ Alternative slot suggester

**Testing:**
- Test available slots query
- Test conflict detection (overlapping appointments)
- Test slot lock acquisition and release
- Test slot lock timeout (5 min)
- Test alternative slot suggestions
- Test concurrent booking attempts (race condition)
- Test lock prevents double-booking

---

#### 5. Appointment Booking Flow
**Objective:** Complete end-to-end booking process with confirmation (REQ-WA-005, REQ-APPT-008)

**Sub-tasks:**

- **5.1** Booking Confirmation Step
  - Present booking summary to user
  - Show patient, doctor, date, time, fee
  - Request confirmation (Yes/Confirm or No/Cancel)
  - Handle confirmation timeout (2 minutes)
  
- **5.2** Atomic Booking Transaction
  - Acquire slot lock
  - Validate slot still available
  - Write appointment to Google Sheets
  - Release slot lock
  - Handle transaction failures (rollback)
  
- **5.3** Appointment Data Structure
  - Generate appointment ID (unique)
  - Set status: "booked" (pending confirmation)
  - Store all required fields
  - Add timestamp and metadata
  
- **5.4** Booking Confirmation Sync
  - Write appointment to Google Sheets (PRIMARY)
  - Sync to PostgreSQL cache (SECONDARY)
  - Update conversation state
  - Prepare confirmation message

**Sub-subtasks (5.1):**
- Format booking summary message (bilingual)
- Include: Patient name, Doctor name, Date, Time, Fee
- Add confirmation buttons/text options
- Set 2-minute timeout for response
- Handle timeout: release lock, send timeout message

**Sub-subtasks (5.2):**
- Implement `bookAppointment(orgId, bookingData)` transaction
- Step 1: Acquire slot lock (fail if locked)
- Step 2: Double-check slot available (fail if booked)
- Step 3: Write to Google Sheets (atomic batch update)
- Step 4: Release slot lock
- Rollback: Release lock and return error
- Use try-catch-finally for lock cleanup

**Sub-subtasks (5.3):**
- Generate appointment ID: `APT_{orgId}_{timestamp}_{random}`
- Create appointment object:
  - id, organizationId, patientId, patientName, phone
  - doctorId, doctorName, date, time, duration
  - status: "booked", fee, notes
  - createdAt, updatedAt, bookedVia: "whatsapp"
- Validate all required fields
- Format date/time for sheet structure

**Sub-subtasks (5.4):**
- Write to Google Sheets first (source of truth)
- Queue PostgreSQL sync job (Bull queue)
- Update conversation state: clear booking data
- Log booking event with full details
- Return booking confirmation data

**Deliverables:**
- ✅ Booking confirmation flow
- ✅ Atomic booking transaction
- ✅ Appointment data model
- ✅ Dual-write synchronization

**Testing:**
- Test booking confirmation message format
- Test confirmation timeout (2 min)
- Test atomic booking transaction (all steps)
- Test booking rollback on failure
- Test slot lock prevents concurrent bookings
- Test appointment ID generation (uniqueness)
- Test Google Sheets write success
- Test PostgreSQL sync (async)
- Test booking under race conditions

---

#### 6. Confirmation Message Generation
**Objective:** Send booking confirmation via WhatsApp (REQ-COMM-002, REQ-WA-006)

**Sub-tasks:**

- **6.1** Confirmation Message Content
  - Generate personalized confirmation message
  - Include appointment ID for reference
  - Show all booking details
  - Add clinic contact information
  - Provide cancellation/rescheduling instructions
  
- **6.2** Bilingual Confirmation
  - Send confirmation in user's language
  - Format date/time appropriately (English/Urdu)
  - Use appropriate greeting and tone
  - Include emojis for visual appeal
  
- **6.3** Confirmation Delivery
  - Send via WhatsApp API
  - Track message delivery status
  - Log confirmation sent
  - Handle delivery failures (retry)

**Sub-subtasks (6.1):**
- Create confirmation template with variables
- Include: "✅ Appointment Confirmed!"
- Details: ID, Patient, Doctor, Date, Time, Location, Fee
- Instructions: "To cancel, reply CANCEL {appointmentId}"
- Clinic info: Phone, address, directions link
- Variable replacement with actual data

**Sub-subtasks (6.2):**
- Detect user's language from conversation state
- Format date: English "Monday, Oct 14 at 2:00 PM" vs Urdu
- Use bilingual templates
- Add cultural greetings (JazakAllah for Urdu)
- Test with native speakers for accuracy

**Sub-subtasks (6.3):**
- Call WhatsApp send message API
- Use text message type (or template if approved)
- Check notification settings (TASK-040A integration)
- Retry 3 times on transient failures
- Log delivery status: sent, delivered, read, failed
- Store message ID in appointment record

**Deliverables:**
- ✅ Confirmation message templates
- ✅ Bilingual message support
- ✅ Message delivery system
- ✅ Delivery tracking

**Testing:**
- Test confirmation message content (all fields)
- Test English confirmation
- Test Urdu confirmation
- Test message delivery success
- Test message delivery failure (retry)
- Test notification settings respected
- Test delivery status tracking

---

#### 7. Error Handling and Edge Cases
**Objective:** Handle all booking failure scenarios gracefully

**Sub-tasks:**

- **7.1** Google Sheets Connection Errors
  - Handle API timeouts
  - Handle rate limiting (100 req/100s)
  - Handle authentication failures
  - Handle sheet not found errors
  
- **7.2** Booking Conflict Errors
  - Handle slot no longer available
  - Handle slot lock acquisition failure
  - Handle double-booking attempts
  - Provide helpful error messages
  
- **7.3** Data Validation Errors
  - Handle invalid date formats
  - Handle invalid time formats
  - Handle missing required fields
  - Handle invalid patient/doctor selections
  
- **7.4** User Error Recovery
  - Allow user to retry booking
  - Suggest alternative slots on conflict
  - Provide clear error messages (bilingual)
  - Maintain conversation state on errors

**Sub-subtasks (7.1):**
- Catch Google Sheets API errors
- Implement exponential backoff for retries
- Handle quota exceeded: queue for later
- Handle auth errors: alert admin, show maintenance message
- Log all errors with context

**Sub-subtasks (7.2):**
- Detect slot conflict: "Slot no longer available"
- Suggest 3 alternative slots automatically
- Handle lock timeout: "Please try again"
- Handle concurrent booking: use slot lock
- Log all conflicts for analytics

**Sub-subtasks (7.3):**
- Validate date not in past
- Validate date not too far future (e.g., max 90 days)
- Validate time in doctor's working hours
- Return specific validation errors
- Guide user to correct format

**Sub-subtasks (7.4):**
- Create error response templates (English/Urdu)
- Preserve conversation state on errors
- Allow "try again" without restarting flow
- Provide "back to menu" option
- Show helpful guidance for fixing errors

**Deliverables:**
- ✅ Comprehensive error handling
- ✅ User-friendly error messages
- ✅ Error recovery flows
- ✅ Error logging and monitoring

**Testing:**
- Test Google Sheets timeout handling
- Test rate limit handling
- Test booking conflict scenarios
- Test invalid date/time inputs
- Test error message clarity (user testing)
- Test error recovery flows
- Test error logging completeness

---

#### 8. PostgreSQL Sync for Messaging
**Objective:** Sync appointment data to PostgreSQL cache for reminder processing (ARCHITECTURE NOTE)

**Sub-tasks:**

- **8.1** Async Sync Service
  - Queue sync job after Google Sheets write
  - Read appointment from Google Sheets
  - Write to PostgreSQL appointments table
  - Handle sync failures gracefully
  
- **8.2** Sync Conflict Resolution
  - Google Sheets data always wins
  - Overwrite PostgreSQL on conflicts
  - Log conflict resolutions
  - Alert on persistent sync failures
  
- **8.3** Sync Status Tracking
  - Track sync status per appointment
  - Retry failed syncs (max 5 attempts)
  - Alert if sync queue backs up
  - Provide sync health dashboard

**Sub-subtasks (8.1):**
- Create Bull queue job: `syncAppointmentToPostgres`
- Job payload: {organizationId, appointmentId, sheetRowId}
- Read appointment from Google Sheets by ID
- Upsert into PostgreSQL appointments table
- Mark sync status: synced, failed, pending
- Execute after confirmation sent (async)

**Sub-subtasks (8.2):**
- On conflict: always use Google Sheets data
- Update PostgreSQL with latest from Sheets
- Log resolution: "Overriding PostgreSQL with Sheets data"
- Alert admin if >10 conflicts in 1 hour

**Sub-subtasks (8.3):**
- Add `syncStatus` field to appointment record
- Values: "pending", "synced", "failed"
- Retry failed syncs every 5 minutes
- After 5 failures, mark as "sync_error"
- Create admin alert for sync errors
- Provide sync queue stats endpoint

**Deliverables:**
- ✅ Async sync service
- ✅ Conflict resolution rules
- ✅ Sync status tracking
- ✅ Sync monitoring

**Testing:**
- Test sync job execution
- Test sync success path
- Test sync failure and retry
- Test conflict resolution (Sheets wins)
- Test sync queue under load
- Test sync status reporting
- Test fallback: read from Sheets if sync failed

---

#### 9. Real-Time Dashboard Updates (SSE) - ACTION #6 Decision
**Objective:** Implement Server-Sent Events for real-time appointment notifications to dashboard

**Sub-tasks:**

- **9.1** EventEmitter Infrastructure
  - Create global `appointmentEmitter` using Node.js EventEmitter
  - Define event types: `appointment:created`, `appointment:updated`, `appointment:cancelled`, `appointment:rescheduled`
  - Emit events after successful booking/updates/cancellations/reschedules
  - Support organization-scoped events (`appointment:created:{orgId}`, etc.)
  
- **9.2** SSE Endpoint Implementation
  - Create `GET /api/organizations/:orgId/appointments/stream` endpoint
  - Setup SSE headers (Content-Type: text/event-stream, Cache-Control: no-cache)
  - Authenticate user and validate organization access
  - Listen to organization-specific appointment events
  - Send events as JSON-formatted data
  - Handle client disconnections and cleanup listeners
  
- **9.3** Booking/Cancel/Reschedule Flow Integration
  - Emit `appointment:created:{orgId}` event after Google Sheets write success
  - Emit `appointment:cancelled:{orgId}` event after cancellation write to Sheets
  - Emit `appointment:rescheduled:{orgId}` event after reschedule write to Sheets
  - Emit `appointment:updated:{orgId}` event after confirmation sent
  - Update dashboard with all lifecycle events in real-time

**Sub-subtasks (9.1):**
- Import EventEmitter: `import { EventEmitter } from 'events';`
- Create singleton: `export const appointmentEmitter = new EventEmitter();`
- Set max listeners: `appointmentEmitter.setMaxListeners(0);` (unlimited)
- Define event payload interfaces:
  ```typescript
  interface AppointmentCreatedEvent {
    id: string;
    patientName: string;
    patientPhone: string;
    doctorName: string;
    date: string;
    time: string;
    status: 'booked' | 'confirmed';
    source: 'whatsapp' | 'dashboard';
    notificationSent: boolean;
    createdAt: Date;
  }
  
  interface AppointmentUpdatedEvent {
    id: string;
    notificationSent?: boolean;
    status?: string;
  }
  
  interface AppointmentCancelledEvent {
    id: string;
    patientName: string;
    doctorName: string;
    date: string;
    time: string;
    status: 'cancelled';
    reason?: string;
    cancelledAt: Date;
  }
  
  interface AppointmentRescheduledEvent {
    id: string;
    patientName: string;
    doctorName: string;
    oldDate: string;
    oldTime: string;
    newDate: string;
    newTime: string;
    status: 'booked';
    rescheduledAt: Date;
  }
  ```

**Sub-subtasks (9.2):**
- Create SSE endpoint in `backend/src/routes/appointments.ts`:
  ```typescript
  router.get(
    '/organizations/:orgId/appointments/stream',
    authenticate,
    (req: Request, res: Response) => {
      const { orgId } = req.params;
      
      // Verify organization access
      if (req.user!.organizationId !== orgId) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      
      // Setup SSE headers
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
      
      // Send connection confirmation
      res.write(`data: ${JSON.stringify({ type: 'connected' })}\\n\\n`);
      
      // Event handlers for all 4 event types
      const createdHandler = (appointment: AppointmentCreatedEvent) => {
        res.write(`data: ${JSON.stringify({ 
          type: 'appointment:created', 
          data: appointment 
        })}\\\\n\\\\n`);
      };
      
      const updatedHandler = (update: AppointmentUpdatedEvent) => {
        res.write(`data: ${JSON.stringify({ 
          type: 'appointment:updated', 
          data: update 
        })}\\\\n\\\\n`);
      };
      
      const cancelledHandler = (cancellation: AppointmentCancelledEvent) => {
        res.write(`data: ${JSON.stringify({ 
          type: 'appointment:cancelled', 
          data: cancellation 
        })}\\\\n\\\\n`);
      };
      
      const rescheduledHandler = (reschedule: AppointmentRescheduledEvent) => {
        res.write(`data: ${JSON.stringify({ 
          type: 'appointment:rescheduled', 
          data: reschedule 
        })}\\\\n\\\\n`);
      };
      
      // Subscribe to all organization-specific event types
      appointmentEmitter.on(`appointment:created:${orgId}`, createdHandler);
      appointmentEmitter.on(`appointment:updated:${orgId}`, updatedHandler);
      appointmentEmitter.on(`appointment:cancelled:${orgId}`, cancelledHandler);
      appointmentEmitter.on(`appointment:rescheduled:${orgId}`, rescheduledHandler);
      
      // Cleanup on client disconnect
      req.on('close', () => {
        appointmentEmitter.removeListener(`appointment:created:${orgId}`, createdHandler);
        appointmentEmitter.removeListener(`appointment:updated:${orgId}`, updatedHandler);
        appointmentEmitter.removeListener(`appointment:cancelled:${orgId}`, cancelledHandler);
        appointmentEmitter.removeListener(`appointment:rescheduled:${orgId}`, rescheduledHandler);
        res.end();
      });
    }
  );
  ```

**Sub-subtasks (9.3):**
- In booking service, after Google Sheets write:
  ```typescript
  // After successful write to Google Sheets
  const appointment = await googleSheets.createAppointment(appointmentData);
  
  // Sync to PostgreSQL (async)
  await googleSheetsSyncService.syncAppointment(appointment.id, organizationId);
  
  // Emit SSE event for real-time dashboard update
  appointmentEmitter.emit(`appointment:created:${organizationId}`, {
    id: appointment.id,
    patientName: appointment.patientName,
    patientPhone: appointment.patientPhone,
    date: appointment.date,
    time: appointment.time,
    status: 'confirmed',
    source: 'whatsapp',
    notificationSent: false,
    createdAt: new Date()
  });
  
  // Send confirmation message
  const result = await messageProcessor.sendMessage(
    organizationId,
    appointment.patientPhone,
    'booking_confirmation',
    confirmationMessage
  );
  
  // Emit update event after confirmation
  if (result.sent) {
    appointmentEmitter.emit(`appointment:updated:${organizationId}`, {
      id: appointment.id,
      notificationSent: true
    });
  }
  ```

**Deliverables:**
- ✅ EventEmitter infrastructure with organization-scoped events
- ✅ SSE endpoint: `/api/organizations/:orgId/appointments/stream`
- ✅ 4 event types: created, updated, cancelled, rescheduled
- ✅ Events emitted for all appointment lifecycle stages
- ✅ Organization isolation (Org A events don't reach Org B clients)

**Testing:**
- Test SSE connection establishment and authentication
- Test `appointment:created` event emission on new WhatsApp booking
- Test `appointment:cancelled` event emission on cancellation
- Test `appointment:rescheduled` event emission on reschedule
- Test `appointment:updated` event emission on notification status update
- Test organization isolation (concurrent connections from different orgs)
- Test client reconnection after disconnect
- Test multiple concurrent SSE connections per organization
- Verify <1 second latency from booking to dashboard update (ACTION #6 requirement)
- Test SSE connection cleanup on client disconnect
- Test event data format and structure for all 4 event types

**Frontend Integration (Implementation in Frontend tasks):**
Frontend will use `useRealtimeAppointments` hook:
```typescript
import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/useToast';

export function useRealtimeAppointments(organizationId: string) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const { showToast } = useToast();
  
  useEffect(() => {
    const eventSource = new EventSource(
      `/api/organizations/${organizationId}/appointments/stream`,
      { withCredentials: true }
    );
    
    eventSource.onopen = () => {
      console.log('[SSE] Connected to appointment stream');
    };
    
    eventSource.onmessage = (event) => {
      const message = JSON.parse(event.data);
      
      if (message.type === 'appointment:new') {
        setAppointments(prev => [message.data, ...prev]);
        showToast({
          title: 'New WhatsApp Booking',
          description: `${message.data.patientName} - ${message.data.time}`,
          variant: 'success'
        });
        new Audio('/notification.mp3').play();
      }
      
      if (message.type === 'appointment:updated') {
        setAppointments(prev => prev.map(apt => 
          apt.id === message.data.id ? { ...apt, ...message.data } : apt
        ));
      }
    };
    
    eventSource.onerror = (error) => {
      console.error('[SSE] Connection error:', error);
      eventSource.close();
      setTimeout(() => window.location.reload(), 5000);
    };
    
    return () => eventSource.close();
  }, [organizationId]);
  
  return { appointments, setAppointments };
}
```

**Architecture Decision Rationale (ACTION #6):**
- **Why SSE over Polling:** Real-time updates (<1 second), lower server load, HTTP-friendly
- **Why SSE over WebSocket:** Simpler implementation, unidirectional (sufficient for notifications), better firewall compatibility
- **Organization Scoping:** Each organization has isolated event stream for security and performance
- **Event Types:** Separate new/updated events allow Frontend to handle differently (toast vs silent update)

---

## ✅ Overall Deliverables

**Core Services:**
1. ✅ Google Sheets appointment writer (PRIMARY)
2. ✅ Patient lookup and registration
3. ✅ Provider selection and availability
4. ✅ Slot availability and conflict detection
5. ✅ Redis-based slot locking
6. ✅ Atomic booking transaction
7. ✅ Confirmation message system
8. ✅ PostgreSQL sync service (SECONDARY)

**APIs/Endpoints:**
- `POST /api/appointments/book` - Book appointment
- `GET /api/appointments/availability` - Check availability
- `GET /api/appointments/{id}` - Get appointment details
- `POST /api/appointments/{id}/confirm` - Confirm booking
- `POST /api/appointments/{id}/cancel` - Cancel booking

**Data Models:**
- Appointment (Google Sheets primary, PostgreSQL cache)
- Patient (with family account support)
- Doctor/Provider
- Slot lock (Redis)

**Documentation:**
- Booking flow diagram
- Google Sheets schema
- API documentation
- Error handling guide

---

## 🧪 Testing Requirements

### Unit Tests (50+ tests)
- Google Sheets write operations (10 tests)
- Patient lookup and registration (8 tests)
- Doctor selection and parsing (7 tests)
- Slot availability checking (10 tests)
- Conflict detection (8 tests)
- Slot locking (7 tests)

### Integration Tests (20+ tests)
- End-to-end booking flow (English) (5 tests)
- End-to-end booking flow (Urdu) (5 tests)
- Family account booking (3 tests)
- Concurrent booking prevention (3 tests)
- Google Sheets sync (4 tests)

### Performance Tests
- Booking under load (50 concurrent bookings)
- Slot availability query performance (<500ms)
- Google Sheets API rate limit handling
- Slot lock performance (Redis)

### Edge Case Tests
- Booking during maintenance
- Google Sheets unavailable (fallback)
- Booking exactly at slot boundary
- Booking with special characters in names
- Booking across time zones
- Family member disambiguation

### Acceptance Tests (TASK-041-ACC)
- ✅ **TASK-041-ACC-001:** Appointment booking creates correct Google Sheets entry with all required fields
- ✅ **TASK-041-ACC-002:** Appointment data syncs to PostgreSQL within 10 seconds for messaging
- ✅ **TASK-041-ACC-003:** Booking conflicts detected and prevented via Redis slot locking
- ✅ **TASK-041-ACC-004:** WhatsApp confirmation messages sent within 2 seconds of booking
- ✅ **TASK-041-ACC-005:** Booking failure scenarios gracefully handled with user-friendly error messages
- ✅ **TASK-041-ACC-006:** Family account booking correctly links to selected patient
- ✅ **TASK-041-ACC-007:** Concurrent bookings prevented (no double-booking)
- ✅ **TASK-041-ACC-008:** Cancellation updates Google Sheets and sends confirmation
- ✅ **TASK-041-ACC-009:** Reschedule moves appointment to new slot with conflict detection
- ✅ **TASK-041-ACC-010:** SSE events emitted for all appointment lifecycle events

---

## 📈 Success Criteria

1. ✅ **Primary Storage:** All bookings write to Google Sheets first (100%)
2. ✅ **No Double-Booking:** Slot locking prevents conflicts (100%)
3. ✅ **Family Accounts:** Support multiple patients per phone (REQ-APPT-010)
4. ✅ **Performance:** Booking completes within 2 seconds (TASK-041 target, contributes to PERF-001 <3s end-to-end)
5. ✅ **Reliability:** <1% booking failure rate
6. ✅ **Sync:** PostgreSQL syncs within 10 seconds (async)
7. ✅ **Confirmation:** 100% of successful bookings send confirmation (REQ-COMM-002)
8. ✅ **Testing:** All TASK-041-ACC acceptance tests passing (10 tests)
9. ✅ **Real-time:** SSE events for all appointment lifecycle stages (created, cancelled, rescheduled)
10. ✅ **Error Handling:** All error scenarios handled gracefully
11. ✅ **Multi-tenant:** Complete isolation between organizations

---

## 🔗 Related Tasks

**Prerequisites (Must Complete First):**
- ✅ TASK-040: Message processing pipeline
- ✅ TASK-039: WhatsApp Business API
- ✅ TASK-023: Google Sheets integration foundation
- ✅ TASK-033: Multi-tenant routing

**Dependent Tasks (Require This Task):**
- ⏳ TASK-042: Automated reminders (reads from Google Sheets)
- ⏳ TASK-043: Google Sheets as primary database (template setup)
- ⏳ TASK-044: PostgreSQL sync service (bidirectional)

**Parallel Tasks (Can Develop Simultaneously):**
- 🔄 TASK-040A: Notification settings (affects confirmation sending)

**Related Documents:**
- `DrSync_SRS.md` - Requirements (Section 3.5, 3.7)
- `DrSync_TDD.md` - Architecture (Section 7.2)
- `DrSync_Task_Tracking.md` - Project plan (Lines 1080-1098)
- `TASK-040_Breakdown.md` - Message processing
- `TASK-023` - Google Sheets foundation

---

## 📝 Implementation Notes

**Technology Stack:**
- Node.js 18+ with TypeScript
- Google Sheets API v4
- PostgreSQL 15+ (cache only)
- Redis 7.0+ (slot locking)
- Bull Queue (async sync)
- WhatsApp Business API (confirmations)

**Key Design Decisions:**
1. **Google Sheets Primary:** All writes go to Sheets first (architectural requirement)
2. **PostgreSQL Cache:** Synced for reminder processing only
3. **Slot Locking:** Redis distributed locks prevent double-booking (5-min TTL)
4. **Family Accounts:** Single phone can have multiple patients (REQ-APPT-010)
5. **Atomic Operations:** Use Google Sheets batch update API
6. **Conflict Resolution:** Sheets data always wins over PostgreSQL

**Data Flow:**
```
WhatsApp User
    ↓
TASK-040 (Message Processing)
    ↓
TASK-041 (Booking Service)
    ↓
[Acquire Slot Lock (Redis)]
    ↓
Google Sheets (WRITE PRIMARY) ← Source of Truth
    ↓
[Release Slot Lock]
    ↓
PostgreSQL (SYNC SECONDARY) ← Cache for Reminders
    ↓
WhatsApp Confirmation (via TASK-040)
```

**Critical Path:**
1. Slot locking prevents race conditions
2. Google Sheets write must be atomic
3. Confirmation must be sent after successful write
4. PostgreSQL sync can be delayed (async)

**Performance Targets:**
- **TASK-041 Booking Transaction: <2 seconds** (component target)
  - Patient lookup: <300ms
  - Slot lock acquisition: <100ms (Redis)
  - Google Sheets write: <800ms
  - PostgreSQL sync trigger: <100ms
  - Confirmation message: <200ms
  - Slot lock release: <50ms
  - SSE event emission: <50ms
  - Total: <1600ms typical, <2000ms maximum
- **End-to-End (TASK-040 + TASK-041): <3 seconds** (PERF-001)
  - TASK-040 (message processing): <1s
  - TASK-041 (booking transaction): <2s
  - Total: <3s compliant
- Slot availability check: <500ms (PERF-004)
- Google Sheets write: <800ms (includes network + API)

**Google Sheets Rate Limits:**
- 100 requests per 100 seconds per user
- Use batch operations to minimize requests
- Implement request queuing if limit approached
- Cache doctor lists and schedules

---

## ⚠️ Architecture Change Notes

### CRITICAL: Data Flow Reversal
**Previous Architecture (Wrong):**
- WhatsApp → PostgreSQL → Google Sheets

**New Architecture (Correct - TASK-041):**
- WhatsApp → **Google Sheets (Primary)** → PostgreSQL (Cache)

### Why This Matters:
1. **Client Control:** Clients own their data in their Google Sheets
2. **Data Sovereignty:** Appointments live in client's Google account
3. **Transparency:** Clients can see/edit appointments in real-time
4. **Sync Issues:** PostgreSQL cache can lag without data loss
5. **Conflict Resolution:** Google Sheets always wins

### Implementation Impact:
- Google Sheets writes are blocking (must succeed)
- PostgreSQL writes are async (can tolerate delays)
- Reminder service (TASK-042) must read from Sheets
- Dashboard must read from Sheets (or fresh PostgreSQL cache)

---

**Document Version:** 2.0  
**Last Updated:** October 16, 2025  
**Changes in v2.0:**
- Updated Section 9.1: Added `appointment:cancelled` and `appointment:rescheduled` events
- Updated Section 9.2: Event handlers for all 4 event types (created, updated, cancelled, rescheduled)
- Updated Section 9.3: Integration for cancel/reschedule flows
- Replaced TESTING-030 with TASK-041-ACC-001 to 010 (10 tests)
- Updated performance targets: <2s for TASK-041, <3s end-to-end
- Updated Success Criteria: Component-level performance and SSE events

**Source:** DrSync_Task_Tracking.md (Lines 1080-1098)  
**Author:** DrSync Development Team
