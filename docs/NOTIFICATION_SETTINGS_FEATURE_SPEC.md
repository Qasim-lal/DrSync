# WhatsApp Notification Settings - Feature Specification

**Feature Name:** Smart Notification Controls  
**Version:** 1.0  
**Date:** October 13, 2025  
**Priority:** 🔴 HIGH - Cost Optimization Feature  
**Target Phase:** Phase 3 - WhatsApp Integration (TASK-040)  

---

## 📋 Table of Contents

1. [Overview](#1-overview)
2. [Business Value](#2-business-value)
3. [Feature Requirements](#3-feature-requirements)
4. [Settings Interface Design](#4-settings-interface-design)
5. [Database Schema](#5-database-schema)
6. [Implementation Details](#6-implementation-details)
7. [Cost Impact Calculator](#7-cost-impact-calculator)
8. [Default Configurations](#8-default-configurations)
9. [User Education](#9-user-education)
10. [Testing Requirements](#10-testing-requirements)

---

## 1. Overview

### Purpose
Empower clinic administrators to control **which automated WhatsApp messages are sent**, allowing them to:
- Optimize WhatsApp API costs
- Customize communication frequency
- Match their clinic's workflow
- Maintain patient engagement while controlling expenses

### Key Principle
**"Every PKR 3.50 counts - Let clients decide what messages they truly need"**

---

## 2. Business Value

### Why This Feature Matters

#### For Marketing
```
Without Settings:
"DrSync costs PKR 3,000/month + WhatsApp charges"
❓ Clients worry: "How much will WhatsApp really cost?"

With Settings:
"DrSync lets YOU control WhatsApp costs - send only what you need"
✅ Competitive advantage: "Other platforms force you to pay for all messages"
✅ Transparency: "You decide: reminders only = PKR 700/month"
```

#### For Client Retention
```
Scenario: Medium clinic with 800 patients

Default (All Messages ON):
├─ Confirmations: 800 × PKR 3.50 = PKR 2,800
├─ Reminders: 800 × PKR 3.50 = PKR 2,800
└─ Follow-ups: 800 × PKR 3.50 = PKR 2,800
Total: PKR 8,400/month

Optimized (Client chooses Reminders Only):
└─ Reminders: 800 × PKR 3.50 = PKR 2,800
Total: PKR 2,800/month

Savings: PKR 5,600/month (67% reduction!)
```

#### For Small Clinics
```
Micro-clinic (50 patients/month):

Full automation: 50 × 3 messages × PKR 3.50 = PKR 525
Reminders only: 50 × 1 message × PKR 3.50 = PKR 175

Small clinic saves: PKR 350/month
Annual savings: PKR 4,200
```

---

## 3. Feature Requirements

### 3.1 Notification Types (Controllable)

#### Appointment Lifecycle Messages

**1. Booking Confirmation** (Business-Initiated - PKR 3.50)
```
Trigger: When appointment is booked
Default: ON
Cost Impact: HIGH

Example:
"✅ Appointment confirmed!
Date: Oct 15, 2025
Time: 2:00 PM
Doctor: Dr. Ahmed
Location: City Clinic, 123 Main St
Reply CANCEL to cancel"

Client Control:
[ ] Send booking confirmations
    ├─ Include location details
    ├─ Include doctor info
    └─ Include cancellation instructions
```

**2. Appointment Reminder** (Business-Initiated - PKR 3.50)
```
Trigger: 24 hours before appointment
Default: ON (MOST IMPORTANT)
Cost Impact: HIGH

Example:
"🔔 Reminder: You have an appointment tomorrow
Date: Oct 15, 2025
Time: 2:00 PM
Doctor: Dr. Ahmed
Reply CONFIRM to confirm or CANCEL to cancel"

Client Control:
[x] Send appointment reminders (RECOMMENDED)
    ├─ Timing: [24 hours] before appointment
    ├─ Include confirmation request
    └─ Allow rescheduling via reply
```

**3. Pre-Appointment Instructions** (Business-Initiated - PKR 3.50)
```
Trigger: 2 hours before appointment
Default: OFF
Cost Impact: MEDIUM

Example:
"📋 Appointment in 2 hours - Please bring:
• National ID card
• Previous medical reports
• Insurance card (if applicable)
Location: City Clinic, 123 Main St"

Client Control:
[ ] Send pre-appointment instructions
    ├─ Timing: [2 hours] before appointment
    └─ Customize required documents
```

**4. Arrival Notification** (Business-Initiated - PKR 3.50)
```
Trigger: 30 minutes before appointment
Default: OFF
Cost Impact: MEDIUM

Example:
"⏰ Your appointment is in 30 minutes
Please arrive 10 minutes early for check-in
Location: City Clinic, 123 Main St
[View Map]"

Client Control:
[ ] Send arrival notifications
    ├─ Timing: [30 minutes] before
    └─ Include map link
```

**5. Waiting Room Update** (Business-Initiated - PKR 3.50)
```
Trigger: When patient checks in
Default: OFF
Cost Impact: LOW (requires manual check-in)

Example:
"✓ Checked in successfully
Estimated wait time: 15 minutes
Please wait in the waiting area"

Client Control:
[ ] Send waiting room updates
    └─ Show estimated wait time
```

**6. Appointment Completion** (Business-Initiated - PKR 3.50)
```
Trigger: After appointment is marked complete
Default: OFF
Cost Impact: MEDIUM

Example:
"✅ Appointment completed
Thank you for visiting City Clinic!
Next appointment: [if scheduled]
Take care!"

Client Control:
[ ] Send completion acknowledgment
    └─ Include next appointment reminder
```

**7. Post-Appointment Follow-up** (Business-Initiated - PKR 3.50)
```
Trigger: 24 hours after appointment
Default: OFF
Cost Impact: MEDIUM

Example:
"🩺 Follow-up from City Clinic
How are you feeling after your visit?
Reply with any concerns or questions.
We're here to help!"

Client Control:
[ ] Send post-appointment follow-ups
    ├─ Timing: [24 hours] after appointment
    └─ Request feedback
```

**8. Medication Reminders** (Business-Initiated - PKR 3.50)
```
Trigger: Based on prescription schedule
Default: OFF
Cost Impact: HIGH (if enabled for all patients)

Example:
"💊 Medication Reminder
Time to take: Amoxicillin 500mg
Dosage: 1 tablet
Instructions: Take with food"

Client Control:
[ ] Send medication reminders
    ├─ Frequency: [Daily/Twice daily/As prescribed]
    └─ Duration: [7 days/14 days/Custom]
```

#### Rescheduling & Cancellation Messages

**9. Rescheduling Confirmation** (Business-Initiated - PKR 3.50)
```
Trigger: When appointment is rescheduled
Default: ON
Cost Impact: LOW

Example:
"📅 Appointment Rescheduled
Old: Oct 15, 2pm
New: Oct 20, 2pm
Doctor: Dr. Ahmed
Reply CONFIRM to acknowledge"

Client Control:
[x] Send rescheduling confirmations
    └─ Show old and new times
```

**10. Cancellation Confirmation** (Business-Initiated - PKR 3.50)
```
Trigger: When appointment is cancelled
Default: ON
Cost Impact: LOW

Example:
"❌ Appointment Cancelled
Date: Oct 15, 2025, 2pm
Would you like to book a new appointment?
Reply YES to reschedule"

Client Control:
[x] Send cancellation confirmations
    └─ Offer rebooking option
```

#### Administrative Messages

**11. No-Show Follow-up** (Business-Initiated - PKR 3.50)
```
Trigger: When patient misses appointment
Default: OFF
Cost Impact: LOW

Example:
"😞 We missed you at your appointment today
Date: Oct 15, 2pm
Would you like to reschedule?
Reply YES to book a new time"

Client Control:
[ ] Send no-show follow-ups
    ├─ Timing: [Same day/Next day]
    └─ Offer rebooking
```

**12. Payment Reminders** (Business-Initiated - PKR 3.50)
```
Trigger: When payment is pending
Default: OFF
Cost Impact: LOW

Example:
"💳 Payment Reminder
Outstanding balance: Rs. 2,500
Appointment: Oct 15, 2025
Please pay at reception or online"

Client Control:
[ ] Send payment reminders
    └─ Include payment methods
```

---

### 3.2 Smart Bundling Options

**Strategy:** Combine multiple messages into one to save costs

**Option A: Smart Confirmation + Reminder** (1 message = PKR 3.50)
```
Immediate booking response within user-initiated conversation:
"✅ Appointment booked for Oct 15, 2pm
Doctor: Dr. Ahmed
Location: City Clinic, 123 Main St

📋 Please bring:
• National ID
• Previous reports

We'll send you a reminder 24 hours before.
Reply CANCEL anytime to cancel."

Cost: FREE (within user-initiated conversation)
Reminder sent 24 hours before: PKR 3.50
Total: PKR 3.50 (instead of PKR 7.00 for 2 separate messages)
```

**Option B: Reminder + Pre-Instructions** (1 message = PKR 3.50)
```
24 hours before:
"🔔 Appointment Reminder
Tomorrow: Oct 15, 2pm
Doctor: Dr. Ahmed
Location: City Clinic, 123 Main St

📋 Please bring:
• National ID
• Previous reports
• Insurance card

Arrive 10 minutes early for check-in.
Reply CONFIRM to confirm"

Cost: PKR 3.50 (instead of PKR 7.00 for 2 messages)
```

**Option C: Ultra-Minimal** (User-initiated + 1 reminder)
```
Patient books: "I want appointment"
You reply immediately: "Confirmed! Oct 15, 2pm" (FREE - in conversation)

24 hours before: "Reminder: Appointment tomorrow 2pm" (PKR 3.50)

Total cost: PKR 3.50 per patient
Best for budget-conscious clinics
```

---

### 3.3 Advanced Settings

**Conditional Message Rules**

```
Patient Segmentation:
├─ New patients: Send all messages (full onboarding)
├─ Regular patients: Reminders only (they know the drill)
└─ VIP patients: Custom message frequency

Appointment Type Rules:
├─ First consultation: Full messages
├─ Follow-up: Minimal messages
└─ Emergency: Immediate confirmation only

Cost-Based Rules:
├─ Budget mode: Reminders only (PKR 3.50 per patient)
├─ Standard mode: Confirmation + Reminder (PKR 7.00 per patient)
└─ Premium mode: All messages (PKR 10.50+ per patient)
```

---

## 4. Settings Interface Design

### 4.1 Dashboard Settings Page

**Path:** Dashboard → Settings → WhatsApp Notifications

```
┌────────────────────────────────────────────────────────────┐
│  WhatsApp Notification Settings                            │
│                                                            │
│  Control which automated messages are sent to patients    │
│  💡 Tip: Fewer messages = Lower costs                     │
│                                                            │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  📊 Current Cost Estimate                           │  │
│  │                                                     │  │
│  │  Based on your settings:                           │  │
│  │  • 800 patients/month                              │  │
│  │  • 2 messages per patient enabled                  │  │
│  │                                                     │  │
│  │  Estimated WhatsApp cost: PKR 5,600/month         │  │
│  │  (PKR 3.50 × 1,600 messages)                      │  │
│  │                                                     │  │
│  │  [View Cost Breakdown]                             │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                            │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  📋 Quick Presets                                   │  │
│  │                                                     │  │
│  │  ( ) Budget Mode     - Reminders only (PKR 2,800)  │  │
│  │  (•) Recommended     - Confirmation + Reminder     │  │
│  │  ( ) Premium         - All messages enabled        │  │
│  │  ( ) Custom          - Configure manually          │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                            │
│  ──────────────────────────────────────────────────────  │
│                                                            │
│  📅 Appointment Lifecycle Messages                        │
│                                                            │
│  [x] Booking Confirmation                (PKR 3.50 each) │
│      ├─ [x] Include doctor information                   │
│      ├─ [x] Include location details                     │
│      └─ [x] Include cancellation instructions            │
│      💡 Sent within booking conversation = Usually FREE  │
│                                                            │
│  [x] Appointment Reminder           (PKR 3.50 each) 🌟  │
│      ├─ Timing: [24 hours ▼] before appointment         │
│      ├─ [x] Request confirmation                         │
│      └─ [x] Allow rescheduling via reply                 │
│      ⚠️ HIGHLY RECOMMENDED - Reduces no-shows by 60%    │
│                                                            │
│  [ ] Pre-Appointment Instructions        (PKR 3.50 each) │
│      ├─ Timing: [2 hours ▼] before appointment          │
│      └─ [Edit Required Documents]                        │
│      💰 Save PKR 2,800/month by disabling                │
│                                                            │
│  [ ] Arrival Notification                (PKR 3.50 each) │
│      ├─ Timing: [30 minutes ▼] before appointment       │
│      └─ [x] Include map link                             │
│      💰 Save PKR 2,800/month by disabling                │
│                                                            │
│  [ ] Post-Appointment Follow-up          (PKR 3.50 each) │
│      ├─ Timing: [24 hours ▼] after appointment          │
│      └─ [ ] Request feedback                             │
│      💰 Save PKR 2,800/month by disabling                │
│                                                            │
│  [ ] Medication Reminders                (PKR 3.50 each) │
│      ├─ Frequency: [Daily ▼]                             │
│      ├─ Duration: [7 days ▼]                             │
│      └─ ⚠️ Can add significant costs for many patients  │
│      💰 High cost if enabled for all patients            │
│                                                            │
│  ──────────────────────────────────────────────────────  │
│                                                            │
│  🔄 Rescheduling & Cancellation                           │
│                                                            │
│  [x] Rescheduling Confirmation           (PKR 3.50 each) │
│  [x] Cancellation Confirmation           (PKR 3.50 each) │
│                                                            │
│  ──────────────────────────────────────────────────────  │
│                                                            │
│  🚫 No-Show & Administrative                              │
│                                                            │
│  [ ] No-Show Follow-up                   (PKR 3.50 each) │
│      └─ Timing: [Same day ▼]                             │
│                                                            │
│  [ ] Payment Reminders                   (PKR 3.50 each) │
│      └─ Send when payment is pending                     │
│                                                            │
│  ──────────────────────────────────────────────────────  │
│                                                            │
│  🎯 Advanced Options                                      │
│                                                            │
│  [ ] Enable patient segmentation                          │
│      └─ Different settings for new vs regular patients   │
│                                                            │
│  [ ] Smart message bundling                               │
│      └─ Combine multiple messages to save costs          │
│                                                            │
│  ──────────────────────────────────────────────────────  │
│                                                            │
│  [Cancel]  [Save Settings]  [Preview Sample Messages]    │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

---

### 4.2 Cost Impact Calculator (Live Update)

**Real-time cost calculation as client toggles settings:**

```
┌────────────────────────────────────────────────────────────┐
│  💰 Cost Impact Calculator                                 │
│                                                            │
│  Your Clinic Profile:                                      │
│  • Patients per month: [800]                              │
│  • Average appointments per patient: [1.2]                │
│  • Total appointments: 960                                │
│                                                            │
│  ──────────────────────────────────────────────────────  │
│                                                            │
│  Enabled Messages:                                         │
│                                                            │
│  ✓ Booking Confirmation    960 × PKR 3.50 = PKR 3,360    │
│    💡 Often FREE (sent in booking conversation)           │
│                                                            │
│  ✓ Appointment Reminder    960 × PKR 3.50 = PKR 3,360    │
│    ⭐ RECOMMENDED - Reduces no-shows                      │
│                                                            │
│  ✗ Pre-Instructions        (Disabled)    = PKR 0          │
│    💰 SAVING: PKR 3,360/month                             │
│                                                            │
│  ✗ Arrival Notification    (Disabled)    = PKR 0          │
│    💰 SAVING: PKR 3,360/month                             │
│                                                            │
│  ✗ Follow-up               (Disabled)    = PKR 0          │
│    💰 SAVING: PKR 3,360/month                             │
│                                                            │
│  ──────────────────────────────────────────────────────  │
│                                                            │
│  Estimated Monthly Cost:                                   │
│                                                            │
│  WhatsApp Messages:        PKR 6,720                      │
│  DrSync Subscription:      PKR 9,000  (3 doctors)         │
│  ─────────────────────────────────────                   │
│  Total:                    PKR 15,720/month               │
│                                                            │
│  ──────────────────────────────────────────────────────  │
│                                                            │
│  💡 Cost Optimization Suggestions:                         │
│                                                            │
│  • Keep reminders ON - They reduce no-shows              │
│  • Disable pre-instructions - Save PKR 3,360/month       │
│  • Use smart bundling - Combine messages to save 30%     │
│                                                            │
│  Potential Savings: PKR 6,720/month (50% reduction)      │
│                                                            │
│  [Apply Suggestions]                                       │
└────────────────────────────────────────────────────────────┘
```

---

### 4.3 Message Preview

**Show client exactly what patients will receive:**

```
┌────────────────────────────────────────────────────────────┐
│  📱 Message Preview                                        │
│                                                            │
│  See what your patients will receive                      │
│                                                            │
│  ┌──────────────────────────────────────────────┐        │
│  │  WhatsApp                          [•]  [x]   │        │
│  ├──────────────────────────────────────────────┤        │
│  │                                              │        │
│  │  City Clinic                                 │        │
│  │                                              │        │
│  │  ┌────────────────────────────────────┐     │        │
│  │  │ ✅ Appointment Confirmed            │     │        │
│  │  │                                    │     │        │
│  │  │ Date: Oct 15, 2025                 │     │        │
│  │  │ Time: 2:00 PM                      │     │        │
│  │  │ Doctor: Dr. Ahmed                  │     │        │
│  │  │ Location: City Clinic, 123 Main St │     │        │
│  │  │                                    │     │        │
│  │  │ Reply CANCEL to cancel             │     │        │
│  │  │                                    │     │        │
│  │  │ Cost: FREE (in conversation)       │     │        │
│  │  └────────────────────────────────────┘     │        │
│  │  10:05 AM                                   │        │
│  │                                              │        │
│  │  ┌────────────────────────────────────┐     │        │
│  │  │ 🔔 Appointment Reminder             │     │        │
│  │  │                                    │     │        │
│  │  │ Tomorrow: Oct 15, 2pm              │     │        │
│  │  │ Doctor: Dr. Ahmed                  │     │        │
│  │  │ Location: City Clinic              │     │        │
│  │  │                                    │     │        │
│  │  │ Reply CONFIRM to confirm           │     │        │
│  │  │                                    │     │        │
│  │  │ Cost: PKR 3.50                     │     │        │
│  │  └────────────────────────────────────┘     │        │
│  │  Oct 14, 2:00 PM                            │        │
│  │                                              │        │
│  └──────────────────────────────────────────────┘        │
│                                                            │
│  [< Previous]  [Next >]  [Send Test Message]             │
└────────────────────────────────────────────────────────────┘
```

---

## 5. Database Schema

### 5.1 Notification Settings Table

```sql
-- Notification preferences per organization
CREATE TABLE notification_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) UNIQUE NOT NULL,
    
    -- Quick presets
    preset_mode VARCHAR(20) DEFAULT 'recommended', -- budget, recommended, premium, custom
    
    -- Appointment lifecycle
    booking_confirmation_enabled BOOLEAN DEFAULT true,
    booking_confirmation_include_doctor BOOLEAN DEFAULT true,
    booking_confirmation_include_location BOOLEAN DEFAULT true,
    booking_confirmation_include_cancel_instructions BOOLEAN DEFAULT true,
    
    appointment_reminder_enabled BOOLEAN DEFAULT true,
    appointment_reminder_hours_before INTEGER DEFAULT 24,
    appointment_reminder_request_confirmation BOOLEAN DEFAULT true,
    appointment_reminder_allow_rescheduling BOOLEAN DEFAULT true,
    
    pre_appointment_instructions_enabled BOOLEAN DEFAULT false,
    pre_appointment_instructions_hours_before INTEGER DEFAULT 2,
    pre_appointment_custom_instructions TEXT,
    
    arrival_notification_enabled BOOLEAN DEFAULT false,
    arrival_notification_minutes_before INTEGER DEFAULT 30,
    arrival_notification_include_map BOOLEAN DEFAULT true,
    
    waiting_room_update_enabled BOOLEAN DEFAULT false,
    waiting_room_show_wait_time BOOLEAN DEFAULT true,
    
    appointment_completion_enabled BOOLEAN DEFAULT false,
    appointment_completion_include_next_appointment BOOLEAN DEFAULT true,
    
    post_appointment_followup_enabled BOOLEAN DEFAULT false,
    post_appointment_followup_hours_after INTEGER DEFAULT 24,
    post_appointment_request_feedback BOOLEAN DEFAULT false,
    
    medication_reminders_enabled BOOLEAN DEFAULT false,
    medication_reminders_frequency VARCHAR(20) DEFAULT 'daily', -- daily, twice_daily, custom
    medication_reminders_default_duration INTEGER DEFAULT 7, -- days
    
    -- Rescheduling & cancellation
    rescheduling_confirmation_enabled BOOLEAN DEFAULT true,
    rescheduling_show_old_and_new BOOLEAN DEFAULT true,
    
    cancellation_confirmation_enabled BOOLEAN DEFAULT true,
    cancellation_offer_rebooking BOOLEAN DEFAULT true,
    
    -- Administrative
    no_show_followup_enabled BOOLEAN DEFAULT false,
    no_show_followup_timing VARCHAR(20) DEFAULT 'same_day', -- same_day, next_day
    no_show_offer_rebooking BOOLEAN DEFAULT true,
    
    payment_reminders_enabled BOOLEAN DEFAULT false,
    payment_reminders_include_methods BOOLEAN DEFAULT true,
    
    -- Advanced features
    patient_segmentation_enabled BOOLEAN DEFAULT false,
    smart_bundling_enabled BOOLEAN DEFAULT false,
    
    -- Metadata
    estimated_monthly_messages INTEGER DEFAULT 0,
    estimated_monthly_cost DECIMAL(10,2) DEFAULT 0.00,
    last_cost_calculation_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Patient-specific overrides (for segmentation)
CREATE TABLE patient_notification_overrides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES patients(id) NOT NULL,
    organization_id UUID REFERENCES organizations(id) NOT NULL,
    
    -- Override settings
    use_custom_settings BOOLEAN DEFAULT false,
    custom_settings JSONB, -- Stores overridden settings
    
    -- Patient segment
    patient_segment VARCHAR(50), -- new, regular, vip, budget
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(patient_id, organization_id)
);

-- Message cost tracking
CREATE TABLE message_cost_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) NOT NULL,
    
    -- Period
    period_year INTEGER NOT NULL,
    period_month INTEGER NOT NULL,
    
    -- Message counts
    booking_confirmations_sent INTEGER DEFAULT 0,
    appointment_reminders_sent INTEGER DEFAULT 0,
    pre_instructions_sent INTEGER DEFAULT 0,
    arrival_notifications_sent INTEGER DEFAULT 0,
    waiting_room_updates_sent INTEGER DEFAULT 0,
    completion_messages_sent INTEGER DEFAULT 0,
    followup_messages_sent INTEGER DEFAULT 0,
    medication_reminders_sent INTEGER DEFAULT 0,
    rescheduling_confirmations_sent INTEGER DEFAULT 0,
    cancellation_confirmations_sent INTEGER DEFAULT 0,
    no_show_followups_sent INTEGER DEFAULT 0,
    payment_reminders_sent INTEGER DEFAULT 0,
    
    -- Costs (calculated based on message counts)
    total_messages_sent INTEGER DEFAULT 0,
    estimated_cost DECIMAL(10,2) DEFAULT 0.00,
    actual_cost DECIMAL(10,2), -- From Meta billing (if available)
    
    -- Savings
    messages_saved_by_settings INTEGER DEFAULT 0,
    cost_saved DECIMAL(10,2) DEFAULT 0.00,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(organization_id, period_year, period_month)
);

-- Indexes
CREATE INDEX idx_notification_settings_org ON notification_settings(organization_id);
CREATE INDEX idx_patient_overrides_patient ON patient_notification_overrides(patient_id);
CREATE INDEX idx_message_tracking_org_period ON message_cost_tracking(organization_id, period_year, period_month);
```

---

## 6. Implementation Details

### 6.1 Notification Service Enhancement

```typescript
// backend/src/services/notificationSettingsService.ts

interface NotificationContext {
  organizationId: string;
  patientId: string;
  appointmentId: string;
  messageType: NotificationMessageType;
  additionalData?: any;
}

enum NotificationMessageType {
  BOOKING_CONFIRMATION = 'booking_confirmation',
  APPOINTMENT_REMINDER = 'appointment_reminder',
  PRE_INSTRUCTIONS = 'pre_instructions',
  ARRIVAL_NOTIFICATION = 'arrival_notification',
  WAITING_ROOM_UPDATE = 'waiting_room_update',
  APPOINTMENT_COMPLETION = 'appointment_completion',
  POST_FOLLOWUP = 'post_followup',
  MEDICATION_REMINDER = 'medication_reminder',
  RESCHEDULING_CONFIRMATION = 'rescheduling_confirmation',
  CANCELLATION_CONFIRMATION = 'cancellation_confirmation',
  NO_SHOW_FOLLOWUP = 'no_show_followup',
  PAYMENT_REMINDER = 'payment_reminder'
}

class NotificationSettingsService {
  /**
   * Check if a specific notification should be sent
   */
  async shouldSendNotification(context: NotificationContext): Promise<boolean> {
    const settings = await this.getOrganizationSettings(context.organizationId);
    
    // Check patient-specific overrides first
    const patientOverride = await this.getPatientOverride(
      context.patientId,
      context.organizationId
    );
    
    if (patientOverride?.use_custom_settings) {
      return this.checkPatientOverride(patientOverride, context.messageType);
    }
    
    // Use organization default settings
    return this.checkOrganizationSetting(settings, context.messageType);
  }
  
  /**
   * Get organization notification settings
   */
  async getOrganizationSettings(organizationId: string): Promise<NotificationSettings> {
    const prisma = getPrismaClient();
    
    let settings = await prisma.notificationSettings.findUnique({
      where: { organizationId }
    });
    
    // Create default settings if not exist
    if (!settings) {
      settings = await this.createDefaultSettings(organizationId);
    }
    
    return settings;
  }
  
  /**
   * Create default notification settings (Recommended preset)
   */
  async createDefaultSettings(organizationId: string): Promise<NotificationSettings> {
    const prisma = getPrismaClient();
    
    return await prisma.notificationSettings.create({
      data: {
        organizationId,
        presetMode: 'recommended',
        
        // Essentials ON
        bookingConfirmationEnabled: true,
        appointmentReminderEnabled: true,
        reschedulingConfirmationEnabled: true,
        cancellationConfirmationEnabled: true,
        
        // Cost optimizers OFF by default
        preAppointmentInstructionsEnabled: false,
        arrivalNotificationEnabled: false,
        waitingRoomUpdateEnabled: false,
        appointmentCompletionEnabled: false,
        postAppointmentFollowupEnabled: false,
        medicationRemindersEnabled: false,
        noShowFollowupEnabled: false,
        paymentRemindersEnabled: false
      }
    });
  }
  
  /**
   * Calculate estimated monthly cost based on settings
   */
  async calculateEstimatedCost(
    organizationId: string,
    averageMonthlyAppointments: number
  ): Promise<CostEstimate> {
    const settings = await this.getOrganizationSettings(organizationId);
    
    const costPerMessage = 3.50; // PKR
    let totalMessages = 0;
    let breakdown: any = {};
    
    // Count enabled messages
    if (settings.bookingConfirmationEnabled) {
      // Often free (in conversation), but count for worst case
      breakdown.bookingConfirmations = averageMonthlyAppointments;
      // Don't count toward cost if smart bundling enabled
      if (!settings.smartBundlingEnabled) {
        totalMessages += averageMonthlyAppointments;
      }
    }
    
    if (settings.appointmentReminderEnabled) {
      breakdown.reminders = averageMonthlyAppointments;
      totalMessages += averageMonthlyAppointments;
    }
    
    if (settings.preAppointmentInstructionsEnabled) {
      breakdown.preInstructions = averageMonthlyAppointments;
      totalMessages += averageMonthlyAppointments;
    }
    
    if (settings.arrivalNotificationEnabled) {
      breakdown.arrivalNotifications = averageMonthlyAppointments;
      totalMessages += averageMonthlyAppointments;
    }
    
    if (settings.postAppointmentFollowupEnabled) {
      breakdown.followups = averageMonthlyAppointments;
      totalMessages += averageMonthlyAppointments;
    }
    
    if (settings.medicationRemindersEnabled) {
      // Estimate: 30% of patients get medication reminders for 7 days
      const patientsWithMeds = Math.floor(averageMonthlyAppointments * 0.3);
      const daysPerPatient = settings.medicationRemindersDefaultDuration || 7;
      breakdown.medicationReminders = patientsWithMeds * daysPerPatient;
      totalMessages += breakdown.medicationReminders;
    }
    
    // Calculate costs
    const estimatedCost = totalMessages * costPerMessage;
    
    // Calculate potential savings
    const maxMessages = this.calculateMaxPossibleMessages(averageMonthlyAppointments);
    const savedMessages = maxMessages - totalMessages;
    const costSavings = savedMessages * costPerMessage;
    
    return {
      totalMessages,
      estimatedMonthlyCost: estimatedCost,
      breakdown,
      savedMessages,
      costSavings,
      costPerMessage
    };
  }
  
  /**
   * Apply preset configuration
   */
  async applyPreset(
    organizationId: string,
    preset: 'budget' | 'recommended' | 'premium'
  ): Promise<void> {
    const prisma = getPrismaClient();
    
    const presets = {
      budget: {
        // Minimal - Reminders only
        bookingConfirmationEnabled: false,
        appointmentReminderEnabled: true,
        preAppointmentInstructionsEnabled: false,
        arrivalNotificationEnabled: false,
        postAppointmentFollowupEnabled: false,
        smartBundlingEnabled: true
      },
      recommended: {
        // Balanced - Essential messages
        bookingConfirmationEnabled: true,
        appointmentReminderEnabled: true,
        preAppointmentInstructionsEnabled: false,
        arrivalNotificationEnabled: false,
        postAppointmentFollowupEnabled: false,
        reschedulingConfirmationEnabled: true,
        cancellationConfirmationEnabled: true,
        smartBundlingEnabled: true
      },
      premium: {
        // All features enabled
        bookingConfirmationEnabled: true,
        appointmentReminderEnabled: true,
        preAppointmentInstructionsEnabled: true,
        arrivalNotificationEnabled: true,
        appointmentCompletionEnabled: true,
        postAppointmentFollowupEnabled: true,
        reschedulingConfirmationEnabled: true,
        cancellationConfirmationEnabled: true,
        noShowFollowupEnabled: true,
        smartBundlingEnabled: false
      }
    };
    
    await prisma.notificationSettings.update({
      where: { organizationId },
      data: {
        presetMode: preset,
        ...presets[preset],
        updatedAt: new Date()
      }
    });
  }
}
```

---

### 6.2 Integration with WhatsApp Service

```typescript
// backend/src/services/whatsappService.ts (enhancement)

class WhatsAppService {
  /**
   * Send appointment notification (with settings check)
   */
  async sendAppointmentNotification(
    organizationId: string,
    patientId: string,
    appointmentId: string,
    messageType: NotificationMessageType
  ): Promise<void> {
    // Check if notification should be sent based on settings
    const shouldSend = await notificationSettingsService.shouldSendNotification({
      organizationId,
      patientId,
      appointmentId,
      messageType
    });
    
    if (!shouldSend) {
      logger.info(`Notification ${messageType} skipped per settings for org ${organizationId}`);
      
      // Track savings
      await this.trackMessageSaved(organizationId, messageType);
      return;
    }
    
    // Get message content based on settings
    const messageContent = await this.buildMessage(
      organizationId,
      appointmentId,
      messageType
    );
    
    // Get patient phone
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      select: { phone: true }
    });
    
    // Send message
    const result = await this.sendTextMessage(
      organizationId,
      patient.phone,
      messageContent
    );
    
    // Track message sent
    await this.trackMessageSent(organizationId, messageType, result.success);
  }
  
  /**
   * Track message sent for cost analysis
   */
  private async trackMessageSent(
    organizationId: string,
    messageType: NotificationMessageType,
    success: boolean
  ): Promise<void> {
    if (!success) return;
    
    const prisma = getPrismaClient();
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    
    // Get or create tracking record for current month
    const tracking = await prisma.messageCostTracking.upsert({
      where: {
        organizationId_period: {
          organizationId,
          periodYear: year,
          periodMonth: month
        }
      },
      update: {
        // Increment appropriate counter based on message type
        [this.getMessageTypeColumn(messageType)]: {
          increment: 1
        },
        totalMessagesSent: {
          increment: 1
        },
        updatedAt: new Date()
      },
      create: {
        organizationId,
        periodYear: year,
        periodMonth: month,
        [this.getMessageTypeColumn(messageType)]: 1,
        totalMessagesSent: 1
      }
    });
    
    // Update estimated cost
    await this.updateEstimatedCost(organizationId, year, month);
  }
  
  /**
   * Track message saved (not sent due to settings)
   */
  private async trackMessageSaved(
    organizationId: string,
    messageType: NotificationMessageType
  ): Promise<void> {
    const prisma = getPrismaClient();
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    
    await prisma.messageCostTracking.upsert({
      where: {
        organizationId_period: {
          organizationId,
          periodYear: year,
          periodMonth: month
        }
      },
      update: {
        messagesSavedBySettings: {
          increment: 1
        },
        costSaved: {
          increment: 3.50 // PKR per message
        },
        updatedAt: new Date()
      },
      create: {
        organizationId,
        periodYear: year,
        periodMonth: month,
        messagesSavedBySettings: 1,
        costSaved: 3.50
      }
    });
  }
}
```

---

## 7. Cost Impact Calculator

### 7.1 Real-Time Calculator Widget

```typescript
// frontend/src/components/Settings/CostCalculator.tsx

interface CostCalculatorProps {
  organizationId: string;
  currentSettings: NotificationSettings;
  onSettingsChange: (settings: NotificationSettings) => void;
}

export const CostCalculator: React.FC<CostCalculatorProps> = ({
  organizationId,
  currentSettings,
  onSettingsChange
}) => {
  const [monthlyAppointments, setMonthlyAppointments] = useState(0);
  const [costEstimate, setCostEstimate] = useState<CostEstimate | null>(null);
  
  useEffect(() => {
    // Fetch organization's average monthly appointments
    fetchAverageAppointments(organizationId).then(setMonthlyAppointments);
  }, [organizationId]);
  
  useEffect(() => {
    // Recalculate cost whenever settings change
    calculateCost(currentSettings, monthlyAppointments).then(setCostEstimate);
  }, [currentSettings, monthlyAppointments]);
  
  if (!costEstimate) return <Loading />;
  
  return (
    <div className="cost-calculator-widget">
      <h3>💰 Cost Impact Calculator</h3>
      
      <div className="monthly-stats">
        <p>Average monthly appointments: <strong>{monthlyAppointments}</strong></p>
      </div>
      
      <div className="cost-breakdown">
        <h4>Enabled Messages:</h4>
        <ul>
          {currentSettings.appointmentReminderEnabled && (
            <li>
              ✓ Appointment Reminders
              <span className="cost">{monthlyAppointments} × PKR 3.50 = PKR {(monthlyAppointments * 3.50).toLocaleString()}</span>
              <span className="badge recommended">RECOMMENDED</span>
            </li>
          )}
          
          {currentSettings.bookingConfirmationEnabled && (
            <li>
              ✓ Booking Confirmations
              <span className="cost">Often FREE (in conversation)</span>
              <span className="badge info">SMART</span>
            </li>
          )}
          
          {currentSettings.postAppointmentFollowupEnabled && (
            <li>
              ✓ Post-Appointment Follow-ups
              <span className="cost">{monthlyAppointments} × PKR 3.50 = PKR {(monthlyAppointments * 3.50).toLocaleString()}</span>
              <button onClick={() => disableFollowup()}>
                Disable to save PKR {(monthlyAppointments * 3.50).toLocaleString()}/month
              </button>
            </li>
          )}
        </ul>
      </div>
      
      <div className="total-cost">
        <h4>Estimated Monthly Cost:</h4>
        <div className="cost-display">
          <span className="amount">PKR {costEstimate.estimatedMonthlyCost.toLocaleString()}</span>
          <span className="details">({costEstimate.totalMessages} messages)</span>
        </div>
      </div>
      
      {costEstimate.costSavings > 0 && (
        <div className="savings-display">
          <h4>💡 You're Saving:</h4>
          <div className="savings-amount">
            PKR {costEstimate.costSavings.toLocaleString()}/month
          </div>
          <p>({costEstimate.savedMessages} messages disabled)</p>
        </div>
      )}
      
      <div className="optimization-suggestions">
        <h4>💡 Cost Optimization Tips:</h4>
        <OptimizationSuggestions 
          settings={currentSettings}
          estimate={costEstimate}
          onApplySuggestion={onSettingsChange}
        />
      </div>
    </div>
  );
};
```

---

## 8. Default Configurations

### 8.1 Preset Modes

**Budget Mode** (Lowest cost - PKR 3.50 per patient)
```typescript
{
  presetMode: 'budget',
  appointmentReminderEnabled: true,  // Only essential message
  smartBundlingEnabled: true,
  
  // Everything else disabled
  bookingConfirmationEnabled: false,
  preAppointmentInstructionsEnabled: false,
  arrivalNotificationEnabled: false,
  postAppointmentFollowupEnabled: false,
  medicationRemindersEnabled: false
}
```

**Recommended Mode** (Balanced - PKR 7.00 per patient)
```typescript
{
  presetMode: 'recommended',
  bookingConfirmationEnabled: true,    // User-initiated (often FREE)
  appointmentReminderEnabled: true,     // Essential (PKR 3.50)
  reschedulingConfirmationEnabled: true, // Low volume
  cancellationConfirmationEnabled: true, // Low volume
  smartBundlingEnabled: true,
  
  // Cost optimizers disabled
  preAppointmentInstructionsEnabled: false,
  arrivalNotificationEnabled: false,
  postAppointmentFollowupEnabled: false,
  medicationRemindersEnabled: false
}
```

**Premium Mode** (All features - PKR 14-17.50 per patient)
```typescript
{
  presetMode: 'premium',
  bookingConfirmationEnabled: true,
  appointmentReminderEnabled: true,
  preAppointmentInstructionsEnabled: true,
  arrivalNotificationEnabled: true,
  appointmentCompletionEnabled: true,
  postAppointmentFollowupEnabled: true,
  reschedulingConfirmationEnabled: true,
  cancellationConfirmationEnabled: true,
  noShowFollowupEnabled: true,
  smartBundlingEnabled: false  // Send all separate messages
}
```

---

## 9. User Education

### 9.1 In-App Guidance

**Tooltip Examples:**

```
Appointment Reminder: ⚠️ HIGHLY RECOMMENDED
├─ Reduces no-shows by 60%
├─ Costs PKR 3.50 per appointment
└─ Most important message to keep enabled

Pre-Appointment Instructions: 💰 COST OPTIMIZER
├─ Useful but not essential
├─ Consider: Can you include this in the reminder instead?
└─ Disable to save PKR 2,800/month (for 800 patients)

Post-Appointment Follow-up: 💰 OPTIONAL
├─ Great for patient engagement
├─ Not essential for operations
└─ Disable if on tight budget

Medication Reminders: ⚠️ HIGH COST
├─ Very useful for patient compliance
├─ Can add significant costs (daily messages)
└─ Enable selectively for specific patients only
```

---

### 9.2 Setup Wizard

**First-time setup guide:**

```
Step 1: Choose Your Budget

( ) Tight Budget
    → Reminders only
    → Estimated: PKR 2,800/month (for 800 patients)

(•) Balanced (Recommended)
    → Essential messages
    → Estimated: PKR 5,600/month (for 800 patients)

( ) Full Features
    → All messages enabled
    → Estimated: PKR 10,500/month (for 800 patients)

[Next]

───────────────────────────────────────

Step 2: Your Clinic Profile

How many patients do you see monthly?
[800] patients/month

What's your primary goal?
( ) Minimize costs
(•) Balance cost and engagement
( ) Maximum patient communication

[Next]

───────────────────────────────────────

Step 3: Your Configuration

Based on your selection:

✓ Booking Confirmations (FREE - in conversation)
✓ Appointment Reminders (PKR 3.50 each) 🌟
✓ Rescheduling Confirmations (as needed)
✓ Cancellation Confirmations (as needed)

✗ Pre-Appointment Instructions (Save PKR 2,800/month)
✗ Arrival Notifications (Save PKR 2,800/month)
✗ Post-Appointment Follow-ups (Save PKR 2,800/month)

Estimated Cost: PKR 5,600/month

You're saving: PKR 8,400/month compared to full automation!

[Finish Setup]
```

---

## 10. Testing Requirements

### 10.1 Unit Tests

```typescript
describe('NotificationSettingsService', () => {
  describe('shouldSendNotification', () => {
    it('should respect organization settings', async () => {
      // Given
      const settings = {
        appointmentReminderEnabled: false
      };
      
      // When
      const result = await service.shouldSendNotification({
        organizationId: 'org123',
        patientId: 'patient123',
        appointmentId: 'appt123',
        messageType: NotificationMessageType.APPOINTMENT_REMINDER
      });
      
      // Then
      expect(result).toBe(false);
    });
    
    it('should use patient overrides when available', async () => {
      // Test patient-specific settings override organization defaults
    });
  });
  
  describe('calculateEstimatedCost', () => {
    it('should calculate cost correctly for budget mode', async () => {
      // Given
      const monthlyAppointments = 800;
      await service.applyPreset('org123', 'budget');
      
      // When
      const estimate = await service.calculateEstimatedCost('org123', monthlyAppointments);
      
      // Then
      expect(estimate.totalMessages).toBe(800); // Only reminders
      expect(estimate.estimatedMonthlyCost).toBe(2800); // 800 × 3.50
    });
    
    it('should calculate savings correctly', async () => {
      // Test savings calculation
    });
  });
});
```

---

## 11. Marketing Copy

### Website Feature Highlight

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   💰 Smart Cost Controls
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

YOU Control WhatsApp Costs

Unlike other platforms that force you to pay for every
message, DrSync gives you complete control:

✓ Enable only the messages you need
✓ See real-time cost estimates
✓ Save up to 70% on messaging costs
✓ Start with Budget Mode: As low as PKR 2,800/month

Example: 800 patients/month
─────────────────────────────
Other Platforms: PKR 10,500/month (all messages forced)
DrSync (Your Choice): PKR 2,800/month (reminders only)

YOU SAVE: PKR 7,700/month = PKR 92,400/year!

[Start Free Trial]
```

---

## 12. Implementation Timeline

### Phase 1: Core Settings (1 week)
- [ ] Database schema
- [ ] Backend service
- [ ] API endpoints
- [ ] Basic UI (enable/disable toggles)

### Phase 2: Cost Calculator (3 days)
- [ ] Cost estimation logic
- [ ] Real-time calculator widget
- [ ] Preset modes

### Phase 3: Advanced Features (1 week)
- [ ] Patient segmentation
- [ ] Smart bundling
- [ ] Message preview
- [ ] Cost tracking dashboard

### Phase 4: Polish & Testing (3 days)
- [ ] User education tooltips
- [ ] Setup wizard
- [ ] Integration tests
- [ ] Documentation

**Total Estimated Time:** 2.5 weeks

---

**END OF SPECIFICATION**
