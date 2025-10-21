# WhatsApp Simulator Guide
**Version:** 1.0  
**Date:** October 18, 2025  
**Purpose:** Local WhatsApp testing without Meta approval

## Overview

The WhatsApp Simulator allows you to test the entire DrSync WhatsApp integration locally without requiring:
- ❌ Meta Business Manager approval
- ❌ Production domain with SSL
- ❌ Live WhatsApp Business phone number
- ❌ Production deployment

**Confidence Level: 85-90%** of real WhatsApp functionality

## Components

### 1. Mock WhatsApp API Server
- **Port:** 3099
- **Simulates:** Meta's WhatsApp Cloud API
- **Features:**
  - Realistic message sending/receiving
  - Status tracking (sent → delivered → read)
  - Rate limiting (80 msg/sec)
  - Error simulation (2% random errors)
  - Network latency (50-500ms)

### 2. Conversation Simulator CLI
- **Interactive tool** for simulating patient conversations
- **Features:**
  - Send messages as patients
  - Test booking flows
  - View conversation history
  - Monitor message statistics

### 3. Integration Test Suite
- **Automated tests** for appointment booking
- **Coverage:**
  - Message routing
  - Conversation flows
  - Error handling
  - Rate limiting

## Quick Start

### 🐳 Docker Setup (Recommended)

See **[Docker Setup Guide](WHATSAPP_SIMULATOR_DOCKER.md)** for complete Docker instructions.

**Quick Docker Start:**
```bash
# Start everything (including mock server)
docker-compose --profile testing -f docker-compose.dev.yml up
```

### 💻 Local Setup (Alternative)

### Step 1: Start Mock WhatsApp API
```bash
cd backend
npm run whatsapp:mock-server
```

Expected output:
```
╔════════════════════════════════════════════════════════════════╗
║   WhatsApp Mock API Server Started                            ║
║   Base URL: http://localhost:3099                             ║
╚════════════════════════════════════════════════════════════════╝
```

### Step 2: Update WhatsApp Service Configuration
In your backend code, point to the mock server:

**Option A: Environment Variable**
```bash
# .env.development
WHATSAPP_API_URL=http://localhost:3099
```

**Option B: Code Change** (temporary for testing)
```typescript
// src/services/whatsappService.ts
const WHATSAPP_API_BASE = process.env.WHATSAPP_API_URL || 'http://localhost:3099';
```

### Step 3: Start DrSync Backend
```bash
npm run dev
```

### Step 4: Run Conversation Simulator
```bash
npm run whatsapp:simulate
```

You'll see an interactive menu:
```
📱 Main Menu:
  1. Start new conversation (simulate patient)
  2. Continue existing conversation
  3. View all conversations
  4. View message statistics
  5. Test appointment booking flow
  6. Exit
```

## Usage Examples

### Example 1: Test Complete Booking Flow
1. Run simulator: `npm run whatsapp:simulate`
2. Select option **5** (Test appointment booking flow)
3. Watch automated booking simulation

Expected flow:
```
Patient: Hi, I want to book an appointment
[System responds with options]
Patient: 1
[Selects first patient]
Patient: 1
[Selects first provider]
Patient: tomorrow
[Selects date]
Patient: 10:00 AM
[Selects time]
Patient: CONFIRM
[Confirms booking]
```

### Example 2: Manual Conversation Testing
1. Run simulator: `npm run whatsapp:simulate`
2. Select option **1** (Start new conversation)
3. Enter:
   - Patient phone: `+923001234567`
   - Organization phone: `+923001111111`
   - Phone Number ID: `123456789012345`
4. Select option **1** (Send message as patient)
5. Type custom messages to test responses

### Example 3: View Statistics
Run curl commands to check system status:

**View all messages:**
```bash
curl http://localhost:3099/admin/messages
```

**View statistics:**
```bash
curl http://localhost:3099/admin/stats
```

Response:
```json
{
  "totalMessages": 47,
  "byStatus": {
    "sent": 5,
    "delivered": 30,
    "read": 12,
    "failed": 0
  },
  "rateLimits": []
}
```

## API Endpoints

### Mock WhatsApp API Endpoints

#### Send Message (Main API)
```http
POST http://localhost:3099/:phoneNumberId/messages
Authorization: Bearer test-token
Content-Type: application/json

{
  "messaging_product": "whatsapp",
  "to": "+923001234567",
  "type": "text",
  "text": {
    "body": "Hello from DrSync!"
  }
}
```

#### Simulate Incoming Message
```http
POST http://localhost:3099/admin/simulate-incoming
Content-Type: application/json

{
  "from": "+923001234567",
  "to": "+923001111111",
  "message": "Hi, I want to book an appointment",
  "phoneNumberId": "123456789012345"
}
```

#### View Message Statistics
```http
GET http://localhost:3099/admin/stats
```

## Testing Scenarios

### Scenario 1: Happy Path Booking
**Test:** Complete appointment booking from start to finish

**Steps:**
1. Start conversation
2. Patient sends: "Hi"
3. Patient selects provider: "1"
4. Patient selects date: "tomorrow"
5. Patient selects time: "10:00 AM"
6. Patient confirms: "CONFIRM"

**Expected:** Appointment created in Google Sheets and PostgreSQL

### Scenario 2: Rate Limiting
**Test:** Send 100+ messages rapidly

**Steps:**
1. Use simulator or curl to send 100 messages quickly
2. Observe rate limit kicks in after 80 messages/second

**Expected:** 429 error with message "Too many messages sent"

### Scenario 3: Error Handling
**Test:** Simulate API failures

**Steps:**
1. Mock server randomly returns 2% errors
2. Send multiple messages
3. Some will fail, system should retry

**Expected:** Failed messages queued for retry

### Scenario 4: Multi-Organization Routing
**Test:** Messages route to correct organization

**Steps:**
1. Create conversation with Org A phone
2. Create conversation with Org B phone
3. Send messages to both
4. Check backend logs for correct routing

**Expected:** Each message routes to its organization

## Confidence Level Analysis

### What's 95-100% Accurate:
✅ Message routing logic  
✅ Appointment booking flow  
✅ Database operations  
✅ Error handling patterns  
✅ Conversation state management  
✅ API request/response formats  
✅ Webhook payload structures  
✅ Multi-organization isolation  

### What's 80-90% Accurate:
⚠️ Rate limiting behavior (simulated, not Meta's exact algorithm)  
⚠️ Network latency patterns  
⚠️ Error frequency and types  

### What's Not Tested (5-10%):
❌ Meta's exact webhook retry timing  
❌ Template message rendering (requires Meta approval)  
❌ Production SSL handshake  
❌ Meta-specific rate limit windows  

## Troubleshooting

### Mock Server Won't Start
**Problem:** Port 3099 already in use

**Solution:**
```bash
# Windows
netstat -ano | findstr :3099
taskkill /PID <PID> /F

# Or change port
# Edit whatsapp-mock-server.ts line 55:
constructor(port: number = 3100) // Use different port
```

### Webhooks Not Arriving
**Problem:** Backend not receiving webhooks

**Solution:**
1. Check mock server is running: `curl http://localhost:3099/health`
2. Check backend is running: `curl http://localhost:3001/health`
3. Verify webhook URL: `curl -X POST http://localhost:3099/admin/webhook-url -H "Content-Type: application/json" -d "{\"url\":\"http://localhost:3001/api/whatsapp/webhook\"}"`

### Messages Show "Failed" Status
**Problem:** 2% random error rate triggering

**Solution:** This is expected behavior. Check retry logic:
```bash
# View failed messages
curl http://localhost:3099/admin/messages | grep "failed"

# Check if they're retrying
# Look for retry attempts in backend logs
```

## Transitioning to Production

When you're ready for production testing with real WhatsApp:

### Step 1: Update Configuration
Change from mock to real API:
```bash
# .env.production
WHATSAPP_API_URL=https://graph.facebook.com/v18.0
```

### Step 2: Production Testing Checklist
See `TASK-039_Production_Testing_Checklist.md`:
- [ ] Meta Business Manager approved
- [ ] WhatsApp Business number registered
- [ ] SSL certificate installed
- [ ] Webhook verified by Meta
- [ ] Test real message sending
- [ ] Test real message receiving

### Step 3: Comparison Testing
**Recommended approach:**
1. Test feature with simulator first
2. Deploy to production
3. Test same feature with real WhatsApp
4. Compare results

## Benefits Summary

### Development Speed
- **Before Simulator:** Wait for Meta approval → Deploy → Test → Debug (2-3 days per issue)
- **With Simulator:** Test → Fix → Test (minutes per issue)

### Cost Savings
- ❌ No WhatsApp message costs during development
- ❌ No production server costs for testing
- ❌ No Meta Business verification delays

### Quality Assurance
- ✅ Test edge cases easily
- ✅ Simulate error scenarios
- ✅ Verify rate limiting
- ✅ Test multi-organization routing
- ✅ Debug issues locally

### Confidence Level
- **Before Production:** 85-90% confident code will work
- **After Production Testing:** 95-100% confident

**Net Result:** Production testing becomes **validation**, not **discovery**

## Running Automated Tests

```bash
# Run all WhatsApp tests
npm run whatsapp:test

# Run specific test file
npm test -- whatsappMessageRouting.test.ts

# Run with coverage
npm run test:coverage
```

## Next Steps

After simulator testing:
1. ✅ Complete TASK-040 (Message Processing Pipeline)
2. ✅ Complete TASK-041 (Appointment Booking Flows)
3. ✅ Complete TASK-042 (Automated Messaging)
4. 🚀 Deploy to production
5. ✅ Complete production testing (TASK-039 checklist)

---

**Questions or Issues?**
- Check logs: `backend/logs/`
- Review mock server console output
- Test with curl commands first
- Verify both servers are running

**Status:** Ready to use ✅
