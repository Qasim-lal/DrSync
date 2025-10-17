# TASK-040 Updates from Phase 3 Readiness Analysis

**Date:** October 16, 2025  
**Status:** 📝 APPROVED UPDATES  
**Source:** PHASE-3_READINESS_ANALYSIS.md - Final Decisions

---

## 🎯 Updates Summary

Based on final decisions from Phase 3 Readiness Analysis:
1. ✅ **SSE Scope:** Complete (add real-time message processing events)
2. ✅ **Language Override:** Auto-switch + Main Menu Toggle
3. ✅ **Performance Targets:** Clarify component-level breakdown

---

## UPDATE #1: Server-Sent Events (SSE) for Message Processing

### Location: Add new Section 8 after Section 7

#### 8. Real-Time Updates via SSE
**Objective:** Emit real-time events for message processing lifecycle

**Sub-tasks:**
- **8.1** SSE Event Emitter Setup
  - Create `MessageEventsService` class
  - Initialize EventEmitter for message lifecycle
  - Define event payload schemas
  - Implement organization-scoped event filtering
  
- **8.2** Message Processing Events
  - Emit `message:received` when webhook receives message
  - Emit `message:processing` when queue worker starts processing
  - Emit `message:responded` when response sent to WhatsApp
  - Emit `message:failed` on processing error
  
- **8.3** SSE API Endpoint
  - Create `GET /api/events/messages/:organizationId/stream` endpoint
  - Implement SSE headers and keep-alive (30s heartbeat)
  - Filter events by organization ID (multi-tenant isolation)
  - Add authentication (JWT required)
  
**Event Payload Schema:**
```typescript
interface MessageEvent {
  eventType: 'message:received' | 'message:processing' | 'message:responded' | 'message:failed';
  organizationId: string;
  phoneNumber: string;
  messageId: string;
  timestamp: string; // ISO 8601
  data: {
    intent?: string;
    language?: 'en' | 'ur';
    processingTimeMs?: number;
    error?: string;
  };
}
```

**Integration Points:**
- **Webhook Controller:** Emit `message:received` immediately after validation
- **Queue Worker:** Emit `message:processing` at worker start
- **Message Processor:** Emit `message:responded` after successful send
- **Error Handler:** Emit `message:failed` on processing error

**Deliverables:**
- ✅ MessageEventsService class
- ✅ 4 event types (received, processing, responded, failed)
- ✅ SSE API endpoint
- ✅ Organization-scoped filtering

**Testing:**
- Test SSE connection establishment
- Test event emission on message receive
- Test event filtering by organization
- Test SSE heartbeat mechanism
- Test multiple concurrent SSE clients
- Test reconnection handling

**Performance Requirements:**
- Event emission: <50ms overhead
- SSE connection limit: 100 concurrent clients per server
- Heartbeat interval: 30 seconds

---

## UPDATE #2: Language Menu Toggle (Main Menu)

### Location: Update Section 2.4 and Section 4.3

#### Section 2.4 Enhancement: Bilingual Message Templates

**ADD to existing sub-task:**
- **2.4.4** Main Menu with Language Toggle
  - Add "🌐 Change Language / زبان تبدیل کریں" to main menu
  - Map menu option 0 or command "LANG" to language switch
  - Show bilingual menu in both English and Urdu
  - Persist language change to Redis + Patient profile

**Main Menu Template (Bilingual):**
```
📋 *Main Menu / مین مینو*

1️⃣ Book Appointment / اپوائنٹمنٹ بک کریں
2️⃣ My Appointments / میری اپوائنٹمنٹس  
3️⃣ Cancel/Reschedule / منسوخ/دوبارہ شیڈول
4️⃣ Clinic Info / کلینک کی معلومات
🌐 Change Language / زبان تبدیل کریں

Reply with a number or command.
نمبر یا کمانڈ کے ساتھ جواب دیں۔
```

**Language Toggle Flow:**
1. User sends "🌐" or "0" or "LANG" or "زبان تبدیل کریں"
2. System detects `SWITCH_LANGUAGE` intent
3. System shows language selection menu:
   ```
   Select your preferred language:
   1. English 🇬🇧
   2. اردو 🇵🇰
   
   براہ کرم اپنی زبان منتخب کریں:
   1. English 🇬🇧  
   2. اردو 🇵🇰
   ```
4. User selects 1 or 2
5. System updates:
   - Redis: `conversation:language:{orgId}:{phone}` (TTL: 30 min)
   - PostgreSQL: `Patient.preferredLanguage` (permanent)
6. System confirms: "✅ Language changed to English" / "✅ زبان اردو میں تبدیل ہو گئی"

#### Section 4.4 Enhancement: Language Switch Handler

**UPDATE existing sub-task:**
- **4.4.3** Language Switch Handler (Enhanced)
  - Handle menu option 0/🌐 selection
  - Handle text commands ("LANG", "زبان تبدیل کریں")
  - Show language selection menu (bilingual)
  - Parse user selection (1/2)
  - Update Redis conversation cache (30 min TTL)
  - Update PostgreSQL Patient record (permanent)
  - Send confirmation message in new language
  - Return to main menu

**Handler Implementation:**
```typescript
async function handleLanguageSwitch(context: IntentHandlerContext): Promise<IntentHandlerResult> {
  const { conversationState, organizationId, phoneNumber } = context;
  
  // Show language selection menu
  const menu = `
Select your preferred language:
1. English 🇬🇧
2. اردو 🇵🇰

براہ کرم اپنی زبان منتخب کریں:
1. English 🇬🇧  
2. اردو 🇵🇰
  `;
  
  // Update state to await language selection
  conversationState.step = 'awaiting_language_selection';
  
  return {
    message: menu,
    nextStep: 'awaiting_language_selection'
  };
}

async function handleLanguageSelection(context: IntentHandlerContext, selection: string): Promise<IntentHandlerResult> {
  const language = selection === '1' ? 'en' : 'ur';
  
  // Update Redis (session)
  await redis.setex(
    `conversation:language:${context.organizationId}:${context.phoneNumber}`,
    1800, // 30 minutes
    JSON.stringify({ language, updatedAt: new Date().toISOString() })
  );
  
  // Update PostgreSQL (permanent)
  await prisma.patient.update({
    where: { phoneNumber: context.phoneNumber, organizationId: context.organizationId },
    data: { preferredLanguage: language }
  });
  
  // Confirmation message
  const confirmation = language === 'en' 
    ? '✅ Language changed to English'
    : '✅ زبان اردو میں تبدیل ہو گئی';
  
  // Show main menu in new language
  const mainMenu = await getMainMenu(language);
  
  return {
    message: `${confirmation}\n\n${mainMenu}`,
    nextStep: 'idle'
  };
}
```

**Testing:**
- Test language toggle from main menu (option 0/🌐)
- Test language command ("LANG", "زبان تبدیل کریں")
- Test Redis cache update (30 min TTL)
- Test PostgreSQL update (Patient.preferredLanguage)
- Test confirmation message in new language
- Test persistence across sessions

---

## UPDATE #3: Language Auto-Switch Behavior

### Location: Update Section 2.2

#### Section 2.2 Enhancement: Organization-Level Language Preference

**REPLACE existing behavior with:**

**Language Detection Priority (3-Step Process):**

**Step 1: Check Organization Default**
- Query `NotificationSettings.language` field
- If set → Use as default language
- Cache in Redis (TTL: 30 min)

**Step 2: Auto-Detect from Message**
- Analyze message text using Unicode detection (Section 2.1)
- If detected language ≠ org default → **Auto-switch to detected language**
- Store override in Redis (session-level, TTL: 30 min)
- Store override in Patient profile (permanent)

**Step 3: Fallback to Conversation History**
- If org default not set AND detection inconclusive → Use last 5 messages
- Calculate language distribution from history
- Set detected language as default

**Auto-Switch Logic (NEW):**
```typescript
async function detectLanguageWithAutoSwitch(
  messageText: string,
  organizationId: string,
  phoneNumber: string
): Promise<LanguageDetectionResult> {
  // Step 1: Check org default
  const orgSettings = await getOrgNotificationSettings(organizationId);
  const orgLanguage = orgSettings?.language || null;
  
  // Step 2: Detect from current message
  const detected = await detectLanguageFromText(messageText);
  
  // Auto-switch logic
  if (orgLanguage && detected.language !== orgLanguage && detected.confidence > 0.8) {
    // Patient is using different language than org default
    // AUTO-SWITCH: Set patient's preference to detected language
    await setPatientLanguage(organizationId, phoneNumber, detected.language);
    
    return {
      language: detected.language, // Use detected, not org default
      confidence: detected.confidence,
      method: 'auto_switched',
      requiresConfirmation: false
    };
  }
  
  // Use org default if no strong detection
  if (orgLanguage) {
    return {
      language: orgLanguage,
      confidence: 1.0,
      method: 'org_default',
      requiresConfirmation: false
    };
  }
  
  // Fallback to detection
  return detected;
}
```

**Rationale:**
- **Seamless UX:** Automatically switch to patient's preferred language
- **User Control:** Patient can override via main menu toggle (🌐)
- **Persistence:** Changes persist across sessions via Patient profile
- **Flexibility:** Works even if org has different default language

**Example Scenario:**
```
Org default: English
Patient sends: "السلام علیکم" (Urdu greeting)

System:
1. Detects Urdu (confidence 0.95)
2. Auto-switches conversation to Urdu
3. Updates Patient.preferredLanguage = 'ur'
4. Responds in Urdu: "وعلیکم السلام! میں آپ کی مدد کیسے کر سکتا ہوں؟"
5. Shows bilingual main menu (patient can switch back via 🌐)
```

**Testing:**
- Test auto-switch when patient uses non-default language
- Test org default usage when detection inconclusive
- Test patient preference persistence
- Test menu toggle overrides auto-switch

---

## UPDATE #4: Performance Targets Clarification

### Location: Update Section 1.2 and Section 7.3

#### Performance Breakdown (SRS PERF-001 Compliance)

**CLARIFY that 3 seconds is total end-to-end, not per-component:**

**Component-Level Targets:**
- **Message Processing (TASK-040):** <1 second
  - Language detection: <100ms
  - Intent classification: <200ms
  - Handler execution: <500ms
  - Response generation: <200ms
  - Total: <1000ms
  
- **Booking Transaction (TASK-041):** <2 seconds
  - Google Sheets read: <500ms
  - Slot availability check: <300ms
  - PostgreSQL write: <200ms
  - Google Sheets write: <800ms
  - Confirmation message: <200ms
  - Total: <2000ms
  
- **Total End-to-End (SRS PERF-001):** <3 seconds ✅

**Update Section 1.2: Queue Worker Implementation**
- **REPLACE:** "performance monitoring (<3 second requirement)"
- **WITH:** "performance monitoring (<1 second target for TASK-040)"

**Update Section 7.3: Performance Monitoring**
- **ADD:** Component-level timing breakdown
- **LOG WARNING IF:**
  - Language detection >100ms
  - Intent classification >200ms
  - Handler execution >500ms
  - Total processing >1000ms
  
**Monitoring Metrics:**
```typescript
{
  "message_id": "msg_123",
  "timings": {
    "language_detection_ms": 85,
    "intent_classification_ms": 120,
    "handler_execution_ms": 450,
    "response_generation_ms": 180,
    "total_processing_ms": 835  // <1000ms ✅
  },
  "performance_status": "OK" // or "WARN" if >1000ms
}
```

**Success Criteria Update:**
- **TASK-040 Performance:** <1 second per message (was: <3 seconds)
- **End-to-End Performance:** <3 seconds (TASK-040 + TASK-041 combined)

---

## UPDATE #5: Intent Types Update

### Location: Update Section 3

**ADD to Intent Types list (after #11):**
12. `LANGUAGE_MENU_SELECT` - User selected language toggle option (0/🌐)
13. `UNKNOWN` - Unrecognized intent (moved from #12 to #13)

**Update menu number mapping in Section 3.3:**
- **REPLACE:** "Handle menu number selections (1-5)"
- **WITH:** "Handle menu number selections (0-4, 🌐)"

**Menu Mapping:**
- 0 or 🌐 → `LANGUAGE_MENU_SELECT`
- 1 → `BOOK_APPOINTMENT`
- 2 → `VIEW_APPOINTMENTS`
- 3 → `CANCEL_APPOINTMENT` or `RESCHEDULE_APPOINTMENT`
- 4 → `GET_CLINIC_INFO`

---

## 📋 Summary of Changes

| Section | Change | Type |
|---------|--------|------|
| **New Section 8** | Add SSE events for message processing | NEW |
| **Section 2.4** | Add language menu toggle to main menu | ENHANCEMENT |
| **Section 2.2** | Change to auto-switch behavior | BEHAVIORAL CHANGE |
| **Section 4.4** | Enhance language switch handler | ENHANCEMENT |
| **Section 1.2** | Update performance target to <1s | CLARIFICATION |
| **Section 7.3** | Add component-level timing breakdown | CLARIFICATION |
| **Section 3** | Add LANGUAGE_MENU_SELECT intent | ENHANCEMENT |

---

## ✅ Implementation Checklist

### Before Starting TASK-040:
- [ ] Review all updates in this document
- [ ] Confirm SSE infrastructure requirements (Redis pub/sub?)
- [ ] Confirm bilingual menu design with stakeholders
- [ ] Update TASK-040_Breakdown.md with these changes

### During TASK-040 Implementation:
- [ ] Implement SSE event emitter (Section 8)
- [ ] Add language menu option to all menu templates
- [ ] Implement auto-switch detection logic
- [ ] Add component-level performance tracking
- [ ] Create tests for all new features

### After TASK-040 Implementation:
- [ ] Verify <1 second performance target
- [ ] Verify SSE events work in dashboard
- [ ] Verify language toggle works end-to-end
- [ ] Update documentation with final implementation details

---

**Document Version:** 1.0  
**Status:** ✅ APPROVED FOR IMPLEMENTATION  
**Last Updated:** October 16, 2025  
**Author:** AI Development Assistant
