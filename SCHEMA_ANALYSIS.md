# DrSync Schema vs Code Mismatch Analysis

## Summary
This document analyzes mismatches between the Prisma schema and the code usage in systemOperationsService.ts and related files.

## 🔍 Critical Mismatches Found

### 1. **User Model Issues**

#### Schema (✅ Correct):
- Field: `password` (line 93 in schema)
- Type: `String` (hashed with bcrypt comment)

#### Code (❌ Incorrect):
- systemOperationsService.ts line 159: `passwordHash: await this.hashPassword(userData.password)`
- systemOperationsService.ts line 220: `user.passwordHash`

**Issue**: Code uses `passwordHash` but schema has `password`

---

### 2. **Organization Model Issues**

#### Schema (✅ Correct):
- Field: `subscriptionPlan` (line 30)
- Type: `SubscriptionPlan` enum with values: FREE, BASIC, PROFESSIONAL, ENTERPRISE

#### Code (❌ Incorrect):
- systemOperationsService.ts line 301: `subscriptionTier: orgData.subscriptionTier`
- systemOperationsService.ts line 348: `organization.subscriptionTier`
- Interface line 51: `subscriptionTier: 'BASIC' | 'PROFESSIONAL' | 'ENTERPRISE'`

**Issue**: Code uses `subscriptionTier` but schema has `subscriptionPlan`, and FREE is missing from interface

#### Additional Organization Issues:
- Line 49: `googleSheetsId?: string;` ✅ Matches schema
- Line 53: `settings: any;` ❌ Schema doesn't have `settings` field

---

### 3. **Missing Models in Schema**

#### Code References Missing Models:
1. **Session Model** (used in lines 229, 605, 627)
   - Not defined in current schema
   - Code expects: id, userId, expiresAt, createdAt fields

2. **BillingRecord Model** (used in lines 464, 498, 504)
   - Not defined in current schema
   - Code expects: id, organizationId, subscriptionTier, billingCycle, amount, currency, status, periodStart, periodEnd, dueDate, paidAt, createdAt

3. **SystemMetric Model** (used in lines 605, 627)
   - Not defined in current schema
   - Code expects: timestamp, organizationId, metric, value, unit, tags

---

### 4. **AuditLog Model Issues**

#### Schema (✅ Has):
- Fields: oldValues, newValues (lines 514-515)
- No `changes` field
- No `timestamp` field (uses `createdAt`)

#### Code (❌ Expects):
- Line 377: `changes: logData.changes`
- Line 419: `orderBy: { timestamp: 'desc' }`
- Line 439: `changes: log.changes`
- Line 442: `timestamp: log.timestamp`

**Issue**: Code uses `changes` and `timestamp` but schema has `oldValues`/`newValues` and `createdAt`

---

### 5. **WhatsAppMessage Model Issues**

#### Schema (✅ Has):
- MessageType enum: TEXT, IMAGE, DOCUMENT, AUDIO, VIDEO, LOCATION, CONTACT, TEMPLATE, INTERACTIVE

#### Code (❌ Incorrect):
- Line 532: `messageType: messageData.messageType` where messageData includes 'MEDIA'
- Interface line 100: `messageType: 'TEXT' | 'TEMPLATE' | 'MEDIA' | 'INTERACTIVE'`

**Issue**: 'MEDIA' is not in the schema enum, should map to IMAGE/DOCUMENT/AUDIO/VIDEO

---

### 6. **Additional Field Mismatches**

#### In Various Places:
- Code expects `lastLoginAt` as nullable Date ✅ Schema has this (line 106)
- Code uses `googleSheetsId` as nullable string ✅ Schema has this (line 35)
- Code uses `whatsappCredentials` as Json ✅ Schema has this (line 42)

---

## 🔧 Recommended Fix Strategy

### Phase 1: Update Schema (Add Missing Models)
1. Add Session model
2. Add SystemMetric model  
3. Add BillingRecord model (or use existing BillingHistory)

### Phase 2: Update Code (Fix Field Names)
1. Change `passwordHash` → `password` in User operations
2. Change `subscriptionTier` → `subscriptionPlan` in Organization operations
3. Change `changes` → use `oldValues`/`newValues` in AuditLog operations
4. Change `timestamp` → `createdAt` in AuditLog operations
5. Fix MessageType 'MEDIA' → proper enum values

### Phase 3: Update Interfaces
1. Update SystemOrganization interface to use subscriptionPlan and add FREE
2. Update AuditLogEntry interface to match schema fields
3. Update WhatsAppMessageLog interface to use correct MessageType enum

---

## 🎯 Implementation Priority

### High Priority (Breaks Core Functionality):
1. User password field mismatch
2. Missing Session model
3. Organization subscriptionPlan vs subscriptionTier

### Medium Priority (System Features):
4. Missing BillingRecord/SystemMetric models
5. AuditLog field mismatches

### Low Priority (Enhancements):
6. MessageType enum corrections
7. Interface improvements