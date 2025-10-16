# DrSync-Client Communication Architecture

**Version:** 1.0  
**Date:** October 13, 2025  
**Purpose:** Define how DrSync platform communicates with client organizations  

---

## 📋 Table of Contents

1. [Overview](#1-overview)
2. [Communication Channels](#2-communication-channels)
3. [Notification Types](#3-notification-types)
4. [Implementation Details](#4-implementation-details)
5. [Client Support Flow](#5-client-support-flow)
6. [Emergency Communication](#6-emergency-communication)

---

## 1. Overview

### Communication Goals
- ✅ Keep clients informed about their account status
- ✅ Provide timely support and troubleshooting
- ✅ Send important billing and subscription updates
- ✅ Announce new features and improvements
- ✅ Alert about system issues proactively

### Communication Principles
1. **Non-Intrusive**: Don't spam clients with unnecessary messages
2. **Timely**: Critical alerts sent immediately, others batched
3. **Multi-Channel**: Use appropriate channel for urgency level
4. **Actionable**: Every notification includes next steps
5. **Trackable**: All communications logged for reference

---

## 2. Communication Channels

### 2.1 Email (Primary Channel)

**Use Cases:**
- Account setup and onboarding
- Billing notifications and invoices
- Monthly usage reports
- Feature announcements
- Non-urgent support responses
- Password resets
- Staff invitation emails

**Implementation:**
```typescript
// EmailService (already exists)
interface EmailNotification {
  to: string;
  subject: string;
  template: string; // HTML template
  data: any; // Template variables
  priority: 'high' | 'normal' | 'low';
}

// Example usage
emailService.send({
  to: organization.email,
  subject: 'Welcome to DrSync!',
  template: 'welcome-email',
  data: {
    organizationName: organization.name,
    setupUrl: `${DASHBOARD_URL}/setup`,
    supportEmail: 'support@drsync.health'
  },
  priority: 'high'
});
```

**Email Templates Needed:**
- ✅ Welcome email (already exists - TASK-035)
- ✅ Staff invitation (already exists - TASK-036C)
- [ ] Subscription expiring (5 days, 1 day warnings)
- [ ] Payment successful
- [ ] Payment failed
- [ ] WhatsApp token expiring
- [ ] Google Sheets sync error
- [ ] Monthly usage report
- [ ] New feature announcement
- [ ] Support ticket response

---

### 2.2 In-Dashboard Notifications

**Use Cases:**
- Configuration issues (real-time)
- System status updates
- Setup progress tracking
- Support ticket updates
- Feature tutorials
- Quick tips

**Implementation:**
```typescript
// Notification Schema
interface DashboardNotification {
  id: string;
  organizationId: string;
  type: 'info' | 'success' | 'warning' | 'error';
  category: 'billing' | 'system' | 'configuration' | 'support' | 'feature';
  title: string;
  message: string;
  actionUrl?: string; // Link to resolve issue
  actionText?: string; // "Fix Now", "View Details"
  isRead: boolean;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  createdAt: Date;
  expiresAt?: Date; // Auto-dismiss after date
}

// Create notification
await notificationService.create({
  organizationId: org.id,
  type: 'warning',
  category: 'configuration',
  title: 'WhatsApp Token Expiring Soon',
  message: 'Your WhatsApp access token will expire in 7 days. Please renew it to continue receiving messages.',
  actionUrl: '/settings/whatsapp/renew-token',
  actionText: 'Renew Now',
  priority: 'high'
});

// Frontend displays in:
// 1. Bell icon with badge count
// 2. Notification dropdown panel
// 3. Banner for urgent/high priority
```

**Notification Categories:**

**1. Billing Notifications**
```typescript
{
  type: 'warning',
  category: 'billing',
  title: 'Subscription Expiring Soon',
  message: 'Your subscription expires on Oct 20, 2025',
  actionUrl: '/billing/renew',
  actionText: 'Renew Subscription',
  priority: 'high'
}
```

**2. Configuration Issues**
```typescript
{
  type: 'error',
  category: 'configuration',
  title: 'Google Sheets Sync Failed',
  message: 'Unable to sync appointments. Check your Google Sheets permissions.',
  actionUrl: '/settings/google-sheets/reconnect',
  actionText: 'Fix Now',
  priority: 'urgent'
}
```

**3. System Updates**
```typescript
{
  type: 'info',
  category: 'system',
  title: 'Scheduled Maintenance',
  message: 'System maintenance on Oct 15, 2:00 AM - 4:00 AM PKT',
  priority: 'medium'
}
```

**4. Support Updates**
```typescript
{
  type: 'success',
  category: 'support',
  title: 'Support Ticket Resolved',
  message: 'Your ticket #1234 has been resolved',
  actionUrl: '/support/tickets/1234',
  actionText: 'View Response',
  priority: 'medium'
}
```

**5. Feature Announcements**
```typescript
{
  type: 'info',
  category: 'feature',
  title: 'New Feature: Appointment Analytics',
  message: 'View detailed analytics for your appointments',
  actionUrl: '/analytics',
  actionText: 'Try It Now',
  priority: 'low'
}
```

---

### 2.3 SMS Notifications (Limited Use)

**Use Cases:**
- Phone verification during signup
- Password reset codes
- Critical system alerts (WhatsApp down, payment failed)
- Two-factor authentication codes

**Implementation:**
```typescript
// SMS Service
interface SMSNotification {
  to: string; // Phone number with country code
  message: string; // Max 160 characters
  priority: 'urgent' | 'normal';
}

// Example: Payment failed alert
smsService.send({
  to: organization.adminPhone,
  message: 'DrSync: Payment failed for your subscription. Please update your payment method: drsync.health/billing',
  priority: 'urgent'
});
```

**SMS Gateway:**
- Pakistan: Use local SMS gateway (e.g., SMS API services)
- International: Twilio or AWS SNS
- Cost: Client organizations absorb SMS costs

---

### 2.4 WhatsApp Notifications (DrSync's Own Number)

**Use Cases:**
- Customer support responses
- Urgent alerts that need acknowledgment
- Interactive support conversations

**Implementation:**
```typescript
// DrSync's own WhatsApp Business number (separate from client numbers)
const DRSYNC_SUPPORT_WHATSAPP = '+92-3XX-XXXXXXX';

// Send support message
await whatsappService.sendTextMessage(
  'drsync-support-org-id', // DrSync's own organization ID
  organization.adminPhone,
  'Your support ticket #1234 has been resolved. Reply with "details" to see the solution.'
);
```

**DrSync WhatsApp Use Cases:**
- Support ticket responses
- Billing issue follow-ups
- Quick troubleshooting assistance
- Feature usage tips

---

### 2.5 Support Ticket System (Already Built - TASK-038D)

**Use Cases:**
- Technical support requests
- Billing inquiries
- Feature requests
- Bug reports
- Configuration help

**Flow:**
```
Client creates ticket in dashboard
    ↓
DrSync support team receives notification
    ↓
Support agent responds via ticket system
    ↓
Client receives:
    ├─→ Email notification with response
    ├─→ In-dashboard notification
    └─→ Can reply to continue conversation
```

**Ticket System Features (Already Implemented):**
- ✅ Create/view/update tickets
- ✅ Priority levels (Low, Medium, High, Urgent)
- ✅ Categories (Technical, Billing, Configuration, Feature Request)
- ✅ File attachments
- ✅ Status tracking (Open, In Progress, Resolved, Closed)
- ✅ Response history
- ✅ SLA tracking

---

## 3. Notification Types

### 3.1 Onboarding Notifications

**When:** Client signs up for DrSync

**Sequence:**
```
Day 0 (Signup):
├─→ Email: Welcome + Setup Instructions
├─→ SMS: Phone verification code
└─→ Dashboard: "Complete Your Setup" checklist

Day 1 (If setup incomplete):
└─→ Email: "Finish setting up your WhatsApp integration"

Day 3 (If setup incomplete):
└─→ Email: "Need help? Schedule onboarding call"

Day 7 (If setup complete):
└─→ Email: "Your first week with DrSync - Tips & Best Practices"
```

---

### 3.2 Configuration Notifications

**Real-time Alerts:**

**WhatsApp Configuration Issues:**
```
Trigger: WhatsApp API returns authentication error
Actions:
├─→ Dashboard: Error banner with "Fix Now" button
├─→ Email: "WhatsApp connection issue detected"
└─→ SMS (if critical): "DrSync: WhatsApp down, please reconnect"
```

**Google Sheets Sync Failures:**
```
Trigger: Google Sheets API permission error
Actions:
├─→ Dashboard: Warning notification
├─→ Email: "Google Sheets sync failed - Check permissions"
└─→ Fallback: System uses PostgreSQL (automatic)
```

**Token Expiration Warnings:**
```
Trigger: Access token expires in 7 days
Actions:
├─→ Dashboard: Warning notification
└─→ Email: "Renew your WhatsApp access token"

Trigger: Token expires in 1 day
Actions:
├─→ Dashboard: Urgent banner
├─→ Email: "URGENT: Renew token today"
└─→ SMS: "DrSync: Token expires tomorrow"
```

---

### 3.3 Billing Notifications

**Subscription Lifecycle:**

**Trial Start (Day 0):**
```
Email: "Your 14-day trial has started"
Dashboard: Trial countdown banner
```

**Trial Ending (Day 12 - 2 days left):**
```
Email: "Your trial ends in 2 days - Upgrade now"
Dashboard: Upgrade prompt with discount offer
```

**Trial Expired (Day 14):**
```
Email: "Your trial has ended - Subscribe to continue"
Dashboard: Subscription required modal (limited access)
SMS: "DrSync trial ended. Subscribe: drsync.health/billing"
```

**Subscription Expiring (5 days before):**
```
Email: "Your subscription expires on [date]"
Dashboard: Renewal reminder banner
```

**Payment Successful:**
```
Email: "Payment received - Invoice attached"
Dashboard: Success notification
```

**Payment Failed:**
```
Email: "Payment failed - Update payment method"
Dashboard: Urgent banner with "Update Payment" button
SMS: "DrSync payment failed. Update: drsync.health/billing"
```

**Subscription Expired:**
```
Email: "Your subscription has expired - Reactivate now"
Dashboard: Account suspended banner (grace period)
SMS: "DrSync subscription expired"
```

---

### 3.4 Usage & Analytics Notifications

**Monthly Report (1st of each month):**
```
Email: "Your DrSync monthly report"
Contents:
├─→ Total appointments booked
├─→ WhatsApp messages sent/received
├─→ Patient engagement metrics
├─→ Popular appointment times
├─→ Revenue summary (if billing enabled)
└─→ Link to detailed dashboard
```

**Usage Threshold Alerts:**
```
Trigger: Approaching plan limits
Email: "You're approaching your plan limit"
Dashboard: Upgrade suggestion
```

---

### 3.5 Feature Announcements

**New Feature Release:**
```
Email: "New Feature: [Feature Name]"
Dashboard: Feature spotlight modal (first login)
In-app tooltip: Highlights new feature locations
```

**Feature Deprecation:**
```
Email: "Important: [Feature] will be deprecated"
Dashboard: Migration guide notification
```

---

### 3.6 System Status Notifications

**Maintenance Scheduled:**
```
Email: "Scheduled maintenance on [date/time]"
Dashboard: Banner 24 hours before
SMS: (If affects critical services)
```

**Unplanned Downtime:**
```
Dashboard: System status banner
Email: "System issue - We're working on it"
Status page: Real-time updates
```

**Service Restored:**
```
Email: "All systems operational"
Dashboard: "Issue resolved" notification
```

---

## 4. Implementation Details

### 4.1 Notification Service Architecture

```typescript
// Backend: NotificationService.ts

class NotificationService {
  /**
   * Send notification through appropriate channels
   */
  async send(notification: Notification): Promise<void> {
    const { organizationId, type, priority, channels } = notification;
    
    // Get organization preferences
    const org = await this.getOrganizationPreferences(organizationId);
    
    // Determine channels based on priority and preferences
    const activeChannels = this.determineChannels(priority, org.preferences);
    
    // Send to each channel
    for (const channel of activeChannels) {
      switch (channel) {
        case 'email':
          await emailService.send(notification);
          break;
        case 'dashboard':
          await this.createDashboardNotification(notification);
          break;
        case 'sms':
          await smsService.send(notification);
          break;
        case 'whatsapp':
          await this.sendWhatsAppNotification(notification);
          break;
      }
    }
    
    // Log notification
    await this.logNotification(notification);
  }
  
  /**
   * Determine channels based on priority
   */
  private determineChannels(
    priority: 'low' | 'medium' | 'high' | 'urgent',
    preferences: NotificationPreferences
  ): Channel[] {
    const channelMap = {
      low: ['dashboard'],
      medium: ['dashboard', 'email'],
      high: ['dashboard', 'email'],
      urgent: ['dashboard', 'email', 'sms']
    };
    
    // Filter based on user preferences
    const channels = channelMap[priority];
    return channels.filter(ch => preferences[ch] !== false);
  }
  
  /**
   * Create dashboard notification
   */
  async createDashboardNotification(notification: Notification): Promise<void> {
    const prisma = getPrismaClient();
    
    await prisma.notification.create({
      data: {
        organizationId: notification.organizationId,
        type: notification.type,
        category: notification.category,
        title: notification.title,
        message: notification.message,
        actionUrl: notification.actionUrl,
        actionText: notification.actionText,
        priority: notification.priority,
        isRead: false,
        createdAt: new Date(),
        expiresAt: notification.expiresAt
      }
    });
    
    // Emit real-time event for WebSocket
    this.emitNotificationEvent(notification.organizationId, notification);
  }
}
```

---

### 4.2 Database Schema

```sql
-- Notifications table
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id),
    type VARCHAR(20) NOT NULL, -- info, success, warning, error
    category VARCHAR(50) NOT NULL, -- billing, system, configuration, support, feature
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    action_url VARCHAR(500),
    action_text VARCHAR(100),
    priority VARCHAR(20) NOT NULL, -- low, medium, high, urgent
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP,
    metadata JSONB -- Additional data
);

-- Notification preferences
CREATE TABLE notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) UNIQUE,
    email_enabled BOOLEAN DEFAULT true,
    sms_enabled BOOLEAN DEFAULT true,
    whatsapp_enabled BOOLEAN DEFAULT false,
    dashboard_enabled BOOLEAN DEFAULT true,
    billing_notifications BOOLEAN DEFAULT true,
    system_notifications BOOLEAN DEFAULT true,
    feature_announcements BOOLEAN DEFAULT true,
    marketing_emails BOOLEAN DEFAULT false,
    quiet_hours_start TIME, -- No notifications during these hours
    quiet_hours_end TIME,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Notification log (for analytics)
CREATE TABLE notification_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id),
    notification_type VARCHAR(50),
    channel VARCHAR(20), -- email, sms, dashboard, whatsapp
    status VARCHAR(20), -- sent, delivered, failed, read
    sent_at TIMESTAMP DEFAULT NOW(),
    delivered_at TIMESTAMP,
    read_at TIMESTAMP,
    error_message TEXT
);

-- Indexes
CREATE INDEX idx_notifications_org_unread ON notifications(organization_id, is_read);
CREATE INDEX idx_notifications_priority ON notifications(priority, created_at);
CREATE INDEX idx_notification_log_org ON notification_log(organization_id, sent_at);
```

---

### 4.3 API Endpoints

```typescript
// Get notifications for logged-in organization
GET /api/notifications
Response: {
  unreadCount: 5,
  notifications: [
    {
      id: "notif_123",
      type: "warning",
      category: "billing",
      title: "Subscription Expiring Soon",
      message: "Your subscription expires on Oct 20, 2025",
      actionUrl: "/billing/renew",
      actionText: "Renew Subscription",
      priority: "high",
      isRead: false,
      createdAt: "2025-10-13T10:00:00Z"
    }
  ]
}

// Mark notification as read
PUT /api/notifications/:id/read

// Mark all as read
PUT /api/notifications/mark-all-read

// Get notification preferences
GET /api/notifications/preferences

// Update preferences
PUT /api/notifications/preferences
Body: {
  emailEnabled: true,
  smsEnabled: false,
  quietHoursStart: "22:00",
  quietHoursEnd: "08:00"
}

// Dismiss notification
DELETE /api/notifications/:id
```

---

### 4.4 Frontend Components

```typescript
// React Components

// 1. Notification Bell Icon (Header)
<NotificationBell />
// Shows unread count badge
// Opens dropdown with recent notifications

// 2. Notification Dropdown
<NotificationDropdown>
  <NotificationList>
    <NotificationItem />
    <NotificationItem />
  </NotificationList>
  <ViewAllLink />
</NotificationDropdown>

// 3. Notification Banner (Top of page for urgent)
<NotificationBanner 
  type="error"
  title="WhatsApp Connection Lost"
  message="Reconnect your WhatsApp account to continue receiving messages"
  actionText="Fix Now"
  actionUrl="/settings/whatsapp"
  onDismiss={handleDismiss}
/>

// 4. Notification Center Page
<NotificationCenter>
  <NotificationFilters />
  <NotificationList />
  <NotificationPreferences />
</NotificationCenter>
```

---

## 5. Client Support Flow

### 5.1 Support Ticket Creation

```
Client Has Issue
    ↓
Opens Dashboard → Help → Contact Support
    ↓
Creates Support Ticket:
├─→ Category: [Technical/Billing/Configuration/Feature]
├─→ Priority: [Low/Medium/High/Urgent]
├─→ Subject: Brief description
├─→ Description: Detailed explanation
├─→ Attachments: Screenshots/logs
└─→ Submit
    ↓
System Actions:
├─→ Create ticket in database
├─→ Send confirmation email to client
├─→ Notify DrSync support team (Slack/Email)
└─→ Create dashboard notification for client
```

### 5.2 Support Response Flow

```
DrSync Support Agent
    ↓
Views ticket in Super Admin Dashboard (TASK-038D)
    ↓
Responds with solution
    ↓
System Actions:
├─→ Update ticket status
├─→ Send email to client with response
├─→ Create dashboard notification
└─→ Optional: Send WhatsApp message for urgent issues
    ↓
Client Reviews Response
    ↓
Options:
├─→ Mark as resolved
├─→ Reply with follow-up question
└─→ Reopen ticket
```

---

## 6. Emergency Communication

### 6.1 Critical Issues Protocol

**WhatsApp API Down (Affects all clients):**
```
Immediate Actions:
├─→ Status page: Update with incident details
├─→ Email: All affected clients
├─→ Dashboard: Global banner notification
└─→ SMS: (If prolonged > 1 hour)

Updates:
├─→ Every 30 minutes until resolved
└─→ Final "All clear" message
```

**Security Breach:**
```
Immediate Actions:
├─→ Email: All clients immediately
├─→ SMS: Force password reset instructions
└─→ Dashboard: Security alert banner
    ↓
Follow-up:
├─→ Incident report within 24 hours
└─→ Action plan to prevent recurrence
```

**Data Loss Risk:**
```
Immediate Actions:
├─→ Email: Affected clients
├─→ SMS: Critical data backup reminder
└─→ Phone call: High-value clients
    ↓
Recovery:
├─→ Regular updates every hour
└─→ Post-mortem report
```

---

## 7. Communication Best Practices

### 7.1 Frequency Guidelines

**Daily:** Only for urgent/critical issues
**Weekly:** Support ticket responses, issue resolutions
**Monthly:** Usage reports, feature announcements
**Quarterly:** Platform roadmap updates

### 7.2 Tone & Language

- ✅ Professional but friendly
- ✅ Clear and concise
- ✅ Action-oriented (tell them what to do next)
- ✅ Empathetic (acknowledge their concerns)
- ❌ No jargon unless necessary
- ❌ No blame language

### 7.3 Response Time SLAs

| Priority | Dashboard | Email | Phone/WhatsApp |
|----------|-----------|-------|----------------|
| Urgent | Instant | 1 hour | 30 minutes |
| High | Instant | 4 hours | 2 hours |
| Medium | Instant | 24 hours | N/A |
| Low | Instant | 48 hours | N/A |

---

## 8. Implementation Roadmap

### Phase 1: Essential Communication (Immediate)
- [x] Email service (already exists)
- [x] Support ticket system (TASK-038D done)
- [ ] Dashboard notifications (basic)
- [ ] Notification preferences

### Phase 2: Enhanced Notifications (Next Sprint)
- [ ] Real-time dashboard notifications (WebSocket)
- [ ] SMS integration for critical alerts
- [ ] Notification center page
- [ ] Email template improvements

### Phase 3: Proactive Communication (Future)
- [ ] WhatsApp support channel (DrSync's number)
- [ ] Automated usage reports
- [ ] Predictive issue detection
- [ ] In-app chat support

---

## Appendix: Communication Templates

### Email Template: Subscription Expiring
```
Subject: Your DrSync subscription expires in 5 days

Hi [Organization Name],

Your DrSync subscription will expire on [Date]. To continue using all features:

1. Log in to your dashboard
2. Go to Billing → Renew Subscription
3. Update payment method if needed

Current Plan: [Plan Name]
Monthly Cost: [Amount]

Renew Now: [Link]

Questions? Reply to this email or contact support.

Best regards,
DrSync Team
```

### Dashboard Notification: Configuration Error
```json
{
  "type": "error",
  "title": "WhatsApp Connection Failed",
  "message": "We couldn't connect to your WhatsApp Business API. This means patients can't book appointments via WhatsApp right now.",
  "actionText": "Reconnect Now",
  "actionUrl": "/settings/whatsapp/reconnect",
  "priority": "urgent",
  "troubleshootingSteps": [
    "Check your WhatsApp access token hasn't expired",
    "Verify your phone number is still registered",
    "Ensure your Meta Business Account is active"
  ]
}
```

---

**END OF DOCUMENT**
