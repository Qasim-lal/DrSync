# Notification Settings Integration Guide

**Document Type:** Integration Guide  
**Version:** 1.0  
**Date:** October 16, 2025  
**Task:** ACTION #2 - Phase 3 Pre-Implementation Checklist  
**Related Spec:** `TASK-040A_Notification_Settings_Feature_Spec.md`

---

## 📋 Overview

This guide provides integration instructions for implementing notification settings checks across Phase 3 tasks (TASK-040, TASK-041, TASK-042).

**⚠️ IMPORTANT:** TASK-040A (Notification Settings & Cost Control) is **PLANNING ONLY** - the specification exists but **zero implementation** has been completed. This guide prepares for future integration.

---

## 🎯 Purpose

Once TASK-040A is implemented, these tasks will need to check notification settings before sending WhatsApp messages:

- **TASK-040:** Message Processing Pipeline - Check settings before processing any message
- **TASK-041:** Appointment Booking - Check if booking confirmations are enabled
- **TASK-042:** Automated Reminders - Check which reminder types are enabled

---

## 📊 API Endpoints (When TASK-040A is Implemented)

### 1. Get Organization Notification Settings

**Endpoint:** `GET /api/notification-settings/:organizationId`

**Response:**
```typescript
{
  "organizationId": "org_123",
  "presetMode": "recommended", // "budget" | "recommended" | "premium" | "custom"
  
  // Appointment lifecycle
  "bookingConfirmationEnabled": true,
  "appointmentReminderEnabled": true,
  "appointmentReminderHoursBefore": 24,
  "preAppointmentInstructionsEnabled": false,
  "arrivalNotificationEnabled": false,
  "postAppointmentFollowupEnabled": false,
  
  // Rescheduling & cancellation
  "reschedulingConfirmationEnabled": true,
  "cancellationConfirmationEnabled": true,
  
  // Administrative
  "noShowFollowupEnabled": false,
  "paymentRemindersEnabled": false,
  
  // Advanced
  "smartBundlingEnabled": true,
  "patientSegmentationEnabled": false,
  
  // Cost tracking
  "estimatedMonthlyMessages": 1600,
  "estimatedMonthlyCost": 5600.00
}
```

---

### 2. Check Specific Notification Type

**Endpoint:** `GET /api/notification-settings/:organizationId/check/:notificationType`

**Parameters:**
- `notificationType`: One of the following:
  - `booking_confirmation`
  - `appointment_reminder`
  - `pre_instructions`
  - `arrival_notification`
  - `appointment_completion`
  - `post_followup`
  - `rescheduling_confirmation`
  - `cancellation_confirmation`
  - `no_show_followup`
  - `payment_reminder`

**Response:**
```typescript
{
  "enabled": true,
  "notificationType": "appointment_reminder",
  "settings": {
    "hoursBefore": 24,
    "requestConfirmation": true,
    "allowRescheduling": true
  }
}
```

---

### 3. Check Patient-Level Override

**Endpoint:** `GET /api/notification-settings/:organizationId/patient/:patientId`

**Response:**
```typescript
{
  "patientId": "patient_123",
  "useCustomSettings": false,
  "patientSegment": "regular", // "new" | "regular" | "vip" | "budget"
  "customSettings": null // or object with overridden settings
}
```

---

## 🔧 Integration Code Examples

### Example 1: TASK-040 - Message Processing Pipeline

**File:** `backend/src/services/whatsappMessageProcessor.ts`

```typescript
import notificationSettingsService from './notificationSettingsService';

async function processOutgoingMessage(
  organizationId: string,
  patientId: string,
  messageType: string,
  messageContent: string
): Promise<void> {
  // ✅ STEP 1: Check if notification is enabled for this organization
  const isEnabled = await notificationSettingsService.isNotificationEnabled(
    organizationId,
    messageType
  );

  if (!isEnabled) {
    logger.info(
      `[MessageProcessor] Skipping ${messageType} for org ${organizationId} - disabled in settings`
    );
    
    // ✅ STEP 2: Log skipped message for cost savings tracking
    await logSkippedMessage(organizationId, patientId, messageType, 'disabled_by_org');
    
    return; // Don't send message
  }

  // ✅ STEP 3: Check patient-level overrides
  const patientOverride = await notificationSettingsService.getPatientOverride(
    organizationId,
    patientId
  );

  if (patientOverride?.useCustomSettings) {
    const customEnabled = patientOverride.customSettings[messageType];
    if (!customEnabled) {
      logger.info(
        `[MessageProcessor] Skipping ${messageType} for patient ${patientId} - disabled in patient settings`
      );
      await logSkippedMessage(organizationId, patientId, messageType, 'disabled_by_patient');
      return;
    }
  }

  // ✅ STEP 4: Send message
  await sendWhatsAppMessage(organizationId, patientId, messageContent);

  // ✅ STEP 5: Log sent message for cost tracking
  await logSentMessage(organizationId, patientId, messageType);
}
```

---

### Example 2: TASK-041 - Appointment Booking Confirmation

**File:** `backend/src/services/appointmentBookingService.ts`

```typescript
import notificationSettingsService from './notificationSettingsService';
import googleSheetsSyncService from './googleSheetsSyncService';

async function bookAppointmentViaWhatsApp(
  organizationId: string,
  patientPhone: string,
  appointmentData: any
): Promise<void> {
  // 1. Create appointment in Google Sheets (primary)
  const appointment = await googleSheetsService.createAppointment(
    organizationId,
    appointmentData
  );

  // 2. Sync to PostgreSQL for messaging
  await googleSheetsSyncService.syncAppointment(
    appointment.id,
    organizationId
  );

  // ✅ 3. Check if booking confirmation is enabled
  const settings = await notificationSettingsService.getSettings(organizationId);

  if (settings.bookingConfirmationEnabled) {
    // Build confirmation message
    const message = buildBookingConfirmationMessage(appointment, settings);
    
    // Send confirmation (often FREE if within user-initiated conversation)
    await sendWhatsAppMessage(organizationId, patientPhone, message);
    
    // Log for cost tracking
    await logSentMessage(organizationId, appointment.patientId, 'booking_confirmation');
  } else {
    // Log that we saved a message (cost savings)
    logger.info(`[Booking] Confirmation skipped - saving PKR 3.50`);
    await logSkippedMessage(
      organizationId,
      appointment.patientId,
      'booking_confirmation',
      'disabled_by_org'
    );
  }

  // ✅ 4. Check if smart bundling is enabled
  if (settings.smartBundlingEnabled && settings.appointmentReminderEnabled) {
    // Include reminder preview in booking confirmation to save a message
    logger.info(`[Booking] Smart bundling enabled - including reminder preview`);
  }
}
```

---

### Example 3: TASK-042 - Automated Reminders

**File:** `backend/src/services/reminderSchedulerService.ts`

```typescript
import notificationSettingsService from './notificationSettingsService';
import googleSheetsSyncService from './googleSheetsSyncService';

async function scheduleAppointmentReminders(organizationId: string): Promise<void> {
  // 1. Sync appointments from Google Sheets
  const syncResult = await googleSheetsSyncService.syncAllAppointments(organizationId);
  
  if (!syncResult.success) {
    logger.error(`[Reminders] Failed to sync appointments for ${organizationId}`);
    return;
  }

  // ✅ 2. Get notification settings
  const settings = await notificationSettingsService.getSettings(organizationId);

  if (!settings.appointmentReminderEnabled) {
    logger.info(`[Reminders] Reminders disabled for org ${organizationId}`);
    return; // Don't process reminders
  }

  // 3. Get appointments needing reminders
  const hoursBefore = settings.appointmentReminderHoursBefore || 24;
  const reminderTime = new Date(Date.now() + hoursBefore * 60 * 60 * 1000);

  const appointments = await getAppointmentsNeedingReminders(
    organizationId,
    reminderTime
  );

  logger.info(
    `[Reminders] Found ${appointments.length} appointments needing reminders for ${organizationId}`
  );

  // 4. Send reminders for each appointment
  for (const appointment of appointments) {
    try {
      // ✅ Check patient-level override
      const patientOverride = await notificationSettingsService.getPatientOverride(
        organizationId,
        appointment.patientId
      );

      if (patientOverride?.useCustomSettings && !patientOverride.customSettings.appointmentReminder) {
        logger.info(`[Reminders] Skipped for patient ${appointment.patientId} - custom settings`);
        await logSkippedMessage(
          organizationId,
          appointment.patientId,
          'appointment_reminder',
          'disabled_by_patient'
        );
        continue;
      }

      // Build reminder message
      const message = buildReminderMessage(appointment, settings);

      // Send reminder (COST: PKR 3.50)
      await sendWhatsAppMessage(organizationId, appointment.patientPhone, message);

      // Log for cost tracking
      await logSentMessage(organizationId, appointment.patientId, 'appointment_reminder');

      // Mark reminder as sent in appointment_reminders table
      await markReminderSent(appointment.id, 'appointment_reminder');

    } catch (error) {
      logger.error(`[Reminders] Failed to send reminder for appointment ${appointment.id}:`, error);
    }
  }
}
```

---

## 💰 Cost Tracking Integration

### Log Sent Message

```typescript
async function logSentMessage(
  organizationId: string,
  patientId: string,
  messageType: string
): Promise<void> {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  await prisma.messageCostTracking.upsert({
    where: {
      organizationId_period: {
        organizationId,
        periodYear: year,
        periodMonth: month,
      },
    },
    update: {
      [getMessageTypeColumn(messageType)]: { increment: 1 },
      totalMessagesSent: { increment: 1 },
      estimatedCost: { increment: 3.50 }, // PKR per message
      updatedAt: new Date(),
    },
    create: {
      organizationId,
      periodYear: year,
      periodMonth: month,
      [getMessageTypeColumn(messageType)]: 1,
      totalMessagesSent: 1,
      estimatedCost: 3.50,
    },
  });
}
```

### Log Skipped Message (Cost Savings)

```typescript
async function logSkippedMessage(
  organizationId: string,
  patientId: string,
  messageType: string,
  skipReason: string
): Promise<void> {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  await prisma.messageCostTracking.upsert({
    where: {
      organizationId_period: {
        organizationId,
        periodYear: year,
        periodMonth: month,
      },
    },
    update: {
      messagesSavedBySettings: { increment: 1 },
      costSaved: { increment: 3.50 }, // PKR saved per skipped message
      updatedAt: new Date(),
    },
    create: {
      organizationId,
      periodYear: year,
      periodMonth: month,
      messagesSavedBySettings: 1,
      costSaved: 3.50,
    },
  });

  logger.info(
    `[CostTracking] Saved PKR 3.50 by skipping ${messageType} for org ${organizationId} (${skipReason})`
  );
}
```

### Helper: Get Message Type Column

```typescript
function getMessageTypeColumn(messageType: string): string {
  const columnMap: Record<string, string> = {
    'booking_confirmation': 'bookingConfirmationsSent',
    'appointment_reminder': 'appointmentRemindersSent',
    'pre_instructions': 'preInstructionsSent',
    'arrival_notification': 'arrivalNotificationsSent',
    'appointment_completion': 'completionMessagesSent',
    'post_followup': 'followupMessagesSent',
    'rescheduling_confirmation': 'reschedulingConfirmationsSent',
    'cancellation_confirmation': 'cancellationConfirmationsSent',
    'no_show_followup': 'noShowFollowupsSent',
    'payment_reminder': 'paymentRemindersSent',
  };

  return columnMap[messageType] || 'totalMessagesSent';
}
```

---

## 🔒 Patient-Level Overrides

When checking if a message should be sent, always check both organization-level and patient-level settings:

```typescript
async function shouldSendNotification(
  organizationId: string,
  patientId: string,
  messageType: string
): Promise<boolean> {
  // 1. Get organization settings
  const orgSettings = await notificationSettingsService.getSettings(organizationId);
  
  // Check if enabled at org level
  const orgEnabled = orgSettings[`${messageType}Enabled`];
  if (!orgEnabled) {
    return false; // Disabled at org level
  }

  // 2. Check patient-level override
  const patientOverride = await notificationSettingsService.getPatientOverride(
    organizationId,
    patientId
  );

  if (patientOverride?.useCustomSettings) {
    // Patient has custom settings - use those instead
    const patientEnabled = patientOverride.customSettings[messageType];
    return patientEnabled || false;
  }

  // No patient override - use org settings
  return true;
}
```

---

## 📋 Integration Checklist

### For TASK-040 (Message Processing Pipeline)

- [ ] Import `notificationSettingsService`
- [ ] Check settings before processing **any** outgoing message
- [ ] Implement `shouldSendNotification()` helper
- [ ] Log sent messages with `logSentMessage()`
- [ ] Log skipped messages with `logSkippedMessage()`
- [ ] Handle patient-level overrides
- [ ] Test with all 12 notification types

### For TASK-041 (Appointment Booking)

- [ ] Import `notificationSettingsService`
- [ ] Check if `bookingConfirmationEnabled` before sending confirmation
- [ ] Implement smart bundling (combine booking + reminder preview)
- [ ] Log sent/skipped booking confirmations
- [ ] Sync to PostgreSQL via `googleSheetsSyncService.syncAppointment()`
- [ ] Test booking flow with confirmations ON and OFF

### For TASK-042 (Automated Reminders)

- [ ] Import `notificationSettingsService`
- [ ] Check if `appointmentReminderEnabled` before processing reminders
- [ ] Check `appointmentReminderHoursBefore` setting (default: 24)
- [ ] Sync from Google Sheets via `googleSheetsSyncService.syncAllAppointments()`
- [ ] Handle patient-level notification preferences
- [ ] Log sent/skipped reminders
- [ ] Test reminder scheduler with settings ON and OFF

---

## 🧪 Testing Guidelines

### Test Scenario 1: Notifications Disabled

```typescript
// Setup
await setNotificationSettings(orgId, {
  appointmentReminderEnabled: false,
});

// Book appointment
const appointment = await bookAppointment(orgId, patientData);

// Verify
const costTracking = await getCostTracking(orgId);
expect(costTracking.messagesSavedBySettings).toBe(1);
expect(costTracking.costSaved).toBe(3.50);
```

### Test Scenario 2: Notifications Enabled

```typescript
// Setup
await setNotificationSettings(orgId, {
  appointmentReminderEnabled: true,
  appointmentReminderHoursBefore: 24,
});

// Book appointment
const appointment = await bookAppointment(orgId, patientData);

// Verify reminder scheduled
const reminders = await getScheduledReminders(appointment.id);
expect(reminders.length).toBe(1);
expect(reminders[0].scheduledFor).toBe(appointment.scheduledAt - 24 hours);
```

### Test Scenario 3: Patient Override

```typescript
// Setup org settings (enabled)
await setNotificationSettings(orgId, {
  appointmentReminderEnabled: true,
});

// Setup patient override (disabled)
await setPatientOverride(orgId, patientId, {
  useCustomSettings: true,
  customSettings: {
    appointmentReminder: false,
  },
});

// Book appointment
const appointment = await bookAppointment(orgId, patientData);

// Verify reminder NOT sent
const costTracking = await getCostTracking(orgId);
expect(costTracking.messagesSavedBySettings).toBe(1);
```

---

## 🚨 Error Handling

### Graceful Fallback

If notification settings service is unavailable, default to sending critical messages only:

```typescript
async function shouldSendNotificationWithFallback(
  organizationId: string,
  patientId: string,
  messageType: string
): Promise<boolean> {
  try {
    return await shouldSendNotification(organizationId, patientId, messageType);
  } catch (error) {
    logger.error(`[NotificationSettings] Failed to check settings:`, error);
    
    // Fallback: Only send critical messages
    const criticalMessages = [
      'appointment_reminder',
      'rescheduling_confirmation',
      'cancellation_confirmation',
    ];
    
    return criticalMessages.includes(messageType);
  }
}
```

---

## 📊 Monitoring & Analytics

### Track Cost Savings

```typescript
async function getCostSavingsReport(
  organizationId: string,
  month: number,
  year: number
): Promise<{
  totalSent: number;
  totalSkipped: number;
  actualCost: number;
  costSaved: number;
  savingsPercentage: number;
}> {
  const tracking = await prisma.messageCostTracking.findUnique({
    where: {
      organizationId_period: {
        organizationId,
        periodYear: year,
        periodMonth: month,
      },
    },
  });

  if (!tracking) {
    return {
      totalSent: 0,
      totalSkipped: 0,
      actualCost: 0,
      costSaved: 0,
      savingsPercentage: 0,
    };
  }

  const totalPossible = tracking.totalMessagesSent + tracking.messagesSavedBySettings;
  const savingsPercentage = totalPossible > 0
    ? (tracking.messagesSavedBySettings / totalPossible) * 100
    : 0;

  return {
    totalSent: tracking.totalMessagesSent,
    totalSkipped: tracking.messagesSavedBySettings,
    actualCost: tracking.estimatedCost,
    costSaved: tracking.costSaved,
    savingsPercentage,
  };
}
```

---

## 🔗 Related Documents

- **Feature Specification:** `TASK-040A_Notification_Settings_Feature_Spec.md` (1,485 lines - planning complete)
- **Task Tracking:** `DrSync_Task_Tracking.md` (TASK-040A status)
- **Pre-Implementation Checklist:** `PHASE-3_PRE_IMPLEMENTATION_CHECKLIST.md`

---

## ⚠️ Implementation Status

**Current Status:** This is an integration guide for **future implementation**.

**TASK-040A Status:**
- ✅ Specification: 100% complete (1,485 lines)
- ❌ Database schema: NOT implemented (3 tables missing)
- ❌ Backend services: NOT implemented
- ❌ API endpoints: NOT implemented
- ❌ Tests: NOT implemented

**Next Steps:**
1. Complete TASK-039 (WhatsApp Business API Configuration)
2. Complete TASK-040 (Message Processing Pipeline)
3. Implement TASK-040A (Notification Settings)
4. Use this guide to integrate notification checks

---

**Document Version:** 1.0  
**Created:** October 16, 2025  
**Last Updated:** October 16, 2025  
**Author:** DrSync Development Team  
**Task:** ACTION #2 - Phase 3 Pre-Implementation Checklist

---

**END OF GUIDE**
