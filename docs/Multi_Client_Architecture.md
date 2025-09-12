# Multi-Client Architecture Specification
# DrSync - Google Sheets & WhatsApp Integration

**Version:** 1.0  
**Date:** September 12, 2025  
**Author:** DrSync Development Team  

## 📋 Table of Contents

1. [Google Sheets Structure Options](#google-sheets-structure-options)
2. [WhatsApp Multi-Client Management](#whatsapp-multi-client-management)
3. [Atomic Booking Operations](#atomic-booking-operations)
4. [Family Member Support](#family-member-support)
5. [Data Flow Architecture](#data-flow-architecture)
6. [Implementation Guidelines](#implementation-guidelines)

## 🗂️ Google Sheets Structure Options

### Option A: Single Sheet with Tabs (RECOMMENDED)
```
Client's Google Sheet: "ClinicName_DrSync_Data"
├── Tab 1: "Patients"
├── Tab 2: "Appointments" 
├── Tab 3: "Providers"
├── Tab 4: "Settings"
└── Tab 5: "Audit_Log"
```

**Advantages:**
- ✅ Single permission setup per client
- ✅ Easier data relationships across tabs
- ✅ Better organization and maintenance
- ✅ Atomic operations across related data

**Structure Definition:**
```json
{
  "organizationId": "org_abc123",
  "googleSheetsId": "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
  "googleSheetsStructure": "TABS",
  "tabMappings": {
    "patients": "Patients",
    "appointments": "Appointments",
    "providers": "Providers",
    "settings": "Settings",
    "audit": "Audit_Log"
  }
}
```

### Option B: Separate Sheets (FALLBACK)
```
Client's Google Drive Folder: "ClinicName_DrSync"
├── "Patients_Data" (Sheet)
├── "Appointments_Data" (Sheet)
├── "Providers_Data" (Sheet)
└── "Settings_Config" (Sheet)
```

**Use When:**
- Google Sheets API has issues with tab operations
- Client prefers separate sheets for different staff access levels
- Performance issues with large datasets in single sheet

**Structure Definition:**
```json
{
  "organizationId": "org_abc123",
  "googleSheetsStructure": "SEPARATE_SHEETS",
  "sheetMappings": {
    "patients": "1ABC..._patients",
    "appointments": "1DEF..._appointments", 
    "providers": "1GHI..._providers",
    "settings": "1JKL..._settings"
  }
}
```

## 📱 WhatsApp Multi-Client Management

### Architecture Overview
```
DrSync VPS Backend
├── WhatsApp Service Manager
│   ├── Client A (WhatsApp Business #1) → Client A's Google Sheets
│   ├── Client B (WhatsApp Business #2) → Client B's Google Sheets
│   └── Client C (WhatsApp Business #3) → Client C's Google Sheets
└── Unified Message Processing Engine
```

### Client WhatsApp Configuration
```json
{
  "organizationId": "org_abc123",
  "whatsappPhoneNumber": "+92300XXXXXXX",
  "whatsappBusinessId": "business_account_id_123",
  "whatsappWebhookUrl": "https://drsync.com/webhook/org_abc123",
  "whatsappCredentials": {
    "accessToken": "encrypted_token",
    "appSecret": "encrypted_secret",
    "verifyToken": "encrypted_verify"
  }
}
```

### Message Routing Logic
```typescript
// Incoming WhatsApp message routing
class WhatsAppMessageRouter {
  async routeMessage(webhook_data: any) {
    // 1. Identify client from webhook URL or phone number
    const client = await identifyClient(webhook_data.phone_number);
    
    // 2. Process message with client's context
    const response = await processMessage(webhook_data.message, client);
    
    // 3. Write directly to client's Google Sheets
    await writeToGoogleSheets(client.googleSheetsId, response.data);
    
    // 4. Send WhatsApp response using client's credentials
    await sendWhatsAppMessage(client.whatsappCredentials, response.message);
    
    // 5. Sync to PostgreSQL for reminders
    await syncToPostgreSQL(client.organizationId, response.data);
  }
}
```

## ⚡ Atomic Booking Operations

### Slot Locking Mechanism
```typescript
class AtomicBookingService {
  async bookAppointment(clientId: string, slotData: any, source: string) {
    // 1. Generate unique lock token
    const lockToken = generateUUID();
    
    // 2. Attempt to lock the slot
    const lockResult = await lockSlot({
      providerId: slotData.providerId,
      scheduledAt: slotData.scheduledAt,
      lockToken: lockToken,
      lockedBy: source, // "WHATSAPP" or "DASHBOARD"
      lockDuration: 30000 // 30 seconds
    });
    
    if (!lockResult.success) {
      // 3a. Slot taken - suggest alternative
      const nextSlot = await findNextAvailableSlot(slotData);
      return {
        success: false,
        conflict: true,
        suggestedSlot: nextSlot,
        message: "Slot unavailable. How about this alternative?"
      };
    }
    
    try {
      // 4. Write to Google Sheets (PRIMARY)
      const sheetsResult = await writeToGoogleSheets(clientId, slotData);
      
      // 5. Confirm booking and release lock
      await releaseLock(lockToken);
      
      // 6. Background sync to PostgreSQL
      await syncToPostgreSQL(clientId, sheetsResult.data);
      
      return {
        success: true,
        appointmentId: sheetsResult.appointmentId,
        message: "Appointment confirmed successfully!"
      };
      
    } catch (error) {
      // 7. Error - release lock and notify
      await releaseLock(lockToken);
      throw error;
    }
  }
}
```

### Conflict Resolution Strategy
```
Booking Attempt (WhatsApp + Dashboard simultaneously)
├── Both requests hit Google Sheets API
├── First request locks slot successfully
├── Second request gets lock failure
├── System suggests next available slot to second request
└── User can accept alternative or cancel
```

## 👨‍👩‍👧‍👦 Family Member Support

### Database Schema Changes
```sql
-- Updated Patient model allows multiple patients per phone
patients (
  id: string,
  phone: string, -- NO UNIQUE CONSTRAINT
  primaryContact: boolean, -- true for main contact
  relationToPrimaryContact: string, -- "self", "child", "spouse", etc.
  organizationId: string
);
```

### WhatsApp Family Interaction Flow
```
Patient: "Book appointment"
System: "Who is this appointment for?"
├── Option 1: "John Doe (You)" 
├── Option 2: "Sarah Doe (Child)"
├── Option 3: "Mary Doe (Spouse)"
└── Option 4: "Add new family member"

If "Add new family member":
├── System: "What's their name?"
├── System: "What's their relation to you?"
├── System: "Their date of birth?"
└── Register new patient with same phone number
```

### Family Patient Creation
```typescript
// When creating via WhatsApp or Staff app
const familyPatient = {
  firstName: "Sarah",
  lastName: "Doe", 
  phone: "+923001234567", // Same as primary contact
  primaryContact: false,   // Not the primary contact
  relationToPrimaryContact: "child",
  organizationId: "org_abc123"
};
```

## 🔄 Data Flow Architecture

### Write Operations (Primary Flow)
```
Patient Action (WhatsApp/Staff) 
    ↓
Google Sheets (CLIENT-OWNED) ← PRIMARY SOURCE
    ↓ (background sync)
PostgreSQL (DrSync VPS) ← SERVICE LAYER
    ↓
Reminder Queue Processing
    ↓
WhatsApp Notifications
```

### Read Operations 
```
Staff Dashboard Request
    ↓
Google Sheets API (real-time) ← AUTHORITATIVE
    ↓ (fallback if sheets unavailable)
PostgreSQL Cache ← BACKUP ONLY
```

### Multi-Client Data Isolation
```json
{
  "client_a": {
    "googleSheetsId": "sheet_123",
    "whatsappNumber": "+923001111111",
    "patients": [...], 
    "appointments": [...]
  },
  "client_b": {
    "googleSheetsId": "sheet_456", 
    "whatsappNumber": "+923002222222",
    "patients": [...],
    "appointments": [...]
  }
}
```

## 🛠️ Implementation Guidelines

### Google Sheets Service Layer
```typescript
// googleSheetsService.ts
class GoogleSheetsService {
  // Option A: Tab-based operations
  async writeToTab(sheetId: string, tabName: string, data: any[]);
  async readFromTab(sheetId: string, tabName: string, range?: string);
  
  // Option B: Separate sheet operations  
  async writeToSheet(sheetId: string, data: any[]);
  async readFromSheet(sheetId: string, range?: string);
  
  // Universal operations
  async createClientSheets(clientConfig: ClientConfig);
  async syncAppointment(clientId: string, appointmentData: any);
  async handleRateLimits();
}
```

### WhatsApp Service Manager
```typescript
// whatsappService.ts  
class WhatsAppService {
  private clients: Map<string, WhatsAppClient> = new Map();
  
  async initializeClient(organizationId: string, config: WhatsAppConfig);
  async routeMessage(phoneNumber: string, message: any);
  async sendMessage(clientId: string, recipientPhone: string, message: string);
  async handleWebhook(organizationId: string, webhookData: any);
}
```

### Sync Service Architecture
```typescript
// sheetsSyncService.ts
class SheetsSyncService {
  // Periodic sync: Google Sheets → PostgreSQL  
  async syncAllClients();
  async syncClient(organizationId: string);
  
  // Real-time webhook sync
  async handleSheetsWebhook(organizationId: string, changeData: any);
  
  // Reminder processing
  async processReminders();
  async queueReminder(appointmentData: any);
}
```

### Error Handling & Fallbacks
```typescript
class ErrorHandlingService {
  async handleGoogleSheetsOutage(clientId: string) {
    // 1. Log outage event
    // 2. Switch to PostgreSQL read mode temporarily  
    // 3. Queue writes for when sheets come back online
    // 4. Notify client of temporary degradation
  }
  
  async handleSlotConflict(conflictData: any) {
    // 1. Find next available slot
    // 2. Notify user with alternative
    // 3. Allow user to accept or decline
  }
}
```

## 📊 Monitoring & Analytics

### Key Metrics to Track
- Google Sheets API response times per client
- Booking conflict resolution success rate
- Family member registration patterns  
- WhatsApp message delivery rates per client
- Sync lag between Google Sheets ↔ PostgreSQL

### Success Criteria
- ✅ Booking conflicts resolved in < 5 seconds
- ✅ Google Sheets writes complete in < 3 seconds  
- ✅ 99.9% message delivery rate per client
- ✅ Zero data loss during sync operations
- ✅ Support for 50+ family members per phone number

---

**Next Implementation Phase:** TASK-023 through TASK-026 based on this specification.
