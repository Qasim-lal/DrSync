# WhatsApp Business API - Complete API Documentation

**Version:** 1.0  
**Date:** October 17, 2025  
**Base URL:** `https://api.drsync.health/v1/api/whatsapp`  
**Authentication:** JWT Bearer Token (where required)

---

## Table of Contents

1. [Webhook Endpoints](#webhook-endpoints)
2. [Message Sending](#message-sending)
3. [Metrics & Monitoring](#metrics--monitoring)
4. [Message History](#message-history)
5. [Error Codes](#error-codes)
6. [Rate Limiting](#rate-limiting)
7. [Examples](#examples)

---

## Webhook Endpoints

### GET /webhook

**Description:** Webhook verification endpoint called by Meta to verify webhook URL ownership.

**Authentication:** None (public endpoint)

**Query Parameters:**
- `hub.mode` (string, required): Must be "subscribe"
- `hub.verify_token` (string, required): Verification token (matches `WEBHOOK_VERIFY_TOKEN` env var)
- `hub.challenge` (string, required): Random string to echo back

**Response:**
```
Status: 200 OK
Body: <hub.challenge value>
```

**Example:**
```bash
# Meta calls this endpoint during webhook setup
GET /api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=your_token&hub.challenge=abc123
```

---

### POST /webhook

**Description:** Receives incoming WhatsApp messages and status updates from Meta.

**Authentication:** Webhook signature verification (X-Hub-Signature-256 header)

**Headers:**
- `X-Hub-Signature-256` (string): HMAC SHA256 signature of request body
- `Content-Type`: `application/json`

**Request Body:**
```json
{
  "object": "whatsapp_business_account",
  "entry": [{
    "id": "BUSINESS_ACCOUNT_ID",
    "changes": [{
      "value": {
        "messaging_product": "whatsapp",
        "metadata": {
          "display_phone_number": "+923001234567",
          "phone_number_id": "109876543210"
        },
        "messages": [{
          "from": "923009876543",
          "id": "wamid.ABC123...",
          "timestamp": "1697500000",
          "type": "text",
          "text": {
            "body": "Hello, I want to book an appointment"
          }
        }]
      },
      "field": "messages"
    }]
  }]
}
```

**Response:**
```
Status: 200 OK
Body: (empty)
```

**Note:** Webhook must respond within 20 seconds or Meta will retry.

---

## Message Sending

### Helper Methods (whatsappHelpers.ts)

Use these helper functions to create properly formatted messages:

#### createTextMessage()

```typescript
import { createTextMessage } from '../services/whatsappHelpers';

const message = createTextMessage(
  '+923001234567',
  'Hello! Your appointment is confirmed for tomorrow at 2:00 PM.',
  true // enable link previews
);
```

#### createButtonMessage()

```typescript
import { createButtonMessage } from '../services/whatsappHelpers';

const message = createButtonMessage(
  '+923001234567',
  'Would you like to confirm your appointment?',
  [
    { id: 'confirm_yes', title: 'Yes, confirm' },
    { id: 'confirm_no', title: 'Cancel' }
  ],
  'Appointment Confirmation', // header (optional)
  'Reply within 24 hours' // footer (optional)
);
```

#### createListMessage()

```typescript
import { createListMessage } from '../services/whatsappHelpers';

const message = createListMessage(
  '+923001234567',
  'Please select a doctor from the list below:',
  'Select Doctor',
  [
    {
      title: 'Available Doctors',
      rows: [
        { id: 'dr_1', title: 'Dr. Ahmed Khan', description: 'Cardiologist - 15 years exp' },
        { id: 'dr_2', title: 'Dr. Fatima Ali', description: 'Pediatrician - 10 years exp' }
      ]
    }
  ]
);
```

#### createTemplateMessage()

```typescript
import { createTemplateMessage } from '../services/whatsappHelpers';

// Templates must be pre-approved by WhatsApp
const message = createTemplateMessage(
  '+923001234567',
  'appointment_reminder', // template name
  'en',
  [
    {
      type: 'body',
      parameters: [
        { type: 'text', text: 'Dr. Ahmed Khan' },
        { type: 'text', text: 'October 18, 2025 at 2:00 PM' }
      ]
    }
  ]
);
```

### Send Message (Internal API)

**Description:** Send WhatsApp message using organization's credentials.

**Method:** Internal service method (not HTTP endpoint)

```typescript
import whatsappService from '../services/whatsappService';

const result = await whatsappService.sendMessage(
  'org_123', // organization ID
  {
    to: '923001234567',
    type: 'text',
    text: {
      body: 'Hello from DrSync!'
    }
  }
);

// Response
{
  success: true,
  messageId: 'wamid.ABC123...'
}
```

**Rate Limiting:** Automatically queues messages if rate limit (80 msg/sec) exceeded.

**Retry Logic:** Automatically retries failed messages up to 3 times with exponential backoff.

---

## Metrics & Monitoring

### GET /metrics/:organizationId

**Description:** Get message metrics for organization.

**Authentication:** Required (JWT)

**Parameters:**
- `organizationId` (path, string): Organization ID
- `date` (query, string, optional): Date in YYYY-MM-DD format (default: today)

**Response:**
```json
{
  "organizationId": "org_123",
  "metrics": {
    "date": "2025-10-17",
    "messagesSent": 150,
    "messagesReceived": 200,
    "messagesRateLimited": 5,
    "averageResponseTime": 245,
    "responseTimes": {
      "count": 150,
      "min": 120,
      "max": 890
    }
  },
  "timestamp": "2025-10-17T03:30:00.000Z"
}
```

**Example:**
```bash
curl -X GET "https://api.drsync.health/v1/api/whatsapp/metrics/org_123?date=2025-10-17" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

### GET /health

**Description:** Basic health check for WhatsApp service.

**Authentication:** None

**Response:**
```json
{
  "status": "healthy",
  "service": "whatsapp",
  "activeClients": 5,
  "clients": {
    "org_123": {
      "phoneNumber": "+923001234567",
      "isActive": true,
      "lastActivityAt": "2025-10-17T03:25:00.000Z"
    }
  },
  "timestamp": "2025-10-17T03:30:00.000Z"
}
```

---

### GET /health/detailed

**Description:** Comprehensive health check with all system components.

**Authentication:** None

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-10-17T03:30:00.000Z",
  "checks": {
    "whatsapp": {
      "status": "ok",
      "activeClients": 5,
      "clients": { ... }
    },
    "database": {
      "status": "ok"
    },
    "redis": {
      "status": "ok"
    },
    "whatsappApi": {
      "status": "ok",
      "message": "WhatsApp API accessible"
    },
    "messageQueue": {
      "status": "ok"
    }
  }
}
```

**Status Values:**
- `healthy`: All systems operational
- `degraded`: Some systems experiencing issues but service continues
- `unhealthy`: Critical failure

---

### GET /queue/stats

**Description:** Message queue statistics.

**Authentication:** Required (JWT)

**Response:**
```json
{
  "queue": "whatsapp-messages",
  "status": "operational",
  "timestamp": "2025-10-17T03:30:00.000Z"
}
```

---

### POST /test/connectivity

**Description:** Test WhatsApp API connectivity for an organization.

**Authentication:** Required (JWT, Admin role)

**Request Body:**
```json
{
  "organizationId": "org_123"
}
```

**Response:**
```json
{
  "organizationId": "org_123",
  "connectivity": {
    "status": "ok",
    "phoneNumber": "+923001234567",
    "isActive": true,
    "lastActivity": "2025-10-17T03:25:00.000Z"
  },
  "timestamp": "2025-10-17T03:30:00.000Z"
}
```

---

### GET /alerts/config

**Description:** Get alerting configuration and thresholds.

**Authentication:** Required (JWT, Super Admin role)

**Response:**
```json
{
  "alerts": {
    "highErrorRate": {
      "enabled": true,
      "threshold": 0.05,
      "window": 300,
      "action": "email_notification"
    },
    "slowResponse": {
      "enabled": true,
      "threshold": 5000,
      "window": 300,
      "action": "slack_notification"
    },
    "apiDown": {
      "enabled": true,
      "threshold": 1,
      "window": 60,
      "action": "page_oncall"
    },
    "highQueueDepth": {
      "enabled": true,
      "threshold": 1000,
      "window": 60,
      "action": "slack_notification"
    }
  },
  "timestamp": "2025-10-17T03:30:00.000Z"
}
```

---

## Message History

### GET /messages/history

**Description:** Get paginated message history for organization.

**Authentication:** Required (JWT)

**Query Parameters:**
- `patientId` (string, optional): Filter by patient ID
- `startDate` (string, optional): Start date (ISO 8601)
- `endDate` (string, optional): End date (ISO 8601)
- `page` (number, optional): Page number (default: 1)
- `limit` (number, optional): Results per page (default: 50)

**Response:**
```json
{
  "messages": [
    {
      "id": "msg_123",
      "messageType": "TEXT",
      "content": "Hello, I want to book an appointment",
      "direction": "INBOUND",
      "status": "SENT",
      "language": "en",
      "createdAt": "2025-10-17T03:25:00.000Z",
      "patientId": "patient_456",
      "whatsappMessageId": "wamid.ABC123..."
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 245,
    "totalPages": 5
  },
  "timestamp": "2025-10-17T03:30:00.000Z"
}
```

**Example:**
```bash
curl -X GET "https://api.drsync.health/v1/api/whatsapp/messages/history?page=1&limit=20&startDate=2025-10-01" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## Error Codes

### WhatsApp API Error Codes

| Code | Message | Description | Resolution |
|------|---------|-------------|------------|
| 401 | Authentication failed | Access token invalid or expired | Refresh access token or regenerate |
| 403 | Permission denied | Insufficient permissions | Check phone number permissions in Meta console |
| 429 | Rate limit exceeded | Too many messages sent | Messages automatically queued, reduce send rate |
| 500 | Internal server error | WhatsApp API internal error | Retry after delay, check Meta status page |
| 131000 | Generic user error | Invalid phone number format | Verify phone number format |
| 131005 | Rate limit hit | Organization rate limit exceeded | Wait and retry |
| 131008 | Required parameter missing | Missing required message field | Check message structure |
| 131026 | Message undeliverable | Cannot deliver to recipient | Verify recipient number and WhatsApp account |
| 131047 | Re-engagement message required | 24-hour window expired | Use approved template message |
| 133000 | Generic template error | Template message error | Verify template is approved and parameters correct |

### DrSync API Error Codes

| Status | Error | Description |
|--------|-------|-------------|
| 400 | Bad Request | Invalid request parameters |
| 401 | Unauthorized | Missing or invalid authentication token |
| 403 | Forbidden | Insufficient permissions for operation |
| 404 | Not Found | Resource not found (organization, client, etc.) |
| 429 | Too Many Requests | Rate limit exceeded (client-side) |
| 500 | Internal Server Error | Server-side error |
| 503 | Service Unavailable | Service temporarily unavailable |

---

## Rate Limiting

### WhatsApp Cloud API Limits

- **80 messages per second** per phone number
- **1,000 conversations** per day (free tier)
- **100,000 conversations** per day (paid tier)

### DrSync Rate Limiting

**Automatic Rate Limiting:**
- Messages automatically queued when approaching 80 msg/sec limit
- Redis-based tracking with 1-second sliding window
- Exponential backoff for failed messages

**Queue Configuration:**
- Max retries: 3 attempts
- Backoff delay: 2 seconds (exponential)
- Queue name: `whatsapp-messages`

**Checking Rate Limit Status:**
```typescript
// Internal - rate limiting is automatic
const withinLimit = await whatsappService.checkRateLimit('org_123');
```

---

## Examples

### Complete Message Flow Example

```typescript
import whatsappService from '../services/whatsappService';
import { createButtonMessage } from '../services/whatsappHelpers';

// 1. Send initial message
const initialMessage = await whatsappService.sendMessage(
  'org_123',
  {
    to: '923001234567',
    type: 'text',
    text: {
      body: 'Hello! Welcome to DrSync Healthcare. How can I help you today?'
    }
  }
);

console.log('Message sent:', initialMessage.messageId);

// 2. Send button message for appointment booking
const buttonMessage = createButtonMessage(
  '923001234567',
  'Would you like to book an appointment with a doctor?',
  [
    { id: 'book_yes', title: 'Yes, book now' },
    { id: 'book_later', title: 'Maybe later' },
    { id: 'book_info', title: 'More info' }
  ]
);

const buttonResponse = await whatsappService.sendMessage('org_123', buttonMessage);

// 3. Get message metrics
const metrics = await whatsappService.getMessageMetrics('org_123');
console.log('Today\'s metrics:', metrics);
```

### Error Handling Example

```typescript
try {
  const result = await whatsappService.sendMessage('org_123', message);
  
  if (!result.success) {
    if (result.error === 'Message queued due to rate limit') {
      // Message queued successfully, will be sent automatically
      console.log('Message queued for later delivery');
    } else {
      // Actual error occurred
      console.error('Failed to send message:', result.error);
    }
  } else {
    console.log('Message sent successfully:', result.messageId);
  }
} catch (error) {
  console.error('Unexpected error:', error);
}
```

### Webhook Processing Example

```typescript
// Webhook route automatically processes incoming messages
// Messages are routed to correct organization based on phone number

// In whatsappService, messages are processed:
router.post('/webhook', async (req, res) => {
  res.sendStatus(200); // Respond immediately
  
  // Process asynchronously
  await whatsappService.routeMessage(req.body);
});
```

---

## Testing

### Test Webhook Verification

```bash
# Simulate Meta's verification call
curl "http://localhost:3001/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=your_token&hub.challenge=test123"

# Should return: test123
```

### Test Message Sending

```bash
# Send test message via Meta API Console
# 1. Go to developers.facebook.com
# 2. Select your app
# 3. WhatsApp > API Setup
# 4. Send and Receive Messages section
# 5. Enter your phone number and click "Send Message"
```

### Test Health Check

```bash
curl http://localhost:3001/api/whatsapp/health

# Expected response:
# {
#   "status": "healthy",
#   "service": "whatsapp",
#   "activeClients": 1,
#   ...
# }
```

---

## Additional Resources

- [WhatsApp Cloud API Documentation](https://developers.facebook.com/docs/whatsapp/cloud-api)
- [WhatsApp Message Templates](https://developers.facebook.com/docs/whatsapp/message-templates)
- [Webhook Reference](https://developers.facebook.com/docs/graph-api/webhooks/getting-started)
- DrSync Internal: `TASK-039_Setup_Guide.md`

---

**Last Updated:** October 17, 2025  
**Maintained By:** DrSync Development Team  
**Support:** support@drsync.health
