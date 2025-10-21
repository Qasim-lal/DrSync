# TASK-039: WhatsApp Business API Setup Guide v2.0

**Version:** 2.0  
**Date:** October 17, 2025  
**Status:** ✅ Production Ready  
**Purpose:** Accurate step-by-step setup guide matching actual implementation

---

## 📋 Table of Contents

1. [What's Already Built](#whats-already-built)
2. [Prerequisites](#prerequisites)
3. [Step 1: Generate Encryption Keys](#step-1-generate-encryption-keys)
4. [Step 2: Configure Environment](#step-2-configure-environment)
5. [Step 3: Deploy Backend](#step-3-deploy-backend)
6. [Step 4: Meta Business Account Setup](#step-4-meta-business-account-setup)
7. [Step 5: Create WhatsApp App](#step-5-create-whatsapp-app)
8. [Step 6: Configure Webhook](#step-6-configure-webhook)
9. [Step 7: Store Credentials](#step-7-store-credentials)
10. [Step 8: Test Integration](#step-8-test-integration)
11. [Troubleshooting](#troubleshooting)

---

## What's Already Built

**✅ Complete Implementation**

The following is already implemented and working:

### Backend Infrastructure
- **Webhook Routes** (`backend/src/routes/whatsappRoutes.ts`)
  - `GET /api/whatsapp/webhook` - Meta verification
  - `POST /api/whatsapp/webhook` - Receive messages
  - `GET /api/whatsapp/health` - Health check
  - `GET /api/whatsapp/health/detailed` - Detailed health

- **Metrics Routes** (`backend/src/routes/whatsappMetricsRoutes.ts`)
  - `GET /api/whatsapp/metrics/:orgId` - Organization metrics
  - `GET /api/whatsapp/messages/history` - Message history
  - `POST /api/whatsapp/test/connectivity` - Test connection
  - `GET /api/whatsapp/alerts/config` - Alert configuration

### Core Services
- **WhatsApp Service** (`backend/src/services/whatsappService.ts`)
  - Rate limiting (80 msg/sec)
  - Message queueing (Bull + Redis)
  - Automatic retry (3 attempts, exponential backoff)
  - Multi-organization routing
  - Credential decryption
  - Metrics tracking

- **Message Helpers** (`backend/src/services/whatsappHelpers.ts`)
  - `createTextMessage()` - Plain text messages
  - `createButtonMessage()` - Interactive buttons
  - `createListMessage()` - Interactive lists
  - `createTemplateMessage()` - Template messages
  - `createMediaMessage()` - Media messages
  - Phone number formatting/validation

- **Encryption Utility** (`backend/src/utils/encryption.ts`)
  - `encryptData()` - AES-256-CBC encryption
  - `decryptData()` - Decryption
  - `generateEncryptionKey()` - Key generation
  - `generateSecureToken()` - Token generation

### What You Need To Do
1. ✅ **Generate keys** (encryption, webhook token)
2. ✅ **Configure environment** (.env file)
3. ✅ **Deploy backend** (build & restart)
4. ✅ **Create Meta account** (manual)
5. ✅ **Configure WhatsApp app** (manual)
6. ✅ **Setup webhook** (Meta console)
7. ✅ **Store credentials** (via API or wizard)
8. ✅ **Test** (send/receive messages)

---

## Prerequisites

### System Requirements
- ✅ DrSync backend running (Docker or direct)
- ✅ PostgreSQL database
- ✅ Redis server
- ✅ HTTPS endpoint with valid SSL certificate
- ✅ Node.js 18+ (for key generation)

### Access Requirements
- [ ] Meta Business Manager account (will create)
- [ ] Phone number for WhatsApp Business
- [ ] Access to production backend server
- [ ] Database credentials (admin access)

### Files Already in Place
```
backend/src/
├── routes/
│   ├── whatsappRoutes.ts          ✅ Created
│   └── whatsappMetricsRoutes.ts   ✅ Created
├── services/
│   ├── whatsappService.ts         ✅ Enhanced
│   └── whatsappHelpers.ts         ✅ Created
└── utils/
    └── encryption.ts              ✅ Created
```

---

## Step 1: Generate Encryption Keys

### 1.1 Generate Encryption Key

**Purpose:** Used to encrypt WhatsApp credentials in database (AES-256-CBC)

```bash
# Generate 32-byte (256-bit) encryption key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Example output:
# a1b2c3d4e5f6789012345678901234567890abcdef123456789012345678901
```

**⚠️ Important:** 
- Must be exactly 64 hex characters (32 bytes)
- Store securely - losing this key means losing access to encrypted credentials
- Different for each environment (dev, staging, prod)

### 1.2 Generate Webhook Verify Token

**Purpose:** Used by Meta to verify webhook URL ownership

```bash
# Generate secure random token
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Example output:
# b2c3d4e5f6789012345678901234567890abcdef12345678901234567890ab12
```

**Save both keys** - you'll need them in Step 2.

---

## Step 2: Configure Environment

### 2.1 Update Backend .env File

Add these variables to your `.env` file:

```bash
# ============================================
# WHATSAPP CONFIGURATION (TASK-039)
# ============================================

# Encryption (from Step 1.1)
ENCRYPTION_KEY=a1b2c3d4e5f6789012345678901234567890abcdef123456789012345678901

# WhatsApp API Configuration
WHATSAPP_API_VERSION=v18.0
WHATSAPP_BASE_URL=https://graph.facebook.com/v18.0

# Webhook Configuration (from Step 1.2)
WEBHOOK_VERIFY_TOKEN=b2c3d4e5f6789012345678901234567890abcdef12345678901234567890ab12

# Will be filled after Meta setup (Step 5)
WHATSAPP_APP_SECRET=

# Backend URL (your production URL)
WEBHOOK_BASE_URL=https://api.drsync.health/v1

# Redis (should already exist)
REDIS_URL=redis://redis:6379
```

### 2.2 Verify Existing Configuration

Check these are already configured:

```bash
# Database
DATABASE_URL=postgresql://...

# Redis (for rate limiting & queue)
REDIS_URL=redis://...

# JWT Secret
JWT_SECRET=...
```

---

## Step 3: Deploy Backend

### 3.1 Build Backend

```bash
cd C:\Users\Qasim\DrSync\backend

# Install dependencies (if needed)
npm install bull ioredis

# Build TypeScript
npm run build
```

### 3.2 Restart Backend Service

**Using Docker:**
```bash
docker-compose restart backend
```

**Using PM2/Direct:**
```bash
npm run start
# or
pm2 restart backend
```

### 3.3 Verify Deployment

```bash
# Test health endpoint
curl http://localhost:3001/api/whatsapp/health

# Expected response:
# {
#   "status": "healthy",
#   "service": "whatsapp",
#   "activeClients": 0,
#   "clients": {},
#   "timestamp": "2025-10-17T..."
# }
```

**✅ If you get the health response, backend is ready!**

---

## Step 4: Meta Business Account Setup

### 4.1 Create Meta Business Manager

1. Go to **[business.facebook.com](https://business.facebook.com)**
2. Click **"Create Account"**
3. Enter:
   - Business name: `DrSync Healthcare` (or your clinic name)
   - Your name
   - Business email

4. Click **"Submit"**

### 4.2 Verify Business (Optional but Recommended)

1. Go to **Business Settings** > **Business Info**
2. Click **"Start Verification"**
3. Upload documents:
   - Business registration certificate
   - Tax documents
   - Proof of address

4. Wait 1-5 business days for verification

**Note:** You can continue setup while verification is pending.

### 4.3 Add Phone Number

1. Go to **Business Settings** > **Phone Numbers**
2. Click **"Add"**
3. Enter phone number with country code: `+923001234567`
4. Verify via SMS or call
5. Mark as **"WhatsApp Business Phone Number"**

**✅ Deliverable:** Verified Meta Business Manager with phone number

---

## Step 5: Create WhatsApp App

### 5.1 Create Meta Developer App

1. Go to **[developers.facebook.com](https://developers.facebook.com)**
2. Click **"My Apps"** > **"Create App"**

3. **Page 1 - App Details:**
   - App name: `DrSync Healthcare Platform`
   - App contact email: your support email
   - Click **"Next"**

4. **Page 2 - Select Use Case:**
   - Scroll down and select **"Other"** (usually at the bottom)
   - Click **"Next"**

5. **Page 3 - Select App Type:**
   - Select **"Business"**
   - Click **"Next"**

6. **Page 4 - Connect Business Account:**
   - Business Account: Select your Meta Business Manager
   - Click **"Create App"**

### 5.2 Note App Credentials

After creation, go to **Settings** > **Basic**:

```
App ID: 1234567890123456
App Secret: [Click "Show" to reveal]
```

**🔒 IMPORTANT:** 
- Copy App Secret now
- Add to .env: `WHATSAPP_APP_SECRET=<app_secret>`
- Never commit to git

### 5.3 Add WhatsApp Product

1. In app dashboard, click **"Add Product"**
2. Find **"WhatsApp"** > **"Set Up"**
3. Accept WhatsApp Business Platform terms

### 5.4 Configure Phone Number

1. Go to **WhatsApp** > **API Setup**
2. Click **"Add Phone Number"**
3. Select phone number from Business Manager
4. Or add new:
   - Enter phone number: `+923001234567`
   - Verify via SMS/call

### 5.5 Note Phone Number Credentials

In **WhatsApp** > **API Setup** section:

```
Phone Number ID: 109876543210/ 803475339522939
Display Phone Number: +923001234567
WhatsApp Business Account ID (WABA ID): 112233445566/ 1531007178037559
```

**Save these - needed for Step 7**

### 5.6 Configure Business Profile

1. Display name: `Your Clinic Name`
2. Category: `Medical & Health`
3. Description: Brief clinic description
4. Address: Clinic address
5. Upload business logo
6. Save

**✅ Deliverable:** WhatsApp app with phone number configured

---

## Step 6: Configure Webhook

### 6.1 Generate System User Access Token

**Important:** Don't use temporary token - it expires in 24 hours!

1. Go to **Business Settings** > **System Users**
2. Click **"Add"** > Create system user:
   - Name: `DrSync API Service`
   - Role: `Admin`
3. Click **"Generate New Token"**
4. Select app: `DrSync Healthcare Platform`
5. Permissions: Check **`whatsapp_business_management`**
6. Click **"Generate Token"**
7. **Copy token immediately** - won't be shown again

```
System User Token: EAAB...xyz (permanent)
```

**Save this token securely!**

### 6.2 Update .env with App Secret

Add the App Secret you copied earlier:

```bash
WHATSAPP_APP_SECRET=abc123def456...
```

### 6.3 Restart Backend

```bash
# Apply new environment variable
docker-compose restart backend
```

### 6.4 Configure Webhook in Meta Console

1. Go to **WhatsApp** > **Configuration**
2. Find **"Webhook"** section
3. Click **"Edit"**
4. Enter:
   - **Callback URL:** `https://api.drsync.health/v1/api/whatsapp/webhook`
   - **Verify Token:** (from Step 1.2) `b2c3d4e5f67890...`
5. Click **"Verify and Save"**

**What happens:**
- Meta calls: `GET https://api.drsync.health/v1/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=YOUR_TOKEN&hub.challenge=RANDOM_STRING`
- DrSync responds with: `RANDOM_STRING`
- Meta verifies: ✅ Webhook verified!

### 6.5 Subscribe to Webhook Events

After verification succeeds:

1. Find **"Webhook Fields"** section
2. Subscribe to:
   - ✅ `messages` (incoming messages)
   - ✅ `message_status` (delivery status)
3. Click **"Save"**

**✅ Verify webhook is active:**
```bash
# Check logs for verification attempt
docker logs drsync_backend_dev | grep "webhook verification"

# Should see:
# [INFO] WhatsApp webhook verification request
# [INFO] Webhook verification successful
```

**✅ Deliverable:** Webhook verified and subscribed to events

---

## Step 7: Store Credentials

### 7.1 Prepare Credential Data

Collect all credentials from previous steps:

```json
{
  "appId": "1234567890123456",
  "appSecret": "abc123def456...",
  "accessToken": "EAAB...xyz",
  "phoneNumberId": "109876543210",
  "businessAccountId": "112233445566",
  "webhookVerifyToken": "b2c3d4e5f67890...",
  "displayPhoneNumber": "+923001234567"
}
```

### 7.2 Store via API (Recommended)

**Option A: Using cURL**

```bash
curl -X POST https://api.drsync.health/v1/api/configuration/whatsapp \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "organizationId": "org_123",
    "appId": "1234567890123456",
    "appSecret": "abc123def456...",
    "accessToken": "EAAB...xyz",
    "phoneNumberId": "109876543210",
    "businessAccountId": "112233445566",
    "webhookVerifyToken": "b2c3d4e5f67890...",
    "displayPhoneNumber": "+923001234567"
  }'
```

**Option B: Using Configuration Wizard (UI)**

1. Log in to DrSync dashboard as organization admin
2. Navigate to **Settings** > **WhatsApp Configuration**
3. Enter all credentials in the form
4. Click **"Save"**

**What happens automatically:**
1. Credentials are **encrypted** with AES-256-CBC
2. Stored in `organizations.whatsappCredentials` (JSONB)
3. `whatsappPhoneNumber` field updated
4. `whatsappConfigured` set to `true`
5. WhatsApp service client initialized
6. Phone number mapping created: `+923001234567` → `org_123`

### 7.3 Verify Credentials Stored

```bash
# Check database
docker exec drsync_postgres_dev psql -U drsync_user -d drsync_dev -c \
  "SELECT id, name, whatsapp_phone_number, whatsapp_configured 
   FROM organizations 
   WHERE id='org_123';"

# Expected:
#     id    |      name       | whatsapp_phone_number | whatsapp_configured
# ----------+-----------------+-----------------------+---------------------
#  org_123  | Test Clinic     | +923001234567         | t
```

### 7.4 Verify Client Initialized

```bash
# Check health endpoint
curl http://localhost:3001/api/whatsapp/health

# Expected response:
# {
#   "status": "healthy",
#   "service": "whatsapp",
#   "activeClients": 1,
#   "clients": {
#     "org_123": {
#       "phoneNumber": "+923001234567",
#       "isActive": true,
#       "lastActivityAt": "2025-10-17T..."
#     }
#   }
# }
```

**✅ If activeClients = 1 and your org appears, credentials are working!**

---

## Step 8: Test Integration

### 8.1 Test Message Sending (Via Meta Console)

1. Go to **WhatsApp** > **API Setup**
2. Find **"Send and Receive Messages"** section
3. Enter your personal WhatsApp number: `+923009876543`
4. Click **"Send Message"**
5. Check your WhatsApp - you should receive test message!

### 8.2 Test Message Receiving

1. Send WhatsApp message **TO** your business number: `+923001234567`
2. Message: `Hello`

3. Check backend logs:
```bash
docker logs drsync_backend_dev --tail 50 | grep "Incoming WhatsApp webhook"

# Expected:
# [INFO] Incoming WhatsApp webhook
# [INFO] Message routed to organization: org_123
# [INFO] Processing message from: 923009876543
```

4. Check database:
```bash
docker exec drsync_postgres_dev psql -U drsync_user -d drsync_dev -c \
  "SELECT id, message_type, content, direction, status 
   FROM whatsapp_messages 
   WHERE organization_id='org_123' 
   ORDER BY created_at DESC 
   LIMIT 1;"

# Expected:
#          id          | message_type | content | direction | status
# ---------------------+--------------+---------+-----------+--------
#  msg_abc123...       | TEXT         | Hello   | INBOUND   | SENT
```

**✅ If message appears in database, receiving works!**

### 8.3 Test Programmatic Sending

Create test file: `test-whatsapp.ts`

```typescript
import whatsappService from './services/whatsappService';

async function testSend() {
  const result = await whatsappService.sendMessage('org_123', {
    to: '923009876543',
    type: 'text',
    text: {
      body: 'Hello from DrSync! 👋'
    }
  });

  console.log('Result:', result);
}

testSend();
```

Run:
```bash
npx ts-node test-whatsapp.ts

# Expected output:
# Result: { success: true, messageId: 'wamid.ABC123...' }
```

Check your WhatsApp - should receive message!

### 8.4 Test Multi-Organization Routing (If Multiple Orgs)

If you have second organization:

1. Setup second org with different phone number
2. Send messages to both numbers
3. Verify each routes correctly:

```bash
curl http://localhost:3001/api/whatsapp/health

# Expected:
# {
#   "activeClients": 2,
#   "clients": {
#     "org_123": { "phoneNumber": "+923001234567", ... },
#     "org_456": { "phoneNumber": "+923007654321", ... }
#   }
# }
```

### 8.5 Test Rate Limiting

Send multiple messages rapidly:

```bash
# Send 100 messages
for i in {1..100}; do
  curl -X POST http://localhost:3001/api/test/send \
    -H "Content-Type: application/json" \
    -d "{\"to\":\"+923009876543\",\"message\":\"Test $i\"}"
done
```

Check logs:
```bash
docker logs drsync_backend_dev | grep "rate limit"

# Expected:
# [WARN] Rate limit exceeded for organization org_123
# [INFO] Queueing message due to rate limit
```

Messages should queue automatically!

### 8.6 Test Health Monitoring

```bash
# Basic health
curl http://localhost:3001/api/whatsapp/health

# Detailed health
curl http://localhost:3001/api/whatsapp/health/detailed

# Organization metrics
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3001/api/whatsapp/metrics/org_123
```

**✅ All tests passing? Integration is complete!**

---

## Troubleshooting

### Issue: Webhook Verification Fails

**Symptoms:**
- Meta shows "Verification failed"
- Webhook URL not saving

**Solutions:**

1. **Check WEBHOOK_VERIFY_TOKEN in .env:**
```bash
docker exec drsync_backend_dev printenv WEBHOOK_VERIFY_TOKEN

# Should match token you entered in Meta console
```

2. **Check endpoint is accessible:**
```bash
curl -I https://api.drsync.health/v1/api/whatsapp/webhook

# Should return: HTTP/1.1 200 OK (or 403 if no params)
```

3. **Check SSL certificate:**
```bash
openssl s_client -connect api.drsync.health:443 -servername api.drsync.health

# Should show valid certificate, no errors
```

4. **Check logs:**
```bash
docker logs drsync_backend_dev | grep "webhook verification"

# Should see verification attempt when Meta calls
```

5. **Test locally with ngrok (dev only):**
```bash
# Install ngrok
ngrok http 3001

# Use ngrok URL in Meta console:
# https://abc123.ngrok.io/api/whatsapp/webhook
```

---

### Issue: Messages Not Sending

**Symptoms:**
- `sendMessage()` returns error
- Messages not delivered

**Solutions:**

1. **Check access token validity:**
```bash
curl -X GET "https://graph.facebook.com/v18.0/debug_token?input_token=YOUR_TOKEN&access_token=YOUR_TOKEN"

# Check "is_valid": true
```

2. **Check phone number ID:**
```bash
curl -X GET "https://graph.facebook.com/v18.0/PHONE_NUMBER_ID" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Should return phone number details
```

3. **Check credentials in database:**
```bash
docker exec drsync_postgres_dev psql -U drsync_user -d drsync_dev -c \
  "SELECT whatsapp_credentials IS NOT NULL as has_creds 
   FROM organizations 
   WHERE id='org_123';"

# Should show: has_creds | t
```

4. **Check client initialized:**
```bash
curl http://localhost:3001/api/whatsapp/health

# Should show org in activeClients
```

5. **Check logs for errors:**
```bash
docker logs drsync_backend_dev | grep "Error sending WhatsApp message"
```

---

### Issue: Messages Not Receiving

**Symptoms:**
- Send message to business number
- No webhook call, no logs

**Solutions:**

1. **Verify webhook subscription:**
- Go to WhatsApp > Configuration in Meta console
- Check `messages` field is subscribed ✅

2. **Test webhook manually:**
```bash
curl -X POST http://localhost:3001/api/whatsapp/webhook \
  -H "Content-Type: application/json" \
  -H "X-Hub-Signature-256: sha256=test" \
  -d '{
    "entry": [{
      "changes": [{
        "value": {
          "messages": [{
            "from": "923009876543",
            "type": "text",
            "text": {"body": "Test"}
          }],
          "metadata": {
            "phone_number_id": "109876543210",
            "display_phone_number": "+923001234567"
          }
        }
      }]
    }]
  }'

# Check logs for processing
```

3. **Check webhook logs in Meta:**
- Go to WhatsApp > Configuration > Webhooks
- Click "Test" button
- Should see successful webhook call

4. **Verify WHATSAPP_APP_SECRET:**
```bash
docker exec drsync_backend_dev printenv WHATSAPP_APP_SECRET

# Should have value
```

---

### Issue: Organization Not Identified

**Symptoms:**
- "Could not identify organization for incoming message"

**Solutions:**

1. **Check phone mapping:**
```bash
curl http://localhost:3001/api/whatsapp/health

# Verify phone number matches
# clients.org_123.phoneNumber should be "+923001234567"
```

2. **Check organization has credentials:**
```bash
docker exec drsync_postgres_dev psql -U drsync_user -d drsync_dev -c \
  "SELECT id, whatsapp_phone_number 
   FROM organizations 
   WHERE whatsapp_credentials IS NOT NULL;"

# Should show your org
```

3. **Restart to reload mappings:**
```bash
docker-compose restart backend

# Re-initializes all clients and mappings
```

---

### Issue: Rate Limiting Not Working

**Symptoms:**
- Getting rate limit errors from WhatsApp
- Messages not queueing

**Solutions:**

1. **Check Redis connection:**
```bash
docker exec drsync_redis_dev redis-cli ping

# Should return: PONG
```

2. **Check rate limit key:**
```bash
docker exec drsync_redis_dev redis-cli --scan --pattern "whatsapp:ratelimit:*"

# Should show keys like: whatsapp:ratelimit:org_123
```

3. **Check Bull Queue:**
```bash
docker exec drsync_redis_dev redis-cli --scan --pattern "bull:whatsapp-messages:*"

# Should show queue keys
```

4. **Monitor queue:**
```bash
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:3001/api/whatsapp/queue/stats
```

---

### Issue: Encryption/Decryption Errors

**Symptoms:**
- "Failed to decrypt data"
- "Invalid encrypted data format"

**Solutions:**

1. **Check ENCRYPTION_KEY format:**
```bash
docker exec drsync_backend_dev printenv ENCRYPTION_KEY

# Should be 64 hex characters (32 bytes)
# Correct: a1b2c3d4e5f6...
# Wrong: abc123 (too short)
```

2. **Regenerate encryption key:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Copy to .env and restart
```

3. **Re-store credentials:**
```bash
# Delete and re-add credentials via API or wizard
# They'll be encrypted with new key
```

---

## Next Steps

After completing all steps:

1. ✅ **Mark TASK-039 as complete**
2. ➡️ **Proceed to TASK-040**: Message Processing Pipeline
3. ➡️ **Proceed to TASK-041**: Appointment Booking
4. ➡️ **Proceed to TASK-042**: Automated Reminders

---

## Additional Resources

- **API Documentation:** `docs/TASK-039_API_Documentation.md`
- **Completion Summary:** `docs/TASK-039_Completion_Summary.md`
- **Quick Reference:** `docs/TASK-039_Quick_Reference.md`
- **WhatsApp Cloud API:** https://developers.facebook.com/docs/whatsapp/cloud-api
- **Meta Business:** https://business.facebook.com
- **Meta Developers:** https://developers.facebook.com

---

**Status:** ✅ Setup Guide Complete  
**Next:** Follow steps 1-8 to configure your WhatsApp integration  
**Support:** Refer to Troubleshooting section for common issues
