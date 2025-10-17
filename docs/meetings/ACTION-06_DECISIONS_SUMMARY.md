# ACTION #6: Backend-Frontend Interface Review - Decision Summary
**Date:** October 16, 2025  
**Status:** ✅ Complete

---

## 🎯 Critical Architecture Decisions

### 1. Real-Time Updates: Server-Sent Events (SSE) ✅

**Decision:** Implement SSE for real-time dashboard updates when WhatsApp bookings arrive.

**Technical Implementation:**
```typescript
// Backend: SSE endpoint
app.get('/api/organizations/:orgId/appointments/stream', authenticate, (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  
  const orgId = req.params.orgId;
  
  // Listen for new appointments
  appointmentEmitter.on(`appointment:new:${orgId}`, (appointment) => {
    res.write(`data: ${JSON.stringify(appointment)}\n\n`);
  });
  
  req.on('close', () => {
    appointmentEmitter.removeAllListeners(`appointment:new:${orgId}`);
  });
});

// Frontend: SSE client
useEffect(() => {
  const eventSource = new EventSource(`/api/organizations/${orgId}/appointments/stream`);
  
  eventSource.onmessage = (event) => {
    const newAppointment = JSON.parse(event.data);
    setAppointments(prev => [newAppointment, ...prev]);
    showToast('New WhatsApp booking received!');
  };
  
  eventSource.onerror = () => {
    eventSource.close();
    // Auto-reconnect after 5 seconds
    setTimeout(() => window.location.reload(), 5000);
  };
  
  return () => eventSource.close();
}, [orgId]);
```

**Benefits:**
- ✅ Real-time updates (no 10-second polling delay)
- ✅ HTTP-based (works through firewalls)
- ✅ Auto-reconnect on disconnect
- ✅ Lower server load than polling
- ✅ Native browser support (no libraries needed)

**Where to Implement:**
- Backend: `backend/src/routes/appointments.ts` (new SSE endpoint)
- Backend: `backend/src/services/appointmentService.ts` (emit events on new bookings)
- Frontend: `frontend/src/app/dashboard/appointments/page.tsx` (SSE client hook)

---

### 2. Language Preference: Organization Level ✅

**Decision:** Store language preference (English/Urdu) at organization level, not patient level.

**Database Schema:**
```prisma
model NotificationSettings {
  id                          String   @id @default(uuid())
  organizationId              String   @unique
  
  // Language setting (applies to all patients in org)
  language                    String   @default("en") // "en" | "ur"
  
  bookingConfirmations        Boolean  @default(true)
  appointmentReminders        Boolean  @default(true)
  // ... other settings
  
  organization                Organization @relation(...)
}
```

**Rationale:**
- ✅ Simpler implementation for Phase 3
- ✅ Most clinics serve single-language patient base
- ✅ Consistent experience per organization
- ✅ Fewer database queries (one setting per org)

**Future Enhancement (Phase 6):**
Can add patient-level override if needed:
```prisma
model Patient {
  languageOverride  String?  // null = use org default, "en" | "ur" = override
}
```

**Where to Implement:**
- Backend: `backend/prisma/schema.prisma` (NotificationSettings model)
- Backend: `backend/src/services/notificationSettingsService.ts` (language getter)
- Backend: `backend/src/services/whatsappService.ts` (use org language for messages)
- Frontend: `frontend/src/app/dashboard/settings/notifications/page.tsx` (language dropdown)

---

### 3. Manual Reminder Triggers: Yes (Hybrid Auto + Manual) ✅

**Decision:** Implement both automatic and manual reminder sending in Phase 3.

**Use Case:**
- Doctor **disables auto-reminders** to save costs (PKR 0.50 per message)
- Doctor **manually sends reminders** only to VIP patients or critical appointments
- Result: Cost savings + flexibility

**Technical Implementation:**

#### Backend API:
```typescript
// POST /api/reminders/send-manual
{
  "appointmentIds": ["uuid1", "uuid2", "uuid3"],  // Max 100
  "reminderType": "REMINDER_24H" | "REMINDER_1H" | "CUSTOM",
  "customMessage": "Optional custom message"  // For CUSTOM type
}

// Response:
{
  "sent": 45,
  "failed": 5,
  "totalCost": 25.00,  // PKR
  "failedAppointments": [
    {
      "appointmentId": "uuid",
      "reason": "invalid_phone_number"
    }
  ]
}
```

#### Database Updates:
```prisma
enum ReminderTrigger {
  AUTOMATIC    // Scheduled by system
  MANUAL       // Sent manually by doctor
}

model AppointmentReminder {
  id             String          @id @default(uuid())
  appointmentId  String
  reminderType   ReminderType    // CONFIRMATION, REMINDER_24H, etc.
  trigger        ReminderTrigger @default(AUTOMATIC)  // NEW FIELD
  sentBy         String?         // User ID who sent manual reminder
  // ... other fields
}
```

#### Frontend UI:
```typescript
// Appointment list with bulk actions
<AppointmentTable>
  <BulkActions>
    <Checkbox selectAll />
    <Button onClick={sendBulkReminders}>
      📱 Send Reminders ({selectedCount})
    </Button>
  </BulkActions>
  
  <AppointmentRow>
    <PatientName>Ahmed Khan</PatientName>
    <DateTime>Nov 5, 2025 - 2:00 PM</DateTime>
    <Actions>
      <Button onClick={sendSingleReminder}>
        Send Reminder
      </Button>
    </Actions>
  </AppointmentRow>
</AppointmentTable>

// Cost warning before sending
<Modal>
  You are about to send 45 reminders.
  Estimated cost: PKR 22.50
  Current month spend: PKR 1,250 / PKR 2,000 budget
  
  <Button>Confirm & Send</Button>
  <Button>Cancel</Button>
</Modal>
```

**Cost Tracking:**
```typescript
// Separate tracking for auto vs manual
{
  "costAnalytics": {
    "automatic": {
      "count": 150,
      "cost": 75.00  // PKR
    },
    "manual": {
      "count": 25,
      "cost": 12.50  // PKR
    },
    "total": 87.50  // PKR
  }
}
```

**Business Rules:**
1. ✅ Manual reminders **always allowed** (even if auto-reminders disabled)
2. ✅ Check notification budget before sending (warn if over budget)
3. ✅ Max 100 appointments per bulk request (prevent abuse)
4. ✅ Log who sent manual reminder (audit trail)
5. ✅ Show cost estimate before sending
6. ✅ Track auto vs manual costs separately

**Where to Implement:**
- Backend: `backend/src/routes/reminders.ts` (new manual send endpoint)
- Backend: `backend/src/services/reminderService.ts` (sendManualReminder method)
- Backend: `backend/src/services/notificationCostService.ts` (track manual costs)
- Backend: `backend/prisma/schema.prisma` (add trigger field to AppointmentReminder)
- Frontend: `frontend/src/app/dashboard/appointments/page.tsx` (bulk actions UI)
- Frontend: `frontend/src/components/SendReminderModal.tsx` (cost confirmation modal)

---

## 📋 Implementation Checklist

### Backend Changes:
- [ ] Add SSE endpoint for real-time appointments (`/api/organizations/:orgId/appointments/stream`)
- [ ] Implement EventEmitter for appointment events
- [ ] Add `language` field to NotificationSettings model
- [ ] Add `trigger` field to AppointmentReminder model (AUTOMATIC/MANUAL)
- [ ] Create manual reminder endpoint (`POST /api/reminders/send-manual`)
- [ ] Implement bulk reminder sending logic (max 100)
- [ ] Add cost estimation before manual send
- [ ] Track auto vs manual costs separately
- [ ] Add audit logging for manual reminders (who sent)

### Frontend Changes:
- [ ] Implement SSE client hook for real-time updates
- [ ] Add language dropdown to notification settings
- [ ] Add bulk selection to appointment list
- [ ] Create "Send Reminder" button (single + bulk)
- [ ] Implement cost confirmation modal
- [ ] Show auto vs manual cost breakdown in analytics
- [ ] Add toast notifications for new WhatsApp bookings
- [ ] Handle SSE reconnection on disconnect

### Database Migrations:
- [ ] Add `language` to NotificationSettings (default: "en")
- [ ] Add `trigger` enum to AppointmentReminder
- [ ] Add `sentBy` field to AppointmentReminder
- [ ] Update message_cost_tracking to distinguish auto vs manual

---

## 🎯 Success Criteria

### Real-Time Updates (SSE):
- ✅ Dashboard updates within 1 second of WhatsApp booking
- ✅ SSE connection auto-reconnects on disconnect
- ✅ No polling fallback needed
- ✅ Works across all modern browsers

### Language Preference:
- ✅ Organization can set English or Urdu
- ✅ All WhatsApp messages use org language setting
- ✅ Setting saved and persisted correctly
- ✅ Easy to change via dashboard

### Manual Reminders:
- ✅ Single appointment: Send reminder button works
- ✅ Bulk: Select up to 100 appointments and send
- ✅ Cost estimate shown before sending
- ✅ Budget warning if over limit
- ✅ Auto vs manual costs tracked separately
- ✅ Manual reminders work even if auto disabled
- ✅ Audit log shows who sent manual reminders

---

## 🚀 Next Steps

1. ✅ **ACTION #6 Complete** - Decisions documented
2. 🔄 **ACTION #7** - Notification Settings Integration Review (prepare guide for TASK-040A)
3. 🔄 **Start Phase 3 Implementation**:
   - TASK-039: WhatsApp API setup
   - TASK-040: Message processing pipeline
   - TASK-040A: Notification settings (includes manual reminders)
   - TASK-041: Booking flow (includes SSE endpoint)
   - TASK-042: Auto reminders (hybrid with manual)

---

**Document Version:** 1.0  
**Last Updated:** October 16, 2025  
**Status:** ✅ Ready for Implementation
