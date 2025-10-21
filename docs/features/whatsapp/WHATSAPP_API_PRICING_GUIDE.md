# WhatsApp Business API Pricing Guide for DrSync Clients

**Document Version:** 1.0  
**Last Updated:** October 13, 2025  
**Audience:** Healthcare organizations using DrSync  

---

## 📋 Table of Contents

1. [Overview](#1-overview)
2. [How Meta Charges Work](#2-how-meta-charges-work)
3. [Pakistan Pricing](#3-pakistan-pricing-pkr)
4. [International Pricing](#4-international-pricing-usd)
5. [Cost Calculator Examples](#5-cost-calculator-examples)
6. [Cost Optimization Tips](#6-cost-optimization-tips)
7. [What DrSync Charges](#7-what-drsync-charges)
8. [Frequently Asked Questions](#8-frequently-asked-questions)

---

## 1. Overview

### What You're Paying For

When you use WhatsApp Business API with DrSync, you pay **two separate parties**:

```
┌────────────────────────────────────────────────┐
│  Meta (Facebook/WhatsApp)                      │
│  - WhatsApp API conversation charges           │
│  - Charged per "conversation" (24-hour window) │
│  - You pay Meta directly                       │
└────────────────────────────────────────────────┘
              +
┌────────────────────────────────────────────────┐
│  DrSync                                        │
│  - Platform subscription                       │
│  - Per-doctor pricing                          │
│  - Rs. 3,000/month or $20/month per doctor    │
└────────────────────────────────────────────────┘
```

### Important Notes

- ✅ **You pay Meta directly** - not through DrSync
- ✅ **Meta bills your credit card** monthly
- ✅ **DrSync subscription is separate** from WhatsApp charges
- ✅ **No markup** - DrSync doesn't charge extra for WhatsApp messages
- ✅ **You control your WhatsApp account** - can disconnect anytime

---

## 2. How Meta Charges Work

### Conversation-Based Pricing (Not Per Message!)

Meta charges for **"conversations"** not individual messages:

```
┌─────────────────────────────────────────────────┐
│  What is a "Conversation"?                      │
│                                                 │
│  A 24-hour window starting when:                │
│  • You send a message to a patient (business)  │
│  • Patient sends a message to you (user)       │
│                                                 │
│  Multiple messages within 24 hours = 1 charge  │
└─────────────────────────────────────────────────┘
```

### Example: Appointment Booking Flow

```
Day 1, 10:00 AM - Patient: "I want to book appointment"
Day 1, 10:01 AM - You: "Available times: 2pm, 4pm, 6pm"
Day 1, 10:05 AM - Patient: "I'll take 2pm"
Day 1, 10:06 AM - You: "Confirmed! See you at 2pm"
Day 1, 11:00 AM - You: "Reminder: Bring your ID"

ALL of the above = 1 conversation charge
```

### Conversation Types

Meta has **4 types** of conversations with different prices:

#### 1. **User-Initiated Conversations** (Cheapest/Free tier available)
- Patient messages you first
- Examples: "I want to book", "Can I reschedule?", "What are your hours?"
- **First 1,000/month FREE** (for most countries including Pakistan)
- After 1,000: Very low cost

#### 2. **Business-Initiated (Utility) Conversations**
- You message patient first with transactional info
- Examples: Appointment reminders, confirmations, booking receipts
- Most common for healthcare
- Moderate cost

#### 3. **Business-Initiated (Authentication) Conversations**
- One-time passwords (OTP), verification codes
- Example: "Your appointment code is 1234"
- Lower cost than utility

#### 4. **Business-Initiated (Marketing) Conversations**
- Promotional messages, offers, announcements
- Example: "20% off dental checkups this month"
- **Highest cost + requires opt-in**
- ⚠️ **Not recommended for healthcare**

---

## 3. Pakistan Pricing (PKR)

### Current WhatsApp Business API Rates for Pakistan

**Effective:** October 2025 (rates subject to change by Meta)

| Conversation Type | Price (PKR) | Notes |
|-------------------|-------------|-------|
| **User-Initiated** | **FREE** (first 1,000/month) | Patient messages you first |
| User-Initiated (after 1,000) | PKR 1.50 | Very low cost |
| **Business-Initiated (Utility)** | **PKR 3.50** | Your reminders/confirmations |
| Business-Initiated (Authentication) | PKR 2.00 | OTP/verification codes |
| Business-Initiated (Marketing) | PKR 10.50 | ⚠️ Avoid for healthcare |

### Free Tier Details

```
Every month you get:
✅ First 1,000 user-initiated conversations: FREE
✅ Resets on 1st of each month
✅ Applies automatically (no signup needed)

Example:
Month 1: 1,500 user-initiated conversations
  - First 1,000: FREE
  - Next 500: 500 × PKR 1.50 = PKR 750
  Total: PKR 750
```

---

## 4. International Pricing (USD)

### For International Clients (Non-Pakistan)

**Note:** Prices vary by country. Below are examples for major markets.

#### United States (USD)
| Conversation Type | Price (USD) |
|-------------------|-------------|
| User-Initiated (first 1,000) | **FREE** |
| User-Initiated (after 1,000) | $0.005 |
| Business-Initiated (Utility) | $0.010 |
| Business-Initiated (Authentication) | $0.007 |
| Business-Initiated (Marketing) | $0.030 |

#### United Kingdom (GBP → USD equivalent)
| Conversation Type | Price (USD) |
|-------------------|-------------|
| User-Initiated (first 1,000) | **FREE** |
| User-Initiated (after 1,000) | $0.010 |
| Business-Initiated (Utility) | $0.014 |
| Business-Initiated (Authentication) | $0.009 |
| Business-Initiated (Marketing) | $0.044 |

#### India (INR → USD equivalent)
| Conversation Type | Price (USD) |
|-------------------|-------------|
| User-Initiated (first 1,000) | **FREE** |
| User-Initiated (after 1,000) | $0.004 |
| Business-Initiated (Utility) | $0.004 |
| Business-Initiated (Authentication) | $0.002 |
| Business-Initiated (Marketing) | $0.012 |

**Check your country's rates:** https://developers.facebook.com/docs/whatsapp/pricing

---

## 5. Cost Calculator Examples

### Scenario 1: Small Clinic (Pakistan)

**Clinic Profile:**
- 1 doctor
- 200 patients/month
- Each patient: 1 booking + 1 reminder

**Message Breakdown:**
```
Patient Activity:
├─ 200 patients book appointments (user-initiated)
│  First 200 of free 1,000 tier: FREE
│
└─ 200 appointment reminders (business-initiated utility)
   200 × PKR 3.50 = PKR 700

Monthly WhatsApp Cost: PKR 700 (~$2.50 USD)
```

**Total Monthly Costs:**
- Meta (WhatsApp): PKR 700
- DrSync subscription: PKR 3,000 (1 doctor)
- **Grand Total: PKR 3,700/month** (~$13 USD)

---

### Scenario 2: Medium Clinic (Pakistan)

**Clinic Profile:**
- 3 doctors
- 800 patients/month
- Each patient: 1 booking + 1 reminder + 1 follow-up

**Message Breakdown:**
```
Patient Activity:
├─ 800 patients book appointments (user-initiated)
│  First 800 of free 1,000 tier: FREE
│
├─ 800 appointment reminders (business-initiated utility)
│  800 × PKR 3.50 = PKR 2,800
│
└─ 800 follow-up messages (business-initiated utility)
   800 × PKR 3.50 = PKR 2,800

Monthly WhatsApp Cost: PKR 5,600 (~$20 USD)
```

**Total Monthly Costs:**
- Meta (WhatsApp): PKR 5,600
- DrSync subscription: PKR 9,000 (3 doctors × PKR 3,000)
- **Grand Total: PKR 14,600/month** (~$52 USD)

---

### Scenario 3: Large Clinic (Pakistan)

**Clinic Profile:**
- 5 doctors
- 2,000 patients/month
- Each patient: 1 booking + 1 reminder

**Message Breakdown:**
```
Patient Activity:
├─ 2,000 patients book appointments (user-initiated)
│  First 1,000: FREE
│  Next 1,000: 1,000 × PKR 1.50 = PKR 1,500
│
└─ 2,000 appointment reminders (business-initiated utility)
   2,000 × PKR 3.50 = PKR 7,000

Monthly WhatsApp Cost: PKR 8,500 (~$30 USD)
```

**Total Monthly Costs:**
- Meta (WhatsApp): PKR 8,500
- DrSync subscription: PKR 15,000 (5 doctors × PKR 3,000)
- **Grand Total: PKR 23,500/month** (~$84 USD)

---

### Scenario 4: Hospital (Pakistan)

**Hospital Profile:**
- 15 doctors
- 5,000 patients/month
- Each patient: 1 booking + 1 reminder + 1 confirmation

**Message Breakdown:**
```
Patient Activity:
├─ 5,000 patients book appointments (user-initiated)
│  First 1,000: FREE
│  Next 4,000: 4,000 × PKR 1.50 = PKR 6,000
│
├─ 5,000 appointment confirmations (business-initiated utility)
│  5,000 × PKR 3.50 = PKR 17,500
│
└─ 5,000 appointment reminders (business-initiated utility)
   5,000 × PKR 3.50 = PKR 17,500

Monthly WhatsApp Cost: PKR 41,000 (~$146 USD)
```

**Total Monthly Costs:**
- Meta (WhatsApp): PKR 41,000
- DrSync subscription: PKR 45,000 (15 doctors × PKR 3,000)
- **Grand Total: PKR 86,000/month** (~$307 USD)

---

## 6. Cost Optimization Tips

### Maximize Free Tier Usage

**Strategy:** Encourage patients to message you first

```
✅ GOOD (User-initiated - FREE tier):
   Patient: "I want to book appointment"
   You: "Available slots: 2pm, 4pm"

❌ EXPENSIVE (Business-initiated - costs PKR 3.50):
   You: "Hi! Would you like to book an appointment?"
   Patient: "Yes, please"
```

**How to Encourage User-Initiated:**
- Put WhatsApp number on website/posters
- Train staff to say: "Message us on WhatsApp to book"
- Add "Book via WhatsApp" buttons on social media
- Include WhatsApp number in email signatures

---

### Consolidate Messages

**Strategy:** Send multiple pieces of info in one message

```
✅ GOOD (1 conversation):
   "Your appointment is confirmed for Oct 15, 2pm with Dr. Ahmed.
   Location: City Clinic, 123 Main St.
   Please bring your ID and insurance card.
   Reply CONFIRM to acknowledge."

❌ EXPENSIVE (3 conversations if sent separately):
   Message 1: "Appointment confirmed Oct 15, 2pm"
   [24 hours pass]
   Message 2: "Don't forget to bring ID"
   [24 hours pass]
   Message 3: "Location is 123 Main St"
```

---

### Smart Reminder Timing

**Strategy:** Send reminders within patient's reply window

```
✅ GOOD (1 conversation total):
   10:00 AM - Patient: "I want to book"
   10:05 AM - You: "Confirmed for tomorrow 2pm"
   11:00 AM - You: "Reminder: Bring ID"
   [All within 24 hours = 1 charge]

❌ EXPENSIVE (2 conversations):
   Day 1, 10:00 AM - Patient: "I want to book"
   Day 1, 10:05 AM - You: "Confirmed for Oct 15"
   [24 hours pass]
   Day 2, 10:00 AM - You: "Reminder: Appointment tomorrow"
   [Separate conversation = extra charge]
```

---

### Avoid Marketing Messages

**Strategy:** Stick to transactional messages only

```
✅ FREE/CHEAP:
   "Your appointment is on Oct 15 at 2pm"
   "Reminder: Appointment in 24 hours"
   "Your appointment is confirmed"

❌ EXPENSIVE (PKR 10.50 each):
   "Special offer: 20% off dental checkups!"
   "New service available: Telemedicine consults"
   "Refer a friend and get discount"
```

---

### Use Templates for Common Messages

**Strategy:** Pre-approved message templates = faster + cheaper

```
DrSync helps you create templates for:
├─ Appointment confirmations
├─ Reminders (24 hours before)
├─ Rescheduling notifications
├─ Cancellation confirmations
└─ Post-appointment follow-ups

Benefits:
✅ Faster sending
✅ More professional
✅ Consistent messaging
✅ Lower failure rates
```

---

## 7. What DrSync Charges

### DrSync Subscription Pricing

DrSync charges **separately** from Meta/WhatsApp charges:

#### Pakistan Pricing
```
Per Doctor: Rs. 3,000/month
  or
Per Doctor: Rs. 29,880/year (17% discount = save Rs. 6,120/year)

Example:
1 doctor:  Rs. 3,000/month
3 doctors: Rs. 9,000/month
5 doctors: Rs. 15,000/month
```

#### International Pricing
```
Per Doctor: $20/month (USD)
  or
Per Doctor: $199/year (17% discount = save $41/year)

Example:
1 doctor:  $20/month
3 doctors: $60/month
5 doctors: $100/month
```

### What's Included in DrSync Subscription

✅ **Platform Access**
- Web dashboard (desktop + mobile)
- Progressive Web App (PWA)
- Unlimited staff accounts

✅ **WhatsApp Integration**
- Multi-client message routing
- Automated appointment booking
- Smart reminders
- Message templates
- (You still pay Meta separately for messages)

✅ **Google Sheets Integration**
- Your data stays in YOUR Google Sheets
- Real-time sync
- Automatic backups

✅ **Appointment Management**
- Unlimited appointments
- Calendar management
- Conflict resolution
- Waitlist management

✅ **Patient Management**
- Unlimited patient records
- Patient history tracking
- Family member support

✅ **Analytics & Reports**
- Appointment analytics
- Patient engagement metrics
- Revenue tracking
- Monthly reports

✅ **Technical Support**
- Email support
- Support ticket system
- Setup assistance
- Troubleshooting help

---

## 8. Frequently Asked Questions

### Q: How does Meta bill me?

**A:** Meta charges your credit/debit card automatically each month. You can view charges in Meta Business Manager → Billing section.

**Billing Cycle:**
- Charges calculated daily
- Billed monthly (on 1st of each month)
- Pay-as-you-go (no minimum commitment)
- Credit card auto-charged

---

### Q: Can I set a spending limit?

**A:** Yes! In Meta Business Manager:
1. Go to Business Settings → Payments
2. Set a monthly spending limit
3. When limit reached, WhatsApp messaging pauses
4. Resets on 1st of next month

**Recommended Limits:**
- Small clinic (200 patients): Set PKR 2,000-3,000 limit
- Medium clinic (800 patients): Set PKR 8,000-10,000 limit
- Large clinic (2,000 patients): Set PKR 15,000-20,000 limit

---

### Q: What if I exceed my free tier?

**A:** No problem! You'll automatically be charged for additional conversations at the rates shown above. There's no penalty or extra fee.

**Example:**
```
Month 1: 1,200 user-initiated conversations
  - First 1,000: FREE
  - Next 200: 200 × PKR 1.50 = PKR 300
  Total WhatsApp charge: PKR 300

Month 2: 800 user-initiated conversations
  - All 800: FREE (under 1,000 limit)
  Total WhatsApp charge: PKR 0
```

---

### Q: Are there any hidden charges?

**A:** No hidden charges! You only pay:
1. Meta's conversation fees (shown above)
2. DrSync subscription (per doctor)

**You DON'T pay extra for:**
- ❌ Setup fees
- ❌ Per-message fees
- ❌ Bandwidth or data transfer
- ❌ Support or maintenance
- ❌ Feature updates

---

### Q: Do I pay for incoming messages?

**A:** Yes, but they count as "user-initiated" conversations which are FREE for the first 1,000/month. After that, they're very cheap (PKR 1.50).

**Patient sends you message = User-initiated conversation**
- First 1,000/month: FREE
- After 1,000: PKR 1.50 each

---

### Q: What happens if I send 10 messages in one conversation?

**A:** You still pay for just 1 conversation! All messages within a 24-hour window = 1 charge.

**Example:**
```
Patient messages you → Conversation starts (1 charge)
Within next 24 hours:
├─ You send appointment options
├─ Patient chooses time
├─ You confirm booking
├─ You send location details
├─ You send reminder about documents
├─ Patient asks question
├─ You answer
└─ All of this = STILL 1 CONVERSATION CHARGE

After 24 hours pass:
└─ Next message = New conversation (new charge)
```

---

### Q: Can I reduce costs if I have a small budget?

**A:** Yes! Follow these strategies:

**Cost Reduction Strategies:**
1. **Maximize free tier** - Encourage patients to message first
2. **Consolidate messages** - Send all info in one message
3. **Avoid marketing messages** - Stick to appointments only
4. **Smart reminder timing** - Send within 24-hour windows
5. **Use manual confirmations** - For very small clinics, manually confirm instead of auto-reminders

**Ultra-Budget Example (50 patients/month):**
```
Strategy:
- Patients message first (user-initiated = FREE)
- You only send 1 reminder per patient (PKR 3.50 each)

Cost:
50 patients × PKR 3.50 = PKR 175/month (~$0.60 USD)

Total with DrSync:
PKR 175 (WhatsApp) + PKR 3,000 (DrSync) = PKR 3,175/month
```

---

### Q: How do prices compare to SMS?

**A:** WhatsApp is generally cheaper than SMS in Pakistan:

| Method | Cost per Message (PKR) | Notes |
|--------|------------------------|-------|
| **WhatsApp (user-initiated)** | **FREE (first 1,000)** | Patient messages you |
| **WhatsApp (your reminder)** | **PKR 3.50** | You message patient |
| SMS (via SMS gateway) | PKR 0.50 - 2.00 | Per SMS, regardless of who initiates |
| SMS (via mobile) | PKR 1.00 - 2.00 | Per SMS |

**Why WhatsApp is Better:**
- ✅ Richer content (images, buttons, links)
- ✅ Delivery confirmation
- ✅ Read receipts
- ✅ Interactive responses
- ✅ Patients prefer WhatsApp (96% usage in Pakistan)
- ✅ Free tier for incoming messages

---

### Q: What if WhatsApp raises prices?

**A:** Meta occasionally updates pricing (usually once a year). If prices increase:

**What Happens:**
1. Meta announces price changes 30 days in advance
2. You receive email notification
3. New prices take effect on specified date
4. You can discontinue if not acceptable

**DrSync's Role:**
- We'll notify you of any Meta price changes
- Update our documentation
- Help you optimize for new pricing
- No change to DrSync subscription pricing

---

### Q: Can I switch to a different pricing plan?

**A:** WhatsApp Business API has one pricing structure (no "plans"). However:

**You Control:**
- ✅ How many messages you send (controls cost)
- ✅ Message types (user-initiated vs business-initiated)
- ✅ When you send messages (24-hour windows)
- ✅ Spending limits in Meta billing

**Fixed by Meta:**
- ❌ Per-conversation rates (standard for all users)
- ❌ Free tier (1,000 user-initiated/month)

---

### Q: Do I pay for failed or undelivered messages?

**A:** **No!** You only pay for successfully delivered conversations.

**Free (No Charge):**
- ❌ Failed messages (invalid number, blocked user)
- ❌ Undelivered messages (user's WhatsApp not working)
- ❌ Template messages rejected by WhatsApp

**Charged:**
- ✅ Successfully delivered messages
- ✅ Messages marked as "sent" or "delivered"

---

### Q: Is there a cheaper way to use WhatsApp?

**A:** WhatsApp Business API is the ONLY way to:
- Automate appointment booking
- Send reminders programmatically
- Integrate with DrSync or any system
- Use multiple staff accounts
- Send to unlimited patients

**Alternatives (NOT suitable for DrSync):**
- ❌ **WhatsApp Business App** (free but manual, 1 phone only, no API)
- ❌ **Regular WhatsApp** (free but violates terms for business use)

**Verdict:** WhatsApp Business API is the only professional option for clinic automation.

---

## 9. Billing Examples

### View Your Charges in Meta Business Manager

**Step-by-Step:**
1. Log in to business.facebook.com
2. Go to **Business Settings** → **Payments**
3. Click **Transaction History**
4. View monthly WhatsApp charges

**What You'll See:**
```
Date       | Description                    | Amount
-----------|--------------------------------|----------
Oct 1      | WhatsApp Business Platform     | PKR 5,600
           | - 800 utility conversations    |
           | - 1,200 user conversations     |
           |   (1,000 free + 200 paid)      |
-----------|--------------------------------|----------
Total      |                                | PKR 5,600
```

---

## 10. Summary Cheat Sheet

### Quick Reference: Pakistan Pricing

| What | Cost |
|------|------|
| **Patient messages you first** | **FREE** (first 1,000/month) |
| Patient messages you (after 1,000) | PKR 1.50 per conversation |
| **You send reminder/confirmation** | **PKR 3.50** per conversation |
| You send verification code | PKR 2.00 per conversation |
| Marketing message | PKR 10.50 (avoid!) |
| **DrSync subscription (per doctor)** | **PKR 3,000/month** |

### Typical Monthly Cost Examples (Pakistan)

| Clinic Size | Patients/Month | WhatsApp Cost | DrSync Cost | Total |
|-------------|----------------|---------------|-------------|-------|
| Small (1 doc) | 200 | PKR 700 | PKR 3,000 | PKR 3,700 |
| Medium (3 docs) | 800 | PKR 5,600 | PKR 9,000 | PKR 14,600 |
| Large (5 docs) | 2,000 | PKR 8,500 | PKR 15,000 | PKR 23,500 |
| Hospital (15 docs) | 5,000 | PKR 41,000 | PKR 45,000 | PKR 86,000 |

---

## Contact & Support

**Questions about WhatsApp pricing?**
- Email: billing@drsync.health
- Support: Dashboard → Help → Contact Support

**Questions about Meta charges?**
- Meta Business Support: https://business.facebook.com/help
- Billing questions: Meta Business Manager → Payments → Get Support

---

**Document Version History:**

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Oct 13, 2025 | Initial pricing guide with Pakistan focus |

---

**Disclaimer:** Pricing information is accurate as of October 2025. Meta may update rates periodically. Always check Meta's official pricing page for the most current rates: https://developers.facebook.com/docs/whatsapp/pricing

---

**END OF PRICING GUIDE**
