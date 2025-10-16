# TASK-039: WhatsApp Business API Integration - Detailed Implementation Plan

**Version:** 1.0  
**Date:** October 13, 2025  
**Author:** DrSync Development Team  
**Status:** 🔄 Not Started  
**Priority:** 🔴 HIGH - Core SRS Functionality  
**Phase:** Phase 3 - WhatsApp Integration  

---

## 📋 Table of Contents

1. [Task Overview](#1-task-overview)
2. [Prerequisites & Dependencies](#2-prerequisites--dependencies)
3. [Subtask Breakdown](#3-subtask-breakdown)
4. [Testing Requirements](#4-testing-requirements)
5. [Success Criteria](#5-success-criteria)
6. [Timeline & Resources](#6-timeline--resources)
7. [Risk Management](#7-risk-management)
8. [Documentation Requirements](#8-documentation-requirements)

---

## 1. Task Overview

### 1.1 Purpose
Configure and activate WhatsApp Business API integration to enable patient communication, appointment booking, and automated messaging through WhatsApp as the primary patient interface.

### 1.2 Scope
This task covers the complete activation and operational configuration of WhatsApp Business API for multi-client SaaS platform, including:
- Production WhatsApp API connection setup
- Webhook endpoint activation and verification
- Message sending/receiving operational flow
- Integration with existing message routing (TASK-033)
- Connection to Google Sheets data source (TASK-023)
- Real-world testing with live WhatsApp accounts

### 1.3 Context
**Foundation Already Complete:**
- ✅ WhatsApp message routing service (TASK-033: 17/17 tests passing)
- ✅ WhatsApp configuration wizard (TASK-036A: 52/52 tests passing)
- ✅ Multi-client message routing infrastructure
- ✅ Google Sheets as primary data source
- ✅ Organization-level WhatsApp credential storage

**What This Task Adds:**
- 🆕 Production WhatsApp API activation
- 🆕 Live webhook endpoint configuration
- 🆕 Real message send/receive functionality
- 🆕 End-to-end message flow testing
- 🆕 Production-ready error handling

### 1.4 SRS Requirements Mapping
- **REQ-WA-001**: Language detection (English/Urdu) - Covered in TASK-040
- **REQ-WA-002**: Menu-driven navigation - Covered in TASK-040
- **REQ-WA-003**: Display doctors and specialties - Covered in TASK-040
- **REQ-WA-004**: Real-time availability - Covered in TASK-041
- **REQ-WA-005**: Booking/rescheduling/cancellation - Covered in TASK-041
- **REQ-WA-006**: Automated confirmations - Covered in TASK-042
- **REQ-WA-007**: Clinic information - Covered in TASK-040
- **REQ-WA-008**: Multi-client WhatsApp numbers - **PRIMARY FOCUS OF TASK-039**
- **REQ-WA-009**: Family member registration - Covered in TASK-041
- **REQ-WA-010**: Conflict handling - Covered in TASK-041

### 1.5 TDD Architecture Alignment
Following TDD Section 7.1: WhatsApp Business API Integration
- Webhook configuration and verification
- Message processing flow (7 steps)
- Multi-organization credential management
- Integration with appointment management service

---

## 2. Prerequisites & Dependencies

### 2.1 Completed Tasks (Dependencies)
- ✅ **TASK-033**: WhatsApp message routing (17/17 tests passing)
- ✅ **TASK-036A**: WhatsApp configuration wizard (52/52 tests passing)
- ✅ **TASK-023**: Google Sheets as primary data source
- ✅ **TASK-032**: Multi-tenant isolation
- ✅ **TASK-038**: Super admin dashboard (for monitoring)

### 2.2 Required Resources

#### **IMPORTANT: WhatsApp Account Architecture**

**Each client organization needs their own WhatsApp Business API account.**

DrSync is a multi-tenant SaaS platform where:
- ✅ **Client-Owned Accounts**: Each clinic uses their own WhatsApp number and credentials
- ✅ **Patient Trust**: Messages appear from the clinic, not from "DrSync"
- ✅ **Data Ownership**: Aligns with client-owned Google Sheets architecture
- ❌ **NOT Shared**: DrSync does NOT use a single WhatsApp account for all clients

#### **For DrSync Platform (Development & Testing):**
1. **1 DrSync-Owned WhatsApp Business API Account**
   - Purpose: Development, testing, and QA
   - Meta Business Account (business.facebook.com)
   - WhatsApp Business API access approval
   - 1 test phone number
   - **NOT used for client messages in production**

#### **For Client Organizations (Production):**
2. **Minimum 2 Test Organization Accounts** (for TASK-039 testing)
   - Purpose: Test multi-tenant message routing
   - Each with separate Meta Business Account
   - Each with separate WhatsApp Business phone number
   - Simulates real production environment

3. **Real Client Accounts** (production deployment)
   - Each clinic creates their own Meta Business Account
   - Each clinic registers their own WhatsApp Business number
   - Clients use TASK-036A configuration wizard to connect
   - DrSync stores credentials securely and routes messages

#### **For Development Environment:**
4. **Backend Infrastructure**
   - Backend server with public HTTPS endpoint
   - SSL certificate (required for WhatsApp webhooks)
   - PostgreSQL database (already configured)
   - Redis cache (already configured)

5. **Third-Party Services**
   - Meta Developer App with WhatsApp product enabled
   - Webhook verification token generation
   - Access tokens from Meta Business Manager

6. **Testing Resources**
   - Personal WhatsApp accounts for testing (minimum 3)
   - Network traffic monitoring tools
   - Postman/Insomnia for API testing

#### **Cost Structure:**
- **DrSync pays**: 1 WhatsApp account for testing (~$0-50/month depending on test volume)
- **Clients pay**: Their own WhatsApp API fees to Meta (~$0.005-0.09 per conversation)
- **Clients pay**: DrSync subscription (Rs. 3,000/month or $20/month per doctor)

#### **Setup Responsibility:**
- **DrSync Team**: Sets up 1 test account + 2 simulated client accounts for TASK-039
- **Real Clients**: Create their own accounts during onboarding (guided by wizard)
- **DrSync Platform**: Manages all technical complexity, routing, and credentials

### 2.3 Technical Prerequisites
```bash
# Required environment variables
WHATSAPP_API_VERSION=v18.0
WHATSAPP_BASE_URL=https://graph.facebook.com/v18.0
WEBHOOK_BASE_URL=https://api.drsync.health/v1
WEBHOOK_VERIFY_TOKEN=<secure_random_token>

# SSL Certificate (Let's Encrypt or commercial)
SSL_CERT_PATH=/etc/ssl/certs/drsync.crt
SSL_KEY_PATH=/etc/ssl/private/drsync.key

# Database (already configured)
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
```

---

## 3. Subtask Breakdown

### SUBTASK 3.1: WhatsApp Business API Account Setup and Verification
**Duration:** 4 hours  
**Assignee:** Backend Developer 1  
**Priority:** 🔴 Critical - Blocking all other subtasks  

#### 3.1.1 Meta Business Account Configuration
**Duration:** 1 hour  
**Objective:** Set up Meta Business Manager and WhatsApp Business API access

**Sub-subtasks:**
1. **3.1.1.1 Create/Verify Meta Business Account**
   - [ ] Create Meta Business Manager account (business.facebook.com)
   - [ ] Verify business identity with Meta
   - [ ] Complete business verification process
   - [ ] Document business verification status
   - **Validation:** Business Manager account shows "Verified" status
   - **Documentation:** Screenshot of verified account + business details

2. **3.1.1.2 Create Meta Developer App**
   - [ ] Navigate to developers.facebook.com
   - [ ] Create new app with "Business" type
   - [ ] Name app: "DrSync Healthcare Platform"
   - [ ] Link app to Business Manager account
   - [ ] Note App ID and App Secret
   - **Validation:** App created and shows in Meta Developer Console
   - **Documentation:** App ID, App Secret (store in secure vault)

3. **3.1.1.3 Enable WhatsApp Product**
   - [ ] Add WhatsApp product to Meta app
   - [ ] Accept WhatsApp Business Platform terms
   - [ ] Configure WhatsApp settings
   - [ ] Request production access (if not already granted)
   - **Validation:** WhatsApp product shows as "Active" in app dashboard
   - **Documentation:** Screenshots of enabled WhatsApp product

4. **3.1.1.4 Configure Phone Numbers**
   - [ ] Add phone number(s) to WhatsApp Business API
   - [ ] Verify phone number ownership (SMS/call verification)
   - [ ] Set display name for WhatsApp Business profile
   - [ ] Upload business logo and description
   - [ ] Configure business hours and category
   - **Validation:** Phone number shows as "Connected" in WhatsApp settings
   - **Documentation:** Phone Number ID, Display Phone Number, verification status

**Deliverables:**
- ✅ Verified Meta Business Account
- ✅ Active Meta Developer App with WhatsApp enabled
- ✅ Verified WhatsApp Business phone number(s)
- ✅ App ID, App Secret, Phone Number ID documented

**Testing:**
- [ ] Verify app appears in Meta Business Manager
- [ ] Confirm WhatsApp product is active
- [ ] Verify phone number is properly connected
- [ ] Test sending test message from Meta API console

---

#### 3.1.2 Generate WhatsApp API Credentials
**Duration:** 30 minutes  
**Objective:** Obtain all necessary credentials for API access

**Sub-subtasks:**
1. **3.1.2.1 Generate Temporary Access Token**
   - [ ] Navigate to WhatsApp > API Setup in Meta Developer Console
   - [ ] Generate 24-hour temporary access token
   - [ ] Copy access token to secure location
   - [ ] Test token validity with Meta Graph API
   - **Validation:** Token works with `GET /{phone-number-id}` endpoint
   - **Documentation:** Token expiry time, token value (temporary storage)

2. **3.1.2.2 Generate Permanent System User Access Token**
   - [ ] Go to Business Settings > System Users
   - [ ] Create new System User: "DrSync API Service"
   - [ ] Assign WhatsApp Business Management permission
   - [ ] Generate permanent access token for System User
   - [ ] Save token in secure credential storage (AWS Secrets Manager / HashiCorp Vault)
   - **Validation:** Permanent token works with WhatsApp API
   - **Documentation:** System User ID, Token generation date

3. **3.1.2.3 Configure Webhook Verify Token**
   - [ ] Generate secure random webhook verify token (32 bytes)
   - [ ] Store in environment configuration
   - [ ] Use Node.js crypto: `crypto.randomBytes(32).toString('hex')`
   - **Validation:** Token is cryptographically secure (min 32 characters)
   - **Documentation:** Token stored in `.env.production`

4. **3.1.2.4 Extract Required Identifiers**
   - [ ] Note WhatsApp Business Account ID (WABA ID)
   - [ ] Note Phone Number ID for each registered number
   - [ ] Note App Secret for webhook signature verification
   - [ ] Create credential checklist document
   - **Validation:** All IDs are valid format (numeric strings)
   - **Documentation:** Complete credential inventory

**Deliverables:**
- ✅ Permanent System User access token
- ✅ Webhook verification token
- ✅ Complete credential inventory (App ID, App Secret, Phone Number ID, WABA ID)
- ✅ Credentials stored in secure vault

**Testing:**
- [ ] Test permanent access token with GET request to WhatsApp API
- [ ] Verify token permissions include `whatsapp_business_management`
- [ ] Confirm webhook verify token meets security requirements
- [ ] Test all credentials work with Meta Graph API

---

#### 3.1.3 Webhook URL Configuration
**Duration:** 1 hour  
**Objective:** Configure production webhook endpoint for receiving messages

**Sub-subtasks:**
1. **3.1.3.1 Verify Server HTTPS Configuration**
   - [ ] Confirm server has valid SSL certificate
   - [ ] Verify HTTPS endpoint is publicly accessible
   - [ ] Test SSL certificate validity (no errors)
   - [ ] Confirm webhook endpoint URL: `https://api.drsync.health/v1/whatsapp/webhook`
   - **Validation:** `curl -I https://api.drsync.health/v1/whatsapp/webhook` returns 200 OK
   - **Documentation:** SSL certificate details, expiry date

2. **3.1.3.2 Implement Webhook Verification Endpoint**
   - [ ] Update webhook controller to handle GET verification requests
   - [ ] Implement challenge-response verification logic
   - [ ] Validate `hub.verify_token` matches configured token
   - [ ] Return `hub.challenge` value on successful verification
   - **Code Implementation:**
   ```typescript
   // backend/src/controllers/whatsappController.ts
   app.get('/whatsapp/webhook', (req, res) => {
     const mode = req.query['hub.mode'];
     const token = req.query['hub.verify_token'];
     const challenge = req.query['hub.challenge'];
     
     if (mode === 'subscribe' && token === process.env.WEBHOOK_VERIFY_TOKEN) {
       console.log('Webhook verified successfully');
       res.status(200).send(challenge);
     } else {
       res.sendStatus(403);
     }
   });
   ```
   - **Validation:** Endpoint responds correctly to verification requests
   - **Documentation:** Verification endpoint implementation notes

3. **3.1.3.3 Configure Webhook in Meta Developer Console**
   - [ ] Navigate to WhatsApp > Configuration in Meta app
   - [ ] Enter callback URL: `https://api.drsync.health/v1/whatsapp/webhook`
   - [ ] Enter verify token (from environment config)
   - [ ] Click "Verify and Save"
   - [ ] Wait for Meta to verify endpoint (should succeed immediately)
   - **Validation:** Meta shows "Callback URL verified" checkmark
   - **Documentation:** Screenshot of successful webhook configuration

4. **3.1.3.4 Subscribe to Webhook Events**
   - [ ] Subscribe to `messages` events
   - [ ] Subscribe to `message_status` events (delivery, read receipts)
   - [ ] Optional: Subscribe to `messaging_postbacks` (for button responses)
   - [ ] Save webhook configuration
   - **Validation:** All subscribed events show as active
   - **Documentation:** List of subscribed webhook events

5. **3.1.3.5 Test Webhook Reception**
   - [ ] Send test message from Meta API console to registered number
   - [ ] Verify webhook receives message notification
   - [ ] Check server logs for incoming webhook POST request
   - [ ] Confirm message payload structure matches expected format
   - **Validation:** Server logs show received webhook data
   - **Documentation:** Sample webhook payload for testing

**Deliverables:**
- ✅ HTTPS endpoint with valid SSL
- ✅ Webhook verification endpoint implemented
- ✅ Webhook configured and verified in Meta console
- ✅ Subscribed to required events
- ✅ Successful test webhook reception

**Testing:**
- [ ] Test GET verification with correct token (should return 200 + challenge)
- [ ] Test GET verification with wrong token (should return 403)
- [ ] Test POST webhook with sample message payload
- [ ] Verify webhook logs message data correctly
- [ ] Test webhook signature verification (App Secret validation)

---

#### 3.1.4 Store Credentials in Database
**Duration:** 30 minutes  
**Objective:** Securely store WhatsApp API credentials for each organization

**Sub-subtasks:**
1. **3.1.4.1 Prepare Credential Data Structure**
   - [ ] Create JSON object with all credentials
   - [ ] Structure matches `WhatsAppCredentials` interface
   - **Data Structure:**
   ```json
   {
     "appId": "1234567890",
     "appSecret": "abc123...",
     "accessToken": "EAAB...",
     "phoneNumberId": "109876543210",
     "businessAccountId": "112233445566",
     "webhookVerifyToken": "secure_token_here",
     "displayPhoneNumber": "+923001234567"
   }
   ```
   - **Validation:** JSON structure is valid and complete
   - **Documentation:** Credential schema documentation

2. **3.1.4.2 Encrypt Sensitive Credentials**
   - [ ] Use existing encryption utility (AES-256-CBC from TASK-036A)
   - [ ] Encrypt `appSecret`, `accessToken`, `webhookVerifyToken`
   - [ ] Keep non-sensitive fields unencrypted for easier querying
   - **Code Implementation:**
   ```typescript
   import { encryptData } from '../utils/encryption';
   
   const encryptedCredentials = {
     appId: credentials.appId,
     appSecret: encryptData(credentials.appSecret),
     accessToken: encryptData(credentials.accessToken),
     phoneNumberId: credentials.phoneNumberId,
     businessAccountId: credentials.businessAccountId,
     webhookVerifyToken: encryptData(credentials.webhookVerifyToken),
     displayPhoneNumber: credentials.displayPhoneNumber
   };
   ```
   - **Validation:** Encrypted data can be decrypted successfully
   - **Documentation:** Encryption method and key management notes

3. **3.1.4.3 Update Organization Record**
   - [ ] Update `whatsappCredentials` JSONB field in organizations table
   - [ ] Update `whatsappPhoneNumber` field with display phone number
   - [ ] Update `whatsappBusinessAccountId` field
   - [ ] Set `whatsappConfigured` to `true`
   - **Code Implementation:**
   ```typescript
   const prisma = getPrismaClient();
   await prisma.organization.update({
     where: { id: organizationId },
     data: {
       whatsappCredentials: encryptedCredentials,
       whatsappPhoneNumber: credentials.displayPhoneNumber,
       whatsappBusinessAccountId: credentials.businessAccountId,
       whatsappConfigured: true,
       updatedAt: new Date()
     }
   });
   ```
   - **Validation:** Database update successful, credentials retrievable
   - **Documentation:** Database update query and result

4. **3.1.4.4 Initialize WhatsApp Service Client**
   - [ ] Call `whatsappService.initializeClient(organizationId, credentials)`
   - [ ] Verify client initialization successful
   - [ ] Test client can send test message
   - [ ] Add organization to active clients map
   - **Validation:** Organization appears in `whatsappService.clients` map
   - **Documentation:** Client initialization log entries

**Deliverables:**
- ✅ Encrypted credentials stored in database
- ✅ Organization WhatsApp configuration updated
- ✅ WhatsApp service client initialized
- ✅ Phone number to organization mapping established

**Testing:**
- [ ] Retrieve credentials from database and decrypt successfully
- [ ] Verify `whatsappService.getClient(organizationId)` returns client
- [ ] Test sending message using stored credentials
- [ ] Confirm phone mapping: `phoneToOrgMapping.get(phoneNumber) === organizationId`

---

### SUBTASK 3.2: Message Sending Infrastructure
**Duration:** 3 hours  
**Assignee:** Backend Developer 1  
**Priority:** 🔴 Critical  

#### 3.2.1 Implement Message Sending Service
**Duration:** 1.5 hours  
**Objective:** Create production-ready message sending functionality

**Sub-subtasks:**
1. **3.2.1.1 Complete `sendMessage()` Method**
   - [ ] Review existing implementation in `whatsappService.ts`
   - [ ] Add comprehensive error handling
   - [ ] Implement retry logic for failed sends
   - [ ] Add rate limiting protection
   - **Code Implementation:**
   ```typescript
   async sendMessage(
     organizationId: string,
     to: string,
     message: OutgoingMessage
   ): Promise<MessageResponse> {
     const client = this.clients.get(organizationId);
     if (!client) {
       throw new Error(`WhatsApp client not found for organization ${organizationId}`);
     }
     
     try {
       const response = await axios.post(
         `${WHATSAPP_BASE_URL}/${client.credentials.phoneNumberId}/messages`,
         {
           messaging_product: 'whatsapp',
           recipient_type: 'individual',
           to: to,
           ...message
         },
         {
           headers: {
             'Authorization': `Bearer ${client.credentials.accessToken}`,
             'Content-Type': 'application/json'
           },
           timeout: 10000 // 10 second timeout
         }
       );
       
       // Log successful send
       await this.logMessage(organizationId, to, 'outbound', message, response.data.messages[0].id);
       
       return {
         success: true,
         messageId: response.data.messages[0].id
       };
       
     } catch (error) {
       logger.error(`Failed to send WhatsApp message for org ${organizationId}:`, error);
       
       // Log failed send
       await this.logMessage(organizationId, to, 'outbound', message, null, 'failed');
       
       return {
         success: false,
         error: error.response?.data?.error?.message || error.message
       };
     }
   }
   ```
   - **Validation:** Method successfully sends messages and handles errors
   - **Documentation:** Method signature, parameters, return values

2. **3.2.1.2 Implement Text Message Helper**
   - [ ] Create `sendTextMessage()` convenience method
   - [ ] Support plain text messages
   - [ ] Support markdown formatting
   - **Code Implementation:**
   ```typescript
   async sendTextMessage(
     organizationId: string,
     to: string,
     text: string
   ): Promise<MessageResponse> {
     return this.sendMessage(organizationId, to, {
       type: 'text',
       text: {
         preview_url: true, // Enable link previews
         body: text
       }
     });
   }
   ```
   - **Validation:** Text messages send correctly
   - **Documentation:** Usage examples

3. **3.2.1.3 Implement Interactive Message Support**
   - [ ] Create methods for button messages
   - [ ] Create methods for list messages
   - [ ] Support reply button responses
   - **Code Implementation:**
   ```typescript
   async sendInteractiveButtons(
     organizationId: string,
     to: string,
     bodyText: string,
     buttons: Array<{ id: string; title: string }>
   ): Promise<MessageResponse> {
     return this.sendMessage(organizationId, to, {
       type: 'interactive',
       interactive: {
         type: 'button',
         body: { text: bodyText },
         action: {
           buttons: buttons.map(btn => ({
             type: 'reply',
             reply: {
               id: btn.id,
               title: btn.title
             }
           }))
         }
       }
     });
   }
   ```
   - **Validation:** Interactive messages render correctly in WhatsApp
   - **Documentation:** Button and list message examples

4. **3.2.1.4 Implement Template Message Support**
   - [ ] Create method for sending template messages
   - [ ] Support template parameter substitution
   - [ ] Handle template approval status
   - **Code Implementation:**
   ```typescript
   async sendTemplateMessage(
     organizationId: string,
     to: string,
     templateName: string,
     languageCode: string,
     components: any[]
   ): Promise<MessageResponse> {
     return this.sendMessage(organizationId, to, {
       type: 'template',
       template: {
         name: templateName,
         language: { code: languageCode },
         components: components
       }
     });
   }
   ```
   - **Validation:** Template messages send successfully
   - **Documentation:** Template message structure and requirements

**Deliverables:**
- ✅ Complete message sending service implementation
- ✅ Text, interactive, and template message support
- ✅ Error handling and retry logic
- ✅ Message logging to database

**Testing:**
- [ ] Test sending plain text message
- [ ] Test sending message with link preview
- [ ] Test sending button message (2-3 buttons)
- [ ] Test sending list message
- [ ] Test sending template message
- [ ] Test error handling for invalid phone numbers
- [ ] Test error handling for rate limiting

---

#### 3.2.2 Message Delivery Tracking
**Duration:** 1 hour  
**Objective:** Track message delivery status and read receipts

**Sub-subtasks:**
1. **3.2.2.1 Implement Message Logging**
   - [ ] Create `logMessage()` method in whatsappService
   - [ ] Log all outbound messages to `whatsapp_messages` table
   - [ ] Include message content, recipient, status
   - [ ] Link to patient record if available
   - **Code Implementation:**
   ```typescript
   async logMessage(
     organizationId: string,
     phoneNumber: string,
     direction: 'inbound' | 'outbound',
     content: any,
     messageId: string | null,
     status: string = 'sent',
     patientId?: string
   ): Promise<void> {
     try {
       const prisma = getPrismaClient();
       await prisma.whatsAppMessage.create({
         data: {
           organizationId,
           phoneNumber,
           direction,
           content: JSON.stringify(content),
           messageId,
           status,
           patientId: patientId || null,
           createdAt: new Date()
         }
       });
     } catch (error) {
       logger.error('Failed to log WhatsApp message:', error);
       // Don't throw - logging failure shouldn't break message flow
     }
   }
   ```
   - **Validation:** Messages logged successfully to database
   - **Documentation:** Message log schema and fields

2. **3.2.2.2 Handle Status Update Webhooks**
   - [ ] Process `message_status` webhook events
   - [ ] Update message status (sent → delivered → read)
   - [ ] Track delivery timestamps
   - **Code Implementation:**
   ```typescript
   async handleStatusUpdate(statusData: any): Promise<void> {
     const messageId = statusData.id;
     const status = statusData.status; // 'sent' | 'delivered' | 'read' | 'failed'
     const timestamp = statusData.timestamp;
     
     const prisma = getPrismaClient();
     await prisma.whatsAppMessage.updateMany({
       where: { messageId },
       data: {
         status,
         deliveredAt: status === 'delivered' ? new Date(timestamp * 1000) : undefined,
         readAt: status === 'read' ? new Date(timestamp * 1000) : undefined,
         updatedAt: new Date()
       }
     });
     
     logger.info(`Updated message ${messageId} status to ${status}`);
   }
   ```
   - **Validation:** Status updates reflected in database
   - **Documentation:** Status webhook handling flow

3. **3.2.2.3 Implement Delivery Status Query**
   - [ ] Create API endpoint to check message delivery status
   - [ ] Support bulk status queries
   - [ ] Return delivery metrics
   - **Code Implementation:**
   ```typescript
   async getMessageStatus(organizationId: string, messageId: string) {
     const prisma = getPrismaClient();
     return await prisma.whatsAppMessage.findFirst({
       where: {
         organizationId,
         messageId
       },
       select: {
         status: true,
         createdAt: true,
         deliveredAt: true,
         readAt: true
       }
     });
   }
   ```
   - **Validation:** Status query returns accurate data
   - **Documentation:** API endpoint documentation

4. **3.2.2.4 Implement Failed Message Retry**
   - [ ] Identify failed messages
   - [ ] Implement exponential backoff retry
   - [ ] Maximum 3 retry attempts
   - [ ] Mark as permanently failed after retries exhausted
   - **Code Implementation:**
   ```typescript
   async retryFailedMessages(organizationId: string): Promise<number> {
     const prisma = getPrismaClient();
     const failedMessages = await prisma.whatsAppMessage.findMany({
       where: {
         organizationId,
         status: 'failed',
         retryCount: { lt: 3 }
       }
     });
     
     let retriedCount = 0;
     for (const msg of failedMessages) {
       const content = JSON.parse(msg.content);
       const result = await this.sendMessage(organizationId, msg.phoneNumber, content);
       
       if (result.success) {
         await prisma.whatsAppMessage.update({
           where: { id: msg.id },
           data: {
             status: 'sent',
             messageId: result.messageId,
             retryCount: msg.retryCount + 1
           }
         });
         retriedCount++;
       }
     }
     
     return retriedCount;
   }
   ```
   - **Validation:** Failed messages retry successfully
   - **Documentation:** Retry logic and backoff strategy

**Deliverables:**
- ✅ Complete message logging system
- ✅ Status update webhook handling
- ✅ Message delivery tracking
- ✅ Failed message retry mechanism

**Testing:**
- [ ] Send message and verify logged to database
- [ ] Verify status updates (sent → delivered → read)
- [ ] Test message status query API
- [ ] Test failed message retry logic
- [ ] Verify retry count increments correctly
- [ ] Test max retry limit (3 attempts)

---

#### 3.2.3 Rate Limiting and Throttling
**Duration:** 30 minutes  
**Objective:** Implement rate limiting to comply with WhatsApp API limits

**Sub-subtasks:**
1. **3.2.3.1 Implement Redis-based Rate Limiter**
   - [ ] Use Redis to track message send rates
   - [ ] Implement sliding window rate limiting
   - [ ] Limits: 80 messages/second per phone number (WhatsApp Cloud API limit)
   - **Code Implementation:**
   ```typescript
   import Redis from 'ioredis';
   
   async checkRateLimit(organizationId: string): Promise<boolean> {
     const redis = new Redis(process.env.REDIS_URL);
     const key = `whatsapp:ratelimit:${organizationId}`;
     const limit = 80; // messages per second
     const window = 1; // 1 second
     
     const current = await redis.incr(key);
     if (current === 1) {
       await redis.expire(key, window);
     }
     
     return current <= limit;
   }
   ```
   - **Validation:** Rate limiter prevents exceeding API limits
   - **Documentation:** Rate limiting configuration

2. **3.2.3.2 Implement Message Queue**
   - [ ] Use Bull Queue (already configured) for message queuing
   - [ ] Queue messages when rate limit approached
   - [ ] Process queue with controlled rate
   - **Code Implementation:**
   ```typescript
   import Queue from 'bull';
   
   const messageQueue = new Queue('whatsapp-messages', process.env.REDIS_URL);
   
   async queueMessage(
     organizationId: string,
     to: string,
     message: OutgoingMessage
   ): Promise<void> {
     await messageQueue.add({
       organizationId,
       to,
       message
     }, {
       attempts: 3,
       backoff: {
         type: 'exponential',
         delay: 2000
       }
     });
   }
   
   messageQueue.process(async (job) => {
     const { organizationId, to, message } = job.data;
     return await this.sendMessage(organizationId, to, message);
   });
   ```
   - **Validation:** Messages queue and process correctly
   - **Documentation:** Queue configuration and processing

3. **3.2.3.3 Add Rate Limit Headers Monitoring**
   - [ ] Monitor `X-RateLimit-*` headers from WhatsApp API responses
   - [ ] Log rate limit warnings
   - [ ] Adjust sending rate dynamically
   - **Code Implementation:**
   ```typescript
   async monitorRateLimits(response: AxiosResponse): Promise<void> {
     const remaining = response.headers['x-ratelimit-remaining'];
     const limit = response.headers['x-ratelimit-limit'];
     const resetTime = response.headers['x-ratelimit-reset'];
     
     if (remaining && parseInt(remaining) < 10) {
       logger.warn(`WhatsApp rate limit approaching: ${remaining}/${limit} remaining`);
     }
   }
   ```
   - **Validation:** Rate limit warnings logged appropriately
   - **Documentation:** Rate limit monitoring strategy

**Deliverables:**
- ✅ Redis-based rate limiting
- ✅ Message queueing system
- ✅ Rate limit header monitoring
- ✅ Dynamic rate adjustment

**Testing:**
- [ ] Test rate limiter prevents exceeding 80 msg/sec
- [ ] Test message queueing under high load
- [ ] Test queue processes messages after rate limit resets
- [ ] Verify rate limit warnings logged
- [ ] Test exponential backoff for failed messages

---

### SUBTASK 3.3: Message Receiving Infrastructure
**Duration:** 2 hours  
**Assignee:** Backend Developer 1  
**Priority:** 🔴 Critical  

#### 3.3.1 Webhook Message Processing
**Duration:** 1 hour  
**Objective:** Process incoming WhatsApp messages from webhook

**Sub-subtasks:**
1. **3.3.1.1 Implement Webhook Signature Verification**
   - [ ] Verify webhook requests are from Meta using App Secret
   - [ ] Validate `X-Hub-Signature-256` header
   - [ ] Reject unsigned or invalid requests
   - **Code Implementation:**
   ```typescript
   import crypto from 'crypto';
   
   function verifyWebhookSignature(
     payload: string,
     signature: string,
     appSecret: string
   ): boolean {
     const expectedSignature = crypto
       .createHmac('sha256', appSecret)
       .update(payload)
       .digest('hex');
     
     return signature === `sha256=${expectedSignature}`;
   }
   
   // In webhook endpoint
   app.post('/whatsapp/webhook', (req, res) => {
     const signature = req.headers['x-hub-signature-256'];
     const payload = JSON.stringify(req.body);
     
     if (!verifyWebhookSignature(payload, signature, process.env.WHATSAPP_APP_SECRET)) {
       logger.error('Invalid webhook signature');
       return res.sendStatus(403);
     }
     
     // Process webhook...
   });
   ```
   - **Validation:** Invalid signatures rejected
   - **Documentation:** Signature verification implementation

2. **3.3.1.2 Parse Incoming Message Structure**
   - [ ] Extract message data from webhook payload
   - [ ] Handle different message types (text, image, document, etc.)
   - [ ] Extract sender information
   - **Code Implementation:**
   ```typescript
   function parseWebhookMessage(webhookData: any): IncomingMessage | null {
     const entry = webhookData.entry?.[0];
     const changes = entry?.changes?.[0];
     const value = changes?.value;
     const message = value?.messages?.[0];
     
     if (!message) return null;
     
     return {
       from: message.from, // Sender's WhatsApp number
       to: value.metadata.phone_number_id, // Business phone number ID
       message: {
         type: message.type,
         text: message.text,
         interactive: message.interactive,
         image: message.image,
         document: message.document
       },
       timestamp: message.timestamp,
       messageId: message.id
     };
   }
   ```
   - **Validation:** Messages parsed correctly
   - **Documentation:** Message structure examples

3. **3.3.1.3 Identify Organization from Message**
   - [ ] Use phone number ID to identify organization
   - [ ] Fallback to phone number mapping
   - [ ] Handle unknown senders
   - **Code Implementation:**
   ```typescript
   async identifyOrganization(phoneNumberId: string): Promise<string | null> {
     // First try phone number ID
     const client = Array.from(this.clients.values())
       .find(c => c.credentials.phoneNumberId === phoneNumberId);
     
     if (client) return client.organizationId;
     
     // Fallback: query database
     const prisma = getPrismaClient();
     const org = await prisma.organization.findFirst({
       where: {
         whatsappCredentials: {
           path: ['phoneNumberId'],
           equals: phoneNumberId
         }
       },
       select: { id: true }
     });
     
     return org?.id || null;
   }
   ```
   - **Validation:** Organization identified correctly
   - **Documentation:** Organization identification flow

4. **3.3.1.4 Route Message to Message Routing Service**
   - [ ] Call existing `whatsappService.routeMessage()`
   - [ ] Pass organization context
   - [ ] Handle routing errors gracefully
   - **Code Implementation:**
   ```typescript
   app.post('/whatsapp/webhook', async (req, res) => {
     // ... signature verification ...
     
     try {
       // Process webhook asynchronously
       setImmediate(async () => {
         await whatsappService.routeMessage(req.body);
       });
       
       // Respond immediately to Meta (required within 20 seconds)
       res.sendStatus(200);
       
     } catch (error) {
       logger.error('Webhook processing error:', error);
       res.sendStatus(500);
     }
   });
   ```
   - **Validation:** Messages routed successfully
   - **Documentation:** Webhook endpoint implementation

**Deliverables:**
- ✅ Webhook signature verification
- ✅ Message parsing logic
- ✅ Organization identification
- ✅ Integration with message routing service

**Testing:**
- [ ] Test webhook with valid signature (should process)
- [ ] Test webhook with invalid signature (should reject)
- [ ] Test parsing text messages
- [ ] Test parsing button responses
- [ ] Test parsing list responses
- [ ] Test organization identification
- [ ] Test message routing to correct organization
- [ ] Test webhook response time (<20 seconds)

---

#### 3.3.2 Message Response Handling
**Duration:** 30 minutes  
**Objective:** Handle incoming messages and generate appropriate responses

**Sub-subtasks:**
1. **3.3.2.1 Integrate with Existing `processMessage()` Method**
   - [ ] Review existing implementation in `whatsappService.ts`
   - [ ] Ensure proper error handling
   - [ ] Add logging for all message processing steps
   - **Validation:** Messages processed through existing flow
   - **Documentation:** Message processing flow diagram

2. **3.3.2.2 Implement Read Receipt Sending**
   - [ ] Send read receipt for incoming messages
   - [ ] Mark message as "read" in WhatsApp
   - **Code Implementation:**
   ```typescript
   async markMessageAsRead(
     organizationId: string,
     messageId: string
   ): Promise<void> {
     const client = this.clients.get(organizationId);
     if (!client) return;
     
     try {
       await axios.post(
         `${WHATSAPP_BASE_URL}/${client.credentials.phoneNumberId}/messages`,
         {
           messaging_product: 'whatsapp',
           status: 'read',
           message_id: messageId
         },
         {
           headers: {
             'Authorization': `Bearer ${client.credentials.accessToken}`,
             'Content-Type': 'application/json'
           }
         }
       );
     } catch (error) {
       logger.error('Failed to mark message as read:', error);
     }
   }
   ```
   - **Validation:** Messages marked as read in sender's WhatsApp
   - **Documentation:** Read receipt implementation

3. **3.3.2.3 Implement Typing Indicator**
   - [ ] Send typing indicator while processing message
   - [ ] Show "typing..." status to user
   - **Code Implementation:**
   ```typescript
   async sendTypingIndicator(
     organizationId: string,
     to: string
   ): Promise<void> {
     const client = this.clients.get(organizationId);
     if (!client) return;
     
     try {
       await axios.post(
         `${WHATSAPP_BASE_URL}/${client.credentials.phoneNumberId}/messages`,
         {
           messaging_product: 'whatsapp',
           recipient_type: 'individual',
           to: to,
           type: 'reaction',
           reaction: {
             message_id: '', // Empty for typing indicator
             emoji: ''
           }
         },
         {
           headers: {
             'Authorization': `Bearer ${client.credentials.accessToken}`,
             'Content-Type': 'application/json'
           }
         }
       );
     } catch (error) {
       logger.error('Failed to send typing indicator:', error);
     }
   }
   ```
   - **Validation:** Typing indicator shows in user's WhatsApp
   - **Documentation:** Typing indicator usage

**Deliverables:**
- ✅ Integration with existing message processing
- ✅ Read receipt functionality
- ✅ Typing indicator support
- ✅ Enhanced user experience

**Testing:**
- [ ] Send message and verify read receipt received
- [ ] Test typing indicator displays correctly
- [ ] Verify message processing flow works end-to-end
- [ ] Test response time for simple queries (<3 seconds per SRS)

---

#### 3.3.3 Message Logging and Analytics
**Duration:** 30 minutes  
**Objective:** Log all incoming messages for analytics and support

**Sub-subtasks:**
1. **3.3.3.1 Log Incoming Messages to Database**
   - [ ] Use existing `logMessage()` method
   - [ ] Store complete message payload
   - [ ] Link to patient record if identified
   - **Validation:** All messages logged successfully
   - **Documentation:** Message log structure

2. **3.3.3.2 Track Message Metrics**
   - [ ] Count messages per organization
   - [ ] Track response times
   - [ ] Monitor error rates
   - **Code Implementation:**
   ```typescript
   async trackMessageMetrics(organizationId: string, messageType: string, duration: number): Promise<void> {
     const redis = new Redis(process.env.REDIS_URL);
     const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
     
     // Increment message count
     await redis.hincrby(`metrics:messages:${organizationId}:${date}`, messageType, 1);
     
     // Track average response time
     await redis.zadd(`metrics:response_times:${organizationId}`, Date.now(), duration);
   }
   ```
   - **Validation:** Metrics collected accurately
   - **Documentation:** Metrics tracking implementation

3. **3.3.3.3 Create Message History API Endpoint**
   - [ ] Implement API to retrieve message history
   - [ ] Support filtering by patient, date range, status
   - [ ] Paginate results
   - **Code Implementation:**
   ```typescript
   app.get('/api/whatsapp/messages', authenticateJWT, async (req, res) => {
     const organizationId = req.user!.organizationId;
     const { patientId, startDate, endDate, page = 1, limit = 50 } = req.query;
     
     const prisma = getPrismaClient();
     const messages = await prisma.whatsAppMessage.findMany({
       where: {
         organizationId,
         patientId: patientId ? String(patientId) : undefined,
         createdAt: {
           gte: startDate ? new Date(String(startDate)) : undefined,
           lte: endDate ? new Date(String(endDate)) : undefined
         }
       },
       orderBy: { createdAt: 'desc' },
       skip: (Number(page) - 1) * Number(limit),
       take: Number(limit)
     });
     
     res.json(messages);
   });
   ```
   - **Validation:** Message history API works correctly
   - **Documentation:** API endpoint documentation

**Deliverables:**
- ✅ Complete message logging
- ✅ Message metrics tracking
- ✅ Message history API
- ✅ Analytics data collection

**Testing:**
- [ ] Send messages and verify logged to database
- [ ] Test message history API with various filters
- [ ] Verify metrics increment correctly
- [ ] Test pagination works properly

---

### SUBTASK 3.4: Integration with Existing Systems
**Duration:** 2 hours  
**Assignee:** Backend Developer 1  
**Priority:** 🟡 High  

#### 3.4.1 Connect to Message Routing Service (TASK-033)
**Duration:** 30 minutes  
**Objective:** Integrate with existing multi-client message routing

**Sub-subtasks:**
1. **3.4.1.1 Verify Routing Service Integration**
   - [ ] Review existing `routeMessage()` implementation
   - [ ] Ensure organization context passed correctly
   - [ ] Test multi-organization routing
   - **Validation:** Messages route to correct organization 100% of time
   - **Documentation:** Routing integration notes

2. **3.4.1.2 Test Phone Number to Organization Mapping**
   - [ ] Verify phone mapping updates when credentials stored
   - [ ] Test unmapped phone number handling
   - [ ] Test multiple organizations with different numbers
   - **Validation:** Phone mapping works correctly
   - **Documentation:** Phone mapping test results

3. **3.4.1.3 Test Session Context Isolation**
   - [ ] Send messages from different organizations simultaneously
   - [ ] Verify sessions don't leak between organizations
   - [ ] Test concurrent message handling
   - **Validation:** Session isolation maintained
   - **Documentation:** Isolation test results

**Deliverables:**
- ✅ Verified routing service integration
- ✅ Phone mapping validated
- ✅ Session isolation confirmed

**Testing:**
- [ ] Send message from Org A phone number (should route to Org A)
- [ ] Send message from Org B phone number (should route to Org B)
- [ ] Send concurrent messages from both orgs
- [ ] Verify no data leakage between organizations

---

#### 3.4.2 Connect to Google Sheets Data Source (TASK-023)
**Duration:** 1 hour  
**Objective:** Integrate WhatsApp with Google Sheets primary data source

**Sub-subtasks:**
1. **3.4.2.1 Read Appointment Data from Google Sheets**
   - [ ] Use existing `googleSheetsService.getAppointments()`
   - [ ] Retrieve provider schedules from sheets
   - [ ] Query patient information from sheets
   - **Code Integration:**
   ```typescript
   async getAvailableSlots(organizationId: string, providerId: string, date: string): Promise<string[]> {
     // Read from Google Sheets (primary data source)
     const appointments = await googleSheetsService.getAppointments(organizationId, { providerId, date });
     
     // Calculate available slots based on provider schedule
     const provider = await googleSheetsService.getProvider(organizationId, providerId);
     const workingHours = provider.availableHours; // e.g., "09:00-17:00"
     
     // Generate available slots
     const slots = this.generateTimeSlots(workingHours, appointments);
     return slots;
   }
   ```
   - **Validation:** Data read correctly from Google Sheets
   - **Documentation:** Google Sheets integration points

2. **3.4.2.2 Write Appointment Data to Google Sheets**
   - [ ] Use existing `googleSheetsService.createAppointment()`
   - [ ] Implement atomic slot locking
   - [ ] Handle concurrent booking conflicts
   - **Code Integration:**
   ```typescript
   async bookAppointmentViaWhatsApp(
     organizationId: string,
     patientPhone: string,
     providerId: string,
     appointmentDate: string,
     appointmentTime: string
   ): Promise<{ success: boolean; appointmentId?: string; error?: string }> {
     try {
       // Get or create patient from Google Sheets
       const patient = await googleSheetsService.getPatientByPhone(organizationId, patientPhone)
         || await googleSheetsService.createPatient(organizationId, { phone: patientPhone, name: 'WhatsApp User' });
       
       // Book appointment directly to Google Sheets (primary write)
       const appointment = await googleSheetsService.createAppointment(organizationId, {
         patientId: patient.id,
         providerId,
         appointmentDate,
         appointmentTime,
         status: 'booked',
         source: 'whatsapp'
       });
       
       // Background sync to PostgreSQL will happen automatically
       
       return {
         success: true,
         appointmentId: appointment.id
       };
       
     } catch (error) {
       logger.error('Failed to book appointment:', error);
       return {
         success: false,
         error: error.message
       };
     }
   }
   ```
   - **Validation:** Appointments written to Google Sheets successfully
   - **Documentation:** Booking flow diagram

3. **3.4.2.3 Handle Google Sheets Unavailability**
   - [ ] Implement fallback to PostgreSQL when sheets unavailable
   - [ ] Queue booking for retry when sheets come back online
   - [ ] Notify user of temporary unavailability
   - **Code Implementation:**
   ```typescript
   async bookAppointmentWithFallback(/* ... */): Promise<{ success: boolean; /* ... */ }> {
     try {
       // Try Google Sheets first (primary data source)
       return await this.bookAppointmentViaWhatsApp(/* ... */);
       
     } catch (sheetsError) {
       logger.warn('Google Sheets unavailable, using PostgreSQL fallback');
       
       // Fallback to PostgreSQL
       const prisma = getPrismaClient();
       const appointment = await prisma.appointment.create({
         data: {
           organizationId,
           patientId,
           providerId,
           appointmentDate: new Date(appointmentDate),
           startTime: appointmentTime,
           status: 'booked',
           source: 'whatsapp',
           needsSheetsSync: true // Mark for later sync
         }
       });
       
       // Queue for Google Sheets sync when available
       await syncQueue.add({
         type: 'appointment',
         id: appointment.id,
         organizationId
       });
       
       return {
         success: true,
         appointmentId: appointment.id
       };
     }
   }
   ```
   - **Validation:** Fallback works correctly
   - **Documentation:** Fallback strategy

**Deliverables:**
- ✅ Google Sheets read integration
- ✅ Google Sheets write integration
- ✅ Fallback to PostgreSQL
- ✅ Conflict resolution

**Testing:**
- [ ] Test reading appointment data from sheets
- [ ] Test booking appointment writes to sheets
- [ ] Test concurrent booking conflict resolution
- [ ] Test fallback when sheets unavailable
- [ ] Verify sync queue processes correctly

---

#### 3.4.3 Connect to Configuration Wizard (TASK-036A)
**Duration:** 30 minutes  
**Objective:** Utilize credentials stored via configuration wizard

**Sub-subtasks:**
1. **3.4.3.1 Read Credentials from Database**
   - [ ] Decrypt credentials stored by wizard
   - [ ] Load into WhatsApp service on startup
   - [ ] Handle missing credentials gracefully
   - **Validation:** Credentials read and decrypted successfully
   - **Documentation:** Credential loading process

2. **3.4.3.2 Validate Credential Completeness**
   - [ ] Check all required fields present
   - [ ] Validate credential format
   - [ ] Test credential validity with WhatsApp API
   - **Validation:** Only valid credentials loaded
   - **Documentation:** Validation checks

3. **3.4.3.3 Support Credential Updates**
   - [ ] Reload credentials when updated via wizard
   - [ ] Hot-reload without service restart
   - [ ] Maintain active sessions during reload
   - **Code Implementation:**
   ```typescript
   async reloadOrganizationCredentials(organizationId: string): Promise<void> {
     const prisma = getPrismaClient();
     const org = await prisma.organization.findUnique({
       where: { id: organizationId },
       select: { whatsappCredentials: true }
     });
     
     if (org?.whatsappCredentials) {
       // Decrypt and reinitialize client
       const credentials = decryptCredentials(org.whatsappCredentials);
       await this.initializeClient(organizationId, credentials);
       
       logger.info(`Reloaded WhatsApp credentials for organization ${organizationId}`);
     }
   }
   ```
   - **Validation:** Credentials hot-reload successfully
   - **Documentation:** Hot-reload procedure

**Deliverables:**
- ✅ Credential reading from database
- ✅ Credential validation
- ✅ Hot-reload support
- ✅ Integration with configuration wizard

**Testing:**
- [ ] Test reading credentials stored by wizard
- [ ] Test decryption of encrypted credentials
- [ ] Test validation catches invalid credentials
- [ ] Test hot-reload updates active client
- [ ] Verify active sessions maintained during reload

---

### SUBTASK 3.5: Production Testing and Validation
**Duration:** 3 hours  
**Assignee:** Backend Developer 1 + QA Engineer  
**Priority:** 🔴 Critical  

#### 3.5.1 End-to-End Message Flow Testing
**Duration:** 1 hour  
**Objective:** Test complete message send/receive flow in production

**Sub-subtasks:**
1. **3.5.1.1 Test Basic Message Exchange**
   - [ ] Send test message from dashboard to WhatsApp user
   - [ ] User replies via WhatsApp
   - [ ] Verify reply received and processed
   - [ ] Check message logged in database
   - **Test Scenarios:**
     - Send plain text message
     - Receive plain text reply
     - Send message with link preview
     - Send button message
     - Receive button response
   - **Validation:** All messages sent and received successfully
   - **Documentation:** Test results with screenshots

2. **3.5.1.2 Test Multi-Organization Routing**
   - [ ] Set up 2 test organizations with different phone numbers
   - [ ] Send messages to both numbers simultaneously
   - [ ] Verify each message routes to correct organization
   - [ ] Check no cross-organization data leakage
   - **Test Scenarios:**
     - Org A user sends message → routed to Org A
     - Org B user sends message → routed to Org B
     - Concurrent messages from both orgs
     - Verify sessions isolated
   - **Validation:** 100% routing accuracy
   - **Documentation:** Multi-org routing test results

3. **3.5.1.3 Test Message Delivery Tracking**
   - [ ] Send message and track status changes
   - [ ] Verify: sent → delivered → read
   - [ ] Check timestamps recorded correctly
   - [ ] Test delivery failure handling
   - **Test Scenarios:**
     - Normal delivery flow
     - Delivery to offline user (should show "sent" until they come online)
     - Delivery to invalid number (should fail)
     - Read receipt tracking
   - **Validation:** Status tracking works correctly
   - **Documentation:** Delivery tracking test results

**Deliverables:**
- ✅ End-to-end message flow verified
- ✅ Multi-organization routing confirmed
- ✅ Delivery tracking validated
- ✅ Test documentation complete

**Testing Checklist:**
- [ ] ✅ Send message from dashboard
- [ ] ✅ Receive message via WhatsApp
- [ ] ✅ Reply via WhatsApp
- [ ] ✅ Reply received by dashboard
- [ ] ✅ Multiple organizations work simultaneously
- [ ] ✅ No data leakage between orgs
- [ ] ✅ All statuses tracked correctly
- [ ] ✅ Timestamps accurate

---

#### 3.5.2 WhatsApp-to-Google Sheets Integration Testing
**Duration:** 1 hour  
**Objective:** Test appointment booking via WhatsApp writes to Google Sheets

**Sub-subtasks:**
1. **3.5.2.1 Test Appointment Availability Query**
   - [ ] User asks for available appointments via WhatsApp
   - [ ] System reads schedule from Google Sheets
   - [ ] System shows available time slots
   - [ ] Verify slots match sheet data
   - **Test Scenarios:**
     - Query today's availability
     - Query tomorrow's availability
     - Query for specific doctor
     - Query when no slots available
   - **Validation:** Availability data accurate
   - **Documentation:** Availability test results

2. **3.5.2.2 Test Appointment Booking Flow**
   - [ ] User books appointment via WhatsApp
   - [ ] System writes to Google Sheets
   - [ ] Verify appointment appears in sheet
   - [ ] Check confirmation message sent
   - **Test Scenarios:**
     - Book appointment for today
     - Book appointment for future date
     - Try to book unavailable slot (should fail)
     - Try to double-book slot (should fail)
   - **Validation:** Bookings write correctly to sheets
   - **Documentation:** Booking test results with sheet screenshots

3. **3.5.2.3 Test Concurrent Booking Conflict Resolution**
   - [ ] Two users try to book same slot simultaneously
   - [ ] System uses atomic locking
   - [ ] First user gets slot, second gets alternative suggestion
   - [ ] Verify no double-booking occurred
   - **Test Scenario:**
     - User A starts booking 2:00 PM slot
     - User B starts booking 2:00 PM slot simultaneously
     - User A completes first → gets slot
     - User B shown "slot taken, try 2:30 PM"
     - Verify only one booking in sheet
   - **Validation:** Conflict resolution works correctly
   - **Documentation:** Concurrent booking test results

4. **3.5.2.4 Test Google Sheets Fallback**
   - [ ] Simulate Google Sheets unavailable (disconnect API)
   - [ ] Try to book appointment
   - [ ] System falls back to PostgreSQL
   - [ ] Booking queued for later sync
   - [ ] Restore sheets connection
   - [ ] Verify booking syncs to sheets
   - **Validation:** Fallback and sync work correctly
   - **Documentation:** Fallback test results

**Deliverables:**
- ✅ Availability query tested
- ✅ Booking flow validated
- ✅ Conflict resolution confirmed
- ✅ Fallback mechanism verified

**Testing Checklist:**
- [ ] ✅ Availability data reads from sheets
- [ ] ✅ Bookings write to sheets
- [ ] ✅ Confirmation messages sent
- [ ] ✅ Concurrent bookings handled correctly
- [ ] ✅ No double-bookings possible
- [ ] ✅ Fallback to PostgreSQL works
- [ ] ✅ Sync queue processes correctly

---

#### 3.5.3 Performance and Load Testing
**Duration:** 1 hour  
**Objective:** Validate system meets SRS performance requirements

**Sub-subtasks:**
1. **3.5.3.1 Test Message Response Time**
   - [ ] Send 100 messages and measure response times
   - [ ] Calculate average, median, 95th percentile
   - [ ] Verify <3 seconds per SRS requirement (REQ-WA-001, PERF-001)
   - **Test Scenarios:**
     - Simple text query
     - Appointment availability query
     - Appointment booking
     - Complex multi-step interaction
   - **Validation:** 95% of responses <3 seconds
   - **Documentation:** Response time distribution chart

2. **3.5.3.2 Test Concurrent User Capacity**
   - [ ] Simulate 50 concurrent users sending messages
   - [ ] Monitor system resource usage
   - [ ] Check for errors or timeouts
   - [ ] Verify all messages processed correctly
   - **Test Scenarios:**
     - 10 concurrent users
     - 25 concurrent users
     - 50 concurrent users
     - 100 concurrent users (stress test)
   - **Validation:** System handles 50+ concurrent users per SRS (PERF-003)
   - **Documentation:** Concurrency test results

3. **3.5.3.3 Test Rate Limiting**
   - [ ] Send messages at high rate (>80/sec)
   - [ ] Verify rate limiter engages
   - [ ] Check messages queue correctly
   - [ ] Monitor for API errors
   - **Test Scenarios:**
     - 50 messages/second (should work)
     - 80 messages/second (at limit)
     - 100 messages/second (should queue)
   - **Validation:** Rate limiter prevents API errors
   - **Documentation:** Rate limiting test results

4. **3.5.3.4 Test Message Queue Performance**
   - [ ] Queue 1000 messages
   - [ ] Monitor queue processing rate
   - [ ] Check for message loss
   - [ ] Verify all messages delivered
   - **Validation:** All queued messages delivered successfully
   - **Documentation:** Queue performance metrics

**Deliverables:**
- ✅ Performance benchmarks established
- ✅ Concurrent user capacity validated
- ✅ Rate limiting confirmed working
- ✅ Queue performance measured

**Testing Checklist:**
- [ ] ✅ 95% of messages respond <3 seconds
- [ ] ✅ System handles 50 concurrent users
- [ ] ✅ Rate limiter prevents API errors
- [ ] ✅ Message queue processes efficiently
- [ ] ✅ No message loss under load
- [ ] ✅ System resources within acceptable limits

---

### SUBTASK 3.6: Error Handling and Monitoring
**Duration:** 2 hours  
**Assignee:** Backend Developer 1  
**Priority:** 🟡 High  

#### 3.6.1 Implement Comprehensive Error Handling
**Duration:** 1 hour  
**Objective:** Handle all possible error scenarios gracefully

**Sub-subtasks:**
1. **3.6.1.1 WhatsApp API Error Handling**
   - [ ] Handle invalid phone numbers
   - [ ] Handle rate limit errors (HTTP 429)
   - [ ] Handle authentication errors (HTTP 401)
   - [ ] Handle API downtime (HTTP 500/503)
   - **Code Implementation:**
   ```typescript
   async handleWhatsAppError(error: any, context: string): Promise<void> {
     if (error.response?.status === 429) {
       logger.warn('WhatsApp rate limit hit, queueing message');
       // Message already queued by rate limiter
       return;
     }
     
     if (error.response?.status === 401) {
       logger.error('WhatsApp authentication failed - refresh token required');
       // TODO: Implement token refresh
       throw new Error('WhatsApp authentication failed');
     }
     
     if (error.response?.status >= 500) {
       logger.error('WhatsApp API unavailable:', error);
       // Retry with exponential backoff
       throw new Error('WhatsApp API temporarily unavailable');
     }
     
     // Log unknown errors
     logger.error(`WhatsApp API error in ${context}:`, error);
     throw error;
   }
   ```
   - **Validation:** All error types handled appropriately
   - **Documentation:** Error handling strategies

2. **3.6.1.2 Google Sheets Error Handling**
   - [ ] Handle API rate limits
   - [ ] Handle authentication errors
   - [ ] Handle sheet not found errors
   - [ ] Handle permission errors
   - **Code Implementation:**
   ```typescript
   async handleSheetsError(error: any, organizationId: string): Promise<void> {
     if (error.code === 429) {
       logger.warn('Google Sheets rate limit, falling back to PostgreSQL');
       // Fallback already implemented
       return;
     }
     
     if (error.code === 403) {
       logger.error(`Google Sheets permission error for org ${organizationId}`);
       // Notify organization admin
       await this.notifyAdmin(organizationId, 'Google Sheets permission error');
       throw new Error('Google Sheets permission denied');
     }
     
     if (error.code === 404) {
       logger.error(`Google Sheet not found for org ${organizationId}`);
       // Create new sheet
       await googleSheetsService.createOrganizationSheets(organizationId);
       return;
     }
     
     logger.error('Google Sheets error:', error);
     throw error;
   }
   ```
   - **Validation:** Sheets errors handled gracefully
   - **Documentation:** Fallback procedures

3. **3.6.1.3 User-Facing Error Messages**
   - [ ] Create friendly error messages for users
   - [ ] Avoid exposing technical details
   - [ ] Provide actionable guidance
   - **Error Message Templates:**
   ```typescript
   const userErrorMessages = {
     INVALID_PHONE: "Sorry, this phone number is not registered. Please contact the clinic.",
     RATE_LIMIT: "We're receiving many messages right now. Your message will be processed shortly.",
     API_DOWN: "Our system is temporarily unavailable. Please try again in a few minutes.",
     BOOKING_CONFLICT: "This appointment slot was just taken. Would you like to see other available times?",
     SHEETS_UNAVAILABLE: "Appointment system temporarily unavailable. Your booking request has been saved and will be processed shortly."
   };
   ```
   - **Validation:** Error messages tested with users
   - **Documentation:** Error message standards

4. **3.6.1.4 Error Recovery Procedures**
   - [ ] Implement automatic retry for transient errors
   - [ ] Queue failed operations for manual review
   - [ ] Alert admins for critical errors
   - **Code Implementation:**
   ```typescript
   async retryWithBackoff<T>(
     operation: () => Promise<T>,
     maxRetries: number = 3,
     baseDelay: number = 1000
   ): Promise<T> {
     for (let attempt = 0; attempt < maxRetries; attempt++) {
       try {
         return await operation();
       } catch (error) {
         if (attempt === maxRetries - 1) throw error;
         
         const delay = baseDelay * Math.pow(2, attempt);
         logger.warn(`Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`);
         await new Promise(resolve => setTimeout(resolve, delay));
       }
     }
     throw new Error('All retry attempts failed');
   }
   ```
   - **Validation:** Retry logic works correctly
   - **Documentation:** Retry policies

**Deliverables:**
- ✅ Comprehensive error handling
- ✅ User-friendly error messages
- ✅ Automatic error recovery
- ✅ Admin alerting for critical errors

**Testing:**
- [ ] Test invalid phone number handling
- [ ] Test rate limit error handling
- [ ] Test API authentication errors
- [ ] Test API downtime scenarios
- [ ] Test Google Sheets errors
- [ ] Test retry logic with transient failures
- [ ] Test user error messages display correctly

---

#### 3.6.2 Implement Monitoring and Alerting
**Duration:** 1 hour  
**Objective:** Set up monitoring for WhatsApp integration health

**Sub-subtasks:**
1. **3.6.2.1 Create Health Check Endpoint**
   - [ ] Implement `/api/whatsapp/health` endpoint
   - [ ] Check WhatsApp API connectivity
   - [ ] Check Google Sheets connectivity
   - [ ] Check message queue status
   - **Code Implementation:**
   ```typescript
   app.get('/api/whatsapp/health', async (req, res) => {
     const health = {
       status: 'healthy',
       timestamp: new Date().toISOString(),
       checks: {
         whatsapp: await checkWhatsAppAPI(),
         sheets: await checkGoogleSheets(),
         queue: await checkMessageQueue(),
         database: await checkDatabase()
       }
     };
     
     const isHealthy = Object.values(health.checks).every(check => check.status === 'ok');
     res.status(isHealthy ? 200 : 503).json(health);
   });
   ```
   - **Validation:** Health check accurately reflects system status
   - **Documentation:** Health check endpoint documentation

2. **3.6.2.2 Implement Metrics Collection**
   - [ ] Track messages sent per organization
   - [ ] Track messages received per organization
   - [ ] Track error rates
   - [ ] Track response times
   - **Metrics to Collect:**
   ```typescript
   interface WhatsAppMetrics {
     messagesSent: number;
     messagesReceived: number;
     messagesDelivered: number;
     messagesRead: number;
     messagesFailed: number;
     averageResponseTime: number;
     apiErrors: number;
     rateLimitHits: number;
   }
   ```
   - **Validation:** Metrics collected accurately
   - **Documentation:** Metrics documentation

3. **3.6.2.3 Set Up Logging**
   - [ ] Log all WhatsApp API requests/responses
   - [ ] Log message routing decisions
   - [ ] Log errors with full context
   - [ ] Use structured logging (JSON format)
   - **Logging Standards:**
   ```typescript
   logger.info('WhatsApp message sent', {
     organizationId,
     messageId,
     recipientPhone,
     messageType,
     duration: endTime - startTime
   });
   
   logger.error('WhatsApp API error', {
     organizationId,
     errorCode: error.response?.status,
     errorMessage: error.message,
     requestId
   });
   ```
   - **Validation:** Logs provide sufficient debugging information
   - **Documentation:** Logging standards

4. **3.6.2.4 Configure Alerts**
   - [ ] Alert when error rate >5%
   - [ ] Alert when response time >5 seconds
   - [ ] Alert when WhatsApp API down
   - [ ] Alert when message queue backing up
   - **Alert Configuration:**
   ```typescript
   const alerts = {
     HIGH_ERROR_RATE: {
       threshold: 0.05, // 5%
       window: 300, // 5 minutes
       action: 'page_oncall'
     },
     SLOW_RESPONSE: {
       threshold: 5000, // 5 seconds
       window: 300,
       action: 'slack_notification'
     },
     API_DOWN: {
       threshold: 1,
       window: 60,
       action: 'page_oncall'
     }
   };
   ```
   - **Validation:** Alerts fire correctly
   - **Documentation:** Alerting procedures

**Deliverables:**
- ✅ Health check endpoint
- ✅ Metrics collection
- ✅ Comprehensive logging
- ✅ Alerting configuration

**Testing:**
- [ ] Test health check endpoint returns correct status
- [ ] Verify metrics collected accurately
- [ ] Test logs contain sufficient detail
- [ ] Trigger test alerts and verify delivery
- [ ] Test alert thresholds are appropriate

---

### SUBTASK 3.7: Documentation and Knowledge Transfer
**Duration:** 2 hours  
**Assignee:** Backend Developer 1  
**Priority:** 🟡 Medium  

#### 3.7.1 API Documentation
**Duration:** 1 hour  
**Objective:** Document all WhatsApp-related APIs

**Sub-subtasks:**
1. **3.7.1.1 Document Message Sending APIs**
   - [ ] Document `sendTextMessage()`
   - [ ] Document `sendInteractiveButtons()`
   - [ ] Document `sendTemplateMessage()`
   - [ ] Include request/response examples
   - **Documentation Format:**
   ```markdown
   ## Send Text Message
   
   Sends a plain text message to a WhatsApp user.
   
   **Endpoint:** `POST /api/whatsapp/send`
   
   **Request:**
   ```json
   {
     "organizationId": "org_123",
     "to": "+923001234567",
     "message": {
       "type": "text",
       "text": {
         "body": "Hello from DrSync!"
       }
     }
   }
   ```
   
   **Response:**
   ```json
   {
     "success": true,
     "messageId": "wamid.ABC123..."
   }
   ```
   ```
   - **Validation:** Documentation accurate and complete
   - **Documentation:** API reference document

2. **3.7.1.2 Document Webhook Endpoints**
   - [ ] Document webhook verification endpoint (GET)
   - [ ] Document message receipt endpoint (POST)
   - [ ] Document webhook payload structure
   - [ ] Include webhook setup instructions
   - **Validation:** Webhook documentation clear
   - **Documentation:** Webhook integration guide

3. **3.7.1.3 Document Error Codes**
   - [ ] List all possible error codes
   - [ ] Provide resolution guidance
   - [ ] Include troubleshooting tips
   - **Error Code Reference:**
   ```markdown
   | Code | Message | Resolution |
   |------|---------|-----------|
   | 401 | Authentication failed | Check access token validity |
   | 403 | Permission denied | Verify phone number permissions |
   | 429 | Rate limit exceeded | Reduce send rate or wait |
   | 500 | Internal server error | Contact support |
   ```
   - **Validation:** Error documentation helpful
   - **Documentation:** Error reference guide

**Deliverables:**
- ✅ Complete API documentation
- ✅ Webhook integration guide
- ✅ Error code reference
- ✅ Troubleshooting guide

---

#### 3.7.2 Operations Documentation
**Duration:** 1 hour  
**Objective:** Create operational procedures and runbooks

**Sub-subtasks:**
1. **3.7.2.1 WhatsApp Setup Procedure**
   - [ ] Document step-by-step setup process
   - [ ] Include screenshots
   - [ ] Document common issues
   - **Documentation Sections:**
     - Meta Business Account setup
     - WhatsApp Business API configuration
     - Webhook configuration
     - Credential storage
     - Testing procedures
   - **Validation:** Setup procedure can be followed by non-technical user
   - **Documentation:** WhatsApp setup guide

2. **3.7.2.2 Troubleshooting Runbook**
   - [ ] Document common issues and solutions
   - [ ] Include diagnostic steps
   - [ ] Document escalation procedures
   - **Troubleshooting Scenarios:**
     - Messages not sending
     - Messages not receiving
     - Webhook not triggering
     - Rate limit errors
     - Authentication failures
     - Google Sheets sync failures
   - **Validation:** Runbook covers major issues
   - **Documentation:** Troubleshooting runbook

3. **3.7.2.3 Monitoring and Alerting Guide**
   - [ ] Document what to monitor
   - [ ] Document alert response procedures
   - [ ] Include dashboard access instructions
   - **Validation:** Monitoring guide clear
   - **Documentation:** Monitoring guide

4. **3.7.2.4 Disaster Recovery Procedures**
   - [ ] Document WhatsApp API outage response
   - [ ] Document Google Sheets outage response
   - [ ] Document database recovery
   - [ ] Document message queue recovery
   - **Validation:** DR procedures tested
   - **Documentation:** Disaster recovery guide

**Deliverables:**
- ✅ Setup procedure documentation
- ✅ Troubleshooting runbook
- ✅ Monitoring guide
- ✅ Disaster recovery procedures

---

## 4. Testing Requirements

### 4.1 Unit Testing
**Total Tests:** 30+  
**Framework:** Jest  
**Coverage Target:** >90%  

#### 4.1.1 Message Sending Tests
- [ ] Test `sendMessage()` with valid credentials
- [ ] Test `sendMessage()` with invalid credentials
- [ ] Test `sendTextMessage()` formatting
- [ ] Test `sendInteractiveButtons()` structure
- [ ] Test `sendTemplateMessage()` parameters
- [ ] Test error handling for failed sends
- [ ] Test retry logic

#### 4.1.2 Message Receiving Tests
- [ ] Test webhook signature verification
- [ ] Test webhook message parsing
- [ ] Test organization identification
- [ ] Test message routing
- [ ] Test read receipt sending
- [ ] Test typing indicator

#### 4.1.3 Integration Tests
- [ ] Test complete send/receive flow
- [ ] Test multi-organization routing
- [ ] Test Google Sheets integration
- [ ] Test rate limiting
- [ ] Test message queueing
- [ ] Test error recovery

### 4.2 Integration Testing
**Total Tests:** 20+  
**Framework:** Jest + Supertest  

#### 4.2.1 End-to-End Flow Tests
- [ ] Test user sends message → system receives
- [ ] Test system sends message → user receives
- [ ] Test message delivery status tracking
- [ ] Test multi-step conversation flow

#### 4.2.2 Multi-Organization Tests
- [ ] Test message routing accuracy (100%)
- [ ] Test session isolation
- [ ] Test concurrent operations
- [ ] Test data leakage prevention

#### 4.2.3 Data Integration Tests
- [ ] Test Google Sheets read operations
- [ ] Test Google Sheets write operations
- [ ] Test atomic booking operations
- [ ] Test conflict resolution
- [ ] Test fallback to PostgreSQL

### 4.3 Performance Testing
**Tools:** Artillery, K6  
**Target:** Meet SRS requirements  

#### 4.3.1 Load Tests
- [ ] Test 50 concurrent users (SRS requirement)
- [ ] Test 100 concurrent users (stress test)
- [ ] Test message throughput (messages/second)
- [ ] Test system resource usage

#### 4.3.2 Response Time Tests
- [ ] Test <3 second response for simple queries (SRS requirement)
- [ ] Test <5 second response for complex queries
- [ ] Test queue processing speed
- [ ] Test database query performance

#### 4.3.3 Reliability Tests
- [ ] Test 24-hour continuous operation
- [ ] Test error recovery
- [ ] Test failover mechanisms
- [ ] Test message delivery guarantee

### 4.4 Security Testing
**Focus:** Authentication, Authorization, Data Protection  

#### 4.4.1 Authentication Tests
- [ ] Test webhook signature validation
- [ ] Test invalid signature rejection
- [ ] Test token expiry handling
- [ ] Test credential encryption

#### 4.4.2 Authorization Tests
- [ ] Test organization data isolation
- [ ] Test unauthorized access prevention
- [ ] Test privilege escalation prevention

#### 4.4.3 Data Protection Tests
- [ ] Test encryption at rest
- [ ] Test encryption in transit
- [ ] Test sensitive data masking in logs
- [ ] Test credential storage security

---

## 5. Success Criteria

### 5.1 Functional Requirements
- ✅ WhatsApp messages can be sent successfully (>99% delivery rate)
- ✅ WhatsApp messages can be received and processed
- ✅ Multi-organization message routing works with 100% accuracy
- ✅ Message delivery status tracked accurately
- ✅ Messages log correctly to database
- ✅ Integration with Google Sheets works correctly
- ✅ Fallback to PostgreSQL works when sheets unavailable
- ✅ Rate limiting prevents API errors
- ✅ Message queue processes reliably

### 5.2 Performance Requirements (SRS Compliance)
- ✅ **PERF-001**: System responds to WhatsApp messages within 3 seconds (95th percentile)
- ✅ **PERF-003**: System supports 50+ concurrent users per organization
- ✅ **PERF-004**: API response time <500ms for 95% of requests
- ✅ Message send rate: 80 messages/second (WhatsApp limit)
- ✅ Message queue processes >100 messages/minute
- ✅ Zero message loss under normal conditions

### 5.3 Reliability Requirements (SRS Compliance)
- ✅ **REL-001**: 99.9% uptime for message receiving
- ✅ **REL-002**: Automatic failover to PostgreSQL when sheets unavailable
- ✅ **REL-004**: Recovery from failures within 5 minutes
- ✅ Failed messages retry automatically (max 3 attempts)
- ✅ Message queue survives system restarts
- ✅ No data loss during failover

### 5.4 Security Requirements (SRS Compliance)
- ✅ **SEC-002**: All communications encrypted (TLS 1.3)
- ✅ **SEC-005**: RBAC controls API access
- ✅ **SEC-006**: All security events logged
- ✅ Webhook signatures verified
- ✅ Credentials encrypted at rest (AES-256-CBC)
- ✅ Organization data isolation enforced

### 5.5 Testing Requirements
- ✅ Unit test coverage >90%
- ✅ All integration tests passing
- ✅ Performance tests meet SRS requirements
- ✅ Security tests pass
- ✅ Load tests validate concurrent user capacity
- ✅ 24-hour reliability test passes

### 5.6 Documentation Requirements
- ✅ Complete API documentation
- ✅ Webhook integration guide
- ✅ Setup procedure documentation
- ✅ Troubleshooting runbook
- ✅ Monitoring and alerting guide
- ✅ Disaster recovery procedures

---

## 6. Timeline & Resources

### 6.1 Estimated Duration
**Total:** 2 days (16 hours)

**Breakdown:**
- Subtask 3.1: WhatsApp API Setup - 4 hours
- Subtask 3.2: Message Sending - 3 hours
- Subtask 3.3: Message Receiving - 2 hours
- Subtask 3.4: System Integration - 2 hours
- Subtask 3.5: Production Testing - 3 hours
- Subtask 3.6: Error Handling - 2 hours
- Subtask 3.7: Documentation - 2 hours

### 6.2 Team Requirements
- **Backend Developer 1** (Primary): 16 hours
- **QA Engineer**: 3 hours (testing support)
- **DevOps Engineer**: 1 hour (deployment support)

### 6.3 Resource Requirements
- WhatsApp Business API account (1 primary, 1 test)
- 2-3 test phone numbers
- SSL certificate (already available)
- Production server access
- Meta Developer Console access

---

## 7. Risk Management

### 7.1 Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| WhatsApp API account approval delay | Medium | High | Apply for approval early, use sandbox for development |
| SSL certificate issues | Low | High | Verify certificate before starting |
| Rate limiting issues | Medium | Medium | Implement proper queueing and monitoring |
| Google Sheets rate limits | Medium | Medium | Implement PostgreSQL fallback |
| Webhook delivery failures | Low | Medium | Implement retry logic and monitoring |
| Message delivery failures | Low | High | Implement retry logic and alerting |

### 7.2 Operational Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Production testing impacts real users | Medium | High | Use test organizations initially |
| Insufficient testing time | Medium | Medium | Allocate buffer time (3 hours) |
| Documentation incomplete | Low | Medium | Document as you build |
| Knowledge not transferred | Low | High | Create comprehensive documentation |

### 7.3 Dependency Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| TASK-033 routing has issues | Low | High | Already tested (17/17 passing) |
| Google Sheets service issues | Low | Medium | PostgreSQL fallback ready |
| Database performance issues | Low | Medium | Already optimized in Phase 2 |

---

## 8. Documentation Requirements

### 8.1 Technical Documentation
- ✅ API Reference (Section 3.7.1)
- ✅ Webhook Integration Guide (Section 3.7.1)
- ✅ Error Code Reference (Section 3.7.1)
- ✅ Architecture Diagrams
- ✅ Data Flow Diagrams

### 8.2 Operational Documentation
- ✅ Setup Procedure (Section 3.7.2)
- ✅ Troubleshooting Runbook (Section 3.7.2)
- ✅ Monitoring Guide (Section 3.7.2)
- ✅ Disaster Recovery Procedures (Section 3.7.2)

### 8.3 Testing Documentation
- ✅ Test Plan
- ✅ Test Cases
- ✅ Test Results
- ✅ Performance Benchmarks

---

## 9. Acceptance Sign-Off

### 9.1 Technical Acceptance Checklist
- [ ] All subtasks completed
- [ ] All tests passing (unit, integration, performance, security)
- [ ] SRS requirements met
- [ ] Production deployment successful
- [ ] Documentation complete

### 9.2 Business Acceptance Checklist
- [ ] Messages send/receive successfully
- [ ] Multi-organization routing works correctly
- [ ] Performance meets requirements
- [ ] Error handling satisfactory
- [ ] Monitoring and alerting configured

### 9.3 Sign-Off

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Backend Developer | | | |
| QA Engineer | | | |
| Technical Lead | | | |
| Product Owner | | | |

---

## 10. Appendix

### 10.1 Related Documents
- `docs/DrSync_SRS.md` - Software Requirements Specification
- `docs/DrSync_TDD.md` - Technical Design Document
- `docs/DrSync_Task_Tracking.md` - Task tracking document
- `backend/tests/whatsappMessageRouting.test.ts` - TASK-033 routing tests
- `backend/tests/whatsappConfiguration.test.ts` - TASK-036A wizard tests
- `docs/TASK-036_Configuration_Wizards_Implementation.md` - Configuration wizard details

### 10.2 External References
- [WhatsApp Cloud API Documentation](https://developers.facebook.com/docs/whatsapp/cloud-api)
- [WhatsApp Business Platform Overview](https://developers.facebook.com/docs/whatsapp/overview)
- [Meta Webhook Setup Guide](https://developers.facebook.com/docs/graph-api/webhooks)
- [Google Sheets API Documentation](https://developers.google.com/sheets/api)

### 10.3 Change Log

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | Oct 13, 2025 | DrSync Team | Initial detailed breakdown |

---

**END OF DOCUMENT**
