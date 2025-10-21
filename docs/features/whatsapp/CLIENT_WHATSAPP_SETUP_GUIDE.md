# WhatsApp Business API Setup Guide for Healthcare Organizations

**DrSync Platform - Client Onboarding Documentation**  
**Version:** 1.0  
**Date:** October 13, 2025  
**Audience:** Healthcare clinic administrators and IT staff  

---

## 📋 Table of Contents

1. [Overview](#1-overview)
2. [Before You Start](#2-before-you-start)
3. [Step-by-Step Setup Process](#3-step-by-step-setup-process)
4. [Connect to DrSync Platform](#4-connect-to-drsync-platform)
5. [Testing Your Setup](#5-testing-your-setup)
6. [Troubleshooting](#6-troubleshooting)
7. [Costs and Billing](#7-costs-and-billing)
8. [Support](#8-support)

---

## 1. Overview

### What You're Setting Up

You're connecting your clinic's **own WhatsApp Business number** to the DrSync platform. This allows your patients to:
- Book appointments via WhatsApp
- Receive appointment reminders
- Get appointment confirmations
- Communicate with your clinic

### Important: Your WhatsApp Number, Your Control

- ✅ **You own the WhatsApp Business account** - not DrSync
- ✅ **Patients see messages from your clinic** - not from "DrSync"
- ✅ **You control your phone number** - can disconnect anytime
- ✅ **You pay Meta directly** - DrSync doesn't charge for WhatsApp messages
- ✅ **DrSync manages the technology** - we handle all the technical complexity

### What You'll Need

- **Time Required**: 1-2 hours
- **Your clinic's phone number** (must not be registered on regular WhatsApp)
- **Business verification documents** (business registration, tax ID)
- **Credit/debit card** for Meta Business verification
- **Computer access** (some steps require desktop browser)
- **Admin access to DrSync dashboard**

---

## 2. Before You Start

### ✅ Prerequisites Checklist

- [ ] You have a phone number for WhatsApp Business (separate from your personal WhatsApp)
- [ ] This phone number is NOT currently registered on regular WhatsApp
- [ ] You have your business registration documents ready
- [ ] You have admin access to your DrSync account
- [ ] You have 1-2 hours available to complete the setup

### ⚠️ Important Notes

**About Your Phone Number:**
- Must be a **mobile number** (landlines not supported)
- Should be the number patients already know to contact your clinic
- Can be a new number or existing business line
- **Cannot** be registered on regular WhatsApp app

**If you're already using this number on regular WhatsApp:**
1. You'll need to migrate to WhatsApp Business API (Meta handles this)
2. Your regular WhatsApp app will stop working on that number
3. All your WhatsApp history will be preserved
4. Consider using a different number if you need personal WhatsApp

---

## 3. Step-by-Step Setup Process

### STEP 1: Create Meta Business Account

#### 1.1 Visit Meta Business Manager
1. Go to https://business.facebook.com
2. Click **"Create Account"**
3. Enter your clinic details:
   - **Business Name**: Your clinic's legal name (e.g., "City Medical Center")
   - **Your Name**: Your full name
   - **Business Email**: Your clinic's email address

#### 1.2 Verify Your Business
1. Meta will ask for business verification documents:
   - Business registration certificate
   - Tax identification document
   - Proof of address (utility bill, bank statement)
2. Upload clear photos/scans of documents
3. Verification takes 1-3 business days
4. You'll receive email notification when verified

**💡 Tip**: Start this process early as verification can take time. You can continue with other steps while waiting.

---

### STEP 2: Create WhatsApp Business API Account

#### 2.1 Add WhatsApp to Your Business Account
1. In Meta Business Manager, go to **Business Settings**
2. Click **"Accounts"** → **"WhatsApp Accounts"**
3. Click **"Add"** → **"Create a new WhatsApp Business Account"**
4. Enter your business information:
   - **Display Name**: Your clinic name as patients will see it
   - **Category**: Select "Hospital" or "Doctor" or "Health"
   - **Description**: Brief description of your clinic
   - **Website**: Your clinic website (if available)

#### 2.2 Register Your Phone Number
1. Click **"Add Phone Number"**
2. Enter your clinic's phone number (with country code)
   - Pakistan: +92-XXX-XXXXXXX
   - Remove any spaces or dashes
3. Select verification method:
   - **SMS**: Receive code via text message (recommended)
   - **Voice Call**: Receive code via automated call
4. Enter the 6-digit verification code
5. Your number is now registered! ✅

#### 2.3 Set Up Your WhatsApp Business Profile
1. Upload your clinic logo (square image, at least 640x640 pixels)
2. Add business description
3. Set business hours
4. Add address (optional but recommended)
5. Add category and website
6. Click **"Save"**

---

### STEP 3: Create Developer App (Required for DrSync)

#### 3.1 Create New App
1. Go to https://developers.facebook.com
2. Click **"My Apps"** → **"Create App"**
3. Select **"Business"** as app type
4. Click **"Next"**
5. Enter app details:
   - **App Name**: "[Your Clinic Name] - DrSync Integration"
   - **App Contact Email**: Your email
   - **Business Account**: Select your Meta Business Account
6. Click **"Create App"**

#### 3.2 Add WhatsApp Product
1. In your new app dashboard, find **"WhatsApp"**
2. Click **"Set Up"**
3. Accept WhatsApp Business Platform Terms
4. Click **"Get Started"**

#### 3.3 Request Production Access
1. In WhatsApp settings, click **"API Setup"**
2. Click **"Request Production Access"**
3. Fill out the questionnaire:
   - **Use case**: Healthcare appointment management
   - **Expected message volume**: Estimate your monthly patient messages
   - **Sample messages**: Example of appointment reminder
4. Submit for review (approval takes 1-3 business days)

**💡 Tip**: You can continue setup while waiting for production approval. Test mode works for initial setup.

---

### STEP 4: Get Your API Credentials

You'll need to copy these credentials to connect to DrSync. Keep them secure!

#### 4.1 Get App ID and App Secret
1. In your app dashboard, go to **"Settings"** → **"Basic"**
2. Copy **"App ID"** (write it down somewhere safe)
3. Click **"Show"** next to **"App Secret"**
4. Copy **"App Secret"** (IMPORTANT: Keep this secret!)

#### 4.2 Get Phone Number ID
1. Go to **"WhatsApp"** → **"API Setup"**
2. Under **"From"**, find your phone number
3. Copy the **"Phone Number ID"** (long numeric string)
4. Also note your **"WhatsApp Business Account ID"**

#### 4.3 Generate Access Token
1. In **"WhatsApp"** → **"API Setup"**
2. Click **"Generate Access Token"**
3. This generates a **temporary 24-hour token** (for initial testing)

#### 4.4 Generate Permanent Access Token (Important!)
1. Go to **"Business Settings"** → **"System Users"**
2. Click **"Add"** → Create new System User:
   - Name: "[Your Clinic] - DrSync API"
   - Role: Admin
3. Click **"Add Assets"**
4. Select **"Apps"** → Choose your app → Give **"Full Control"**
5. Click **"Generate New Token"**
6. Select permissions:
   - ✅ whatsapp_business_management
   - ✅ whatsapp_business_messaging
7. Click **"Generate Token"**
8. **IMPORTANT**: Copy this token immediately and save it securely
   - This token doesn't expire
   - You won't be able to see it again
   - Store it in a password manager or secure document

---

## 4. Connect to DrSync Platform

Now that you have your WhatsApp Business API set up, connect it to DrSync:

### STEP 5: Use DrSync Configuration Wizard

#### 5.1 Access the Wizard
1. Log in to your DrSync dashboard
2. Go to **"Settings"** → **"WhatsApp Configuration"**
3. Click **"Configure WhatsApp Business API"**
4. The setup wizard will guide you through 6 steps

#### 5.2 Enter Your Credentials (Step 1)
1. Enter the credentials you saved:
   - **App ID**: From Step 4.1
   - **App Secret**: From Step 4.1 (keep this private!)
   - **Access Token**: Permanent token from Step 4.4
   - **Phone Number ID**: From Step 4.2
   - **Business Account ID**: From Step 4.2
2. Click **"Test Connection"**
3. DrSync will verify your credentials work correctly
4. Click **"Next"** when verification succeeds ✅

#### 5.3 Configure Webhook (Step 2)
1. DrSync will generate a unique webhook URL for your clinic
2. Copy the webhook URL and verify token (DrSync provides these)
3. Open a new tab and go back to Meta Developer Console
4. In your app, go to **"WhatsApp"** → **"Configuration"**
5. Under **"Webhook"**, click **"Edit"**
6. Paste:
   - **Callback URL**: The URL DrSync provided
   - **Verify Token**: The token DrSync provided
7. Click **"Verify and Save"**
8. Subscribe to webhook fields:
   - ✅ messages
   - ✅ message_status
9. Back in DrSync wizard, click **"Test Webhook"**
10. DrSync will verify Meta can reach the webhook ✅

#### 5.4 Register Phone Number (Step 3)
1. DrSync will test sending messages with your credentials
2. Enter a test phone number (your personal WhatsApp)
3. Click **"Send Test Message"**
4. You should receive a test message on WhatsApp
5. Click **"I received the message"** to proceed ✅

#### 5.5 Configure Business Profile (Step 4)
1. Review your WhatsApp Business profile details
2. DrSync will show what patients will see:
   - Business name
   - Logo
   - Category
   - Description
3. Click **"Save Configuration"**

#### 5.6 Configuration Complete! 🎉
DrSync will:
- ✅ Store your credentials securely (encrypted)
- ✅ Initialize your WhatsApp client
- ✅ Start routing messages to your clinic
- ✅ Enable appointment booking via WhatsApp

---

## 5. Testing Your Setup

### Test 1: Send Message to Patient (from Dashboard)
1. Go to DrSync dashboard → **"Patients"**
2. Select a patient
3. Click **"Send WhatsApp Message"**
4. Type a test message
5. Click **"Send"**
6. Patient should receive message from your clinic's WhatsApp number ✅

### Test 2: Receive Message from Patient
1. Have a team member send a WhatsApp message to your clinic number
2. Message should appear in DrSync dashboard
3. Check **"Messages"** tab to see the conversation ✅

### Test 3: Book Appointment via WhatsApp
1. Send message to your clinic number: "I want to book an appointment"
2. DrSync should respond with available options
3. Follow the booking flow
4. Appointment should appear in DrSync dashboard ✅

### Test 4: Appointment Reminder
1. Create a test appointment for tomorrow
2. Wait for reminder to be sent (24 hours before)
3. Patient should receive appointment reminder ✅

---

## 6. Troubleshooting

### Problem: Messages Not Sending

**Possible Causes:**
- ❌ Access token expired (if using temporary token)
- ❌ Phone number not verified
- ❌ Production access not approved yet

**Solutions:**
1. Use permanent System User token (Step 4.4)
2. Verify phone number again in Meta console
3. Wait for production approval (can take 1-3 days)
4. Check DrSync logs for specific error message

---

### Problem: Messages Not Receiving (Webhook Not Working)

**Possible Causes:**
- ❌ Webhook URL not configured correctly
- ❌ Webhook not subscribed to correct events
- ❌ Firewall blocking Meta's servers

**Solutions:**
1. Verify webhook URL in Meta console matches DrSync URL exactly
2. Check webhook subscriptions (messages, message_status)
3. Test webhook using Meta's "Test" button
4. Contact DrSync support if issue persists

---

### Problem: "Permission Denied" Errors

**Possible Causes:**
- ❌ System User doesn't have correct permissions
- ❌ App not linked to Business Account correctly

**Solutions:**
1. Go to Business Settings → System Users
2. Verify System User has "whatsapp_business_management" permission
3. Regenerate access token with correct permissions
4. Update token in DrSync configuration wizard

---

### Problem: Production Access Denied

**Possible Causes:**
- ❌ Business not verified
- ❌ Use case not clear enough
- ❌ Sample messages violate WhatsApp policies

**Solutions:**
1. Complete business verification first
2. Re-submit with clearer healthcare use case description
3. Ensure sample messages don't contain promotional content
4. WhatsApp Business API is for transactional messages only (appointments, reminders)
5. Contact Meta Business Support if repeatedly denied

---

## 7. Costs and Billing

### WhatsApp Business API Costs (You Pay Meta Directly)

**Conversation-Based Pricing:**
- Meta charges per "conversation" (24-hour window)
- Multiple messages within 24 hours = 1 conversation
- Prices vary by country

**Pakistan Pricing (Approximate):**
- **User-Initiated Conversations**: Free for first 1,000/month
- **Business-Initiated Conversations**: ~PKR 1.50 per conversation
- **Marketing Conversations**: ~PKR 4.50 per conversation

**Example Monthly Cost:**
- 500 patients
- 2 messages per patient per month (appointment + reminder)
- = 1,000 conversations
- First 1,000 user-initiated: Free
- Business-initiated (reminders): 500 × PKR 1.50 = PKR 750/month

**How Meta Bills You:**
- Meta charges your credit/debit card monthly
- View charges in Meta Business Manager → Billing
- Pay-as-you-go (no minimum commitment)

### DrSync Subscription Costs (You Pay DrSync)

**Per-Doctor Pricing:**
- **Pakistan**: Rs. 3,000/month per doctor
- **International**: $20/month per doctor

**What's Included:**
- ✅ DrSync platform access
- ✅ Google Sheets integration
- ✅ WhatsApp integration (you pay Meta separately for messages)
- ✅ Dashboard and analytics
- ✅ Appointment management
- ✅ Patient database
- ✅ Technical support

**Billing:**
- DrSync bills you monthly or yearly (17% discount for yearly)
- Separate from WhatsApp API costs

---

## 8. Support

### DrSync Support

**For DrSync Platform Issues:**
- Email: support@drsync.health
- WhatsApp: +92-XXX-XXXXXXX (DrSync support number)
- Dashboard: Click "Help" → "Contact Support"
- Response Time: Within 24 hours (weekdays)

**Common DrSync Issues:**
- Configuration wizard problems
- Message routing issues
- Dashboard technical issues
- Appointment booking problems

### Meta/WhatsApp Support

**For Meta/WhatsApp Account Issues:**
- Meta Business Support: https://business.facebook.com/help
- WhatsApp Business API: https://developers.facebook.com/docs/whatsapp
- Account verification delays
- Production access approval
- Billing questions
- Phone number verification issues

**How to Contact Meta:**
1. Go to business.facebook.com
2. Click "?" icon (Help)
3. Click "Get Support"
4. Describe your issue
5. Meta support will respond via email

---

## 9. Frequently Asked Questions (FAQ)

### Q: Can I use my existing WhatsApp number?
**A:** Yes, but it must not be registered on regular WhatsApp app. If you're currently using it on WhatsApp, you'll need to migrate to WhatsApp Business API (your chat history will be preserved).

### Q: What happens to my WhatsApp chat history?
**A:** When you migrate to WhatsApp Business API, your chat history is preserved. However, you'll access it through DrSync dashboard, not the WhatsApp app.

### Q: Can I still use WhatsApp app on my phone?
**A:** Not with the same number. The phone number registered for WhatsApp Business API cannot be used with the WhatsApp mobile app. Consider using a different number for personal WhatsApp.

### Q: What if I want to stop using DrSync?
**A:** You own your WhatsApp Business account. You can:
1. Disconnect from DrSync (keeps your WhatsApp account)
2. Connect to another platform
3. Continue using WhatsApp Business API independently
4. Switch back to regular WhatsApp (lose API features)

### Q: How secure are my credentials?
**A:** DrSync encrypts all credentials using AES-256-CBC encryption and stores them securely in our database. We never share your credentials with third parties.

### Q: Can DrSync access my patient data?
**A:** Patient data stays in YOUR Google Sheets (not DrSync servers). WhatsApp messages are logged in DrSync for appointment management, but you control access. You can export or delete data anytime.

### Q: What if my business verification is delayed?
**A:** You can still use test mode while waiting for verification. Test mode allows:
- Up to 5 test phone numbers
- All features work normally
- Perfect for initial setup and testing

### Q: Do I need technical knowledge?
**A:** No! The DrSync configuration wizard guides you through every step. If you can use WhatsApp and email, you can complete the setup. Our support team is also available to help.

### Q: What's the difference between temporary and permanent access tokens?
**A:**
- **Temporary (24-hour)**: Expires after 1 day, good for initial testing only
- **Permanent (System User)**: Never expires, required for production use
- Always use permanent token for your clinic setup

### Q: Can I have multiple phone numbers for my clinic?
**A:** Yes! If you have multiple branches or departments, each can have its own WhatsApp number. Set up each as a separate organization in DrSync.

### Q: What happens if I exceed WhatsApp's rate limits?
**A:** DrSync automatically queues messages to prevent rate limit errors. Your messages will be sent as soon as possible without exceeding Meta's limits (80 messages/second).

### Q: Can patients book appointments without downloading any app?
**A:** Yes! Patients use their regular WhatsApp app (which most people already have). No additional apps needed.

### Q: What languages are supported?
**A:** DrSync supports English and Urdu. Patients can interact in their preferred language. More languages can be added based on your needs.

### Q: Is this HIPAA compliant?
**A:** WhatsApp Business API has encryption, but HIPAA compliance depends on your overall data handling. Consult your legal team about healthcare regulations in your jurisdiction.

---

## 10. Next Steps After Setup

### Recommended Configuration

**1. Create Message Templates** (Optional but Recommended)
- Go to DrSync → Settings → Message Templates
- Create templates for:
  - Appointment confirmations
  - Reminders
  - Post-appointment follow-ups
  - Clinic hours/location info

**2. Add Your Staff**
- Go to DrSync → Settings → Users
- Invite receptionists and doctors
- Assign appropriate roles (Admin, Staff, Doctor)

**3. Configure Appointment Slots**
- Go to DrSync → Settings → Schedule
- Set doctor availability
- Set appointment duration
- Set buffer time between appointments

**4. Train Your Team**
- Show staff how to use DrSync dashboard
- Explain how WhatsApp booking works
- Practice with test appointments
- Review message history and analytics

**5. Inform Your Patients**
- Update your website with WhatsApp booking info
- Post on social media about new WhatsApp booking
- Include WhatsApp number on physical materials
- Train front desk to tell patients about WhatsApp option

---

## 11. Best Practices

### Message Management
- ✅ Respond to patient messages within 24 hours
- ✅ Use professional, friendly language
- ✅ Keep messages concise and clear
- ❌ Don't send promotional/marketing messages (violates WhatsApp policies)
- ❌ Don't send spam or unsolicited messages

### Data Privacy
- ✅ Only discuss appointment details via WhatsApp
- ✅ Avoid sharing detailed medical information
- ✅ Use secure channels for sensitive discussions
- ✅ Inform patients about data handling practices

### Appointment Booking
- ✅ Confirm appointments within 1 hour of booking
- ✅ Send reminders 24 hours before appointment
- ✅ Allow easy rescheduling/cancellation
- ✅ Follow up after appointments

### Monitoring
- ✅ Check DrSync dashboard daily
- ✅ Monitor message delivery rates
- ✅ Review patient feedback
- ✅ Track appointment no-show rates
- ✅ Analyze peak messaging times

---

## 12. Appendix: Credential Checklist

Use this checklist to ensure you have all required information:

### Meta Business Account
- [ ] Meta Business Account created
- [ ] Business verification completed
- [ ] Business name: ______________________
- [ ] Verification status: [ ] Pending [ ] Verified

### WhatsApp Business Account
- [ ] WhatsApp Business Account created
- [ ] Phone number verified: +___ - ___ - ___________
- [ ] Display name: ______________________
- [ ] Logo uploaded
- [ ] Business profile completed

### Developer App
- [ ] App created
- [ ] App name: ______________________
- [ ] App ID: ______________________
- [ ] App Secret: ______________________ (keep secret!)
- [ ] Production access: [ ] Pending [ ] Approved

### API Credentials
- [ ] Phone Number ID: ______________________
- [ ] Business Account ID: ______________________
- [ ] System User created
- [ ] Permanent Access Token: ______________________ (keep secret!)

### DrSync Configuration
- [ ] Credentials entered in DrSync wizard
- [ ] Connection test successful
- [ ] Webhook configured
- [ ] Test message sent successfully
- [ ] Setup completed

---

## Document Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Oct 13, 2025 | Initial version for client onboarding |

---

**Need Help?**  
Contact DrSync Support: support@drsync.health  
WhatsApp: +92-XXX-XXXXXXX

---

**END OF GUIDE**
