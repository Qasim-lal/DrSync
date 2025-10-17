# Notification Settings Integration Workshop
## ACTION #7: TASK-040A Implementation Integration Guide

**Meeting Type:** Technical Workshop (Priority 3)  
**Date:** October 16, 2025  
**Duration:** 1 hour  
**Status:** 📋 Workshop Guide Prepared

---

## 👥 Participants

Since we're building this together (you and me), this workshop document serves as a **comprehensive implementation guide** for integrating notification settings across all Phase 3 tasks.

---

## 🎯 Workshop Objectives

1. **Understand notification settings architecture** from ACTION #2 guide
2. **Review ACTION #6 decisions** (SSE, org-level language, manual reminders)
3. **Define integration points** for TASK-040, 041, 042
4. **Walk through code examples** for each integration scenario
5. **Clarify cost tracking** for auto vs manual reminders
6. **Establish testing strategy** for notification settings

---

## 📋 Agenda

### 1. Architecture Overview (10 minutes)

#### 1.1 System Components

```
┌─────────────────────────────────────────────────────────────┐
│                    WhatsApp Message Flow                     │
└─────────────────────────────────────────────────────────────┘

1. WhatsApp Incoming Message (Patient → System)
   ↓
2. TASK-040: Message Processing Pipeline
   ├─ Check notification settings (is response allowed?)
   ├─ Process intent (booking, query, confirmation)
   └─ Route to appropriate handler
   
3. TASK-041: Appointment Booking
   ├─ Write to Google Sheets (primary)
   ├─ Sync to PostgreSQL (via shared sync service)
   ├─ Check if booking confirmation enabled
   └─ Send confirmation (if enabled) or skip (log cost savings)
   ↓
   └─ Emit SSE event → Dashboard updates in real-time
   
4. TASK-042: Automated Reminders (Hourly Job)
   ├─ Query upcoming appointments from PostgreSQL
   ├─ Check if auto-reminders enabled per org
   ├─ Send reminders (if enabled) or skip
   └─ Log cost tracking (auto vs manual)
   
5. Manual Reminders (New: ACTION #6 Decision)
   ├─ Doctor selects appointments in dashboard
   ├─ Frontend calls POST /api/reminders/send-manual
   ├─ Backend checks budget, sends reminders
   └─ Log cost tracking separately from auto reminders
```

#### 1.2 Database Schema Summary

```prisma
// TASK-040A: Notification Settings
model NotificationSettings {
  id                          String   @id @default(uuid())
  organizationId              String   @unique
  
  // Core settings
  bookingConfirmations        Boolean  @default(true)
  appointmentReminders        Boolean  @default(true)
  cancellationConfirmations   Boolean  @default(true)
  rescheduleConfirmations     Boolean  @default(true)
  followUpMessages            Boolean  @default(false)
  
  // ACTION #6 Decision: Org-level language
  language                    String   @default("en") // "en" | "ur"
  
  // Cost control
  monthlyBudget               Decimal? @db.Decimal(10, 2)
  budgetWarningThreshold      Int?     @default(80) // Warn at 80%
  
  organization                Organization @relation(...)
  createdAt                   DateTime @default(now())
  updatedAt                   DateTime @updatedAt
}

// ACTION #3: Appointment Reminders (Updated)
enum ReminderTrigger {
  AUTOMATIC    // Scheduled by system (TASK-042)
  MANUAL       // Sent manually by doctor (ACTION #6)
}

model AppointmentReminder {
  id             String          @id @default(uuid())
  organizationId String
  appointmentId  String
  reminderType   ReminderType    // CONFIRMATION, REMINDER_24H, etc.
  trigger        ReminderTrigger @default(AUTOMATIC)  // ACTION #6
  sentBy         String?         // User ID who sent (for MANUAL)
  scheduledFor   DateTime
  sentAt         DateTime?
  status         ReminderStatus  // SCHEDULED, SENT, FAILED, SKIPPED
  messageId      String?
  skipReason     String?         // "auto_reminders_disabled", "over_budget"
  cost           Decimal?        @db.Decimal(10, 2)
  
  organization   Organization @relation(...)
  appointment    Appointment @relation(...)
  
  @@index([organizationId, scheduledFor])
  @@index([status, scheduledFor])
  @@index([trigger]) // New index for auto vs manual filtering
}

// Message Cost Tracking
model MessageCostTracking {
  id             String   @id @default(uuid())
  organizationId String
  messageType    String   // "booking_confirmation", "reminder_24h", etc.
  trigger        String   // "automatic" | "manual"
  sent           Boolean  // true = sent, false = skipped
  skipReason     String?  // "disabled_in_settings", "over_budget"
  cost           Decimal? @db.Decimal(10, 2)
  sentAt         DateTime @default(now())
  
  @@index([organizationId, sentAt])
  @@index([trigger]) // Filter by auto vs manual
}
```

---

### 2. Integration Point #1: TASK-040 Message Processing (15 minutes)

#### 2.1 Check Before Sending ANY WhatsApp Message

**File:** `backend/src/services/whatsappMessageProcessor.ts`

```typescript
import { NotificationSettingsService } from './notificationSettingsService';
import { MessageCostTrackingService } from './messageCostTrackingService';

class WhatsAppMessageProcessor {
  private notificationSettings: NotificationSettingsService;
  private costTracking: MessageCostTrackingService;
  
  /**
   * Central method to send ANY WhatsApp message
   * All messages MUST go through this to respect settings
   */
  async sendMessage(
    organizationId: string,
    patientPhone: string,
    messageType: 'booking_confirmation' | 'appointment_reminder' | 'cancellation' | 'reschedule',
    messageContent: string,
    trigger: 'automatic' | 'manual' = 'automatic',
    sentBy?: string
  ): Promise<{ sent: boolean; reason?: string; cost?: number }> {
    
    // STEP 1: Get organization notification settings
    const settings = await this.notificationSettings.get(organizationId);
    
    // STEP 2: Check if this message type is enabled
    const isEnabled = this.isMessageTypeEnabled(settings, messageType);
    
    if (!isEnabled) {
      // Message disabled - log cost savings
      await this.costTracking.logSkippedMessage({
        organizationId,
        messageType,
        trigger,
        skipReason: 'disabled_in_settings',
        potentialCost: 0.50 // PKR per message
      });
      
      return { sent: false, reason: 'disabled_in_settings' };
    }
    
    // STEP 3: Check budget (if manual trigger, warn but allow)
    const budgetCheck = await this.costTracking.checkBudget(organizationId);
    
    if (budgetCheck.overBudget && trigger === 'automatic') {
      // Auto messages: stop if over budget
      await this.costTracking.logSkippedMessage({
        organizationId,
        messageType,
        trigger,
        skipReason: 'over_budget',
        potentialCost: 0.50
      });
      
      return { sent: false, reason: 'over_budget' };
    }
    
    // STEP 4: Get organization language (ACTION #6 decision)
    const language = settings.language; // "en" | "ur"
    const localizedContent = this.translateMessage(messageContent, language);
    
    // STEP 5: Send message via WhatsApp API
    try {
      const result = await this.whatsappClient.sendMessage({
        to: patientPhone,
        message: localizedContent,
        organizationId
      });
      
      // STEP 6: Log successful send for cost tracking
      await this.costTracking.logSentMessage({
        organizationId,
        messageType,
        trigger,
        cost: 0.50, // PKR
        messageId: result.messageId,
        sentBy
      });
      
      return { sent: true, cost: 0.50 };
      
    } catch (error) {
      // Log failed send
      await this.costTracking.logFailedMessage({
        organizationId,
        messageType,
        trigger,
        error: error.message
      });
      
      throw error;
    }
  }
  
  /**
   * Check if specific message type is enabled
   */
  private isMessageTypeEnabled(
    settings: NotificationSettings,
    messageType: string
  ): boolean {
    const mapping = {
      'booking_confirmation': settings.bookingConfirmations,
      'appointment_reminder': settings.appointmentReminders,
      'cancellation': settings.cancellationConfirmations,
      'reschedule': settings.rescheduleConfirmations,
      'followup': settings.followUpMessages
    };
    
    return mapping[messageType] ?? false;
  }
  
  /**
   * Translate message based on org language (ACTION #6)
   */
  private translateMessage(message: string, language: string): string {
    if (language === 'ur') {
      // Use Urdu templates
      return this.urduTemplates.translate(message);
    }
    return message; // English
  }
}
```

**Key Points:**
- ✅ **All messages** go through this central method
- ✅ Checks notification settings before every send
- ✅ Respects org-level language (ACTION #6)
- ✅ Tracks auto vs manual separately
- ✅ Logs cost savings when messages skipped

---

### 3. Integration Point #2: TASK-041 Booking Confirmation (15 minutes)

#### 3.1 Appointment Booking Flow with SSE

**File:** `backend/src/services/appointmentBookingService.ts`

```typescript
import { EventEmitter } from 'events';
import { GoogleSheetsSyncService } from './googleSheetsSyncService';
import { WhatsAppMessageProcessor } from './whatsappMessageProcessor';

// Global event emitter for SSE (ACTION #6 decision)
export const appointmentEmitter = new EventEmitter();

class AppointmentBookingService {
  private googleSheetsSync: GoogleSheetsSyncService;
  private messageProcessor: WhatsAppMessageProcessor;
  
  /**
   * Book appointment via WhatsApp
   * Flow: Google Sheets (primary) → PostgreSQL (sync) → Confirmation
   */
  async bookAppointmentViaWhatsApp(
    organizationId: string,
    patientPhone: string,
    appointmentData: {
      patientName: string;
      date: string;
      time: string;
      appointmentType: string;
      notes?: string;
    }
  ): Promise<Appointment> {
    
    // STEP 1: Write to Google Sheets (primary data source)
    const googleSheetsAppointment = await this.googleSheets.createAppointment({
      organizationId,
      ...appointmentData,
      source: 'whatsapp',
      status: 'confirmed'
    });
    
    // STEP 2: Sync to PostgreSQL (for messaging + dashboard)
    const appointment = await this.googleSheetsSync.syncAppointment(
      googleSheetsAppointment.id,
      organizationId
    );
    
    // STEP 3: Emit SSE event for real-time dashboard update (ACTION #6)
    appointmentEmitter.emit(`appointment:new:${organizationId}`, {
      id: appointment.id,
      patientName: appointment.patientName,
      patientPhone: appointment.patientPhone,
      date: appointment.date,
      time: appointment.time,
      status: appointment.status,
      source: 'whatsapp',
      notificationSent: false, // Will update after sending
      createdAt: appointment.createdAt
    });
    
    // STEP 4: Send booking confirmation (respects notification settings)
    const confirmationMessage = this.buildConfirmationMessage(appointment);
    
    const result = await this.messageProcessor.sendMessage(
      organizationId,
      patientPhone,
      'booking_confirmation',
      confirmationMessage,
      'automatic' // Auto trigger for booking confirmations
    );
    
    // STEP 5: Update appointment with notification status
    if (result.sent) {
      await this.updateAppointment(appointment.id, {
        notificationSent: true,
        notificationCost: result.cost
      });
      
      // Emit updated status to dashboard
      appointmentEmitter.emit(`appointment:updated:${organizationId}`, {
        id: appointment.id,
        notificationSent: true
      });
    }
    
    // STEP 6: Schedule 24-hour reminder (if enabled)
    await this.scheduleReminder(appointment);
    
    return appointment;
  }
  
  /**
   * Schedule automatic reminder (respects settings)
   */
  private async scheduleReminder(appointment: Appointment): Promise<void> {
    // Check if auto-reminders enabled
    const settings = await this.notificationSettings.get(appointment.organizationId);
    
    if (!settings.appointmentReminders) {
      // Auto-reminders disabled - skip scheduling
      await prisma.appointmentReminder.create({
        data: {
          organizationId: appointment.organizationId,
          appointmentId: appointment.id,
          reminderType: 'REMINDER_24H',
          trigger: 'AUTOMATIC',
          scheduledFor: new Date(appointment.date.getTime() - 24 * 60 * 60 * 1000),
          status: 'SKIPPED',
          skipReason: 'auto_reminders_disabled'
        }
      });
      return;
    }
    
    // Schedule reminder
    await prisma.appointmentReminder.create({
      data: {
        organizationId: appointment.organizationId,
        appointmentId: appointment.id,
        reminderType: 'REMINDER_24H',
        trigger: 'AUTOMATIC',
        scheduledFor: new Date(appointment.date.getTime() - 24 * 60 * 60 * 1000),
        status: 'SCHEDULED'
      }
    });
  }
  
  /**
   * Build confirmation message based on language
   */
  private buildConfirmationMessage(appointment: Appointment): string {
    // Will be translated by messageProcessor based on org language
    return `Your appointment is confirmed for ${appointment.date} at ${appointment.time}. 
            Type CANCEL to cancel or RESCHEDULE to change time.`;
  }
}
```

**SSE Endpoint for Real-Time Updates:**

**File:** `backend/src/routes/appointments.ts`

```typescript
import { appointmentEmitter } from '../services/appointmentBookingService';
import { authenticate } from '../middleware/auth';

router.get(
  '/organizations/:orgId/appointments/stream',
  authenticate,
  (req: Request, res: Response) => {
    const { orgId } = req.params;
    
    // Verify user has access to this org
    if (req.user!.organizationId !== orgId) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    
    // Setup SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
    
    // Send initial connection confirmation
    res.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);
    
    // Listen for new appointments
    const newAppointmentHandler = (appointment: any) => {
      res.write(`data: ${JSON.stringify({ 
        type: 'appointment:new',
        data: appointment 
      })}\n\n`);
    };
    
    // Listen for appointment updates
    const updateAppointmentHandler = (update: any) => {
      res.write(`data: ${JSON.stringify({ 
        type: 'appointment:updated',
        data: update 
      })}\n\n`);
    };
    
    appointmentEmitter.on(`appointment:new:${orgId}`, newAppointmentHandler);
    appointmentEmitter.on(`appointment:updated:${orgId}`, updateAppointmentHandler);
    
    // Cleanup on client disconnect
    req.on('close', () => {
      appointmentEmitter.removeListener(`appointment:new:${orgId}`, newAppointmentHandler);
      appointmentEmitter.removeListener(`appointment:updated:${orgId}`, updateAppointmentHandler);
      res.end();
    });
  }
);
```

**Frontend SSE Client:**

**File:** `frontend/src/hooks/useRealtimeAppointments.ts`

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
        // Add new appointment to list
        setAppointments(prev => [message.data, ...prev]);
        
        // Show notification
        showToast({
          title: 'New WhatsApp Booking',
          description: `${message.data.patientName} - ${message.data.time}`,
          variant: 'success'
        });
        
        // Play notification sound
        new Audio('/notification.mp3').play();
      }
      
      if (message.type === 'appointment:updated') {
        // Update existing appointment
        setAppointments(prev => prev.map(apt => 
          apt.id === message.data.id 
            ? { ...apt, ...message.data }
            : apt
        ));
      }
    };
    
    eventSource.onerror = (error) => {
      console.error('[SSE] Connection error:', error);
      eventSource.close();
      
      // Auto-reconnect after 5 seconds
      setTimeout(() => {
        window.location.reload();
      }, 5000);
      
      showToast({
        title: 'Connection Lost',
        description: 'Reconnecting in 5 seconds...',
        variant: 'warning'
      });
    };
    
    // Cleanup on unmount
    return () => {
      eventSource.close();
    };
  }, [organizationId]);
  
  return { appointments, setAppointments };
}
```

**Key Points:**
- ✅ Google Sheets → PostgreSQL → Confirmation flow
- ✅ Real-time SSE updates to dashboard (ACTION #6)
- ✅ Respects notification settings before sending
- ✅ Schedules auto-reminder (if enabled)
- ✅ Tracks costs separately

---

### 4. Integration Point #3: TASK-042 Auto Reminders + Manual Reminders (20 minutes)

#### 4.1 Automated Reminder Job (Hourly Cron)

**File:** `backend/src/jobs/reminderJob.ts`

```typescript
import cron from 'node-cron';
import { WhatsAppMessageProcessor } from '../services/whatsappMessageProcessor';

class ReminderJob {
  private messageProcessor: WhatsAppMessageProcessor;
  
  /**
   * Run every hour to send scheduled reminders
   */
  start() {
    cron.schedule('0 * * * *', async () => {
      console.log('[ReminderJob] Running hourly reminder check...');
      await this.processScheduledReminders();
    });
  }
  
  /**
   * Process all scheduled reminders for this hour
   */
  private async processScheduledReminders(): Promise<void> {
    const now = new Date();
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
    
    // Get all SCHEDULED reminders due within next hour
    const reminders = await prisma.appointmentReminder.findMany({
      where: {
        status: 'SCHEDULED',
        trigger: 'AUTOMATIC', // Only auto reminders
        scheduledFor: {
          gte: now,
          lte: oneHourFromNow
        }
      },
      include: {
        appointment: {
          include: {
            patient: true,
            organization: true
          }
        }
      }
    });
    
    console.log(`[ReminderJob] Found ${reminders.length} reminders to send`);
    
    // Process each reminder
    for (const reminder of reminders) {
      await this.sendReminder(reminder);
    }
  }
  
  /**
   * Send individual reminder (respects notification settings)
   */
  private async sendReminder(reminder: any): Promise<void> {
    const { appointment } = reminder;
    
    // Check if auto-reminders are enabled for this org
    const settings = await this.notificationSettings.get(
      appointment.organizationId
    );
    
    if (!settings.appointmentReminders) {
      // Auto-reminders disabled - mark as skipped
      await prisma.appointmentReminder.update({
        where: { id: reminder.id },
        data: {
          status: 'SKIPPED',
          skipReason: 'auto_reminders_disabled',
          sentAt: new Date()
        }
      });
      
      console.log(
        `[ReminderJob] Skipped reminder ${reminder.id} - auto-reminders disabled`
      );
      return;
    }
    
    // Build reminder message
    const message = this.buildReminderMessage(
      appointment,
      reminder.reminderType
    );
    
    // Send via message processor (handles language, budget, logging)
    try {
      const result = await this.messageProcessor.sendMessage(
        appointment.organizationId,
        appointment.patient.phone,
        'appointment_reminder',
        message,
        'automatic' // Auto trigger
      );
      
      if (result.sent) {
        // Mark as sent
        await prisma.appointmentReminder.update({
          where: { id: reminder.id },
          data: {
            status: 'SENT',
            sentAt: new Date(),
            cost: result.cost
          }
        });
        
        console.log(`[ReminderJob] Sent reminder ${reminder.id}`);
      } else {
        // Mark as skipped (over budget, etc.)
        await prisma.appointmentReminder.update({
          where: { id: reminder.id },
          data: {
            status: 'SKIPPED',
            skipReason: result.reason,
            sentAt: new Date()
          }
        });
      }
      
    } catch (error) {
      // Mark as failed
      await prisma.appointmentReminder.update({
        where: { id: reminder.id },
        data: {
          status: 'FAILED',
          skipReason: error.message,
          sentAt: new Date()
        }
      });
      
      console.error(`[ReminderJob] Failed to send reminder ${reminder.id}:`, error);
    }
  }
  
  /**
   * Build reminder message
   */
  private buildReminderMessage(appointment: any, type: string): string {
    if (type === 'REMINDER_24H') {
      return `Reminder: Your appointment is tomorrow at ${appointment.time}. 
              Reply CONFIRM to confirm or RESCHEDULE to change time.`;
    }
    
    if (type === 'REMINDER_1H') {
      return `Your appointment is in 1 hour at ${appointment.time}. 
              See you soon!`;
    }
    
    return `Appointment reminder: ${appointment.date} at ${appointment.time}`;
  }
}

// Start job on server startup
export const reminderJob = new ReminderJob();
reminderJob.start();
```

#### 4.2 Manual Reminder Sending (ACTION #6 Decision)

**File:** `backend/src/routes/reminders.ts`

```typescript
import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { WhatsAppMessageProcessor } from '../services/whatsappMessageProcessor';

const router = Router();

/**
 * Send manual reminders (ACTION #6)
 * Allows doctors to manually send reminders to selected appointments
 */
router.post(
  '/send-manual',
  authenticate,
  async (req: Request, res: Response) => {
    const { appointmentIds, reminderType, customMessage } = req.body;
    const userId = req.user!.id;
    const organizationId = req.user!.organizationId;
    
    // Validate input
    if (!appointmentIds || !Array.isArray(appointmentIds)) {
      return res.status(400).json({ error: 'appointmentIds must be an array' });
    }
    
    if (appointmentIds.length > 100) {
      return res.status(400).json({ 
        error: 'Maximum 100 appointments per request' 
      });
    }
    
    // Get appointments
    const appointments = await prisma.appointment.findMany({
      where: {
        id: { in: appointmentIds },
        organizationId // Ensure org isolation
      },
      include: {
        patient: true
      }
    });
    
    if (appointments.length === 0) {
      return res.status(404).json({ error: 'No appointments found' });
    }
    
    // Check budget BEFORE sending (warn user)
    const estimatedCost = appointments.length * 0.50; // PKR
    const budgetCheck = await costTracking.checkBudget(organizationId);
    
    if (budgetCheck.overBudget) {
      // Warn but allow manual send (ACTION #6 decision)
      console.warn(
        `[ManualReminders] Org ${organizationId} over budget but allowing manual send`
      );
    }
    
    // Send reminders
    const results = {
      sent: 0,
      failed: 0,
      totalCost: 0,
      failedAppointments: [] as any[]
    };
    
    for (const appointment of appointments) {
      try {
        // Build message
        const message = customMessage || 
          `Reminder: Your appointment is scheduled for ${appointment.date} at ${appointment.time}`;
        
        // Send via message processor
        const result = await messageProcessor.sendMessage(
          organizationId,
          appointment.patient.phone,
          'appointment_reminder',
          message,
          'manual', // Manual trigger (ACTION #6)
          userId    // Track who sent it
        );
        
        if (result.sent) {
          results.sent++;
          results.totalCost += result.cost || 0;
          
          // Create reminder record
          await prisma.appointmentReminder.create({
            data: {
              organizationId,
              appointmentId: appointment.id,
              reminderType: reminderType || 'MANUAL',
              trigger: 'MANUAL',
              sentBy: userId,
              scheduledFor: new Date(),
              sentAt: new Date(),
              status: 'SENT',
              cost: result.cost
            }
          });
        } else {
          results.failed++;
          results.failedAppointments.push({
            appointmentId: appointment.id,
            patientName: appointment.patient.name,
            reason: result.reason
          });
        }
        
      } catch (error) {
        results.failed++;
        results.failedAppointments.push({
          appointmentId: appointment.id,
          patientName: appointment.patient.name,
          reason: error.message
        });
      }
    }
    
    // Return summary
    res.json({
      sent: results.sent,
      failed: results.failed,
      totalCost: results.totalCost,
      failedAppointments: results.failedAppointments,
      budgetWarning: budgetCheck.overBudget
    });
  }
);

export default router;
```

#### 4.3 Frontend: Manual Reminder UI

**File:** `frontend/src/app/dashboard/appointments/page.tsx`

```typescript
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { SendReminderModal } from '@/components/SendReminderModal';

export default function AppointmentsPage() {
  const [selectedAppointments, setSelectedAppointments] = useState<string[]>([]);
  const [showReminderModal, setShowReminderModal] = useState(false);
  
  const handleSendReminders = () => {
    if (selectedAppointments.length === 0) {
      alert('Please select at least one appointment');
      return;
    }
    setShowReminderModal(true);
  };
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Appointments</h1>
        
        {selectedAppointments.length > 0 && (
          <Button onClick={handleSendReminders}>
            📱 Send Reminders ({selectedAppointments.length})
          </Button>
        )}
      </div>
      
      <AppointmentTable
        selectedAppointments={selectedAppointments}
        onSelectionChange={setSelectedAppointments}
      />
      
      <SendReminderModal
        open={showReminderModal}
        onClose={() => setShowReminderModal(false)}
        appointmentIds={selectedAppointments}
        onSuccess={() => {
          setSelectedAppointments([]);
          setShowReminderModal(false);
        }}
      />
    </div>
  );
}
```

**File:** `frontend/src/components/SendReminderModal.tsx`

```typescript
import { useState } from 'react';
import { api } from '@/lib/api';

export function SendReminderModal({ 
  open, 
  onClose, 
  appointmentIds,
  onSuccess 
}: Props) {
  const [loading, setLoading] = useState(false);
  const [estimatedCost, setEstimatedCost] = useState(0);
  
  useEffect(() => {
    // Calculate estimated cost
    setEstimatedCost(appointmentIds.length * 0.50); // PKR
  }, [appointmentIds]);
  
  const handleSend = async () => {
    setLoading(true);
    
    try {
      const result = await api.post('/api/reminders/send-manual', {
        appointmentIds,
        reminderType: 'REMINDER_24H'
      });
      
      // Show success message
      toast({
        title: 'Reminders Sent',
        description: `${result.sent} reminders sent successfully. Cost: PKR ${result.totalCost.toFixed(2)}`,
        variant: 'success'
      });
      
      if (result.failed > 0) {
        // Show warning for failures
        toast({
          title: `${result.failed} Failed`,
          description: 'Some reminders could not be sent. Check failed list.',
          variant: 'warning'
        });
      }
      
      onSuccess();
      
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'error'
      });
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Send Manual Reminders</DialogTitle>
      
      <div className="space-y-4 p-4">
        <p>
          You are about to send <strong>{appointmentIds.length}</strong> reminders.
        </p>
        
        <div className="bg-blue-50 p-3 rounded">
          <p className="text-sm">
            <strong>Estimated Cost:</strong> PKR {estimatedCost.toFixed(2)}
          </p>
          <p className="text-xs text-gray-600 mt-1">
            Current month spend: PKR {currentSpend} / PKR {monthlyBudget}
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button onClick={onClose} variant="outline">
            Cancel
          </Button>
          <Button onClick={handleSend} loading={loading}>
            Confirm & Send
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
```

**Key Points:**
- ✅ Auto reminders: Hourly cron job, respects settings
- ✅ Manual reminders: Always allowed (even if auto disabled)
- ✅ Separate tracking: `trigger` field distinguishes auto vs manual
- ✅ Cost estimation: Frontend shows cost before sending
- ✅ Bulk support: Max 100 appointments per request
- ✅ Audit trail: `sentBy` tracks who sent manual reminders

---

### 5. Cost Tracking Dashboard (10 minutes)

#### 5.1 Analytics API

**File:** `backend/src/routes/analytics.ts`

```typescript
router.get(
  '/organizations/:orgId/notification-costs',
  authenticate,
  async (req: Request, res: Response) => {
    const { orgId } = req.params;
    const { startDate, endDate } = req.query;
    
    // Get cost breakdown
    const costs = await prisma.messageCostTracking.groupBy({
      by: ['trigger', 'messageType', 'sent'],
      where: {
        organizationId: orgId,
        sentAt: {
          gte: new Date(startDate as string),
          lte: new Date(endDate as string)
        }
      },
      _sum: {
        cost: true
      },
      _count: true
    });
    
    // Format response
    const breakdown = {
      automatic: {
        sent: 0,
        skipped: 0,
        cost: 0,
        savings: 0
      },
      manual: {
        sent: 0,
        skipped: 0,
        cost: 0
      },
      total: {
        sent: 0,
        skipped: 0,
        cost: 0,
        savings: 0
      }
    };
    
    costs.forEach(row => {
      const trigger = row.trigger === 'automatic' ? 'automatic' : 'manual';
      const cost = parseFloat(row._sum.cost?.toString() || '0');
      
      if (row.sent) {
        breakdown[trigger].sent += row._count;
        breakdown[trigger].cost += cost;
      } else {
        breakdown[trigger].skipped += row._count;
        breakdown[trigger].savings += row._count * 0.50; // Estimated savings
      }
    });
    
    // Calculate totals
    breakdown.total.sent = breakdown.automatic.sent + breakdown.manual.sent;
    breakdown.total.skipped = breakdown.automatic.skipped + breakdown.manual.skipped;
    breakdown.total.cost = breakdown.automatic.cost + breakdown.manual.cost;
    breakdown.total.savings = breakdown.automatic.savings + breakdown.manual.savings;
    
    res.json(breakdown);
  }
);
```

#### 5.2 Frontend Cost Dashboard

**File:** `frontend/src/app/dashboard/analytics/costs/page.tsx`

```typescript
export default function NotificationCostsPage() {
  const { data: costs } = useCostAnalytics(organizationId);
  
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Notification Costs</h1>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardTitle>Total Cost</CardTitle>
          <CardValue>PKR {costs?.total.cost.toFixed(2)}</CardValue>
          <CardSubtitle>{costs?.total.sent} messages sent</CardSubtitle>
        </Card>
        
        <Card>
          <CardTitle>Cost Savings</CardTitle>
          <CardValue className="text-green-600">
            PKR {costs?.total.savings.toFixed(2)}
          </CardValue>
          <CardSubtitle>{costs?.total.skipped} messages skipped</CardSubtitle>
        </Card>
        
        <Card>
          <CardTitle>Budget Usage</CardTitle>
          <ProgressBar 
            value={costs?.total.cost} 
            max={monthlyBudget} 
          />
          <CardSubtitle>
            {((costs?.total.cost / monthlyBudget) * 100).toFixed(0)}% used
          </CardSubtitle>
        </Card>
      </div>
      
      {/* Auto vs Manual Breakdown */}
      <Card>
        <CardTitle>Message Breakdown</CardTitle>
        <Table>
          <thead>
            <tr>
              <th>Type</th>
              <th>Sent</th>
              <th>Skipped</th>
              <th>Cost</th>
              <th>Savings</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Automatic</td>
              <td>{costs?.automatic.sent}</td>
              <td>{costs?.automatic.skipped}</td>
              <td>PKR {costs?.automatic.cost.toFixed(2)}</td>
              <td className="text-green-600">
                PKR {costs?.automatic.savings.toFixed(2)}
              </td>
            </tr>
            <tr>
              <td>Manual</td>
              <td>{costs?.manual.sent}</td>
              <td>{costs?.manual.skipped}</td>
              <td>PKR {costs?.manual.cost.toFixed(2)}</td>
              <td>-</td>
            </tr>
            <tr className="font-bold">
              <td>Total</td>
              <td>{costs?.total.sent}</td>
              <td>{costs?.total.skipped}</td>
              <td>PKR {costs?.total.cost.toFixed(2)}</td>
              <td className="text-green-600">
                PKR {costs?.total.savings.toFixed(2)}
              </td>
            </tr>
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
```

---

### 6. Testing Strategy (5 minutes)

#### 6.1 Integration Tests

**File:** `backend/tests/notificationSettings.integration.test.ts`

```typescript
describe('Notification Settings Integration', () => {
  
  test('should skip auto-reminder when disabled', async () => {
    // Setup: Disable auto-reminders
    await updateNotificationSettings(orgId, {
      appointmentReminders: false
    });
    
    // Create appointment
    const appointment = await createAppointment(orgId);
    
    // Run reminder job
    await reminderJob.processScheduledReminders();
    
    // Verify: No message sent
    const reminder = await getReminder(appointment.id);
    expect(reminder.status).toBe('SKIPPED');
    expect(reminder.skipReason).toBe('auto_reminders_disabled');
    
    // Verify: Cost savings logged
    const costLog = await getCostTracking(orgId);
    expect(costLog.skipped).toBeGreaterThan(0);
  });
  
  test('should allow manual reminder when auto disabled', async () => {
    // Setup: Disable auto-reminders
    await updateNotificationSettings(orgId, {
      appointmentReminders: false
    });
    
    // Send manual reminder
    const result = await sendManualReminders({
      appointmentIds: [appointmentId],
      userId: doctorId
    });
    
    // Verify: Message sent
    expect(result.sent).toBe(1);
    expect(result.failed).toBe(0);
    
    // Verify: Logged as manual
    const reminder = await getReminder(appointmentId);
    expect(reminder.trigger).toBe('MANUAL');
    expect(reminder.sentBy).toBe(doctorId);
  });
  
  test('should use org-level language setting', async () => {
    // Setup: Set org language to Urdu
    await updateNotificationSettings(orgId, {
      language: 'ur'
    });
    
    // Send booking confirmation
    await bookAppointment(orgId, appointmentData);
    
    // Verify: Message sent in Urdu
    const sentMessage = await getLastSentMessage(orgId);
    expect(sentMessage.content).toContain('آپ کی ملاقات'); // Urdu text
  });
  
  test('should emit SSE event on new booking', async (done) => {
    // Setup: Listen to SSE stream
    const eventSource = new EventSource(`/api/organizations/${orgId}/appointments/stream`);
    
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'appointment:new') {
        expect(data.data.source).toBe('whatsapp');
        eventSource.close();
        done();
      }
    };
    
    // Trigger: Book appointment via WhatsApp
    await bookAppointmentViaWhatsApp(orgId, appointmentData);
  });
  
  test('should separate auto vs manual cost tracking', async () => {
    // Send 5 auto reminders
    await reminderJob.processScheduledReminders();
    
    // Send 3 manual reminders
    await sendManualReminders({
      appointmentIds: [id1, id2, id3]
    });
    
    // Verify: Separate tracking
    const costs = await getCostBreakdown(orgId);
    expect(costs.automatic.sent).toBe(5);
    expect(costs.manual.sent).toBe(3);
    expect(costs.total.sent).toBe(8);
  });
});
```

---

## 📋 Implementation Checklist

### Backend Tasks:
- [ ] **NotificationSettingsService**
  - [ ] `get(organizationId)` - Get all settings
  - [ ] `update(organizationId, settings)` - Update settings
  - [ ] `isNotificationEnabled(orgId, type)` - Check if enabled
  - [ ] `getLanguage(orgId)` - Get org language (ACTION #6)

- [ ] **WhatsAppMessageProcessor** (Enhanced)
  - [ ] Central `sendMessage()` method
  - [ ] Check notification settings before sending
  - [ ] Support `trigger` parameter (auto/manual)
  - [ ] Translate messages based on org language
  - [ ] Log cost tracking with trigger type

- [ ] **AppointmentBookingService** (Enhanced)
  - [ ] Emit SSE events for new bookings (ACTION #6)
  - [ ] Emit SSE events for status updates
  - [ ] Check booking confirmation settings
  - [ ] Schedule auto-reminders (if enabled)

- [ ] **ReminderJob**
  - [ ] Hourly cron job
  - [ ] Process AUTOMATIC reminders only
  - [ ] Respect notification settings
  - [ ] Log cost tracking

- [ ] **Manual Reminder API**
  - [ ] `POST /api/reminders/send-manual` endpoint
  - [ ] Support bulk sending (max 100)
  - [ ] Check budget, warn if over
  - [ ] Track `sentBy` user ID
  - [ ] Log as MANUAL trigger

- [ ] **SSE Endpoint**
  - [ ] `GET /api/organizations/:orgId/appointments/stream`
  - [ ] Authentication check
  - [ ] Emit `appointment:new` events
  - [ ] Emit `appointment:updated` events
  - [ ] Cleanup on disconnect

- [ ] **Cost Tracking Analytics**
  - [ ] `GET /api/analytics/notification-costs`
  - [ ] Separate auto vs manual breakdown
  - [ ] Calculate cost savings
  - [ ] Budget usage percentage

### Frontend Tasks:
- [ ] **SSE Hook** (`useRealtimeAppointments`)
  - [ ] Connect to SSE endpoint
  - [ ] Handle new appointment events
  - [ ] Handle update events
  - [ ] Show toast notifications
  - [ ] Auto-reconnect on error

- [ ] **Appointment List** (Enhanced)
  - [ ] Bulk selection checkboxes
  - [ ] "Send Reminders" button
  - [ ] WhatsApp icon for WhatsApp bookings
  - [ ] Real-time updates from SSE

- [ ] **Send Reminder Modal**
  - [ ] Show estimated cost
  - [ ] Show budget usage
  - [ ] Confirm button
  - [ ] Success/error handling
  - [ ] Show failed appointments list

- [ ] **Notification Settings Page**
  - [ ] Language dropdown (English/Urdu)
  - [ ] Toggle switches for each type
  - [ ] Budget input field
  - [ ] Save button
  - [ ] Preview estimated cost

- [ ] **Cost Analytics Dashboard**
  - [ ] Total cost card
  - [ ] Cost savings card
  - [ ] Budget usage progress bar
  - [ ] Auto vs manual breakdown table
  - [ ] Date range filter

### Database Migrations:
- [ ] Add `language` to NotificationSettings
- [ ] Add `trigger` enum (AUTOMATIC/MANUAL) to AppointmentReminder
- [ ] Add `sentBy` to AppointmentReminder
- [ ] Add `trigger` to MessageCostTracking
- [ ] Add indexes for `trigger` field

---

## ✅ Success Criteria

### Functionality:
- ✅ All messages respect notification settings
- ✅ Auto-reminders can be disabled (cost savings)
- ✅ Manual reminders always work (even if auto disabled)
- ✅ Org-level language setting applied to all messages
- ✅ Dashboard updates in real-time via SSE
- ✅ Cost tracking separates auto vs manual
- ✅ Budget warnings shown before sending

### Performance:
- ✅ SSE updates dashboard within 1 second
- ✅ Reminder job processes 1000+ reminders/hour
- ✅ Manual bulk send handles 100 appointments

### User Experience:
- ✅ Toast notifications for new WhatsApp bookings
- ✅ Clear cost breakdown in analytics
- ✅ Easy bulk selection and sending
- ✅ Warning if over budget

---

## 🚀 Next Steps

1. ✅ **ACTION #7 Complete** - Integration guide prepared
2. 🔄 **Start Phase 3 Implementation**:
   - TASK-039: WhatsApp API setup
   - TASK-040: Message processing (use this guide for integration)
   - TASK-040A: Notification settings (implement database + API)
   - TASK-041: Booking flow (use SSE code from this guide)
   - TASK-042: Reminders (use auto + manual code from this guide)

---

**Document Version:** 1.0  
**Last Updated:** October 16, 2025  
**Status:** ✅ Ready for Implementation
