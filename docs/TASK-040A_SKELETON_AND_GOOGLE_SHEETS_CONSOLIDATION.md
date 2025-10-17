# TASK-040A Skeleton Implementation & Google Sheets Service Consolidation

**Date:** October 16, 2025  
**Status:** 📝 APPROVED UPDATES  
**Source:** PHASE-3_READINESS_ANALYSIS.md - Final Decisions (ISSUE #1, #2, #4)

---

## 🎯 Document Purpose

This document addresses two critical issues from readiness analysis:
1. **ISSUE #1:** TASK-040A timing (Option B - Skeleton Early)
2. **ISSUE #2:** Google Sheets service consolidation
3. **ISSUE #4:** Manual reminders database schema

---

## PART 1: TASK-040A Skeleton Implementation (Option B)

### Strategy: Two-Phase Implementation

**Phase 1 (Week 1 - During TASK-040):** Build skeleton
- Database schema + migration
- CRUD API endpoints with default responses
- Integration stubs for TASK-040, 041, 042

**Phase 2 (Week 2+ - After TASK-041):** Implement business logic
- Complex preference rules
- Multi-channel orchestration
- Advanced validation

### Benefits of Option B:
✅ No refactoring needed in TASK-040, 041, 042  
✅ Other tasks can integrate immediately  
✅ Skeleton provides sane defaults  
✅ Business logic filled in later without breaking changes

---

## SECTION 1: Phase 1 - Skeleton Implementation (Week 1)

### Timeline: Implement during TASK-040 (Days 1-3)

#### 1.1 Database Schema & Migration

**ADD to Prisma schema:**

```prisma
// File: prisma/schema.prisma

enum NotificationChannel {
  WHATSAPP
  SMS
  EMAIL
}

enum ReminderTiming {
  IMMEDIATELY      // 0 minutes
  MINUTES_30       // 30 minutes
  HOURS_1          // 1 hour
  HOURS_2          // 2 hours
  HOURS_4          // 4 hours
  HOURS_24         // 24 hours (default)
  HOURS_48         // 48 hours
  HOURS_72         // 72 hours
  CUSTOM           // Custom timing
}

enum ReminderTrigger {
  AUTOMATIC  // Sent automatically by scheduler
  MANUAL     // Sent manually by staff
}

model NotificationSettings {
  id             String   @id @default(cuid())
  organizationId String   @unique
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  
  // Language preference (ACTION #6 decision)
  language       String   @default("en") // "en" | "ur"
  
  // Enabled notification types
  bookingConfirmationsEnabled Boolean @default(true)
  remindersEnabled            Boolean @default(true)
  followUpsEnabled            Boolean @default(false)
  medicationRemindersEnabled  Boolean @default(false)
  wellnessChecksEnabled       Boolean @default(false)
  
  // Reminder timing
  reminderTiming ReminderTiming @default(HOURS_24)
  customReminderMinutes Int?  // Only if reminderTiming = CUSTOM
  
  // Channels
  enabledChannels NotificationChannel[] @default([WHATSAPP])
  
  // Quiet hours
  quietHoursEnabled Boolean @default(false)
  quietHoursStart   String? // HH:MM format (e.g., "22:00")
  quietHoursEnd     String? // HH:MM format (e.g., "08:00")
  
  // Cost controls
  monthlyCap      Decimal? @db.Decimal(10, 2)
  currentMonthSpend Decimal @default(0) @db.Decimal(10, 2)
  alertThreshold  Int @default(80) // Percentage (80%)
  
  // Timestamps
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@index([organizationId])
}

// Update AppointmentReminder model (ISSUE #4)
model AppointmentReminder {
  id             String   @id @default(cuid())
  appointmentId  String
  appointment    Appointment @relation(fields: [appointmentId], references: [id], onDelete: Cascade)
  
  // Manual reminder support (ACTION #6 decision)
  trigger        ReminderTrigger @default(AUTOMATIC) // NEW
  sentBy         String?                              // NEW - User ID who sent (for MANUAL)
  
  scheduledFor   DateTime
  sentAt         DateTime?
  status         String   @default("pending") // pending, sent, failed, cancelled
  errorMessage   String?
  retryCount     Int      @default(0)
  
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  
  @@index([appointmentId])
  @@index([scheduledFor])
  @@index([status])
  @@index([trigger]) // NEW - Index for manual/automatic filtering
}
```

**Migration Command:**
```bash
npx prisma migrate dev --name add_notification_settings_and_manual_reminders
```

#### 1.2 CRUD API Endpoints (Skeleton)

**File: `backend/src/controllers/notificationSettingsController.ts`**

```typescript
import { Request, Response } from 'express';
import { NotificationSettingsService } from '../services/notificationSettingsService';

export class NotificationSettingsController {
  private service: NotificationSettingsService;

  constructor() {
    this.service = new NotificationSettingsService();
  }

  /**
   * GET /api/notification-settings/:organizationId
   * Get notification settings for organization
   */
  async getSettings(req: Request, res: Response) {
    try {
      const { organizationId } = req.params;
      
      // Authorization check (user belongs to org)
      if (req.user.organizationId !== organizationId) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      
      const settings = await this.service.getSettings(organizationId);
      res.json(settings);
    } catch (error) {
      console.error('Get notification settings error:', error);
      res.status(500).json({ error: 'Failed to fetch notification settings' });
    }
  }

  /**
   * PUT /api/notification-settings/:organizationId
   * Update notification settings
   */
  async updateSettings(req: Request, res: Response) {
    try {
      const { organizationId } = req.params;
      
      // Authorization check
      if (req.user.organizationId !== organizationId) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      
      const updated = await this.service.updateSettings(organizationId, req.body);
      res.json(updated);
    } catch (error) {
      console.error('Update notification settings error:', error);
      res.status(500).json({ error: 'Failed to update notification settings' });
    }
  }

  /**
   * GET /api/notification-settings/:organizationId/should-send
   * Check if notification should be sent (integration point for TASK-040, 041, 042)
   */
  async shouldSendNotification(req: Request, res: Response) {
    try {
      const { organizationId } = req.params;
      const { type, timestamp } = req.query;
      
      const shouldSend = await this.service.shouldSendNotification(
        organizationId,
        type as string,
        timestamp ? new Date(timestamp as string) : new Date()
      );
      
      res.json({ shouldSend });
    } catch (error) {
      console.error('Should send notification check error:', error);
      res.status(500).json({ error: 'Failed to check notification status' });
    }
  }
}
```

**File: `backend/src/services/notificationSettingsService.ts` (SKELETON)**

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class NotificationSettingsService {
  /**
   * Get notification settings for organization
   * Creates default settings if none exist (Phase 1 behavior)
   */
  async getSettings(organizationId: string) {
    let settings = await prisma.notificationSettings.findUnique({
      where: { organizationId }
    });

    // Create default settings if not exists
    if (!settings) {
      settings = await prisma.notificationSettings.create({
        data: {
          organizationId,
          language: 'en',
          bookingConfirmationsEnabled: true,
          remindersEnabled: true,
          followUpsEnabled: false,
          medicationRemindersEnabled: false,
          wellnessChecksEnabled: false,
          reminderTiming: 'HOURS_24',
          enabledChannels: ['WHATSAPP'],
          quietHoursEnabled: false,
          alertThreshold: 80
        }
      });
    }

    return settings;
  }

  /**
   * Update notification settings
   */
  async updateSettings(organizationId: string, data: any) {
    return prisma.notificationSettings.upsert({
      where: { organizationId },
      update: data,
      create: {
        organizationId,
        ...data
      }
    });
  }

  /**
   * SKELETON: Check if notification should be sent
   * Phase 1: Returns sane defaults (simple rules)
   * Phase 2: Implement complex business logic
   */
  async shouldSendNotification(
    organizationId: string,
    notificationType: string,
    timestamp: Date = new Date()
  ): Promise<boolean> {
    const settings = await this.getSettings(organizationId);

    // Phase 1: Simple checks (SKELETON)
    
    // Check if notification type is enabled
    switch (notificationType) {
      case 'booking_confirmation':
        if (!settings.bookingConfirmationsEnabled) return false;
        break;
      case 'reminder':
        if (!settings.remindersEnabled) return false;
        break;
      case 'followup':
        if (!settings.followUpsEnabled) return false;
        break;
      case 'medication':
        if (!settings.medicationRemindersEnabled) return false;
        break;
      case 'wellness':
        if (!settings.wellnessChecksEnabled) return false;
        break;
      default:
        return true; // Unknown type, allow by default
    }

    // Check quiet hours (simple check)
    if (settings.quietHoursEnabled && settings.quietHoursStart && settings.quietHoursEnd) {
      const hour = timestamp.getHours();
      const start = parseInt(settings.quietHoursStart.split(':')[0]);
      const end = parseInt(settings.quietHoursEnd.split(':')[0]);
      
      // Simple quiet hours check (Phase 1)
      if (start < end) {
        // Normal range (e.g., 22:00 to 08:00 next day)
        if (hour >= start || hour < end) return false;
      } else {
        // Overnight range
        if (hour >= start && hour < end) return false;
      }
    }

    // Phase 1: No cost check (assume under budget)
    // Phase 2: Implement monthly cap checking

    return true; // Default: allow notification
  }

  /**
   * STUB: Get reminder timing in minutes
   * Phase 1: Returns standard timings
   * Phase 2: Implement custom timing logic
   */
  async getReminderTimingMinutes(organizationId: string): Promise<number> {
    const settings = await this.getSettings(organizationId);
    
    // Phase 1: Simple mapping (STUB)
    switch (settings.reminderTiming) {
      case 'IMMEDIATELY': return 0;
      case 'MINUTES_30': return 30;
      case 'HOURS_1': return 60;
      case 'HOURS_2': return 120;
      case 'HOURS_4': return 240;
      case 'HOURS_24': return 1440;
      case 'HOURS_48': return 2880;
      case 'HOURS_72': return 4320;
      case 'CUSTOM': return settings.customReminderMinutes || 1440;
      default: return 1440; // Default 24 hours
    }
  }
}
```

**Routes: `backend/src/routes/notificationSettings.ts`**

```typescript
import { Router } from 'express';
import { NotificationSettingsController } from '../controllers/notificationSettingsController';
import { authenticate } from '../middleware/auth';

const router = Router();
const controller = new NotificationSettingsController();

// All routes require authentication
router.use(authenticate);

router.get('/:organizationId', controller.getSettings.bind(controller));
router.put('/:organizationId', controller.updateSettings.bind(controller));
router.get('/:organizationId/should-send', controller.shouldSendNotification.bind(controller));

export default router;
```

#### 1.3 Integration Points for Other Tasks

**TASK-040 Integration (Language Detection):**
```typescript
// In TASK-040 language detection (Section 2.2)
import { NotificationSettingsService } from '../services/notificationSettingsService';

const settingsService = new NotificationSettingsService();

async function getOrganizationLanguage(organizationId: string): Promise<'en' | 'ur'> {
  const settings = await settingsService.getSettings(organizationId);
  return settings.language as 'en' | 'ur';
}
```

**TASK-041 Integration (Booking Confirmation):**
```typescript
// In TASK-041 confirmation sending (Section 6)
import { NotificationSettingsService } from '../services/notificationSettingsService';

const settingsService = new NotificationSettingsService();

async function sendBookingConfirmation(organizationId: string, appointment: any) {
  // Check if confirmations enabled
  const shouldSend = await settingsService.shouldSendNotification(
    organizationId,
    'booking_confirmation',
    new Date()
  );
  
  if (!shouldSend) {
    console.log('Booking confirmation disabled for org:', organizationId);
    return;
  }
  
  // Get language preference
  const settings = await settingsService.getSettings(organizationId);
  const language = settings.language;
  
  // Send confirmation in preferred language
  await whatsappService.sendMessage(/* ... */);
}
```

**TASK-042 Integration (Reminder Scheduling):**
```typescript
// In TASK-042 reminder scheduler (Section 2)
import { NotificationSettingsService } from '../services/notificationSettingsService';

const settingsService = new NotificationSettingsService();

async function scheduleReminder(organizationId: string, appointment: any) {
  // Check if reminders enabled
  const shouldSend = await settingsService.shouldSendNotification(
    organizationId,
    'reminder',
    new Date()
  );
  
  if (!shouldSend) {
    console.log('Reminders disabled for org:', organizationId);
    return;
  }
  
  // Get reminder timing
  const timingMinutes = await settingsService.getReminderTimingMinutes(organizationId);
  
  // Calculate scheduled time
  const appointmentTime = new Date(appointment.date + ' ' + appointment.time);
  const scheduledFor = new Date(appointmentTime.getTime() - (timingMinutes * 60 * 1000));
  
  // Queue reminder job
  await reminderQueue.add('send-reminder', { appointmentId: appointment.id }, {
    delay: scheduledFor.getTime() - Date.now()
  });
}
```

#### 1.4 Basic Tests (Phase 1)

**File: `backend/tests/notificationSettings.test.ts`**

```typescript
import { NotificationSettingsService } from '../services/notificationSettingsService';

describe('NotificationSettings Skeleton', () => {
  let service: NotificationSettingsService;

  beforeEach(() => {
    service = new NotificationSettingsService();
  });

  test('getSettings creates default if not exists', async () => {
    const settings = await service.getSettings('org_test_123');
    
    expect(settings.language).toBe('en');
    expect(settings.bookingConfirmationsEnabled).toBe(true);
    expect(settings.remindersEnabled).toBe(true);
    expect(settings.reminderTiming).toBe('HOURS_24');
  });

  test('shouldSendNotification returns true for enabled types', async () => {
    const shouldSend = await service.shouldSendNotification(
      'org_test_123',
      'booking_confirmation',
      new Date()
    );
    
    expect(shouldSend).toBe(true);
  });

  test('getReminderTimingMinutes returns 24 hours default', async () => {
    const minutes = await service.getReminderTimingMinutes('org_test_123');
    
    expect(minutes).toBe(1440); // 24 hours
  });
});
```

---

## PART 2: Google Sheets Service Consolidation (ISSUE #2)

### Problem Statement:
Currently, multiple services might be created for Google Sheets operations:
1. `googleSheetsSyncService.ts` (ACTION #1 - PostgreSQL ← Sheets sync)
2. Direct writes in TASK-041 (WhatsApp → Sheets)
3. Direct reads in TASK-042 (Sheets → Reminders)

### Solution: Consolidate into Single Service

#### 2.1 Extend Existing `googleSheetsSyncService.ts`

**File: `backend/src/services/googleSheetsSyncService.ts` (ENHANCED)**

```typescript
import { google } from 'googleapis';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const sheets = google.sheets('v4');

export class GoogleSheetsSyncService {
  // ==========================================
  // EXISTING: ACTION #1 - Sync to PostgreSQL
  // ==========================================
  
  /**
   * Sync appointments from Google Sheets to PostgreSQL
   * (Existing method from ACTION #1)
   */
  async syncAppointmentsToPostgreSQL(organizationId: string) {
    // ... existing implementation
  }

  // ==========================================
  // NEW: TASK-041 - Write Operations
  // ==========================================
  
  /**
   * Write new appointment to Google Sheets
   * Used by: TASK-041 booking transaction
   */
  async writeAppointment(organizationId: string, appointmentData: any) {
    const orgSettings = await this.getOrganizationSheetSettings(organizationId);
    const auth = await this.getServiceAccountAuth(orgSettings.serviceAccountKey);

    // Find next empty row
    const nextRow = await this.getNextEmptyRow(orgSettings.spreadsheetId, orgSettings.appointmentsSheet, auth);

    // Format data for sheet
    const values = [
      [
        appointmentData.id,
        appointmentData.patientName,
        appointmentData.patientPhone,
        appointmentData.doctorName,
        appointmentData.date,
        appointmentData.time,
        appointmentData.status || 'booked',
        new Date().toISOString()
      ]
    ];

    // Write to sheet (atomic)
    await sheets.spreadsheets.values.update({
      auth,
      spreadsheetId: orgSettings.spreadsheetId,
      range: `${orgSettings.appointmentsSheet}!A${nextRow}:H${nextRow}`,
      valueInputOption: 'RAW',
      requestBody: { values }
    });

    return { success: true, rowNumber: nextRow };
  }

  /**
   * Update appointment status in Google Sheets
   * Used by: TASK-041 cancellation/reschedule
   */
  async updateAppointmentStatus(
    organizationId: string,
    appointmentId: string,
    newStatus: string,
    reason?: string
  ) {
    const orgSettings = await this.getOrganizationSheetSettings(organizationId);
    const auth = await this.getServiceAccountAuth(orgSettings.serviceAccountKey);

    // Find appointment row by ID
    const rowNumber = await this.findAppointmentRow(orgSettings, appointmentId, auth);

    if (!rowNumber) {
      throw new Error(`Appointment ${appointmentId} not found in sheet`);
    }

    // Update status column (column G)
    await sheets.spreadsheets.values.update({
      auth,
      spreadsheetId: orgSettings.spreadsheetId,
      range: `${orgSettings.appointmentsSheet}!G${rowNumber}`,
      valueInputOption: 'RAW',
      requestBody: { values: [[newStatus]] }
    });

    // If reason provided, update reason column (column I)
    if (reason) {
      await sheets.spreadsheets.values.update({
        auth,
        spreadsheetId: orgSettings.spreadsheetId,
        range: `${orgSettings.appointmentsSheet}!I${rowNumber}`,
        valueInputOption: 'RAW',
        requestBody: { values: [[reason]] }
      });
    }

    return { success: true, rowNumber };
  }

  // ==========================================
  // NEW: TASK-042 - Read Operations
  // ==========================================
  
  /**
   * Read appointments from Google Sheets for reminder processing
   * Used by: TASK-042 reminder scheduler
   */
  async readAppointments(
    organizationId: string,
    filters?: {
      status?: string;
      dateFrom?: Date;
      dateTo?: Date;
    }
  ) {
    const orgSettings = await this.getOrganizationSheetSettings(organizationId);
    const auth = await this.getServiceAccountAuth(orgSettings.serviceAccountKey);

    // Read all appointments
    const response = await sheets.spreadsheets.values.get({
      auth,
      spreadsheetId: orgSettings.spreadsheetId,
      range: `${orgSettings.appointmentsSheet}!A2:I` // Skip header row
    });

    const rows = response.data.values || [];
    
    // Parse rows into appointment objects
    const appointments = rows.map(row => ({
      id: row[0],
      patientName: row[1],
      patientPhone: row[2],
      doctorName: row[3],
      date: row[4],
      time: row[5],
      status: row[6] || 'booked',
      createdAt: row[7],
      reason: row[8] || null
    }));

    // Apply filters
    let filtered = appointments;
    
    if (filters?.status) {
      filtered = filtered.filter(a => a.status === filters.status);
    }
    
    if (filters?.dateFrom) {
      filtered = filtered.filter(a => new Date(a.date) >= filters.dateFrom!);
    }
    
    if (filters?.dateTo) {
      filtered = filtered.filter(a => new Date(a.date) <= filters.dateTo!);
    }

    return filtered;
  }

  /**
   * Read single appointment by ID
   * Used by: TASK-042 reminder worker
   */
  async readAppointmentById(organizationId: string, appointmentId: string) {
    const appointments = await this.readAppointments(organizationId);
    return appointments.find(a => a.id === appointmentId);
  }

  // ==========================================
  // HELPER METHODS (Private)
  // ==========================================
  
  private async getOrganizationSheetSettings(organizationId: string) {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      include: { googleSheetsIntegration: true }
    });

    if (!org?.googleSheetsIntegration) {
      throw new Error('Google Sheets not configured for organization');
    }

    return {
      spreadsheetId: org.googleSheetsIntegration.spreadsheetId,
      appointmentsSheet: org.googleSheetsIntegration.appointmentsSheetName || 'Appointments',
      serviceAccountKey: org.googleSheetsIntegration.serviceAccountKey
    };
  }

  private async getServiceAccountAuth(serviceAccountKey: string) {
    const credentials = JSON.parse(serviceAccountKey);
    
    return new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });
  }

  private async getNextEmptyRow(spreadsheetId: string, sheetName: string, auth: any): Promise<number> {
    const response = await sheets.spreadsheets.values.get({
      auth,
      spreadsheetId,
      range: `${sheetName}!A:A` // Get column A
    });

    const rows = response.data.values || [];
    return rows.length + 1; // Next empty row
  }

  private async findAppointmentRow(orgSettings: any, appointmentId: string, auth: any): Promise<number | null> {
    const response = await sheets.spreadsheets.values.get({
      auth,
      spreadsheetId: orgSettings.spreadsheetId,
      range: `${orgSettings.appointmentsSheet}!A:A` // Get column A (IDs)
    });

    const rows = response.data.values || [];
    const rowIndex = rows.findIndex(row => row[0] === appointmentId);
    
    return rowIndex >= 0 ? rowIndex + 1 : null; // +1 for 1-based indexing
  }
}
```

#### 2.2 Update TASK-041 to Use Consolidated Service

**In TASK-041 booking transaction:**
```typescript
// BEFORE (creating separate service):
// const googleSheetsService = new GoogleSheetsAppointmentService();

// AFTER (using consolidated service):
import { GoogleSheetsSyncService } from '../services/googleSheetsSyncService';

const googleSheetsService = new GoogleSheetsSyncService();

// Write appointment
await googleSheetsService.writeAppointment(organizationId, appointmentData);
```

#### 2.3 Update TASK-042 to Use Consolidated Service

**In TASK-042 reminder scheduler:**
```typescript
// BEFORE (direct Google Sheets API calls):
// const auth = await getAuth();
// const response = await sheets.spreadsheets.values.get(...);

// AFTER (using consolidated service):
import { GoogleSheetsSyncService } from '../services/googleSheetsSyncService';

const googleSheetsService = new GoogleSheetsSyncService();

// Read appointments for reminders
const upcomingAppointments = await googleSheetsService.readAppointments(organizationId, {
  status: 'booked',
  dateFrom: new Date(),
  dateTo: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // Next 7 days
});
```

---

## 📋 Implementation Checklist

### Phase 1 - Week 1 (During TASK-040):
- [ ] Create Prisma migration for NotificationSettings model
- [ ] Add `trigger` and `sentBy` fields to AppointmentReminder
- [ ] Run migration: `npx prisma migrate dev`
- [ ] Create `NotificationSettingsController` (skeleton)
- [ ] Create `NotificationSettingsService` (skeleton with defaults)
- [ ] Add routes to Express app
- [ ] Write 10 basic tests for skeleton
- [ ] Extend `googleSheetsSyncService.ts` with write/read methods
- [ ] Update TASK-041 plan to reference consolidated service
- [ ] Update TASK-042 plan to reference consolidated service

### Integration Testing (Week 1):
- [ ] Test TASK-040 can get organization language
- [ ] Test TASK-041 can check if confirmations enabled
- [ ] Test TASK-042 can check if reminders enabled
- [ ] Test Google Sheets write operation
- [ ] Test Google Sheets read operation

### Phase 2 - Week 2+ (After TASK-041):
- [ ] Implement complex quiet hours logic (cross-day ranges)
- [ ] Implement monthly cost cap checking
- [ ] Implement cost tracking per message
- [ ] Implement alert system (80% threshold)
- [ ] Add multi-channel orchestration
- [ ] Add advanced validation rules
- [ ] Write 50+ comprehensive tests
- [ ] Update ACTION #2 integration guide with Phase 2 details

---

## 🎯 Success Criteria

### Phase 1 (Week 1):
- ✅ Database schema deployed
- ✅ API endpoints respond with defaults
- ✅ TASK-040, 041, 042 can integrate without errors
- ✅ Google Sheets service consolidated (single source)
- ✅ 10 skeleton tests passing

### Phase 2 (Week 2+):
- ✅ All 15 notification settings requirements (REQ-NOTIF-001 to 015) implemented
- ✅ 50+ comprehensive tests passing
- ✅ Cost tracking operational
- ✅ Quiet hours working correctly
- ✅ Multi-channel support complete

---

**Document Version:** 1.0  
**Status:** ✅ APPROVED FOR IMPLEMENTATION  
**Last Updated:** October 16, 2025  
**Author:** AI Development Assistant
